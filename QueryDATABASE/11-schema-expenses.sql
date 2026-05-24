-- ============================================================================
-- EXPENSE TRACKING SYSTEM
-- ============================================================================
-- File: 11-schema-expenses.sql
-- Description: Expense tracking for outlet daily operations
-- Version: 1.0
-- Date: 2026-05-19
-- Author: Kiro AI
-- 
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy paste isi file ini
-- 3. Klik "Run"
-- ============================================================================

-- ============================================================================
-- TABLE: expenses
-- ============================================================================
-- Purpose: Track all outlet expenses (operational, raw materials, salaries, etc.)
-- Used by: Kasir, Manager, Owner
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
        'operasional',    -- Operasional (listrik, gas, air, dll)
        'bahan_baku',     -- Bahan Baku (tepung, gula, minyak, dll)
        'gaji',           -- Gaji & Upah
        'transportasi',   -- Transportasi & Pengiriman
        'perawatan',      -- Perawatan & Perbaikan
        'marketing',      -- Marketing & Promosi
        'lainnya'         -- Lainnya
    )),
    keterangan TEXT NOT NULL,
    jumlah NUMERIC(15,2) NOT NULL CHECK (jumlah > 0),
    bukti_url TEXT,  -- URL foto bukti pengeluaran (optional)
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index untuk query by outlet dan tanggal (most common query)
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_date 
ON expenses (outlet_id, tanggal DESC);

-- Index untuk query by kategori
CREATE INDEX IF NOT EXISTS idx_expenses_kategori 
ON expenses (outlet_id, kategori, tanggal DESC);

-- Index untuk query by created_by (audit trail)
CREATE INDEX IF NOT EXISTS idx_expenses_created_by 
ON expenses (created_by, tanggal DESC);

-- Index untuk date range queries
CREATE INDEX IF NOT EXISTS idx_expenses_date_range 
ON expenses (tanggal DESC, outlet_id);

-- ============================================================================
-- FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Function: Get daily expense summary
CREATE OR REPLACE FUNCTION get_expense_daily_summary(
    p_outlet_id UUID,
    p_tanggal DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_pengeluaran NUMERIC,
    jumlah_item INTEGER,
    operasional NUMERIC,
    bahan_baku NUMERIC,
    gaji NUMERIC,
    transportasi NUMERIC,
    perawatan NUMERIC,
    marketing NUMERIC,
    lainnya NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(e.jumlah), 0) as total_pengeluaran,
        COUNT(*)::INTEGER as jumlah_item,
        COALESCE(SUM(CASE WHEN e.kategori = 'operasional' THEN e.jumlah ELSE 0 END), 0) as operasional,
        COALESCE(SUM(CASE WHEN e.kategori = 'bahan_baku' THEN e.jumlah ELSE 0 END), 0) as bahan_baku,
        COALESCE(SUM(CASE WHEN e.kategori = 'gaji' THEN e.jumlah ELSE 0 END), 0) as gaji,
        COALESCE(SUM(CASE WHEN e.kategori = 'transportasi' THEN e.jumlah ELSE 0 END), 0) as transportasi,
        COALESCE(SUM(CASE WHEN e.kategori = 'perawatan' THEN e.jumlah ELSE 0 END), 0) as perawatan,
        COALESCE(SUM(CASE WHEN e.kategori = 'marketing' THEN e.jumlah ELSE 0 END), 0) as marketing,
        COALESCE(SUM(CASE WHEN e.kategori = 'lainnya' THEN e.jumlah ELSE 0 END), 0) as lainnya
    FROM expenses e
    WHERE e.outlet_id = p_outlet_id 
        AND e.tanggal = p_tanggal;
END;
$$ LANGUAGE plpgsql;

-- Function: Get period expense summary
CREATE OR REPLACE FUNCTION get_expense_period_summary(
    p_outlet_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_pengeluaran NUMERIC,
    jumlah_item INTEGER,
    rata_rata_harian NUMERIC,
    kategori VARCHAR(50),
    kategori_total NUMERIC,
    kategori_count INTEGER,
    kategori_percentage NUMERIC
) AS $$
DECLARE
    v_total NUMERIC;
    v_days INTEGER;
BEGIN
    -- Calculate total
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total
    FROM expenses
    WHERE outlet_id = p_outlet_id
        AND tanggal BETWEEN p_start_date AND p_end_date;
    
    -- Calculate days
    v_days := (p_end_date - p_start_date) + 1;
    
    RETURN QUERY
    SELECT 
        v_total as total_pengeluaran,
        COUNT(*)::INTEGER as jumlah_item,
        CASE WHEN v_days > 0 THEN v_total / v_days ELSE 0 END as rata_rata_harian,
        e.kategori,
        SUM(e.jumlah) as kategori_total,
        COUNT(*)::INTEGER as kategori_count,
        CASE WHEN v_total > 0 THEN (SUM(e.jumlah) / v_total) * 100 ELSE 0 END as kategori_percentage
    FROM expenses e
    WHERE e.outlet_id = p_outlet_id
        AND e.tanggal BETWEEN p_start_date AND p_end_date
    GROUP BY e.kategori
    ORDER BY kategori_total DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view expenses from their outlet
CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT
    USING (
        outlet_id IN (
            SELECT outlet_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert expenses for their outlet
CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT
    WITH CHECK (
        outlet_id IN (
            SELECT outlet_id FROM users WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Policy: Users can update their own expenses
CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own expenses (within 24 hours)
CREATE POLICY expenses_delete_policy ON expenses
    FOR DELETE
    USING (
        created_by = auth.uid()
        AND created_at > NOW() - INTERVAL '24 hours'
    );

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
INSERT INTO expenses (outlet_id, tanggal, kategori, keterangan, jumlah, created_by)
SELECT 
    o.id,
    CURRENT_DATE,
    'bahan_baku',
    'Tepung terigu 25kg',
    175000,
    u.id
FROM outlets o
CROSS JOIN users u
WHERE o.nama = 'Outlet Pusat' 
    AND u.role = 'admin'
LIMIT 1;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table exists
SELECT 
    'expenses' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'expenses'
    ) as table_exists;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'expenses'
    AND schemaname = 'public';

-- Check functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%expense%';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Get daily summary
SELECT * FROM get_expense_daily_summary(
    'outlet-uuid-here',
    CURRENT_DATE
);

-- Example 2: Get period summary
SELECT * FROM get_expense_period_summary(
    'outlet-uuid-here',
    '2026-05-01',
    '2026-05-31'
);

-- Example 3: Get all expenses for today
SELECT 
    e.*,
    o.nama as outlet_nama,
    u.name as created_by_name
FROM expenses e
JOIN outlets o ON e.outlet_id = o.id
JOIN users u ON e.created_by = u.id
WHERE e.outlet_id = 'outlet-uuid-here'
    AND e.tanggal = CURRENT_DATE
ORDER BY e.created_at DESC;
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
