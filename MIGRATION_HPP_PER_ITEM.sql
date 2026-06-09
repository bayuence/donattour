-- ============================================================
-- MIGRATION: HPP Per Item
-- Tujuan: Menambahkan kolom HPP rinci per produk
--         hpp_base_donat  = biaya donat polos (tanpa topping)
--         hpp_topping     = biaya topping
--         hpp_total       = base + topping (auto-hitung)
--         margin_amount   = harga_jual - hpp_total
--         margin_percent  = (margin_amount / harga_jual) × 100
--
-- CARA MENJALANKAN:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project donattour
-- 3. Klik menu "SQL Editor" di sidebar kiri
-- 4. Paste seluruh isi file ini
-- 5. Klik "Run"
--
-- SETELAH MIGRATION SELESAI:
-- Buka lib/db/products.ts dan:
-- 1. Hapus blok [COMPATIBILITY STRIP]
-- 2. Aktifkan (uncomment) blok [NEW COLUMNS]
-- ============================================================

-- Step 1: Tambahkan kolom baru ke tabel products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hpp_base_donat  NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hpp_topping     NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hpp_total       NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_amount   NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent  NUMERIC(5,2)  DEFAULT 0;

-- Step 2: Migrasi data lama ke kolom baru
-- Untuk produk donat: harga_pokok_penjualan → hpp_total (kita tidak tahu breakdown-nya)
-- Untuk semua produk: set hpp_total = harga_pokok_penjualan yang sudah ada
UPDATE products
SET
  hpp_total      = COALESCE(harga_pokok_penjualan, 0),
  hpp_topping    = COALESCE(harga_pokok_penjualan, 0),  -- total dianggap sebagai topping saja
  hpp_base_donat = 0,                                    -- base donat belum diketahui
  margin_amount  = COALESCE(harga_jual, 0) - COALESCE(harga_pokok_penjualan, 0),
  margin_percent = CASE
    WHEN COALESCE(harga_jual, 0) > 0
    THEN ROUND(
      ((COALESCE(harga_jual, 0) - COALESCE(harga_pokok_penjualan, 0))
       / COALESCE(harga_jual, 0) * 100)::NUMERIC,
      2
    )
    ELSE 0
  END
WHERE harga_pokok_penjualan IS NOT NULL
  AND harga_pokok_penjualan > 0;

-- Step 3: Verifikasi hasil migration
SELECT
  COUNT(*) AS total_produk,
  COUNT(CASE WHEN hpp_total > 0 THEN 1 END) AS hpp_terisi,
  COUNT(CASE WHEN hpp_base_donat > 0 THEN 1 END) AS base_donat_terisi,
  AVG(margin_percent) AS avg_margin_pct
FROM products
WHERE is_active = TRUE;

-- ============================================================
-- Setelah running ini, refresh schema cache Supabase:
-- Tunggu ~5 menit ATAU jalankan perintah ini:
-- SELECT pg_notify('pgrst', 'reload schema');
-- ============================================================
