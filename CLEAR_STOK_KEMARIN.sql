-- ============================================================================
-- CLEAR STOK KEMARIN (untuk reset inventory sebelum produksi baru)
-- ============================================================================

-- OPTION 1: Delete semua stok hari kemarin (hard delete)
DELETE FROM inventory_non_topping
WHERE outlet_id = '86a545ed-9420-41f9-9f26-bcdcfba4437c'  -- Ganti dengan outlet ID Anda
AND production_date < '2026-06-10';  -- Hapus stok sebelum hari ini

-- OPTION 2: Update status jadi 'expired' (soft delete, untuk reporting)
UPDATE inventory_non_topping
SET 
  status = 'expired',
  last_updated = NOW()
WHERE outlet_id = '86a545ed-9420-41f9-9f26-bcdcfba4437c'
AND production_date < '2026-06-10'
AND status = 'fresh';

-- OPTION 3: Cek stok saat ini
SELECT 
  outlet_id,
  ukuran,
  production_date,
  qty_available,
  status,
  last_updated
FROM inventory_non_topping
WHERE outlet_id = '86a545ed-9420-41f9-9f26-bcdcfba4437c'
ORDER BY production_date DESC, ukuran;
