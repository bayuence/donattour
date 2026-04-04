-- ============================================================================
-- DONATTOUR DATABASE - VIEWS
-- ============================================================================
-- File: 05-views.sql
-- Description: Database views untuk query cepat dan reporting
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- ============================================================================
-- VIEW: v_inventory_status_per_outlet
-- Description: Summary inventory status per outlet
-- ============================================================================
CREATE OR REPLACE VIEW v_inventory_status_per_outlet AS
SELECT 
    o.id AS outlet_id,
    o.nama AS outlet_nama,
    ii.status,
    COUNT(ii.id) AS item_count,
    SUM(ii.quantity) AS total_quantity,
    ARRAY_AGG(DISTINCT p.nama) AS product_names
FROM outlets o
LEFT JOIN inventory_items ii ON ii.outlet_id = o.id
LEFT JOIN products p ON p.id = ii.product_final_id
GROUP BY o.id, o.nama, ii.status;

COMMENT ON VIEW v_inventory_status_per_outlet IS 'Summary inventory berdasarkan status per outlet';

-- ============================================================================
-- VIEW: v_otr_stock_realtime
-- Description: Real-time stock OTR per session
-- ============================================================================
CREATE OR REPLACE VIEW v_otr_stock_realtime AS
SELECT 
    os.id AS session_id,
    os.session_number,
    ov.nama AS vehicle_name,
    u.name AS driver_name,
    ol.paket_id,
    opm.kode AS paket_kode,
    opm.nama AS paket_nama,
    opm.tipe AS paket_tipe,
    ol.quantity_loaded,
    COALESCE(SUM(oti.quantity), 0) AS quantity_sold,
    ol.quantity_loaded - COALESCE(SUM(oti.quantity), 0) AS quantity_remaining,
    COALESCE(SUM(oti.subtotal), 0) AS revenue_per_paket
FROM otr_sessions os
JOIN otr_vehicles ov ON ov.id = os.vehicle_id
JOIN users u ON u.id = os.driver_id
LEFT JOIN otr_loading ol ON ol.otr_session_id = os.id
LEFT JOIN otr_paket_master opm ON opm.id = ol.paket_id
LEFT JOIN otr_transaksi ot ON ot.otr_session_id = os.id
LEFT JOIN otr_transaksi_items oti ON oti.transaksi_id = ot.id AND oti.paket_id = ol.paket_id
GROUP BY 
    os.id, os.session_number, ov.nama, u.name,
    ol.paket_id, opm.kode, opm.nama, opm.tipe, ol.quantity_loaded;

COMMENT ON VIEW v_otr_stock_realtime IS 'Real-time stock OTR: loaded vs sold vs remaining';

-- ============================================================================
-- VIEW: v_daily_production_summary
-- Description: Summary produksi harian per outlet
-- ============================================================================
CREATE OR REPLACE VIEW v_daily_production_summary AS
SELECT 
    DATE(pb.created_at) AS production_date,
    o.id AS outlet_id,
    o.nama AS outlet_nama,
    COUNT(DISTINCT pb.id) AS total_batches,
    SUM(pb.quantity_planned) AS total_planned,
    SUM(pb.quantity_produced) AS total_produced,
    COUNT(DISTINCT CASE WHEN ii.status = 'waste' THEN ii.id END) AS total_waste_count,
    SUM(CASE WHEN ii.status = 'waste' THEN ii.quantity ELSE 0 END) AS total_waste_quantity,
    SUM(CASE WHEN ii.status = 'sold' THEN ii.quantity ELSE 0 END) AS total_sold,
    ROUND(
        (SUM(CASE WHEN ii.status = 'sold' THEN ii.quantity ELSE 0 END)::NUMERIC / 
        NULLIF(SUM(pb.quantity_produced), 0)) * 100, 
        2
    ) AS sold_percentage
FROM production_batches pb
JOIN outlets o ON o.id = pb.outlet_id
LEFT JOIN inventory_items ii ON ii.batch_id = pb.id
GROUP BY DATE(pb.created_at), o.id, o.nama;

COMMENT ON VIEW v_daily_production_summary IS 'Summary produksi, waste, dan penjualan harian';

-- ============================================================================
-- VIEW: v_outlet_performance_today
-- Description: Performance overview per outlet hari ini
-- ============================================================================
CREATE OR REPLACE VIEW v_outlet_performance_today AS
SELECT 
    o.id AS outlet_id,
    o.nama AS outlet_nama,
    o.status AS outlet_status,
    
    -- Kasir aktif
    COUNT(DISTINCT ks.kasir_id) AS active_kasir_count,
    
    -- Sales today
    COUNT(DISTINCT t.id) AS total_transactions,
    COALESCE(SUM(t.total_amount), 0) AS total_sales,
    
    -- Orders today (outlet)
    COUNT(DISTINCT ord.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN ord.status = 'pending' THEN ord.id END) AS pending_orders,
    
    -- Inventory status
    SUM(CASE WHEN ii.status = 'ready' THEN ii.quantity ELSE 0 END) AS stock_ready,
    SUM(CASE WHEN ii.status = 'raw' THEN ii.quantity ELSE 0 END) AS stock_raw,
    SUM(CASE WHEN ii.status = 'waste' THEN ii.quantity ELSE 0 END) AS waste_today
    
FROM outlets o
LEFT JOIN kasir_sessions ks ON ks.outlet_id = o.id 
    AND ks.status = 'active'
    AND DATE(ks.shift_start) = CURRENT_DATE
LEFT JOIN transactions t ON t.outlet_id = o.id 
    AND DATE(t.created_at) = CURRENT_DATE
    AND t.status = 'completed'
LEFT JOIN orders ord ON ord.outlet_id = o.id 
    AND DATE(ord.ordered_at) = CURRENT_DATE
LEFT JOIN inventory_items ii ON ii.outlet_id = o.id 
    AND DATE(ii.created_at) = CURRENT_DATE
GROUP BY o.id, o.nama, o.status;

COMMENT ON VIEW v_outlet_performance_today IS 'Performance summary per outlet untuk hari ini';

-- ============================================================================
-- VIEW: v_otr_performance_today
-- Description: Performance OTR hari ini
-- ============================================================================
CREATE OR REPLACE VIEW v_otr_performance_today AS
SELECT 
    os.id AS session_id,
    os.session_number,
    os.status AS session_status,
    ov.nama AS vehicle_name,
    ov.nopol,
    u.name AS driver_name,
    o.nama AS loaded_from_outlet,
    
    os.total_loaded_boxes,
    os.total_sold_boxes,
    os.total_returned_boxes,
    os.total_revenue,
    
    COUNT(DISTINCT ot.id) AS transaction_count,
    
    ROUND(
        (os.total_sold_boxes::NUMERIC / NULLIF(os.total_loaded_boxes, 0)) * 100,
        2
    ) AS sell_through_percentage,
    
    os.started_at,
    os.ended_at,
    EXTRACT(EPOCH FROM (COALESCE(os.ended_at, CURRENT_TIMESTAMP) - os.started_at)) / 3600 AS hours_active
    
FROM otr_sessions os
JOIN otr_vehicles ov ON ov.id = os.vehicle_id
JOIN users u ON u.id = os.driver_id
LEFT JOIN outlets o ON o.id = os.loaded_from_outlet_id
LEFT JOIN otr_transaksi ot ON ot.otr_session_id = os.id
WHERE DATE(os.started_at) = CURRENT_DATE
GROUP BY 
    os.id, os.session_number, os.status,
    ov.nama, ov.nopol, u.name, o.nama,
    os.total_loaded_boxes, os.total_sold_boxes, os.total_returned_boxes, os.total_revenue,
    os.started_at, os.ended_at;

COMMENT ON VIEW v_otr_performance_today IS 'Performance summary OTR untuk hari ini';

-- ============================================================================
-- VIEW: v_waste_analysis
-- Description: Analisis waste untuk cost reduction
-- ============================================================================
CREATE OR REPLACE VIEW v_waste_analysis AS
SELECT 
    DATE(wl.waste_date) AS waste_date,
    o.id AS outlet_id,
    o.nama AS outlet_nama,
    wl.waste_type,
    COUNT(wl.id) AS waste_incident_count,
    SUM(wl.quantity) AS total_waste_quantity,
    SUM(wl.total_cost) AS total_waste_cost,
    ARRAY_AGG(DISTINCT wl.reason) AS waste_reasons,
    ARRAY_AGG(DISTINCT wl.root_cause) AS root_causes
FROM waste_logs wl
JOIN outlets o ON o.id = wl.outlet_id
GROUP BY DATE(wl.waste_date), o.id, o.nama, wl.waste_type;

COMMENT ON VIEW v_waste_analysis IS 'Analisis waste untuk identifikasi pattern dan cost impact';

-- ============================================================================
-- VIEW: v_kasir_performance
-- Description: Performance metrics per kasir
-- ============================================================================
CREATE OR REPLACE VIEW v_kasir_performance AS
SELECT 
    u.id AS kasir_id,
    u.name AS kasir_name,
    o.nama AS outlet_nama,
    ks.shift_start,
    ks.shift_end,
    ks.status AS session_status,
    
    ks.total_transactions,
    ks.total_sales,
    CASE 
        WHEN ks.total_transactions > 0 
        THEN ROUND(ks.total_sales / ks.total_transactions, 2)
        ELSE 0 
    END AS avg_transaction_value,
    
    ks.closing_balance,
    ks.expected_balance,
    ks.difference AS till_difference,
    
    EXTRACT(EPOCH FROM (COALESCE(ks.shift_end, CURRENT_TIMESTAMP) - ks.shift_start)) / 3600 AS hours_worked,
    
    CASE 
        WHEN EXTRACT(EPOCH FROM (COALESCE(ks.shift_end, CURRENT_TIMESTAMP) - ks.shift_start)) > 0
        THEN ROUND(
            ks.total_sales / (EXTRACT(EPOCH FROM (COALESCE(ks.shift_end, CURRENT_TIMESTAMP) - ks.shift_start)) / 3600),
            2
        )
        ELSE 0 
    END AS sales_per_hour
    
FROM kasir_sessions ks
JOIN users u ON u.id = ks.kasir_id
JOIN outlets o ON o.id = ks.outlet_id;

COMMENT ON VIEW v_kasir_performance IS 'Performance metrics per kasir untuk evaluasi produktivitas';

-- ============================================================================
-- VIEW: v_product_sales_ranking
-- Description: Ranking produk terlaris
-- ============================================================================
CREATE OR REPLACE VIEW v_product_sales_ranking AS
SELECT 
    p.id AS product_id,
    p.nama AS product_name,
    pc.nama AS category_name,
    COUNT(ti.id) AS times_sold,
    SUM(ti.quantity) AS total_quantity_sold,
    SUM(ti.subtotal) AS total_revenue,
    ROUND(AVG(ti.quantity), 2) AS avg_quantity_per_transaction,
    MAX(t.created_at) AS last_sold_at
FROM products p
LEFT JOIN product_categories pc ON pc.id = p.category_id
LEFT JOIN transaction_items ti ON ti.product_id = p.id
LEFT JOIN transactions t ON t.id = ti.transaction_id AND t.status = 'completed'
GROUP BY p.id, p.nama, pc.nama
ORDER BY total_quantity_sold DESC;

COMMENT ON VIEW v_product_sales_ranking IS 'Ranking produk berdasarkan penjualan';

-- ============================================================================
-- VIEW: v_kitchen_queue_status
-- Description: Status antrian dapur real-time
-- ============================================================================
CREATE OR REPLACE VIEW v_kitchen_queue_status AS
SELECT 
    kdq.id AS queue_id,
    kdq.queue_number,
    o.order_number,
    o.outlet_id,
    out.nama AS outlet_nama,
    kdq.status AS queue_status,
    kdq.priority,
    u.name AS assigned_to,
    kdq.entered_queue_at,
    kdq.started_at,
    kdq.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(kdq.completed_at, CURRENT_TIMESTAMP) - kdq.entered_queue_at)) / 60 AS minutes_in_queue,
    
    -- Order details
    o.customer_name,
    COUNT(oi.id) AS item_count,
    STRING_AGG(oi.topping || ' x' || oi.quantity, ', ') AS order_summary
    
FROM kitchen_display_queue kdq
JOIN orders o ON o.id = kdq.order_id
JOIN outlets out ON out.id = kdq.outlet_id
LEFT JOIN users u ON u.id = kdq.assigned_to_user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE DATE(kdq.entered_queue_at) = CURRENT_DATE
GROUP BY 
    kdq.id, kdq.queue_number, o.order_number, o.outlet_id, out.nama,
    kdq.status, kdq.priority, u.name,
    kdq.entered_queue_at, kdq.started_at, kdq.completed_at, o.customer_name
ORDER BY kdq.queue_number;

COMMENT ON VIEW v_kitchen_queue_status IS 'Status antrian dapur untuk Kitchen Display System';

-- ============================================================================
-- END OF 05-views.sql
-- ============================================================================
