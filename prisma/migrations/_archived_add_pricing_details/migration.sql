-- Migration: Add Pricing Details & Remove Channel
-- Created: 2026-06-05
-- Purpose: Implement detailed pricing per product and simplify kasir

-- ============================================================================
-- STEP 1: Add new columns to products table
-- ============================================================================

-- Add pricing detail columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_donat BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ukuran_donat VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hpp_base_donat DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS hpp_topping DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS hpp_total DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS harga_jual DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margin_amount DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2);

-- Create index for is_donat
CREATE INDEX IF NOT EXISTS idx_products_is_donat ON products(is_donat);

-- ============================================================================
-- STEP 2: Migrate existing data
-- ============================================================================

-- Update is_donat based on tipe_produk
UPDATE products
SET is_donat = (
  tipe_produk IS NOT NULL AND 
  (tipe_produk LIKE '%donat%' OR tipe_produk = 'donat_varian' OR tipe_produk = 'donat_base')
)
WHERE is_donat IS NULL OR is_donat = false;

-- Set ukuran_donat from existing ukuran field
UPDATE products
SET ukuran_donat = 
  CASE 
    WHEN ukuran = 'standar' THEN 'regular'
    WHEN ukuran = 'mini' THEN 'mini'
    ELSE ukuran
  END
WHERE is_donat = true AND ukuran_donat IS NULL;

-- Migrate HPP (estimate: 60% base, 40% topping for donuts)
UPDATE products
SET 
  hpp_base_donat = CASE WHEN is_donat = true THEN ROUND(COALESCE(hpp, 0) * 0.6) ELSE NULL END,
  hpp_topping = CASE WHEN is_donat = true THEN ROUND(COALESCE(hpp, 0) * 0.4) ELSE NULL END,
  hpp_total = COALESCE(hpp, 0),
  harga_jual = COALESCE(harga, 0)
WHERE hpp_total IS NULL;

-- Calculate margins
UPDATE products
SET 
  margin_amount = COALESCE(harga_jual, 0) - COALESCE(hpp_total, 0),
  margin_percent = CASE 
    WHEN COALESCE(harga_jual, 0) > 0 
    THEN ROUND(((COALESCE(harga_jual, 0) - COALESCE(hpp_total, 0)) / COALESCE(harga_jual, 0) * 100)::numeric, 2)
    ELSE 0 
  END
WHERE margin_amount IS NULL OR margin_percent IS NULL;

-- ============================================================================
-- STEP 3: Remove channel column from orders (if exists)
-- ============================================================================

-- Check if column exists first, then drop
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'channel'
  ) THEN
    ALTER TABLE orders DROP COLUMN channel;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Drop old kasir menu tables (if exists)
-- ============================================================================

-- Backup first (optional, commented out - uncomment if needed)
-- CREATE TABLE IF NOT EXISTS _backup_outlet_kasir_menus AS SELECT * FROM outlet_kasir_menus;
-- CREATE TABLE IF NOT EXISTS _backup_outlet_channel_prices AS SELECT * FROM outlet_channel_prices;

-- Drop tables
DROP TABLE IF EXISTS outlet_kasir_menus CASCADE;
DROP TABLE IF EXISTS outlet_channel_prices CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify products with new pricing
-- SELECT 
--   nama,
--   is_donat,
--   ukuran_donat,
--   hpp_base_donat,
--   hpp_topping,
--   hpp_total,
--   harga_jual,
--   margin_amount,
--   margin_percent
-- FROM products
-- WHERE is_donat = true
-- LIMIT 10;

-- Verify orders without channel
-- SELECT id, outlet_id, total_amount, payment_method, created_at
-- FROM orders
-- LIMIT 10;
