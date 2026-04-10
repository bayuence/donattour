-- File: 16-schema-kasir-menus.sql
-- Tujuan: Membuat tabel outlet_kasir_menus untuk mengelola
--         kanal menu kasir (Toko, GoFood, dll) secara dinamis per outlet.

-- ─── 1. Buat Tabel outlet_kasir_menus ────────────────────────
CREATE TABLE IF NOT EXISTS outlet_kasir_menus (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id   UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    nama        VARCHAR(100) NOT NULL,          -- Nama tampilan (misal: "GoFood")
    slug        VARCHAR(100) NOT NULL,          -- Identitas unik (misal: "gofood")
    color       VARCHAR(50) DEFAULT 'amber',    -- Warna tema tombol
    urutan      INT DEFAULT 0,                  -- Urutan tampil (0 = paling awal)
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, slug)
);

-- ─── 2. Trigger updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_outlet_kasir_menus_updated_at ON outlet_kasir_menus;
CREATE TRIGGER update_outlet_kasir_menus_updated_at
  BEFORE UPDATE ON outlet_kasir_menus
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. Seed Data Bawaan untuk Outlet yang Sudah Ada ─────────
-- Isi otomatis menu kasir bawaan untuk setiap outlet yang sudah ada.
INSERT INTO outlet_kasir_menus (outlet_id, nama, slug, color, urutan, is_active)
SELECT
    o.id,
    m.nama,
    m.slug,
    m.color,
    m.urutan,
    TRUE
FROM outlets o
CROSS JOIN (
    VALUES
        ('Toko',      'toko',       'amber',   0),
        ('GoFood',    'gofood',     'green',   1),
        ('Shopee',    'shopeefood', 'orange',  2),
        ('Grab',      'grabfood',   'emerald', 3),
        ('Online',    'online',     'blue',    4)
) AS m(nama, slug, color, urutan)
ON CONFLICT (outlet_id, slug) DO NOTHING;

-- ─── 4. Hapus batasan CHECK pada outlet_channel_prices ───────
-- Agar sistem bisa menerima slug kanal baru yang dibuat user.
ALTER TABLE outlet_channel_prices
  DROP CONSTRAINT IF EXISTS outlet_channel_prices_channel_check;
