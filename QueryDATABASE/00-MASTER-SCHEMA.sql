-- ============================================================================
-- DONATTOUR POS SYSTEM - MASTER SCHEMA
-- ============================================================================
-- File: 00-MASTER-SCHEMA.sql
-- Description: Complete database schema - semua tabel penting dalam 1 file
-- Version: 1.0
-- Date: 2026-04-30
-- Author: Kiro AI
-- 
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy paste SELURUH isi file ini
-- 3. Klik "Run"
-- 4. Tunggu sampai selesai
-- 
-- CATATAN:
-- - File ini menggabungkan semua schema penting dari file 01-30
-- - Aman dijalankan berkali-kali (menggunakan IF NOT EXISTS)
-- - Sudah include Midtrans integration & indexes
-- ============================================================================

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. OUTLETS
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    alamat TEXT,
    telepon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (Karyawan/Kasir)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    pin VARCHAR(6),
    role VARCHAR(50) DEFAULT 'kasir', -- 'admin', 'kasir', 'manager'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS (Master Produk)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES product_categories(id),
    base_product_id UUID REFERENCES products(id), -- Untuk varian
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(100) UNIQUE,
    deskripsi TEXT,
    ukuran VARCHAR(50), -- 'standar', 'mini'
    tipe_produk VARCHAR(50), -- 'donat_varian', 'tambahan', 'biaya_ekstra'
    harga_jual DECIMAL(15,2) DEFAULT 0,
    hpp DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCT BOXES (Kemasan)
CREATE TABLE IF NOT EXISTS product_boxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kapasitas INTEGER NOT NULL,
    peruntukan VARCHAR(50) DEFAULT 'universal', -- 'standar', 'mini', 'universal'
    harga_box DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCT PACKAGES (Paket Fixed)
CREATE TABLE IF NOT EXISTS product_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(100),
    kapasitas INTEGER NOT NULL,
    box_id UUID REFERENCES product_boxes(id),
    harga_paket DECIMAL(15,2) NOT NULL,
    diskon_nominal DECIMAL(15,2) DEFAULT 0,
    diskon_persen DECIMAL(5,2) DEFAULT 0,
    channel_prices JSONB, -- Harga per channel
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRODUCT BUNDLING (Bundling Spesifik)
CREATE TABLE IF NOT EXISTS product_bundling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    harga_bundling DECIMAL(15,2) NOT NULL,
    items JSONB, -- Array of {product_id, quantity}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PRODUCT CUSTOM TEMPLATES (Custom Order)
CREATE TABLE IF NOT EXISTS product_custom_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(100),
    kapasitas INTEGER NOT NULL,
    ukuran_donat VARCHAR(50) DEFAULT 'standar',
    harga_satuan_default DECIMAL(15,2) NOT NULL,
    harga_klasik_full DECIMAL(15,2),
    harga_reguler_full DECIMAL(15,2),
    harga_premium_full DECIMAL(15,2),
    harga_mix DECIMAL(15,2),
    diskon_nominal DECIMAL(15,2) DEFAULT 0,
    diskon_persen DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CUSTOM MODE CONFIG (Flexible Pricing)
CREATE TABLE IF NOT EXISTS custom_mode_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_template_id UUID REFERENCES product_custom_templates(id) ON DELETE CASCADE,
    mode_name VARCHAR(100) NOT NULL, -- 'klasik', 'reguler', 'premium', 'mix'
    mode_label VARCHAR(255), -- Label untuk display
    harga DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(custom_template_id, mode_name)
);

-- 10. ORDERS (Transaksi)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id),
    kasir_id UUID REFERENCES users(id),
    kasir_name VARCHAR(255), -- Denormalized untuk performa
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    channel VARCHAR(50) DEFAULT 'toko', -- 'toko', 'gofood', 'grabfood', 'shopee', 'tiktok'
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash', -- 'cash', 'qris', 'gopay', dll
    payment_method_detail VARCHAR(255), -- Detail lengkap: "QRIS (GoPay)", "BCA Virtual Account"
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    paid_amount DECIMAL(15,2) DEFAULT 0,
    change_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    
    -- Midtrans Integration
    midtrans_order_id VARCHAR(255),
    midtrans_transaction_id VARCHAR(255),
    payment_type VARCHAR(100), -- 'qris', 'gopay', 'bank_transfer', dll
    
    -- Additional data
    items_detail JSONB, -- Backup detail items
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ORDER ITEMS (Detail Transaksi)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255), -- Fallback jika product dihapus
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. OUTLET CHANNEL PRICES (Harga per Channel per Outlet)
CREATE TABLE IF NOT EXISTS outlet_channel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'toko', 'gofood', 'grabfood', dll
    harga_jual DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, product_id, channel)
);

-- 13. KASIR MENUS (Menu Kasir per Outlet)
CREATE TABLE IF NOT EXISTS kasir_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL, -- 'toko', 'gofood', dll
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    color VARCHAR(50) DEFAULT 'amber',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, slug)
);

-- 14. PRODUCTION BATCHES (Batch Produksi)
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity_produced INTEGER NOT NULL,
    production_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'sold_out'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. INVENTORY (Stok Real-time)
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, product_id)
);

-- ============================================================================
-- INDEXES (Performance Optimization)
-- ============================================================================

-- Orders indexes (CRITICAL!)
CREATE INDEX IF NOT EXISTS idx_orders_kasir_id ON orders(kasir_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_created ON orders(outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_midtrans_order_id ON orders(midtrans_order_id);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_tipe_produk ON products(tipe_produk);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(is_active, category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_base_product_id ON products(base_product_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_outlet_id ON users(outlet_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_outlet_active ON users(outlet_id, is_active) WHERE is_active = true;

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_outlet_product ON inventory(outlet_id, product_id);

-- Production batches indexes
CREATE INDEX IF NOT EXISTS idx_production_outlet_date ON production_batches(outlet_id, production_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_mode_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasir_menus ENABLE ROW LEVEL SECURITY;

-- Public read policies (untuk authenticated users)
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON outlets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON product_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON product_boxes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON product_packages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON product_bundling FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON product_custom_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON custom_mode_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow read access to all authenticated users" ON kasir_menus FOR SELECT USING (true); -- Public read

-- Write policies (untuk authenticated users)
CREATE POLICY IF NOT EXISTS "Allow insert for authenticated users" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow insert for authenticated users" ON order_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow update for authenticated users" ON orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow update for authenticated users" ON inventory FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_outlets_updated_at ON outlets;
CREATE TRIGGER update_outlets_updated_at BEFORE UPDATE ON outlets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (DEMO DATA - Optional, comment jika tidak perlu)
-- ============================================================================

-- Insert default product categories
INSERT INTO product_categories (id, nama, kode, is_active) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Donat Klasik', 'CAT-KLASIK', true),
  ('00000000-0000-0000-0000-000000000011', 'Donat Reguler', 'CAT-REGULER', true),
  ('00000000-0000-0000-0000-000000000012', 'Donat Premium', 'CAT-PREMIUM', true)
ON CONFLICT (id) DO NOTHING;

-- Insert base products (Donat Polos)
INSERT INTO products (id, nama, kode, harga_jual, tipe_produk, is_active) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Donat Polos Standar', 'BASE-STD', 1500, 'donat_base', true),
  ('00000000-0000-0000-0000-000000000002', 'Donat Polos Mini', 'BASE-MINI', 800, 'donat_base', true)
ON CONFLICT (kode) DO NOTHING;

-- Insert product variants (Donat dengan topping)
INSERT INTO products (nama, kode, category_id, harga_jual, tipe_produk, base_product_id, ukuran, is_active) VALUES 
  -- KLASIK (Standar)
  ('Donat Gula', 'VAR-GL-STD', '00000000-0000-0000-0000-000000000010', 3000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Meses', 'VAR-MS-STD', '00000000-0000-0000-0000-000000000010', 3000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Gula Halus', 'VAR-GH-STD', '00000000-0000-0000-0000-000000000010', 3000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  
  -- REGULER (Standar)
  ('Donat Cokelat Ceres', 'VAR-CC-STD', '00000000-0000-0000-0000-000000000011', 5000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Tiramisu', 'VAR-TR-STD', '00000000-0000-0000-0000-000000000011', 5000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Strawberry', 'VAR-ST-STD', '00000000-0000-0000-0000-000000000011', 5000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Keju', 'VAR-KJ-STD', '00000000-0000-0000-0000-000000000011', 5000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  
  -- PREMIUM (Standar)
  ('Donat Vanila Lotus', 'VAR-VL-STD', '00000000-0000-0000-0000-000000000012', 8000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Matcha', 'VAR-MT-STD', '00000000-0000-0000-0000-000000000012', 8000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  ('Donat Red Velvet', 'VAR-RV-STD', '00000000-0000-0000-0000-000000000012', 8000, 'donat_varian', '00000000-0000-0000-0000-000000000001', 'standar', true),
  
  -- MINI VARIANTS
  ('Mini Gula', 'VAR-GL-MINI', '00000000-0000-0000-0000-000000000010', 1500, 'donat_varian', '00000000-0000-0000-0000-000000000002', 'mini', true),
  ('Mini Keju', 'VAR-KJ-MINI', '00000000-0000-0000-0000-000000000011', 2500, 'donat_varian', '00000000-0000-0000-0000-000000000002', 'mini', true),
  ('Mini Matcha', 'VAR-MT-MINI', '00000000-0000-0000-0000-000000000012', 4000, 'donat_varian', '00000000-0000-0000-0000-000000000002', 'mini', true)
ON CONFLICT (kode) DO NOTHING;

-- Insert default admin user (GANTI PASSWORD SETELAH LOGIN!)
INSERT INTO users (name, email, pin, role, is_active) VALUES
  ('Admin Donattour', 'admin@donattour.com', '1234', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MASTER SCHEMA BERHASIL DIJALANKAN!';
    RAISE NOTICE '📊 Total tables: %', table_count;
    RAISE NOTICE '📊 Total custom indexes: %', index_count;
    RAISE NOTICE '⚡ Database ready untuk production!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SELESAI!
-- ============================================================================
