-- ============================================================================
-- DONATTOUR DATABASE - OTR MANAGEMENT SCHEMA
-- ============================================================================
-- File: 03-schema-otr.sql
-- Description: Sistem OTR dengan paket kode (REG1, REG2, PREM1, dll)
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- ============================================================================
-- TABLE: otr_vehicles
-- Description: Master data kendaraan/mobil OTR
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Vehicle Info
    nama VARCHAR(255) NOT NULL, -- "Mobil OTR #1"
    nopol VARCHAR(50) UNIQUE NOT NULL, -- "B 1234 XYZ"
    jenis VARCHAR(100), -- "Daihatsu Gran Max", dll
    warna VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'inactive')),
    
    -- Assignment
    default_driver_id UUID REFERENCES users(id),
    home_outlet_id UUID REFERENCES outlets(id), -- Outlet base
    
    -- Metadata
    tahun_pembuatan INT,
    kapasitas_box INT, -- Maksimal berapa box bisa dibawa
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: otr_paket_master
-- Description: Master paket OTR dengan kode (REG1, REG2, PREM1, dll)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_paket_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Kode Paket (KEY FEATURE!)
    kode VARCHAR(20) UNIQUE NOT NULL, -- "REG1", "REG2", "PREM1", dll
    nama VARCHAR(255) NOT NULL, -- "Reguler Paket 1", "Premium Paket 1"
    
    -- Tipe
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('isi_3', 'isi_6')),
    
    -- Varian Detail (JSONB untuk flexibility)
    varian_detail JSONB NOT NULL,
    /* Example:
    [
        {"topping": "Ceres", "qty": 1},
        {"topping": "Gula", "qty": 1},
        {"topping": "Cokelat", "qty": 1}
    ]
    */
    
    -- Pricing
    harga NUMERIC(12, 2) NOT NULL,
    harga_promo NUMERIC(12, 2), -- Optional harga promo
    
    -- Display
    deskripsi TEXT, -- "Isi 3: Ceres, Gula, Cokelat"
    icon VARCHAR(50) DEFAULT '🍩',
    sort_order INT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: otr_sessions
-- Description: Session penjualan OTR per hari
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number VARCHAR(100) UNIQUE NOT NULL, -- "OTR-20260401-001"
    
    -- Vehicle & Driver
    vehicle_id UUID NOT NULL REFERENCES otr_vehicles(id),
    driver_id UUID NOT NULL REFERENCES users(id),
    
    -- Loading dari outlet mana
    loaded_from_outlet_id UUID REFERENCES outlets(id),
    
    -- Session Info
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    
    -- Location
    starting_location VARCHAR(255), -- "Outlet Pusat"
    route_plan TEXT, -- "Mall → Pasar → Perumahan"
    
    -- Status
    status VARCHAR(20) DEFAULT 'loading' CHECK (status IN (
        'loading',      -- Sedang loading paket
        'selling',      -- Sedang berjualan
        'returning',    -- Dalam perjalanan kembali
        'completed',    -- Session selesai
        'cancelled'     -- Cancelled
    )),
    
    -- Summary (akan di-update real-time)
    total_loaded_boxes INT DEFAULT 0,
    total_sold_boxes INT DEFAULT 0,
    total_returned_boxes INT DEFAULT 0,
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: otr_loading
-- Description: Detail paket yang di-load ke mobil OTR (pagi hari)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_loading (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    otr_session_id UUID NOT NULL REFERENCES otr_sessions(id) ON DELETE CASCADE,
    paket_id UUID NOT NULL REFERENCES otr_paket_master(id),
    
    -- Quantity
    quantity_loaded INT NOT NULL, -- Berapa dus/box dibawa
    
    -- Personnel
    loaded_by_user_id UUID REFERENCES users(id), -- SPV yang prepare
    
    -- Timestamp
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    notes TEXT
);

-- ============================================================================
-- TABLE: otr_transaksi
-- Description: Transaksi penjualan OTR
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_transaksi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaksi_number VARCHAR(100) UNIQUE NOT NULL, -- "OTR-TRX-20260401-001"
    
    -- Session Reference
    otr_session_id UUID NOT NULL REFERENCES otr_sessions(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES otr_vehicles(id),
    driver_id UUID REFERENCES users(id),
    
    -- Payment
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'transfer', 'qris', 'e-wallet')),
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2),
    change_amount NUMERIC(12, 2) DEFAULT 0,
    
    -- Location (GPS optional)
    location_name VARCHAR(255), -- "Dekat Mall", "Pasar Minggu"
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Customer Info (optional)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: otr_transaksi_items
-- Description: Detail items dalam transaksi OTR (paket apa yang terjual)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_transaksi_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaksi_id UUID NOT NULL REFERENCES otr_transaksi(id) ON DELETE CASCADE,
    paket_id UUID NOT NULL REFERENCES otr_paket_master(id),
    
    -- Quantity & Price
    quantity INT NOT NULL, -- Berapa dus terjual
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: otr_returns
-- Description: Return donat yang tidak terjual (unsold)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otr_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    otr_session_id UUID NOT NULL REFERENCES otr_sessions(id) ON DELETE CASCADE,
    
    -- Return to which outlet
    return_to_outlet_id UUID NOT NULL REFERENCES outlets(id),
    
    -- Products returned
    paket_id UUID NOT NULL REFERENCES otr_paket_master(id),
    quantity INT NOT NULL, -- Berapa dus returned
    
    -- Condition
    condition VARCHAR(20) CHECK (condition IN ('good', 'damaged', 'expired')),
    
    -- Personnel
    returned_by_user_id UUID REFERENCES users(id),
    received_by_user_id UUID REFERENCES users(id),
    
    -- Timestamp
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMP,
    
    -- Metadata
    notes TEXT
);

-- ============================================================================
-- INDEXES untuk Performance
-- ============================================================================
CREATE INDEX idx_otr_vehicles_status ON otr_vehicles(status);
CREATE INDEX idx_otr_paket_master_kode ON otr_paket_master(kode);
CREATE INDEX idx_otr_paket_master_is_active ON otr_paket_master(is_active);

CREATE INDEX idx_otr_sessions_vehicle_id ON otr_sessions(vehicle_id);
CREATE INDEX idx_otr_sessions_driver_id ON otr_sessions(driver_id);
CREATE INDEX idx_otr_sessions_status ON otr_sessions(status);
CREATE INDEX idx_otr_sessions_started_at ON otr_sessions(started_at);

CREATE INDEX idx_otr_loading_session_id ON otr_loading(otr_session_id);
CREATE INDEX idx_otr_loading_paket_id ON otr_loading(paket_id);

CREATE INDEX idx_otr_transaksi_session_id ON otr_transaksi(otr_session_id);
CREATE INDEX idx_otr_transaksi_created_at ON otr_transaksi(created_at);

CREATE INDEX idx_otr_transaksi_items_transaksi_id ON otr_transaksi_items(transaksi_id);
CREATE INDEX idx_otr_transaksi_items_paket_id ON otr_transaksi_items(paket_id);

CREATE INDEX idx_otr_returns_session_id ON otr_returns(otr_session_id);
CREATE INDEX idx_otr_returns_outlet_id ON otr_returns(return_to_outlet_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update OTR session summary saat ada transaksi baru
CREATE OR REPLACE FUNCTION update_otr_session_summary()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE otr_sessions
    SET 
        total_sold_boxes = (
            SELECT COALESCE(SUM(oti.quantity), 0)
            FROM otr_transaksi ot
            JOIN otr_transaksi_items oti ON oti.transaksi_id = ot.id
            WHERE ot.otr_session_id = NEW.otr_session_id
        ),
        total_revenue = (
            SELECT COALESCE(SUM(ot.total_amount), 0)
            FROM otr_transaksi ot
            WHERE ot.otr_session_id = NEW.otr_session_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.otr_session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_otr_session_summary
AFTER INSERT OR UPDATE ON otr_transaksi
FOR EACH ROW
EXECUTE FUNCTION update_otr_session_summary();

-- Trigger: Update total_loaded_boxes saat loading
CREATE OR REPLACE FUNCTION update_otr_session_loaded()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE otr_sessions
    SET 
        total_loaded_boxes = (
            SELECT COALESCE(SUM(quantity_loaded), 0)
            FROM otr_loading
            WHERE otr_session_id = NEW.otr_session_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.otr_session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_otr_session_loaded
AFTER INSERT OR UPDATE ON otr_loading
FOR EACH ROW
EXECUTE FUNCTION update_otr_session_loaded();

-- Trigger: Update vehicle status saat session start/end
CREATE OR REPLACE FUNCTION update_vehicle_status_on_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'loading' OR NEW.status = 'selling' THEN
        UPDATE otr_vehicles SET status = 'in_use' WHERE id = NEW.vehicle_id;
    ELSIF NEW.status = 'completed' OR NEW.status = 'cancelled' THEN
        UPDATE otr_vehicles SET status = 'available' WHERE id = NEW.vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_status
AFTER INSERT OR UPDATE ON otr_sessions
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_status_on_session();

-- Trigger: updated_at
CREATE TRIGGER update_otr_vehicles_updated_at 
BEFORE UPDATE ON otr_vehicles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_otr_paket_master_updated_at 
BEFORE UPDATE ON otr_paket_master
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_otr_sessions_updated_at 
BEFORE UPDATE ON otr_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_otr_transaksi_updated_at 
BEFORE UPDATE ON otr_transaksi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE otr_vehicles IS 'Master data kendaraan/mobil OTR';
COMMENT ON TABLE otr_paket_master IS 'Master paket dengan kode (REG1, REG2, PREM1, dll)';
COMMENT ON TABLE otr_sessions IS 'Session penjualan OTR per hari';
COMMENT ON TABLE otr_loading IS 'Detail paket yang di-load ke mobil (pagi hari)';
COMMENT ON TABLE otr_transaksi IS 'Transaksi penjualan di jalan';
COMMENT ON TABLE otr_transaksi_items IS 'Detail paket yang terjual per transaksi';
COMMENT ON TABLE otr_returns IS 'Return donat unsold ke outlet';

COMMENT ON COLUMN otr_paket_master.kode IS 'Kode unik paket: REG1, REG2, PREM1, dll';
COMMENT ON COLUMN otr_paket_master.varian_detail IS 'JSONB array: [{"topping": "Cokelat", "qty": 1}, ...]';

-- ============================================================================
-- END OF 03-schema-otr.sql
-- ============================================================================
