-- ============================================================================
-- DONATTOUR DATABASE - PAYMENT METHODS MIGRATION
-- ============================================================================
-- File: 15-payment-methods-migration.sql
-- Description: Setup tabel orders & expand payment methods
-- Version: 2.0 (Fixed - safe to run)
-- Date: 2026-04-06
-- ============================================================================
-- JALANKAN DI SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- STEP 1: Buat tabel orders jika belum ada
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE,

    -- Location & Personnel
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    kasir_id UUID REFERENCES users(id),
    kasir_name VARCHAR(100),

    -- Customer
    customer_name VARCHAR(255) DEFAULT 'Umum',
    customer_phone VARCHAR(50),

    -- Channel (toko, gofood, dll)
    channel VARCHAR(50) DEFAULT 'toko',

    -- Payment
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_detail JSONB DEFAULT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2),
    change_amount NUMERIC(12, 2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'completed',

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 2: Buat tabel order_items jika belum ada
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 3: Tambah kolom baru ke orders (aman jika sudah ada)
-- ============================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kasir_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_detail JSONB DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'toko';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- STEP 4: Drop constraint payment_method lama & buat baru yang lengkap
-- ============================================================================
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'cash',
    'qris',
    'transfer',
    'gopay',
    'ovo',
    'dana',
    'shopeepay',
    'card',
    'mobile_money',
    'e-wallet'
  ));

-- ============================================================================
-- STEP 5: Index untuk performa query
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================================
-- STEP 6: Trigger updated_at (aman jika sudah ada fungsinya)
-- ============================================================================
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: RLS — allow semua untuk sekarang (sesuaikan nanti)
-- ============================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all orders" ON orders;
CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all order_items" ON order_items;
CREATE POLICY "Allow all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- SELESAI — cek hasilnya:
-- SELECT * FROM orders LIMIT 5;
-- ============================================================================
