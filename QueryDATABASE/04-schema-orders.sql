-- ============================================================================
-- DONATTOUR DATABASE - ORDER MANAGEMENT SCHEMA (OUTLET)
-- ============================================================================
-- File: 04-schema-orders.sql
-- Description: Sistem order management untuk outlet (made-to-order)
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- ============================================================================
-- TABLE: orders
-- Description: Order pelanggan di outlet (made-to-order workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL, -- "ORDER-001", "ORDER-002"
    
    -- Location & Personnel
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    kasir_id UUID NOT NULL REFERENCES users(id),
    
    -- Customer Info (optional)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Order Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Baru dipesan, waiting dapur
        'processing',   -- Sedang dikerjakan dapur
        'ready',        -- Siap diambil customer
        'completed',    -- Customer sudah bayar & ambil
        'cancelled'     -- Cancelled
    )),
    
    -- Payment
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'qris', 'transfer', 'e-wallet')),
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2),
    change_amount NUMERIC(12, 2) DEFAULT 0,
    
    -- Timestamps
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP,
    ready_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Estimated waiting time (minutes)
    estimated_waiting_time INT DEFAULT 5,
    actual_waiting_time INT, -- Calculated: ready_at - ordered_at
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: order_items
-- Description: Detail items dalam order
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Product Info
    donat_base VARCHAR(50), -- "standar", "mini"
    topping VARCHAR(100) NOT NULL, -- "Cokelat", "Strawberry", "Vanilla", dll
    quantity INT NOT NULL,
    
    -- Price
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    
    -- Status (untuk tracking individual item)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready', 'completed')),
    
    -- Special request
    special_request TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: kasir_sessions
-- Description: Shift kasir (opening & closing till)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kasir_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kasir_id UUID NOT NULL REFERENCES users(id),
    outlet_id UUID NOT NULL REFERENCES outlets(id),
    
    -- Session Time
    shift_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    shift_end TIMESTAMP,
    
    -- Till Management (Kas)
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Kas awal shift
    closing_balance NUMERIC(12, 2), -- Kas akhir shift
    expected_balance NUMERIC(12, 2), -- Expected dari transaksi
    difference NUMERIC(12, 2), -- Selisih (closing - expected)
    
    -- Summary
    total_transactions INT DEFAULT 0,
    total_sales NUMERIC(12, 2) DEFAULT 0,
    total_cash_received NUMERIC(12, 2) DEFAULT 0,
    total_non_cash NUMERIC(12, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'break', 'ended')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: kitchen_display_queue
-- Description: Queue untuk display dapur (KDS - Kitchen Display System)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kitchen_display_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id),
    
    -- Queue Info
    queue_number INT NOT NULL, -- Nomor antrian: 1, 2, 3, ...
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
    
    -- Personnel (siapa yang handle)
    assigned_to_user_id UUID REFERENCES users(id),
    
    -- Timestamps
    entered_queue_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    notes TEXT
);

-- ============================================================================
-- INDEXES untuk Performance
-- ============================================================================
CREATE INDEX idx_orders_outlet_id ON orders(outlet_id);
CREATE INDEX idx_orders_kasir_id ON orders(kasir_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);

CREATE INDEX idx_kasir_sessions_kasir_id ON kasir_sessions(kasir_id);
CREATE INDEX idx_kasir_sessions_outlet_id ON kasir_sessions(outlet_id);
CREATE INDEX idx_kasir_sessions_shift_start ON kasir_sessions(shift_start);
CREATE INDEX idx_kasir_sessions_status ON kasir_sessions(status);

CREATE INDEX idx_kitchen_display_queue_order_id ON kitchen_display_queue(order_id);
CREATE INDEX idx_kitchen_display_queue_outlet_id ON kitchen_display_queue(outlet_id);
CREATE INDEX idx_kitchen_display_queue_status ON kitchen_display_queue(status);
CREATE INDEX idx_kitchen_display_queue_queue_number ON kitchen_display_queue(queue_number);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate order_number saat create order
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    max_num INT;
    new_order_number VARCHAR(100);
BEGIN
    -- Get max order number untuk hari ini
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INT)), 0)
    INTO max_num
    FROM orders
    WHERE DATE(ordered_at) = CURRENT_DATE;
    
    -- Generate new order number
    new_order_number := 'ORDER-' || LPAD((max_num + 1)::TEXT, 3, '0');
    NEW.order_number := new_order_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_order_number();

-- Trigger: Auto-add to kitchen display queue saat order dibuat
CREATE OR REPLACE FUNCTION add_to_kitchen_queue()
RETURNS TRIGGER AS $$
DECLARE
    max_queue INT;
BEGIN
    IF NEW.status = 'pending' THEN
        -- Get max queue number untuk outlet hari ini
        SELECT COALESCE(MAX(queue_number), 0)
        INTO max_queue
        FROM kitchen_display_queue
        WHERE outlet_id = NEW.outlet_id 
        AND DATE(entered_queue_at) = CURRENT_DATE;
        
        -- Insert to kitchen queue
        INSERT INTO kitchen_display_queue (
            order_id,
            outlet_id,
            queue_number,
            status
        ) VALUES (
            NEW.id,
            NEW.outlet_id,
            max_queue + 1,
            'waiting'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_to_kitchen_queue
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION add_to_kitchen_queue();

-- Trigger: Calculate actual waiting time saat order ready
CREATE OR REPLACE FUNCTION calculate_waiting_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
        NEW.actual_waiting_time := EXTRACT(EPOCH FROM (NEW.ready_at - NEW.ordered_at)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_waiting_time
BEFORE UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'ready' AND OLD.status != 'ready')
EXECUTE FUNCTION calculate_waiting_time();

-- Trigger: Update kasir session summary
CREATE OR REPLACE FUNCTION update_kasir_session_summary()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE kasir_sessions ks
    SET 
        total_transactions = (
            SELECT COUNT(*) 
            FROM orders o 
            WHERE o.kasir_id = ks.kasir_id 
            AND o.created_at BETWEEN ks.shift_start AND COALESCE(ks.shift_end, CURRENT_TIMESTAMP)
            AND o.status = 'completed'
        ),
        total_sales = (
            SELECT COALESCE(SUM(o.total_amount), 0)
            FROM orders o 
            WHERE o.kasir_id = ks.kasir_id 
            AND o.created_at BETWEEN ks.shift_start AND COALESCE(ks.shift_end, CURRENT_TIMESTAMP)
            AND o.status = 'completed'
        ),
        total_cash_received = (
            SELECT COALESCE(SUM(o.total_amount), 0)
            FROM orders o 
            WHERE o.kasir_id = ks.kasir_id 
            AND o.created_at BETWEEN ks.shift_start AND COALESCE(ks.shift_end, CURRENT_TIMESTAMP)
            AND o.status = 'completed'
            AND o.payment_method = 'cash'
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ks.kasir_id = NEW.kasir_id
    AND ks.status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kasir_session
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_kasir_session_summary();

-- Trigger: updated_at
CREATE TRIGGER update_orders_updated_at 
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kasir_sessions_updated_at 
BEFORE UPDATE ON kasir_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE orders IS 'Order pelanggan di outlet (made-to-order workflow)';
COMMENT ON TABLE order_items IS 'Detail items dalam order';
COMMENT ON TABLE kasir_sessions IS 'Shift kasir dengan till management';
COMMENT ON TABLE kitchen_display_queue IS 'Queue untuk Kitchen Display System';

COMMENT ON COLUMN orders.status IS 'Status: pending → processing → ready → completed';
COMMENT ON COLUMN orders.actual_waiting_time IS 'Waktu tunggu customer (dalam menit)';
COMMENT ON COLUMN kasir_sessions.difference IS 'Selisih kas (closing - expected)';

-- ============================================================================
-- END OF 04-schema-orders.sql
-- ============================================================================
