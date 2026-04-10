-- ============================================================================
-- DONATTOUR DATABASE - KEAMANAN PUBLIK UNTUK KASIR MENU
-- ============================================================================
-- File: 20-allow-public-kasir-menus.sql
-- Tujuan: Memungkinkan penambahan/pengeditan Kasir Menu (Omnichannel)
--         secara publik tanpa login yang ketat (untuk testing & dev).
-- ============================================================================

-- 1. Berikan hak akses dasar ke role anonim
GRANT ALL ON TABLE outlet_kasir_menus TO anon;
GRANT ALL ON TABLE outlet_kasir_menus TO authenticated;

-- 2. Tambahkan policy All Access (Public)
-- Menghapus policy lama yang memblokir akses jika tidak ada auth.uid()
DROP POLICY IF EXISTS kasir_menus_select_policy ON outlet_kasir_menus;
DROP POLICY IF EXISTS kasir_menus_write_policy ON outlet_kasir_menus;

-- Policy baru: Siapapun bisa baca (SELECT)
CREATE POLICY public_select_kasir_menus ON outlet_kasir_menus
  FOR SELECT USING (true);

-- Policy baru: Siapapun bisa modifikasi (ALL: Insert, Update, Delete)
CREATE POLICY public_all_kasir_menus ON outlet_kasir_menus
  FOR ALL USING (true);

-- Selesai

