-- Migration: Add HPP Per Item Columns to products
-- Generated: 2026-06-09
-- Safe: hanya ADD COLUMN, tidak ada DROP TABLE

-- ── 1. Tambah kolom baru ke tabel products ──────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_donat       BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS ukuran_donat   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hpp_base_donat DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS hpp_topping    DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS hpp_total      DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS harga_jual     DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margin_amount  DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2);

-- ── 2. Index untuk performa query ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_is_donat  ON products(is_donat);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_tipe      ON products(tipe_produk);

-- ── 3. Migrasi data lama → kolom baru ───────────────────────────

-- Set is_donat berdasarkan tipe_produk yang sudah ada
UPDATE products
SET is_donat = (
  tipe_produk IS NOT NULL AND
  tipe_produk IN ('donat_varian', 'donat_base')
)
WHERE is_donat IS NULL OR is_donat = false;

-- Set harga_jual dari kolom lama (harga atau harga_pokok_penjualan)
UPDATE products
SET harga_jual = COALESCE(
  harga_jual,
  (SELECT harga FROM products p2 WHERE p2.id = products.id LIMIT 1),
  0
)
WHERE harga_jual IS NULL;

-- Migrasi HPP dari kolom lama ke kolom baru
-- Donat: estimasi 60% base / 40% topping (user bisa edit ulang nanti)
-- Non-donat: full HPP ke hpp_topping (tidak ada base)
UPDATE products
SET
  hpp_base_donat = CASE
    WHEN is_donat = true
    THEN ROUND(COALESCE(harga_pokok_penjualan, hpp, 0) * 0.6, 2)
    ELSE 0
  END,
  hpp_topping = CASE
    WHEN is_donat = true
    THEN ROUND(COALESCE(harga_pokok_penjualan, hpp, 0) * 0.4, 2)
    ELSE COALESCE(harga_pokok_penjualan, hpp, 0)
  END,
  hpp_total = COALESCE(harga_pokok_penjualan, hpp, 0)
WHERE hpp_total IS NULL;

-- Hitung margin otomatis
UPDATE products
SET
  margin_amount = COALESCE(harga_jual, 0) - COALESCE(hpp_total, 0),
  margin_percent = CASE
    WHEN COALESCE(harga_jual, 0) > 0
    THEN ROUND(
      ((COALESCE(harga_jual, 0) - COALESCE(hpp_total, 0))
        / COALESCE(harga_jual, 0) * 100)::NUMERIC, 2
    )
    ELSE 0
  END
WHERE margin_amount IS NULL;
