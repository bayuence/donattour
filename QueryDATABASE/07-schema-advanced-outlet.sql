-- ============================================================================
-- DONATTOUR DATABASE - ADVANCED OUTLET SCHEMA
-- ============================================================================
-- File: 07-schema-advanced-outlet.sql
-- Description: Tabel tambahan untuk mengontrol outlet secara detail
-- ============================================================================

-- ============================================================================
-- TABLE: receipt_settings
-- Description: Pengaturan struk/receipt per outlet
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_settings (
    outlet_id UUID PRIMARY KEY REFERENCES outlets(id) ON DELETE CASCADE,
    
    header_text TEXT, -- Nama toko/brand di struk (default: "DONATTOUR")
    address_text TEXT, -- Alamat di struk (default ambil dari outlets.alamat)
    footer_text TEXT, -- Pesan bawah struk (default: "Terima kasih atas kunjungan Anda")
    
    logo_url TEXT, -- URL logo untuk diprint
    show_logo BOOLEAN DEFAULT true,
    
    -- Info tambahan (opsional)
    tax_info TEXT, -- NPWP atau info pajak
    wifi_password TEXT, -- Info wifi untuk pengunjung
    social_media TEXT, -- Info IG/Tiktok
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: outlet_products
-- Description: Pengaturan produk mana yang aktif di outlet mana beserta harganya
-- ============================================================================
CREATE TABLE IF NOT EXISTS outlet_products (
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    is_active BOOLEAN DEFAULT true, -- Apakah produk ini dijual di outlet ini?
    custom_price NUMERIC(12, 2), -- Null jika mengikuti harga default dari tabel products
    
    -- Stok realtime (jika menggunakan simple inventory, tidak pakai inventory_items detail)
    current_stock INT DEFAULT 0,
    daily_quota INT, -- Kuota harian batas stok
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (outlet_id, product_id)
);

-- Trigger untuk updated_at
CREATE TRIGGER update_receipt_settings_updated_at BEFORE UPDATE ON receipt_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlet_products_updated_at BEFORE UPDATE ON outlet_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE receipt_settings IS 'Pengaturan tampilan struk kasir per outlet';
COMMENT ON TABLE outlet_products IS 'Pemetaan ketersediaan produk dan custom harga per outlet';
