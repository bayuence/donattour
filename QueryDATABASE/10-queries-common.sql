-- ============================================================================
-- DONATTOUR DATABASE - COMMON QUERIES
-- ============================================================================
-- File: 10-queries-common.sql
-- Description: Common queries untuk aplikasi (copy-paste ready)
-- Version: 1.0
-- Date: 2026-04-01
-- ============================================================================

-- ============================================================================
-- OUTLET QUERIES
-- ============================================================================

-- Get all active outlets
SELECT * FROM outlets WHERE status = 'aktif' ORDER BY nama;

-- Get outlet dengan metrics hari ini
SELECT * FROM v_outlet_performance_today ORDER BY total_sales DESC;

-- ============================================================================
-- INVENTORY QUERIES
-- ============================================================================

-- Get inventory status per outlet (real-time)
SELECT * FROM v_inventory_status_per_outlet 
WHERE outlet_id = 'YOUR_OUTLET_ID' 
ORDER BY status;

-- Get donat READY di outlet tertentu
SELECT 
    p.nama AS product_name,
    SUM(ii.quantity) AS quantity_ready
FROM inventory_items ii
JOIN products p ON p.id = ii.product_final_id
WHERE ii.outlet_id = 'YOUR_OUTLET_ID'
AND ii.status = 'ready'
GROUP BY p.id, p.nama
ORDER BY p.nama;

-- Get donat RAW (mentah) available untuk topping
SELECT 
    COUNT(*) AS total_raw_donat,
    SUM(quantity) AS total_quantity
FROM inventory_items
WHERE outlet_id = 'YOUR_OUTLET_ID'
AND status = 'raw';

-- Track lifecycle specific donat
SELECT 
    im.from_status,
    im.to_status,
    im.timestamp,
    u.name AS moved_by,
    im.reason
FROM inventory_movements im
LEFT JOIN users u ON u.id = im.moved_by_user_id
WHERE im.inventory_item_id = 'YOUR_ITEM_ID'
ORDER BY im.timestamp;

-- ============================================================================
-- OTR QUERIES
-- ============================================================================

-- Get active OTR sessions today
SELECT * FROM v_otr_performance_today 
WHERE session_status IN ('loading', 'selling')
ORDER BY started_at DESC;

-- Get real-time stock OTR per session
SELECT * FROM v_otr_stock_realtime 
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY paket_kode;

-- Get all available OTR paket (master data)
SELECT 
    kode,
    nama,
    tipe,
    varian_detail,
    harga
FROM otr_paket_master
WHERE is_active = TRUE
ORDER BY sort_order, kode;

-- Get OTR sales summary by paket (today)
SELECT 
    opm.kode,
    opm.nama,
    COUNT(DISTINCT ot.id) AS transaction_count,
    SUM(oti.quantity) AS total_boxes_sold,
    SUM(oti.subtotal) AS total_revenue
FROM otr_transaksi ot
JOIN otr_transaksi_items oti ON oti.transaksi_id = ot.id
JOIN otr_paket_master opm ON opm.id = oti.paket_id
WHERE DATE(ot.created_at) = CURRENT_DATE
GROUP BY opm.kode, opm.nama
ORDER BY total_revenue DESC;

-- ============================================================================
-- ORDER QUERIES (OUTLET)
-- ============================================================================

-- Get pending orders untuk dapur
SELECT 
    o.order_number,
    o.customer_name,
    STRING_AGG(oi.topping || ' x' || oi.quantity, ', ') AS items,
    o.estimated_waiting_time,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.ordered_at)) / 60 AS minutes_waiting
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.outlet_id = 'YOUR_OUTLET_ID'
AND o.status IN ('pending', 'processing')
GROUP BY o.id, o.order_number, o.customer_name, o.estimated_waiting_time, o.ordered_at
ORDER BY o.ordered_at;

-- Get kitchen display queue
SELECT * FROM v_kitchen_queue_status
WHERE outlet_id = 'YOUR_OUTLET_ID'
AND queue_status IN ('waiting', 'in_progress')
ORDER BY queue_number;

-- Get order ready untuk pickup
SELECT 
    order_number,
    customer_name,
    total_amount,
    EXTRACT(EPOCH FROM (ready_at - ordered_at)) / 60 AS waiting_time_minutes
FROM orders
WHERE outlet_id = 'YOUR_OUTLET_ID'
AND status = 'ready'
ORDER BY ready_at;

-- ============================================================================
-- KASIR & TRANSACTION QUERIES
-- ============================================================================

-- Get active kasir session
SELECT 
    ks.*,
    u.name AS kasir_name,
    o.nama AS outlet_nama
FROM kasir_sessions ks
JOIN users u ON u.id = ks.kasir_id
JOIN outlets o ON o.id = ks.outlet_id
WHERE ks.kasir_id = 'YOUR_KASIR_ID'
AND ks.status = 'active'
LIMIT 1;

-- Get kasir performance
SELECT * FROM v_kasir_performance
WHERE kasir_id = 'YOUR_KASIR_ID'
AND DATE(shift_start) = CURRENT_DATE;

-- Get sales summary per outlet (today)
SELECT 
    o.nama AS outlet_nama,
    COUNT(t.id) AS total_transactions,
    SUM(t.total_amount) AS total_sales,
    AVG(t.total_amount) AS avg_transaction_value,
    SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END) AS cash_sales,
    SUM(CASE WHEN t.payment_method != 'cash' THEN t.total_amount ELSE 0 END) AS non_cash_sales
FROM transactions t
JOIN outlets o ON o.id = t.outlet_id
WHERE DATE(t.created_at) = CURRENT_DATE
AND t.status = 'completed'
GROUP BY o.id, o.nama
ORDER BY total_sales DESC;

-- ============================================================================
-- PRODUCTION QUERIES
-- ============================================================================

-- Get daily production summary
SELECT * FROM v_daily_production_summary
WHERE production_date = CURRENT_DATE
ORDER BY outlet_nama;

-- Get active production batches
SELECT 
    pb.*,
    o.nama AS outlet_nama,
    u.name AS production_manager
FROM production_batches pb
JOIN outlets o ON o.id = pb.outlet_id
LEFT JOIN users u ON u.id = pb.production_manager_id
WHERE pb.status IN ('planned', 'in_progress', 'quality_check')
ORDER BY pb.created_at DESC;

-- Get topping sessions today
SELECT 
    ts.*,
    o.nama AS outlet_nama,
    u.name AS topping_person
FROM topping_sessions ts
JOIN outlets o ON o.id = ts.outlet_id
JOIN users u ON u.id = ts.topping_person_id
WHERE DATE(ts.started_at) = CURRENT_DATE
ORDER BY ts.started_at DESC;

-- ============================================================================
-- WASTE & ANALYSIS QUERIES
-- ============================================================================

-- Get waste analysis
SELECT * FROM v_waste_analysis
WHERE waste_date = CURRENT_DATE
ORDER BY total_waste_cost DESC;

-- Get waste trend (last 7 days)
SELECT 
    waste_date,
    SUM(total_waste_quantity) AS total_waste,
    SUM(total_waste_cost) AS total_cost
FROM v_waste_analysis
WHERE waste_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY waste_date
ORDER BY waste_date;

-- Get top waste reasons
SELECT 
    reason,
    COUNT(*) AS incident_count,
    SUM(quantity) AS total_quantity,
    SUM(total_cost) AS total_cost
FROM waste_logs
WHERE waste_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY reason
ORDER BY total_cost DESC
LIMIT 10;

-- ============================================================================
-- REPORTING QUERIES
-- ============================================================================

-- Daily sales report per outlet
SELECT 
    o.nama AS outlet,
    COUNT(DISTINCT t.id) AS transactions,
    SUM(ti.quantity) AS items_sold,
    SUM(t.total_amount) AS revenue,
    AVG(t.total_amount) AS avg_transaction
FROM transactions t
JOIN outlets o ON o.id = t.outlet_id
JOIN transaction_items ti ON ti.transaction_id = t.id
WHERE DATE(t.created_at) = CURRENT_DATE
AND t.status = 'completed'
GROUP BY o.id, o.nama
ORDER BY revenue DESC;

-- Product sales ranking
SELECT * FROM v_product_sales_ranking
LIMIT 20;

-- Hourly sales trend (today)
SELECT 
    EXTRACT(HOUR FROM created_at) AS hour,
    COUNT(*) AS transactions,
    SUM(total_amount) AS revenue
FROM transactions
WHERE DATE(created_at) = CURRENT_DATE
AND status = 'completed'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- ============================================================================
-- MONITORING & ALERTS QUERIES
-- ============================================================================

-- Check low stock products
SELECT 
    p.nama AS product_name,
    o.nama AS outlet_nama,
    SUM(ii.quantity) AS current_stock,
    p.reorder_level
FROM inventory_items ii
JOIN products p ON p.id = ii.product_final_id
JOIN outlets o ON o.id = ii.outlet_id
WHERE ii.status = 'ready'
GROUP BY p.id, p.nama, o.id, o.nama, p.reorder_level
HAVING SUM(ii.quantity) < p.reorder_level
ORDER BY current_stock;

-- Check inactive kasir (no transaction last 2 hours)
SELECT 
    u.name AS kasir_name,
    o.nama AS outlet_nama,
    ks.shift_start,
    MAX(ord.ordered_at) AS last_transaction,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(ord.ordered_at))) / 60 AS minutes_inactive
FROM kasir_sessions ks
JOIN users u ON u.id = ks.kasir_id
JOIN outlets o ON o.id = ks.outlet_id
LEFT JOIN orders ord ON ord.kasir_id = ks.kasir_id 
    AND ord.created_at >= ks.shift_start
WHERE ks.status = 'active'
GROUP BY u.name, o.nama, ks.shift_start
HAVING MAX(ord.ordered_at) < CURRENT_TIMESTAMP - INTERVAL '2 hours'
    OR MAX(ord.ordered_at) IS NULL;

-- Check long-waiting orders (> 10 minutes)
SELECT 
    o.order_number,
    o.customer_name,
    o.outlet_id,
    out.nama AS outlet_nama,
    o.ordered_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.ordered_at)) / 60 AS minutes_waiting
FROM orders o
JOIN outlets out ON out.id = o.outlet_id
WHERE o.status IN ('pending', 'processing')
AND o.ordered_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
ORDER BY o.ordered_at;

-- ============================================================================
-- OWNER DASHBOARD QUERIES
-- ============================================================================

-- Master control dashboard data
SELECT 
    -- Outlets
    (SELECT COUNT(*) FROM outlets WHERE status = 'aktif') AS total_outlets_active,
    (SELECT COUNT(DISTINCT kasir_id) FROM kasir_sessions WHERE status = 'active') AS total_active_kasir,
    
    -- Sales today
    (SELECT COALESCE(SUM(total_amount), 0) FROM transactions 
     WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') AS total_sales_today,
    (SELECT COUNT(*) FROM transactions 
     WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') AS total_transactions_today,
    
    -- OTR
    (SELECT COUNT(*) FROM otr_sessions 
     WHERE DATE(started_at) = CURRENT_DATE AND status IN ('loading', 'selling')) AS active_otr_count,
    (SELECT COALESCE(SUM(total_revenue), 0) FROM otr_sessions 
     WHERE DATE(started_at) = CURRENT_DATE) AS total_otr_revenue_today,
    
    -- Inventory
    (SELECT SUM(quantity) FROM inventory_items WHERE status = 'ready') AS total_ready_stock,
    (SELECT SUM(quantity) FROM inventory_items WHERE status = 'raw') AS total_raw_stock,
    (SELECT SUM(quantity) FROM inventory_items 
     WHERE status = 'waste' AND DATE(created_at) = CURRENT_DATE) AS total_waste_today;

-- ============================================================================
-- END OF 10-queries-common.sql
-- ============================================================================
