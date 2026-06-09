-- Query untuk cek data inventory_non_topping HARI INI
-- Ganti outlet_id dan tanggal sesuai kebutuhan

SELECT 
  id,
  outlet_id,
  ukuran,
  qty_available,
  production_date,
  status,
  last_updated,
  created_at
FROM inventory_non_topping
WHERE outlet_id = '86a545ed-9420-41f9-9f26-bcdcfba4437c'  -- Outlet: Donattour K3PG
AND production_date = '2026-06-10'  -- Hari ini
ORDER BY ukuran, created_at;

-- Expected result jika input 3 pcs standar:
-- | ukuran  | qty_available | production_date | status |
-- |---------|---------------|-----------------|--------|
-- | standar | 3             | 2026-06-10      | fresh  |

-- Jika hasilnya:
-- | standar | 3 | 2026-06-10 | fresh |
-- | standar | 3 | 2026-06-10 | fresh |
-- Berarti ada DUPLICATE INSERT = BUG!

-- Jika hasilnya:
-- | standar | 6 | 2026-06-10 | fresh |
-- Berarti TOP-UP (produksi kedua hari ini menambah stok)
