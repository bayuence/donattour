-- ============================================================================
-- DONATTOUR DATABASE - PERBAIKAN TOTAL STORAGE & HARGA KANAL
-- ============================================================================
-- File: 18-storage-bucket-and-fixes.sql
-- Tujuan:
-- 1. Membuat Bucket "products" & Akses Public
-- 2. Membuka RLS untuk Akses Anonim (Dev Mode)
-- 3. MENGHAPUS SEMUA PEMBATASAN (CHECK CONSTRAINT) KANAL KASIR
-- ============================================================================

-- ─── 1. Storage Bucket & Policies ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow Public Access" ON storage.objects;
CREATE POLICY "Allow Public Access" ON storage.objects FOR ALL USING (bucket_id = 'products') WITH CHECK (bucket_id = 'products');

-- ─── 2. Table RLS (Hapus Semua Blokir Keamanan) ──────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow Public Access" ON products;
CREATE POLICY "Allow Public Access" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE outlet_channel_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow Public Access" ON outlet_channel_prices;
CREATE POLICY "Allow Public Access" ON outlet_channel_prices FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. PENGHANCUR PEMBATASAN KANAL (AGRESIF) ───────────────────────────────
-- Bagian ini akan mencari semua 'Check Constraint' yang menghalangi nama-nama
-- kanal baru seperti 'online', 'gofood', dll, lalu menghapusnya otomatis.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Cari semua constraint bertipe 'Check' di tabel outlet_channel_prices 
    -- yang isinya mengandung kata 'channel'
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'outlet_channel_prices'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) ILIKE '%channel%'
    ) LOOP
        EXECUTE 'ALTER TABLE outlet_channel_prices DROP CONSTRAINT ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Pastikan juga tabel outlet_kasir_menus tidak memblokir slug baru
ALTER TABLE outlet_kasir_menus DROP CONSTRAINT IF EXISTS chk_kasir_menus_slug_format;
