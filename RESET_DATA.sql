-- Delete semua production & inventory data untuk reset
DELETE FROM production_waste_details;
DELETE FROM production_daily;
DELETE FROM inventory_non_topping;
DELETE FROM inventory_sync_log;

-- Verify
SELECT 'production_daily', COUNT(*) FROM production_daily
UNION ALL
SELECT 'inventory_non_topping', COUNT(*) FROM inventory_non_topping
UNION ALL
SELECT 'inventory_sync_log', COUNT(*) FROM inventory_sync_log
UNION ALL
SELECT 'production_waste_details', COUNT(*) FROM production_waste_details;
