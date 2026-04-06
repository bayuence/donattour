-- ============================================================================
-- SCRIPT: KELOLA PRODUK ADVANCED (BOX, PAKET, BUNDLING, ADD-ONS)
-- File: 12-schema-advanced-products.sql
-- ============================================================================

-- 1. Tabel Master Box (Isi 1, 3, 6, 12, dll)
CREATE TABLE IF NOT EXISTS product_boxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL, -- "Box Isi 1", "Box Isi 6"
    kapasitas INT NOT NULL,     -- 1, 3, 6, 12
    harga_box NUMERIC(12, 2) DEFAULT 0, -- Harga jual box jika tidak gratis
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Master Paket (Fixed Price / Promo)
-- Contoh: Paket Klasik Isi 3 (Harganya dipatok, isi harus jenis yang sama)
CREATE TABLE IF NOT EXISTS product_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    box_id UUID REFERENCES product_boxes(id) ON DELETE CASCADE,
    harga_paket NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Master Bundling (Kombinasi Spesifik)
-- Contoh: Bundling Valentine (1 Box 6 + 1 Minuman)
CREATE TABLE IF NOT EXISTS product_bundling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    pilihan_item TEXT, -- JSON/Text deskripsi item dalam bundling
    harga_normal NUMERIC(12, 2),
    harga_bundling NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Custom Package Templates
-- Contoh: Custom Isi 6 (Bisa bebas pilih rasa)
CREATE TABLE IF NOT EXISTS product_custom_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kapasitas INT NOT NULL,
    ukuran_donat VARCHAR(20) CHECK (ukuran_donat IN ('standar', 'mini')),
    
    -- Harga default per kategori jika isi "campur"
    harga_satuan_default NUMERIC(12, 2),
    harga_klasik_full NUMERIC(12, 2),
    harga_reguler_full NUMERIC(12, 2),
    harga_premium_full NUMERIC(12, 2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Add-ons / Tambahan (Pita, Lilin, Lilin Angka, dll)
-- Kita bisa gunakan tabel products dengan tipe khusus atau tabel terpisah.
-- Mengingat Add-ons punya stok, lebih baik masuk ke products dengan tipe 'tambahan'.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tipe_produk_check;
ALTER TABLE products ADD CONSTRAINT products_tipe_produk_check 
    CHECK (tipe_produk IN ('donat_base', 'donat_varian', 'tambahan', 'box', 'paket', 'bundling', 'biaya_ekstra'));

-- 6. Tabel Histori Stok (Audit Log)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('in', 'out', 'sale', 'waste', 'transfer')),
    quantity INT NOT NULL,
    reference_id UUID, -- Bisa ID Transaksi atau ID Produksi
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Function untuk Update Stok Aman (RPC)
CREATE OR REPLACE FUNCTION update_stock_quantity(
    p_location_id UUID,
    p_product_id UUID,
    p_quantity_change INT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO stocks (location_id, product_id, quantity)
    VALUES (p_location_id, p_product_id, p_quantity_change)
    ON CONFLICT (location_id, product_id)
    DO UPDATE SET 
        quantity = stocks.quantity + p_quantity_change,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 8. Tabel Konfigurasi Produksi Outlet (Harga Polos per Outlet)
CREATE TABLE IF NOT EXISTS outlet_production_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    
    -- Biaya Produksi Polos (HPP Dasar)
    cost_polos_standar NUMERIC(12, 2) DEFAULT 1500,
    cost_polos_mini NUMERIC(12, 2) DEFAULT 800,
    
    UNIQUE(outlet_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SUNTIK DATA AWAL (BERDASARKAN MOCK DATA SEBELUMNYA)
-- ============================================================================

INSERT INTO product_boxes (nama, kapasitas, harga_box)
VALUES 
    ('Box Isi 1', 1, 0),
    ('Box Isi 3', 3, 0),
    ('Box Isi 6', 6, 0)
ON CONFLICT DO NOTHING;

INSERT INTO product_custom_templates (nama, kapasitas, ukuran_donat, harga_satuan_default, harga_klasik_full, harga_reguler_full, harga_premium_full)
VALUES 
    ('Custom Isi 3', 3, 'standar', 3000, 8000, 13000, 22000),
    ('Custom Isi 6', 6, 'standar', 3000, 15000, 25000, 42000),
    ('Custom Mini Isi 12', 12, 'mini', 1500, 15000, 25000, 42000)
ON CONFLICT DO NOTHING;
