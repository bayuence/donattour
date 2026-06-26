-- ============================================================================
-- RESET DATABASE - CLEAN ALL DATA
-- ============================================================================
-- File: scripts/reset-database.sql
-- Description: Clean all production, transaction, and inventory data
-- Usage: Run in Supabase SQL Editor
-- ============================================================================

-- WARNING: This will DELETE all transaction data!
-- Master data (products, outlets, users) will NOT be affected

BEGIN;

-- 1. Show current counts (optional, for reference)
SELECT 
  'Before Delete' as status,
  (SELECT COUNT(*) FROM production_daily) as production_records,
  (SELECT COUNT(*) FROM inventory_non_topping) as inventory_records,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM order_items) as order_items,
  (SELECT COUNT(*) FROM channel_stock_deductions) as channel_deductions,
  (SELECT COUNT(*) FROM expenses) as expenses,
  (SELECT COUNT(*) FROM otr_stock_transfers) as otr_transfers,
  (SELECT COUNT(*) FROM otr_sales) as otr_sales;

-- 2. Delete order items first (foreign key dependency)
DELETE FROM order_items;

-- 3. Delete orders
DELETE FROM orders;

-- 4. Delete channel stock deductions
DELETE FROM channel_stock_deductions;

-- 5. Delete inventory
DELETE FROM inventory_non_topping;

-- 6. Delete production
DELETE FROM production_daily;

-- 7. Delete expenses
DELETE FROM expenses;

-- 8. Delete OTR transfers
DELETE FROM otr_stock_transfers;

-- 9. Delete OTR sales
DELETE FROM otr_sales;

-- 10. Show result
SELECT 
  'After Delete' as status,
  (SELECT COUNT(*) FROM production_daily) as production_records,
  (SELECT COUNT(*) FROM inventory_non_topping) as inventory_records,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM order_items) as order_items,
  (SELECT COUNT(*) FROM channel_stock_deductions) as channel_deductions,
  (SELECT COUNT(*) FROM expenses) as expenses,
  (SELECT COUNT(*) FROM otr_stock_transfers) as otr_transfers,
  (SELECT COUNT(*) FROM otr_sales) as otr_sales;

COMMIT;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- Master data NOT deleted:
--   - products (Produk donattour)
--   - product_categories (Kategori produk)
--   - outlets (Data outlet)
--   - users (User login)
--   - payment_methods (Metode pembayaran)
--
-- Only operational/transaction data deleted:
--   - production_daily (Semua input produksi)
--   - inventory_non_topping (Semua stok donat)
--   - orders & order_items (Semua transaksi penjualan)
--   - channel_stock_deductions (Pemotongan stok channel)
--   - expenses (Semua pengeluaran)
--   - otr_stock_transfers (Transfer stok OTR)
--   - otr_sales (Penjualan OTR)
-- ============================================================================
