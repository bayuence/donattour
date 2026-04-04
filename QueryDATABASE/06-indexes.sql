-- ============================================================================
-- DONATTOUR DATABASE - INDEXES
-- ============================================================================
-- File: 06-indexes.sql
-- Description: Additional performance indexes (core indexes sudah di schema)
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES untuk Query Performance
-- ============================================================================

-- Orders: Filter by outlet + date + status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_orders_outlet_date_status 
ON orders(outlet_id, DATE(ordered_at), status);

-- Transactions: Filter by outlet + date (untuk daily reports)
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_date 
ON transactions(outlet_id, DATE(created_at));

-- Inventory items: Filter by outlet + status (untuk inventory views)
CREATE INDEX IF NOT EXISTS idx_inventory_items_outlet_status 
ON inventory_items(outlet_id, status);

-- OTR transaksi: Filter by session + date
CREATE INDEX IF NOT EXISTS idx_otr_transaksi_session_date 
ON otr_transaksi(otr_session_id, DATE(created_at));

-- Waste logs: Filter by outlet + date (untuk waste analysis)
CREATE INDEX IF NOT EXISTS idx_waste_logs_outlet_date 
ON waste_logs(outlet_id, waste_date);

-- Attendance: Filter by outlet + date
CREATE INDEX IF NOT EXISTS idx_attendance_outlet_date 
ON attendance(outlet_id, tanggal);

-- ============================================================================
-- PARTIAL INDEXES untuk Specific Queries
-- ============================================================================

-- Active kasir sessions only
CREATE INDEX IF NOT EXISTS idx_kasir_sessions_active 
ON kasir_sessions(outlet_id, kasir_id) 
WHERE status = 'active';

-- Pending orders only (dapur queue)
CREATE INDEX IF NOT EXISTS idx_orders_pending 
ON orders(outlet_id, ordered_at) 
WHERE status IN ('pending', 'processing');

-- Active OTR sessions today
CREATE INDEX IF NOT EXISTS idx_otr_sessions_active_today 
ON otr_sessions(vehicle_id, driver_id) 
WHERE status IN ('loading', 'selling') 
AND DATE(started_at) = CURRENT_DATE;

-- Inventory items ready for sale
CREATE INDEX IF NOT EXISTS idx_inventory_items_ready 
ON inventory_items(outlet_id, product_final_id) 
WHERE status = 'ready';

-- Kitchen queue waiting status
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_waiting 
ON kitchen_display_queue(outlet_id, queue_number) 
WHERE status IN ('waiting', 'in_progress');

-- ============================================================================
-- GIN INDEXES untuk JSONB Columns
-- ============================================================================

-- OTR paket varian detail (untuk search varian)
CREATE INDEX IF NOT EXISTS idx_otr_paket_varian_detail_gin 
ON otr_paket_master USING GIN (varian_detail);

-- Inventory items metadata
CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata_gin 
ON inventory_items USING GIN (metadata);

-- Production batch cost breakdown
CREATE INDEX IF NOT EXISTS idx_production_batches_cost_gin 
ON production_batches USING GIN (cost_breakdown);

-- ============================================================================
-- TEXT SEARCH INDEXES (untuk search functionality)
-- ============================================================================

-- Product name search
CREATE INDEX IF NOT EXISTS idx_products_nama_trgm 
ON products USING GIN (nama gin_trgm_ops);

-- Outlet name search
CREATE INDEX IF NOT EXISTS idx_outlets_nama_trgm 
ON outlets USING GIN (nama gin_trgm_ops);

-- User name search
CREATE INDEX IF NOT EXISTS idx_users_name_trgm 
ON users USING GIN (name gin_trgm_ops);

-- Note: Perlu enable extension pg_trgm terlebih dahulu:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ANALYZE untuk Update Statistics
-- ============================================================================

ANALYZE outlets;
ANALYZE users;
ANALYZE products;
ANALYZE transactions;
ANALYZE transaction_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE inventory_items;
ANALYZE inventory_movements;
ANALYZE otr_sessions;
ANALYZE otr_transaksi;
ANALYZE production_batches;
ANALYZE waste_logs;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON INDEX idx_orders_outlet_date_status IS 'Composite index untuk filter orders by outlet, date, dan status';
COMMENT ON INDEX idx_kasir_sessions_active IS 'Partial index untuk active kasir sessions saja';
COMMENT ON INDEX idx_inventory_items_ready IS 'Partial index untuk inventory ready saja';

-- ============================================================================
-- END OF 06-indexes.sql
-- ============================================================================
