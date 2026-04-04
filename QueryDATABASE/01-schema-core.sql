-- ============================================================================
-- DONATTOUR DATABASE - CORE SCHEMA
-- ============================================================================
-- File: 01-schema-core.sql
-- Description: Core tables untuk outlets, users, products
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: outlets
-- Description: Master data outlet/toko
-- ============================================================================
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL, -- "OUT-PUSAT", "OUT-MALL"
    alamat TEXT,
    telepon VARCHAR(50),
    pic_name VARCHAR(255), -- Person in Charge
    pic_phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'tutup', 'maintenance')),
    
    -- Operational Hours
    jam_buka TIME,
    jam_tutup TIME,
    hari_operasional JSONB, -- ["senin", "selasa", ...]
    
    -- Location (for maps)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- ============================================================================
-- TABLE: users
-- Description: User accounts (kasir, admin, owner, dll)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Hashed password
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Role & Permissions
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'admin', 
        'owner', 
        'cashier', 
        'production_manager', 
        'supervisor',
        'otr_driver',
        'kitchen_staff'
    )),
    
    -- Assignment
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    
    -- Metadata
    profile_picture_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- ============================================================================
-- TABLE: product_categories
-- Description: Kategori produk (Donat Classic, Premium, Minuman, dll)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL, -- "CAT-CLASSIC", "CAT-PREMIUM"
    deskripsi TEXT,
    icon VARCHAR(50), -- emoji atau icon name
    sort_order INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: products
-- Description: Master data produk
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL, -- "PROD-COKELAT-STD"
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    
    -- Product Info
    deskripsi TEXT,
    ukuran VARCHAR(20) CHECK (ukuran IN ('standar', 'mini')),
    
    -- Pricing
    harga_jual NUMERIC(12, 2) NOT NULL,
    harga_pokok_penjualan NUMERIC(12, 2), -- HPP / COGS
    
    -- Stock (Global - akan enhanced dengan per-outlet inventory)
    quantity_in_stock INT DEFAULT 0,
    reorder_level INT DEFAULT 10, -- Alert stok rendah
    
    -- Product Image
    image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- ============================================================================
-- TABLE: production_batches
-- Description: Batch produksi donat
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) UNIQUE NOT NULL, -- "BATCH-20260401-001"
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    
    -- Planning
    quantity_planned INT NOT NULL,
    quantity_produced INT DEFAULT 0,
    
    -- Product base (donat polos sebelum topping)
    product_base_type VARCHAR(50), -- "standar", "mini"
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN (
        'planned',
        'in_progress',
        'quality_check',
        'completed',
        'cancelled'
    )),
    
    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Cost Breakdown (untuk cost analysis)
    cost_breakdown JSONB, -- { "raw_materials": 100000, "labor": 50000, ... }
    
    -- Personnel
    production_manager_id UUID REFERENCES users(id),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: transactions
-- Description: Transaksi penjualan (outlet & OTR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(100) UNIQUE NOT NULL, -- "TRX-20260401-001"
    
    -- Location & Personnel
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    kasir_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Transaction Type
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('outlet', 'otr')),
    
    -- OTR Reference (if applicable)
    otr_session_id UUID, -- Reference ke otr_sessions
    
    -- Customer (optional - untuk loyalty)
    customer_id UUID, -- Will be created later in customer table
    
    -- Payment
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'qris', 'transfer', 'e-wallet')),
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2),
    change_amount NUMERIC(12, 2) DEFAULT 0,
    
    -- Discount/Promo (optional)
    promo_id UUID, -- Will be created later
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: transaction_items
-- Description: Item detail dalam transaksi
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    quantity INT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: expenses
-- Description: Pengeluaran outlet (bahan baku, operasional, dll)
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    
    -- Expense Info
    kategori VARCHAR(100) NOT NULL, -- "Bahan Baku", "Operasional", "Gaji", dll
    keterangan TEXT NOT NULL,
    jumlah NUMERIC(12, 2) NOT NULL,
    
    -- Date & Personnel
    tanggal DATE NOT NULL,
    recorded_by_user_id UUID REFERENCES users(id),
    
    -- Approval (optional)
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Receipt/Evidence
    receipt_url TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: attendance
-- Description: Presensi karyawan
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    
    -- Attendance Info
    tanggal DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('hadir', 'izin', 'sakit', 'alpha', 'cuti')),
    
    -- Location (GPS saat check-in)
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, tanggal)
);

-- ============================================================================
-- INDEXES untuk Performance
-- ============================================================================
CREATE INDEX idx_users_outlet_id ON users(outlet_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_transactions_outlet_id ON transactions(outlet_id);
CREATE INDEX idx_transactions_kasir_id ON transactions(kasir_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product_id ON transaction_items(product_id);
CREATE INDEX idx_expenses_outlet_id ON expenses(outlet_id);
CREATE INDEX idx_expenses_tanggal ON expenses(tanggal);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_tanggal ON attendance(tanggal);
CREATE INDEX idx_production_batches_outlet_id ON production_batches(outlet_id);
CREATE INDEX idx_production_batches_status ON production_batches(status);

-- ============================================================================
-- TRIGGERS untuk updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_outlets_updated_at BEFORE UPDATE ON outlets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE outlets IS 'Master data outlet/toko fisik';
COMMENT ON TABLE users IS 'User accounts dengan role-based access';
COMMENT ON TABLE products IS 'Master data produk donat dan minuman';
COMMENT ON TABLE transactions IS 'Transaksi penjualan outlet dan OTR';
COMMENT ON TABLE expenses IS 'Pengeluaran operasional per outlet';
COMMENT ON TABLE attendance IS 'Presensi karyawan';

-- ============================================================================
-- END OF 01-schema-core.sql
-- ============================================================================
