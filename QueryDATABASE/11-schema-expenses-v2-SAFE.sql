-- ============================================================================
-- EXPENSE TRACKING SYSTEM - SAFE MIGRATION V2
-- ============================================================================
-- File: 11-schema-expenses-v2-SAFE.sql
-- Description: Migration yang AMAN - hanya tambah kolom yang belum ada
-- Version: 2.0-SAFE
-- Date: 2026-05-20
-- 
-- CATATAN: Migration ini AMAN karena:
-- 1. Hanya ADD COLUMN (tidak DROP atau ALTER existing columns)
-- 2. Semua kolom baru adalah NULLABLE atau punya DEFAULT value
-- 3. Tidak akan merusak data existing
-- 4. Backward compatible dengan kode existing
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to expenses table
-- ============================================================================

DO $$
BEGIN
  -- Add status column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN status VARCHAR(20) DEFAULT 'approved' 
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
    
    RAISE NOTICE '✅ Added column: status';
  ELSE
    RAISE NOTICE '⏭️  Column already exists: status';
  END IF;

  -- Add rejection_reason column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN rejection_reason TEXT;
    
    RAISE NOTICE '✅ Added column: rejection_reason';
  ELSE
    RAISE NOTICE '⏭️  Column already exists: rejection_reason';
  END IF;

  -- Add is_included_in_closing column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'is_included_in_closing'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN is_included_in_closing BOOLEAN DEFAULT false;
    
    RAISE NOTICE '✅ Added column: is_included_in_closing';
  ELSE
    RAISE NOTICE '⏭️  Column already exists: is_included_in_closing';
  END IF;

  -- Add closing_id column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'closing_id'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN closing_id UUID;
    
    RAISE NOTICE '✅ Added column: closing_id';
  ELSE
    RAISE NOTICE '⏭️  Column already exists: closing_id';
  END IF;

  -- Add device_info column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'device_info'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN device_info JSONB;
    
    RAISE NOTICE '✅ Added column: device_info';
  ELSE
    RAISE NOTICE '⏭️  Column already exists: device_info';
  END IF;

  -- Add ip_address column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE expenses 
    ADD COLUMN ip_address INET;
    
    RAISE NOTICE '✅ Added column: ip_address';
  ELSE
    RAISE NOTICE '⏭️  Column already exists: ip_address';
  END IF;

END $$;

-- ============================================================================
-- STEP 2: Create expense_audit_logs table (if not exists)
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

-- ============================================================================
-- STEP 3: Create outlet_expense_budgets table (if not exists)
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

-- ============================================================================
-- STEP 4: Create indexes (if not exists)
-- ============================================================================

-- Indexes for expenses table
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON expenses(outlet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tanggal ON expenses(tanggal);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(outlet_id, status, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_closing ON expenses(outlet_id, is_included_in_closing, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_approval ON expenses(approved_by_user_id, approved_at DESC) 
  WHERE approved_by_user_id IS NOT NULL;

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_expense ON expense_audit_logs(expense_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON expense_audit_logs(performed_by, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON expense_audit_logs(action, performed_at DESC);

-- Indexes for budgets
CREATE INDEX IF NOT EXISTS idx_budget_outlet ON outlet_expense_budgets(outlet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budget_kategori ON outlet_expense_budgets(kategori, is_active);

-- ============================================================================
-- STEP 5: Create helper functions (if not exists)
-- ============================================================================

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
    AND (e.status IN ('pending', 'approved') OR e.status IS NULL)
  WHERE b.outlet_id = p_outlet_id 
    AND b.is_active = true
  GROUP BY b.kategori, b.budget_harian, b.budget_bulanan, b.alert_threshold_percent;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Create trigger for audit logging (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_expense_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO expense_audit_logs (expense_id, action, performed_by, new_value)
    VALUES (NEW.id, 'created', NEW.recorded_by_user_id, row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO expense_audit_logs (expense_id, action, performed_by, old_value, new_value)
    VALUES (NEW.id, 'updated', NEW.recorded_by_user_id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO expense_audit_logs (expense_id, action, performed_by, old_value)
    VALUES (OLD.id, 'deleted', OLD.recorded_by_user_id, row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS audit_logs_select_policy ON expense_audit_logs;
DROP POLICY IF EXISTS budget_select_policy ON outlet_expense_budgets;
DROP POLICY IF EXISTS budget_insert_policy ON outlet_expense_budgets;
DROP POLICY IF EXISTS budget_update_policy ON outlet_expense_budgets;

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
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Changes applied:';
  RAISE NOTICE '   • Added missing columns to expenses table';
  RAISE NOTICE '   • Created expense_audit_logs table (if not exists)';
  RAISE NOTICE '   • Created outlet_expense_budgets table (if not exists)';
  RAISE NOTICE '   • Created indexes for better performance';
  RAISE NOTICE '   • Created helper functions';
  RAISE NOTICE '   • Created audit trigger';
  RAISE NOTICE '   • Updated RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database is now ready for v2.0!';
  RAISE NOTICE '';
END $$;
