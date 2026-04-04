-- ============================================================================
-- SCRIPT SUNTIK DATA DEMO (PRODUK & KATEGORI)
-- File: insert-demo-products.sql
-- ============================================================================
-- Menjalankan ini akan mengisi Supabase Anda dengan data persis seperti
-- yang ada di halaman "Kelola Produk" Anda sebelumnya!

-- 1. Kosongkan Data Lama (Hanya jika perlu, untuk menghindari tumpuk data)
-- DELETE FROM products;
-- DELETE FROM product_categories;

-- ============================================================================
-- 2. Memasukkan Kategori (Jenis Donat)
-- ============================================================================
INSERT INTO product_categories (id, nama, kode)
VALUES 
  ('00000000-0000-0000-0000-000000000010', 'Donat Klasik', 'CAT-KLASIK'),
  ('00000000-0000-0000-0000-000000000011', 'Donat Reguler', 'CAT-REGULER'),
  ('00000000-0000-0000-0000-000000000012', 'Donat Premium', 'CAT-PREMIUM')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Memasukkan Bahan Mentah (Donat Polos) - JIT SYSTEM
-- ============================================================================
INSERT INTO products (id, nama, kode, harga_jual, quantity_in_stock, reorder_level, tipe_produk)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Donat Polos Standar', 'BASE-STD', 1500, 1000, 100, 'donat_base'),
  ('00000000-0000-0000-0000-000000000002', 'Donat Polos Mini', 'BASE-MINI', 800, 1000, 100, 'donat_base')
ON CONFLICT (kode) DO NOTHING;

-- ============================================================================
-- 4. Memasukkan Varian Donat & Menyambungkannya ke Donat Polos!
-- ============================================================================
INSERT INTO products (nama, kode, category_id, harga_jual, quantity_in_stock, reorder_level, tipe_produk, base_product_id)
VALUES 
  -- --- KLASIK ---
  ('Donat Gula', 'VAR-GL-STD', '00000000-0000-0000-0000-000000000010', 3000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Meses', 'VAR-MS-STD', '00000000-0000-0000-0000-000000000010', 3000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Gula Halus', 'VAR-GH-STD', '00000000-0000-0000-0000-000000000010', 3000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  
  -- --- REGULER ---
  ('Donat Cokelat Ceres', 'VAR-CC-STD', '00000000-0000-0000-0000-000000000011', 5000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Tiramisu', 'VAR-TR-STD', '00000000-0000-0000-0000-000000000011', 5000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Strawberry', 'VAR-ST-STD', '00000000-0000-0000-0000-000000000011', 5000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Keju', 'VAR-KJ-STD', '00000000-0000-0000-0000-000000000011', 5000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  
  -- --- PREMIUM ---
  ('Donat Vanila Lotus', 'VAR-VL-STD', '00000000-0000-0000-0000-000000000012', 8000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Matcha', 'VAR-MT-STD', '00000000-0000-0000-0000-000000000012', 8000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  ('Donat Red Velvet', 'VAR-RV-STD', '00000000-0000-0000-0000-000000000012', 8000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000001'),
  
  -- === UKURAN MINI (Disambungkan ke Donat Polos Mini) ===
  ('Mini Gula', 'VAR-GL-MINI', '00000000-0000-0000-0000-000000000010', 1500, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000002'),
  ('Mini Keju', 'VAR-KJ-MINI', '00000000-0000-0000-0000-000000000011', 2500, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000002'),
  ('Mini Matcha', 'VAR-MT-MINI', '00000000-0000-0000-0000-000000000012', 4000, 0, 10, 'donat_varian', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (kode) DO NOTHING;
