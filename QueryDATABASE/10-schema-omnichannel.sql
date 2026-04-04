-- ============================================================================
-- DONATTOUR DATABASE - OMNICHANNEL & HYBRID INVENTORY
-- ============================================================================
-- File: 10-schema-omnichannel.sql
-- Description: Menambahkan struktur pondasi untuk harga multi-platform 
--              dan manajemen stok berjenjang (Polos vs Topping).
-- ============================================================================

-- 1. Modifikasi Tabel `products`
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tipe_produk VARCHAR(50) DEFAULT 'donat_varian' 
CHECK (tipe_produk IN ('donat_base', 'donat_varian', 'minuman', 'cemilan', 'paket'));

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS base_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

COMMENT ON COLUMN products.tipe_produk IS 'Membedakan bahan baku polos dengan barang jadi ber-topping.';
COMMENT ON COLUMN products.base_product_id IS 'Khusus donat varian, ini menunjuk asal-usul (Donat Polos)-nya untuk dipotong saat transaksi selesai.';

-- ============================================================================
-- 2. Tabel `outlet_channel_prices` (Custom Pricing per Outlet & Platform)
-- ============================================================================
CREATE TABLE IF NOT EXISTS outlet_channel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('toko', 'otr', 'gofood', 'shopeefood', 'grabfood')),
    
    harga_jual NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE, -- Untuk on/off menu secara instan per channel
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(outlet_id, product_id, channel)
);

CREATE TRIGGER update_outlet_channel_prices_updated_at BEFORE UPDATE ON outlet_channel_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Tabel `inventory_locations` (Manik-Gudang)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL, -- "Gudang Utama Toko", "Bagasi Mobil L300", dll.
    tipe VARCHAR(50) DEFAULT 'toko' CHECK (tipe IN ('toko', 'otr')),
    
    dikepalai_oleh UUID REFERENCES users(id) ON DELETE SET NULL, -- Siapa supir OTR atau Manajer tokonya
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(outlet_id, nama)
);

CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Tabel `stocks` (Penghitung Aktual)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    quantity INT DEFAULT 0,
    
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(location_id, product_id)
);
