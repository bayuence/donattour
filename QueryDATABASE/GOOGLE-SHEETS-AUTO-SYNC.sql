-- ============================================================================
-- GOOGLE SHEETS AUTO-SYNC SETUP
-- ============================================================================
-- File: QueryDATABASE/GOOGLE-SHEETS-AUTO-SYNC.sql
-- Description: Setup auto-sync to Google Sheets for transactions and production
-- Version: 1.0
-- Date: May 8, 2026
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SYNC LOG TABLE
-- ============================================================================
-- Track which records have been synced to Google Sheets

CREATE TABLE IF NOT EXISTS google_sheets_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('transaction', 'production')),
    record_id UUID NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Ensure each record is only logged once
    CONSTRAINT unique_sync_record UNIQUE(record_type, record_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sync_log_status 
ON google_sheets_sync_log(sync_status, synced_at);

CREATE INDEX IF NOT EXISTS idx_sync_log_record 
ON google_sheets_sync_log(record_type, record_id);

COMMENT ON TABLE google_sheets_sync_log IS 'Tracks which records have been synced to Google Sheets';

-- ============================================================================
-- STEP 2: CREATE FUNCTION TO QUEUE SYNC
-- ============================================================================
-- This function is called by triggers to queue records for sync

CREATE OR REPLACE FUNCTION queue_google_sheets_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync completed/paid transactions
    IF TG_TABLE_NAME = 'orders' THEN
        IF NEW.status = 'completed' AND NEW.payment_status = 'paid' THEN
            INSERT INTO google_sheets_sync_log (record_type, record_id, sync_status)
            VALUES ('transaction', NEW.id, 'pending')
            ON CONFLICT (record_type, record_id) DO NOTHING;
        END IF;
    END IF;
    
    -- Sync all production records
    IF TG_TABLE_NAME = 'production_daily' THEN
        INSERT INTO google_sheets_sync_log (record_type, record_id, sync_status)
        VALUES ('production', NEW.id, 'pending')
        ON CONFLICT (record_type, record_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION queue_google_sheets_sync IS 'Queue records for Google Sheets sync';

-- ============================================================================
-- STEP 3: CREATE TRIGGERS
-- ============================================================================

-- Trigger for transactions (orders)
DROP TRIGGER IF EXISTS trigger_queue_transaction_sync ON orders;

CREATE TRIGGER trigger_queue_transaction_sync
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION queue_google_sheets_sync();

-- Trigger for production
DROP TRIGGER IF EXISTS trigger_queue_production_sync ON production_daily;

CREATE TRIGGER trigger_queue_production_sync
    AFTER INSERT ON production_daily
    FOR EACH ROW
    EXECUTE FUNCTION queue_google_sheets_sync();

-- ============================================================================
-- STEP 4: CREATE FUNCTION TO GET PENDING SYNCS
-- ============================================================================
-- Get records that need to be synced

CREATE OR REPLACE FUNCTION get_pending_google_sheets_syncs(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    sync_id UUID,
    record_type VARCHAR(50),
    record_id UUID,
    record_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gsl.id as sync_id,
        gsl.record_type,
        gsl.record_id,
        CASE 
            WHEN gsl.record_type = 'transaction' THEN
                (SELECT row_to_json(t.*)::jsonb
                 FROM (
                     SELECT 
                         o.id as order_id,
                         o.outlet_id,
                         out.nama as outlet_name,
                         o.kasir_id,
                         o.kasir_name,
                         o.customer_name,
                         o.customer_phone,
                         o.channel,
                         o.total_amount,
                         o.payment_method,
                         o.payment_status,
                         o.status,
                         o.created_at,
                         (
                             SELECT json_agg(
                                 json_build_object(
                                     'product_name', oi.product_name,
                                     'quantity', oi.quantity,
                                     'unit_price', oi.unit_price,
                                     'subtotal', oi.subtotal
                                 )
                             )
                             FROM order_items oi
                             WHERE oi.order_id = o.id
                         ) as items
                     FROM orders o
                     LEFT JOIN outlets out ON out.id = o.outlet_id
                     WHERE o.id = gsl.record_id
                 ) t)
            WHEN gsl.record_type = 'production' THEN
                (SELECT row_to_json(p.*)::jsonb
                 FROM (
                     SELECT 
                         pd.id as production_id,
                         pd.outlet_id,
                         out.nama as outlet_name,
                         pd.tanggal,
                         pd.ukuran,
                         pd.target_qty,
                         pd.success_qty,
                         pd.waste_qty,
                         -- Calculate success_rate and waste_rate
                         ROUND((pd.success_qty::DECIMAL / NULLIF(pd.target_qty, 0) * 100), 2) as success_rate,
                         ROUND((pd.waste_qty::DECIMAL / NULLIF(pd.target_qty, 0) * 100), 2) as waste_rate,
                         pd.total_hpp_loss,
                         u.name as created_by,
                         pd.created_at
                     FROM production_daily pd
                     LEFT JOIN outlets out ON out.id = pd.outlet_id
                     LEFT JOIN users u ON u.id = pd.created_by
                     WHERE pd.id = gsl.record_id
                 ) p)
        END as record_data
    FROM google_sheets_sync_log gsl
    WHERE gsl.sync_status = 'pending'
        AND gsl.retry_count < 3  -- Max 3 retries
    ORDER BY gsl.synced_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_google_sheets_syncs IS 'Get records pending sync to Google Sheets';

-- ============================================================================
-- STEP 5: CREATE FUNCTION TO UPDATE SYNC STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_google_sheets_sync_status(
    p_sync_id UUID,
    p_status VARCHAR(20),
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE google_sheets_sync_log
    SET 
        sync_status = p_status,
        error_message = p_error_message,
        retry_count = CASE 
            WHEN p_status = 'failed' THEN retry_count + 1
            ELSE retry_count
        END,
        synced_at = CASE 
            WHEN p_status = 'success' THEN NOW()
            ELSE synced_at
        END
    WHERE id = p_sync_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_google_sheets_sync_status IS 'Update sync status for a record';

-- ============================================================================
-- STEP 6: MANUAL SYNC QUERIES
-- ============================================================================

-- Get pending syncs
SELECT * FROM get_pending_google_sheets_syncs(10);

-- Check sync log status
SELECT 
    record_type,
    sync_status,
    COUNT(*) as count,
    MAX(synced_at) as last_sync
FROM google_sheets_sync_log
GROUP BY record_type, sync_status
ORDER BY record_type, sync_status;

-- Retry failed syncs (reset to pending)
UPDATE google_sheets_sync_log
SET 
    sync_status = 'pending',
    retry_count = 0,
    error_message = NULL
WHERE sync_status = 'failed'
    AND retry_count < 3;

-- Clear old successful syncs (older than 30 days)
DELETE FROM google_sheets_sync_log
WHERE sync_status = 'success'
    AND synced_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- STEP 7: MONITORING QUERIES
-- ============================================================================

-- Check sync health
SELECT 
    'Sync Health' as metric,
    record_type,
    COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE sync_status = 'success') as success,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as failed,
    ROUND(
        COUNT(*) FILTER (WHERE sync_status = 'success')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as success_rate_pct
FROM google_sheets_sync_log
GROUP BY record_type;

-- Recent sync activity
SELECT 
    record_type,
    sync_status,
    COUNT(*) as count,
    MAX(synced_at) as last_sync,
    MIN(synced_at) as first_sync
FROM google_sheets_sync_log
WHERE synced_at >= NOW() - INTERVAL '24 hours'
GROUP BY record_type, sync_status
ORDER BY record_type, sync_status;

-- Failed syncs with errors
SELECT 
    record_type,
    record_id,
    error_message,
    retry_count,
    synced_at
FROM google_sheets_sync_log
WHERE sync_status = 'failed'
ORDER BY synced_at DESC
LIMIT 20;

-- ============================================================================
-- END OF GOOGLE SHEETS AUTO-SYNC SETUP
-- ============================================================================

/*
=== SETUP INSTRUCTIONS ===

1. Run this SQL script in Supabase SQL Editor

2. Setup environment variables in .env.local:
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
   GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email
   GOOGLE_SHEETS_PRIVATE_KEY=your_private_key

3. Initialize Google Sheets:
   GET /api/sync/google-sheets?action=init

4. Setup cron job to process pending syncs:
   - Every 1 minute: Process pending syncs
   - Every 1 hour: Retry failed syncs
   - Every 1 day: Clean old successful syncs

5. Monitor sync health:
   SELECT * FROM get_pending_google_sheets_syncs(10);

=== HOW IT WORKS ===

1. When transaction is completed:
   - Trigger adds record to google_sheets_sync_log
   - Status: pending

2. Cron job (every 1 minute):
   - Fetch pending syncs
   - Call Google Sheets API
   - Update status to success/failed

3. If failed:
   - Retry up to 3 times
   - After 3 failures, manual intervention needed

4. Monitoring:
   - Check sync health dashboard
   - View failed syncs with errors
   - Retry failed syncs manually

=== BENEFITS ===

✅ Auto-sync all completed transactions
✅ Auto-sync all production records
✅ Retry mechanism for failures
✅ Monitoring and logging
✅ No data loss (queued in database)
✅ Scalable for 1000+ outlets

*/
