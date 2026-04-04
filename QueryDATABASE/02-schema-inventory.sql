-- ============================================================================
-- DONATTOUR DATABASE - INVENTORY TRACKING SCHEMA
-- ============================================================================
-- File: 02-schema-inventory.sql
-- Description: Sistem tracking inventory donat dari RAW hingga SOLD
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- ============================================================================
-- TABLE: inventory_items
-- Description: Tracking setiap donat dengan 7 status lifecycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Location
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    
    -- Product Reference
    product_base_id UUID REFERENCES products(id), -- Donat polos (before topping)
    product_final_id UUID REFERENCES products(id), -- Donat final (after topping)
    batch_id UUID REFERENCES production_batches(id),
    
    -- Status Lifecycle (7 status)
    status VARCHAR(20) NOT NULL DEFAULT 'raw' CHECK (status IN (
        'raw',        -- Donat mentah/polos (tanpa topping)
        'qc',         -- Sedang quality check
        'ready',      -- Siap jual (sudah topping)
        'sold',       -- Terjual
        'waste',      -- Gagal produksi/rusak
        'rejected',   -- Batal beli pelanggan
        'otr'         -- Di mobil OTR
    )),
    
    -- Quantity
    quantity INT NOT NULL DEFAULT 1,
    
    -- Timestamps per Status
    produced_at TIMESTAMP,          -- Kapan diproduksi (RAW)
    qc_at TIMESTAMP,                -- Kapan quality check
    topping_at TIMESTAMP,           -- Kapan di-topping
    ready_at TIMESTAMP,             -- Kapan siap jual
    sold_at TIMESTAMP,              -- Kapan terjual
    waste_at TIMESTAMP,             -- Kapan jadi waste
    
    -- Personnel Tracking
    produced_by_user_id UUID REFERENCES users(id),
    qc_by_user_id UUID REFERENCES users(id),
    topping_by_user_id UUID REFERENCES users(id),
    sold_by_user_id UUID REFERENCES users(id),
    
    -- Transaction Reference
    transaction_id UUID REFERENCES transactions(id),
    otr_session_id UUID, -- Reference ke otr_sessions (akan dibuat di file 03)
    
    -- Waste/Rejection Info
    waste_reason VARCHAR(255),      -- Alasan waste: "Gosong", "Adonan gagal", dll
    rejection_reason VARCHAR(255),  -- Alasan rejected: "Batal beli", dll
    
    -- Metadata
    notes TEXT,
    metadata JSONB, -- Flexible field untuk future needs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: inventory_movements
-- Description: Log pergerakan status donat (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Movement Info
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    
    -- Location Movement (optional)
    from_outlet_id UUID REFERENCES outlets(id),
    to_outlet_id UUID REFERENCES outlets(id),
    
    -- Personnel
    moved_by_user_id UUID REFERENCES users(id),
    
    -- Reason
    reason TEXT,
    
    -- Metadata
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- ============================================================================
-- TABLE: topping_sessions
-- Description: Session topping/coating donat
-- ============================================================================
CREATE TABLE IF NOT EXISTS topping_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    
    -- Personnel
    topping_person_id UUID NOT NULL REFERENCES users(id),
    
    -- Session Info
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Input (donat mentah yang di-topping)
    raw_donat_ids UUID[], -- Array of inventory_item_id
    topping_type VARCHAR(100), -- "Cokelat", "Strawberry", "Mix", dll
    
    -- Output
    quantity_input INT NOT NULL,      -- Berapa donat input
    quantity_success INT DEFAULT 0,   -- Berapa yang sukses (READY)
    quantity_failed INT DEFAULT 0,    -- Berapa yang gagal (WASTE)
    
    -- Status
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: stock_transfers
-- Description: Transfer stock antar outlet
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(100) UNIQUE NOT NULL, -- "TRANSFER-20260401-001"
    
    -- From & To
    from_outlet_id UUID NOT NULL REFERENCES outlets(id),
    to_outlet_id UUID NOT NULL REFERENCES outlets(id),
    
    -- Products
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting approval
        'approved',     -- Approved, ready to send
        'in_transit',   -- Sedang dalam perjalanan
        'completed',    -- Received by destination
        'rejected',     -- Rejected
        'cancelled'     -- Cancelled
    )),
    
    -- Personnel
    requested_by_user_id UUID REFERENCES users(id),
    approved_by_user_id UUID REFERENCES users(id),
    sent_by_user_id UUID REFERENCES users(id),
    received_by_user_id UUID REFERENCES users(id),
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    sent_at TIMESTAMP,
    received_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: waste_logs
-- Description: Detail log untuk waste management & analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id),
    
    -- Waste Info
    waste_type VARCHAR(50) CHECK (waste_type IN ('production_failure', 'customer_rejection', 'expired', 'damaged')),
    product_type VARCHAR(100), -- "Donat Cokelat Standar", dll
    quantity INT NOT NULL,
    
    -- Cost Impact
    cost_per_unit NUMERIC(12, 2),
    total_cost NUMERIC(12, 2), -- Berapa rupiah waste ini
    
    -- Reason & Analysis
    reason TEXT NOT NULL,
    root_cause VARCHAR(255), -- "Suhu oven terlalu tinggi", "Adonan terlalu lama", dll
    
    -- Prevention Action
    corrective_action TEXT,
    
    -- Personnel
    reported_by_user_id UUID REFERENCES users(id),
    
    -- Timestamp
    waste_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES untuk Performance
-- ============================================================================
CREATE INDEX idx_inventory_items_outlet_id ON inventory_items(outlet_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_batch_id ON inventory_items(batch_id);
CREATE INDEX idx_inventory_items_product_final_id ON inventory_items(product_final_id);
CREATE INDEX idx_inventory_items_created_at ON inventory_items(created_at);

CREATE INDEX idx_inventory_movements_inventory_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_timestamp ON inventory_movements(timestamp);
CREATE INDEX idx_inventory_movements_to_status ON inventory_movements(to_status);

CREATE INDEX idx_topping_sessions_outlet_id ON topping_sessions(outlet_id);
CREATE INDEX idx_topping_sessions_started_at ON topping_sessions(started_at);
CREATE INDEX idx_topping_sessions_status ON topping_sessions(status);

CREATE INDEX idx_stock_transfers_from_outlet_id ON stock_transfers(from_outlet_id);
CREATE INDEX idx_stock_transfers_to_outlet_id ON stock_transfers(to_outlet_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);

CREATE INDEX idx_waste_logs_outlet_id ON waste_logs(outlet_id);
CREATE INDEX idx_waste_logs_waste_date ON waste_logs(waste_date);
CREATE INDEX idx_waste_logs_waste_type ON waste_logs(waste_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-create inventory_movement saat status berubah
CREATE OR REPLACE FUNCTION log_inventory_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO inventory_movements (
            inventory_item_id,
            from_status,
            to_status,
            quantity,
            moved_by_user_id,
            reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.quantity,
            CASE NEW.status
                WHEN 'qc' THEN NEW.qc_by_user_id
                WHEN 'ready' THEN NEW.topping_by_user_id
                WHEN 'sold' THEN NEW.sold_by_user_id
                ELSE NEW.produced_by_user_id
            END,
            'Status change from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_inventory_status_change
AFTER UPDATE ON inventory_items
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_inventory_status_change();

-- Trigger: Auto-create waste_log saat status jadi waste
CREATE OR REPLACE FUNCTION log_waste_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'waste' AND OLD.status != 'waste' THEN
        INSERT INTO waste_logs (
            outlet_id,
            inventory_item_id,
            waste_type,
            quantity,
            reason,
            waste_date,
            reported_by_user_id
        ) VALUES (
            NEW.outlet_id,
            NEW.id,
            'production_failure',
            NEW.quantity,
            COALESCE(NEW.waste_reason, 'Tidak ada keterangan'),
            CURRENT_DATE,
            NEW.produced_by_user_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_waste
AFTER UPDATE ON inventory_items
FOR EACH ROW
WHEN (NEW.status = 'waste' AND OLD.status != 'waste')
EXECUTE FUNCTION log_waste_on_status_change();

-- Trigger: Update updated_at
CREATE TRIGGER update_inventory_items_updated_at 
BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topping_sessions_updated_at 
BEFORE UPDATE ON topping_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at 
BEFORE UPDATE ON stock_transfers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE inventory_items IS 'Tracking lifecycle setiap donat dari RAW hingga SOLD';
COMMENT ON TABLE inventory_movements IS 'Audit trail pergerakan status inventory';
COMMENT ON TABLE topping_sessions IS 'Session proses topping/coating donat';
COMMENT ON TABLE stock_transfers IS 'Transfer stock antar outlet';
COMMENT ON TABLE waste_logs IS 'Log waste untuk analysis dan cost tracking';

COMMENT ON COLUMN inventory_items.status IS 'Status: raw, qc, ready, sold, waste, rejected, otr';
COMMENT ON COLUMN inventory_movements.reason IS 'Alasan perubahan status atau transfer';

-- ============================================================================
-- END OF 02-schema-inventory.sql
-- ============================================================================
