-- ============================================================================
-- EXPENSE TRACKING SYSTEM - MIGRATION V2
-- ============================================================================
-- File: 11-schema-expenses-v2-migration.sql
-- Description: Migration untuk enhance expense tracking dengan enterprise features
-- Version: 2.0
-- Date: 2026-05-20
-- Author: Kiro AI
-- 
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy paste isi file ini
-- 3. Klik "Run"
-- 
-- CATATAN: Migration ini AMAN dan tidak akan merusak data yang sudah ada
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new columns to expenses table (SAFE - tidak merusak data)
-- ============================================================================

-- Status & Approval columns
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Closing Integration columns
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS is_included_in_closing BOOLEAN DEFAULT false;

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS closing_id UUID;

-- Audit Trail columns
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS device_info JSONB;

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS ip_address INET;

-- ============================================================================
-- STEP 2: Create expense_audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected')),
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  device_info JSONB,
  reason TEXT
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_expense 
ON expense_audit_logs(expense_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user 
ON expense_audit_logs(performed_by, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action 
ON expense_audit_logs(action, performed_at DESC);

-- ============================================================================
-- STEP 3: Create outlet_expense_budgets table
-- ============================================================================

CREATE TABLE IF NOT EXISTS outlet_expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
    'operasional', 'bahan_baku', 'gaji', 'transportasi', 'perawatan', 'marketing', 'lainnya'
  )),
  budget_harian NUMERIC(15,2),
  budget_bulanan NUMERIC(15,2),
  alert_threshold_percent INTEGER DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 0 AND 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, kategori)
);

-- Indexes for budget
CREATE INDEX IF NOT EXISTS idx_budget_outlet 
ON outlet_expense_budgets(outlet_id, is_active);

CREATE INDEX IF NOT EXISTS idx_budget_kategori 
ON outlet_expense_budgets(kategori, is_active);

-- ============================================================================
-- STEP 4: Add new indexes to expenses table for better performance
-- ============================================================================

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_expenses_status 
ON expenses(outlet_id, status, tanggal DESC);

-- Index for closing queries
CREATE INDEX IF NOT EXISTS idx_expenses_closing 
ON expenses(outlet_id, is_included_in_closing, tanggal DESC);

-- Index for approval queries
CREATE INDEX IF NOT EXISTS idx_expenses_approval 
ON expenses(approved_by, approved_at DESC) 
WHERE approved_by IS NOT NULL;

-- ============================================================================
-- STEP 5: Create helper functions
-- ============================================================================

-- Function: Get budget status for outlet
CREATE OR REPLACE FUNCTION get_budget_status(
  p_outlet_id UUID,
  p_tanggal DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  kategori VARCHAR(50),
  budget_harian NUMERIC,
  budget_bulanan NUMERIC,
  used_today NUMERIC,
  used_this_month NUMERIC,
  remaining_today NUMERIC,
  remaining_month NUMERIC,
  percentage_used_today NUMERIC,
  percentage_used_month NUMERIC,
  alert_level VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.kategori,
    b.budget_harian,
    b.budget_bulanan,
    COALESCE(SUM(CASE WHEN e.tanggal = p_tanggal THEN e.jumlah ELSE 0 END), 0) as used_today,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', e.tanggal) = DATE_TRUNC('month', p_tanggal) THEN e.jumlah ELSE 0 END), 0) as used_this_month,
    CASE 
      WHEN b.budget_harian IS NOT NULL 
      THEN b.budget_harian - COALESCE(SUM(CASE WHEN e.tanggal = p_tanggal THEN e.jumlah ELSE 0 END), 0)
      ELSE NULL 
    END as remaining_today,
    CASE 
      WHEN b.budget_bulanan IS NOT NULL 
      THEN b.budget_bulanan - COALESCE(SUM(CASE WHEN DATE_TRUNC('month', e.tanggal) = DATE_TRUNC('month', p_tanggal) THEN e.jumlah ELSE 0 END), 0)
      ELSE NULL 
    END as remaining_month,
    CASE 
      WHEN b.budget_harian IS NOT NULL AND b.budget_harian > 0
      THEN (COALESCE(SUM(CASE WHEN e.tanggal = p_tanggal THEN e.jumlah ELSE 0 END), 0) / b.budget_harian) * 100
      ELSE 0 
    END as percentage_used_today,
    CASE 
      WHEN b.budget_bulanan IS NOT NULL AND b.budget_bulanan > 0
      THEN (COALESCE(SUM(CASE WHEN DATE_TRUNC('month', e.tanggal) = DATE_TRUNC('month', p_tanggal) THEN e.jumlah ELSE 0 END), 0) / b.budget_bulanan) * 100
      ELSE 0 
    END as percentage_used_month,
    CASE 
      WHEN b.budget_harian IS NOT NULL AND b.budget_harian > 0 THEN
        CASE 
          WHEN (COALESCE(SUM(CASE WHEN e.tanggal = p_tanggal THEN e.jumlah ELSE 0 END), 0) / b.budget_harian) * 100 >= 100 THEN 'danger'
          WHEN (COALESCE(SUM(CASE WHEN e.tanggal = p_tanggal THEN e.jumlah ELSE 0 END), 0) / b.budget_harian) * 100 >= b.alert_threshold_percent THEN 'warning'
          ELSE 'safe'
        END
      ELSE 'safe'
    END as alert_level
  FROM outlet_expense_budgets b
  LEFT JOIN expenses e ON b.outlet_id = e.outlet_id 
    AND b.kategori = e.kategori
    AND e.status IN ('pending', 'approved')
  WHERE b.outlet_id = p_outlet_id 
    AND b.is_active = true
  GROUP BY b.kategori, b.budget_harian, b.budget_bulanan, b.alert_threshold_percent;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Create trigger for audit logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_expense_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO expense_audit_logs (expense_id, action, performed_by, new_value)
    VALUES (NEW.id, 'created', NEW.created_by, row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO expense_audit_logs (expense_id, action, performed_by, old_value, new_value)
    VALUES (NEW.id, 'updated', NEW.created_by, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO expense_audit_logs (expense_id, action, performed_by, old_value)
    VALUES (OLD.id, 'deleted', OLD.created_by, row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if not exists)
DROP TRIGGER IF EXISTS trigger_expense_audit ON expenses;
CREATE TRIGGER trigger_expense_audit
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_expense_audit();

-- ============================================================================
-- STEP 7: Update RLS policies for new tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE expense_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_expense_budgets ENABLE ROW LEVEL SECURITY;

-- Audit logs policies (read-only for users)
CREATE POLICY audit_logs_select_policy ON expense_audit_logs
  FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE outlet_id IN (
        SELECT outlet_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Budget policies
CREATE POLICY budget_select_policy ON outlet_expense_budgets
  FOR SELECT
  USING (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY budget_insert_policy ON outlet_expense_budgets
  FOR INSERT
  WITH CHECK (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY budget_update_policy ON outlet_expense_budgets
  FOR UPDATE
  USING (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if new columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
  AND column_name IN ('status', 'approved_by', 'is_included_in_closing', 'device_info')
ORDER BY column_name;

-- Check if new tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('expense_audit_logs', 'outlet_expense_budgets')
ORDER BY table_name;

-- Check if new indexes exist
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename = 'expenses' OR tablename = 'expense_audit_logs' OR tablename = 'outlet_expense_budgets')
  AND indexname LIKE '%expense%'
ORDER BY tablename, indexname;

-- Check if function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_budget_status';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample budget data
/*
INSERT INTO outlet_expense_budgets (outlet_id, kategori, budget_harian, budget_bulanan, alert_threshold_percent)
SELECT 
  o.id,
  'bahan_baku',
  500000,
  15000000,
  80
FROM outlets o
WHERE o.status = 'aktif'
ON CONFLICT (outlet_id, kategori) DO NOTHING;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 New columns added to expenses table';
  RAISE NOTICE '📋 expense_audit_logs table created';
  RAISE NOTICE '💰 outlet_expense_budgets table created';
  RAISE NOTICE '🔍 New indexes created for better performance';
  RAISE NOTICE '🔒 RLS policies updated';
  RAISE NOTICE '⚡ Ready for Phase 1 implementation!';
END $$;

