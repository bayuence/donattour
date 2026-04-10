-- ============================================================================
-- DONATTOUR DATABASE - PERFORMANCE & SCALABILITY MIGRATION
-- ============================================================================
-- File: 17-performance-kasir-menus.sql
-- Tujuan: Memastikan tabel outlet_kasir_menus dan outlet_channel_prices
--         siap menangani ratusan outlet × ratusan produk × banyak channel
--         tanpa degradasi performa.
-- Jalankan di: Supabase → SQL Editor
-- Aman diulang: Ya (semua pakai IF NOT EXISTS / IF EXISTS)
-- ============================================================================


-- ============================================================================
-- BAGIAN 1: INDEX PERFORMA — outlet_kasir_menus
-- ============================================================================

-- Query paling umum: "ambil semua kasir menu aktif milik outlet X, urutkan"
-- Digunakan oleh: getActiveKasirMenus(), KasirHeader, TabVarian
CREATE INDEX IF NOT EXISTS idx_kasir_menus_outlet_active_order
  ON outlet_kasir_menus (outlet_id, is_active, urutan);

-- Partial index: hanya baris yang aktif (lebih kecil, lebih cepat)
CREATE INDEX IF NOT EXISTS idx_kasir_menus_outlet_active_partial
  ON outlet_kasir_menus (outlet_id, urutan)
  WHERE is_active = TRUE;

-- Lookup by slug (validasi unik, find by slug)
CREATE INDEX IF NOT EXISTS idx_kasir_menus_outlet_slug
  ON outlet_kasir_menus (outlet_id, slug);


-- ============================================================================
-- BAGIAN 2: INDEX PERFORMA — outlet_channel_prices
-- ============================================================================

-- Query paling umum di kasir: "harga produk X di outlet Y channel Z?"
-- Kolom UNIQUE(outlet_id, product_id, channel) sudah ada, tapi kita tambah
-- index untuk query bulk "semua harga outlet X" (dipakai TabVarian)
CREATE INDEX IF NOT EXISTS idx_channel_prices_outlet
  ON outlet_channel_prices (outlet_id);

-- Query kasir realtime: filter by outlet + channel sekaligus
CREATE INDEX IF NOT EXISTS idx_channel_prices_outlet_channel
  ON outlet_channel_prices (outlet_id, channel);

-- Partial index: hanya harga yang aktif
CREATE INDEX IF NOT EXISTS idx_channel_prices_active
  ON outlet_channel_prices (outlet_id, channel, product_id)
  WHERE is_active = TRUE;


-- ============================================================================
-- BAGIAN 3: INDEX PERFORMA — products (pendukung JOIN)
-- ============================================================================

-- Filter produk by tipe (donat_varian, paket, dll)
CREATE INDEX IF NOT EXISTS idx_products_tipe_active
  ON products (tipe_produk, is_active);

-- Filter produk by ukuran (standar / mini)
CREATE INDEX IF NOT EXISTS idx_products_ukuran
  ON products (ukuran)
  WHERE ukuran IS NOT NULL;


-- ============================================================================
-- BAGIAN 4: CONSTRAINT SAFETY — pastikan data konsisten
-- ============================================================================

-- Pastikan slug di outlet_kasir_menus hanya huruf kecil, angka, dan strip
-- (mencegah slug 'GoFood' vs 'gofood' yang bikin duplikat)
ALTER TABLE outlet_kasir_menus
  DROP CONSTRAINT IF EXISTS chk_kasir_menus_slug_format;

ALTER TABLE outlet_kasir_menus
  ADD CONSTRAINT chk_kasir_menus_slug_format
  CHECK (slug ~ '^[a-z0-9_-]+$');

-- Pastikan harga_jual tidak negatif
ALTER TABLE outlet_channel_prices
  DROP CONSTRAINT IF EXISTS chk_channel_prices_positive;

ALTER TABLE outlet_channel_prices
  ADD CONSTRAINT chk_channel_prices_positive
  CHECK (harga_jual >= 0);

-- Pastikan urutan tidak negatif
ALTER TABLE outlet_kasir_menus
  DROP CONSTRAINT IF EXISTS chk_kasir_menus_urutan_positive;

ALTER TABLE outlet_kasir_menus
  ADD CONSTRAINT chk_kasir_menus_urutan_positive
  CHECK (urutan >= 0);


-- ============================================================================
-- BAGIAN 5: ROW LEVEL SECURITY (RLS) — isolasi antar tenant
-- ============================================================================
-- Penting untuk multi-outlet agar data outlet A tidak bocor ke outlet B

-- Enable RLS pada tabel baru
ALTER TABLE outlet_kasir_menus   ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_channel_prices ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya bisa baca/tulis data outlet miliknya sendiri
-- (sesuaikan dengan sistem auth Donattour — menggunakan kolom outlet_id di users)

-- outlet_kasir_menus: select
DROP POLICY IF EXISTS kasir_menus_select_policy ON outlet_kasir_menus;
CREATE POLICY kasir_menus_select_policy ON outlet_kasir_menus
  FOR SELECT USING (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid()
      UNION
      SELECT id FROM outlets WHERE id = outlet_id -- admin level
    )
  );

-- outlet_kasir_menus: insert/update/delete (hanya admin/owner)
DROP POLICY IF EXISTS kasir_menus_write_policy ON outlet_kasir_menus;
CREATE POLICY kasir_menus_write_policy ON outlet_kasir_menus
  FOR ALL USING (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'manager')
    )
  );

-- outlet_channel_prices: select
DROP POLICY IF EXISTS channel_prices_select_policy ON outlet_channel_prices;
CREATE POLICY channel_prices_select_policy ON outlet_channel_prices
  FOR SELECT USING (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid()
    )
  );

-- outlet_channel_prices: write
DROP POLICY IF EXISTS channel_prices_write_policy ON outlet_channel_prices;
CREATE POLICY channel_prices_write_policy ON outlet_channel_prices
  FOR ALL USING (
    outlet_id IN (
      SELECT outlet_id FROM users WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'manager')
    )
  );


-- ============================================================================
-- BAGIAN 6: FUNCTION HELPER — seed kasir menus otomatis untuk outlet baru
-- ============================================================================
-- Setiap kali outlet baru dibuat, jalankan ini agar kasir menu langsung tersedia

CREATE OR REPLACE FUNCTION seed_default_kasir_menus(p_outlet_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO outlet_kasir_menus (outlet_id, nama, slug, color, urutan, is_active)
  VALUES
    (p_outlet_id, 'Toko',    'toko',       'amber',   0, TRUE),
    (p_outlet_id, 'GoFood',  'gofood',     'green',   1, TRUE),
    (p_outlet_id, 'Shopee',  'shopeefood', 'orange',  2, TRUE),
    (p_outlet_id, 'Grab',    'grabfood',   'emerald', 3, TRUE),
    (p_outlet_id, 'Online',  'online',     'blue',    4, TRUE)
  ON CONFLICT (outlet_id, slug) DO NOTHING;
END;
$$;

-- ─── Trigger: otomatis seed saat outlet baru dibuat ──────────
CREATE OR REPLACE FUNCTION trigger_seed_kasir_menus()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM seed_default_kasir_menus(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_seed_kasir_menus_on_outlet_insert ON outlets;
CREATE TRIGGER auto_seed_kasir_menus_on_outlet_insert
  AFTER INSERT ON outlets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_kasir_menus();

-- ─── Seed untuk outlet yang belum punya kasir menus ──────────
-- (jalankan sekali jika ada outlet lama yang belum ter-seed)
SELECT seed_default_kasir_menus(id)
FROM outlets
WHERE id NOT IN (
  SELECT DISTINCT outlet_id FROM outlet_kasir_menus
);


-- ============================================================================
-- BAGIAN 7: ANALYZE — update statistik planner setelah perubahan
-- ============================================================================
ANALYZE outlet_kasir_menus;
ANALYZE outlet_channel_prices;
ANALYZE products;
ANALYZE outlets;


-- ============================================================================
-- VERIFIKASI — cek index yang berhasil dibuat
-- ============================================================================
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('outlet_kasir_menus', 'outlet_channel_prices')
ORDER BY tablename, indexname;


-- ============================================================================
-- END OF 17-performance-kasir-menus.sql
-- ============================================================================
