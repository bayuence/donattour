# 🔍 DEBUG: Stok Tidak Sinkron

## Masalah
- Input Produksi: **Standar 3 pcs**
- Badge Kasir: **Standar 0 PCS** ❌

---

## Kemungkinan Penyebab

### 1. **Data Tidak Masuk ke `inventory_non_topping`**
Fungsi `syncInventoryAfterProduction` tidak jalan atau gagal.

**Cara Cek:**
```sql
-- Cek data di inventory_non_topping untuk hari ini
SELECT * FROM inventory_non_topping
WHERE outlet_id = 'OUTLET_ID_ANDA'
AND production_date = '2026-06-10'
ORDER BY last_updated DESC;
```

### 2. **Tanggal Tidak Match**
Produksi menggunakan tanggal '2026-06-10' tapi kasir cek tanggal '2026-06-09'.

**Cara Cek:**
```sql
-- Cek data produksi hari ini
SELECT id, outlet_id, tanggal, ukuran, success_qty, created_at
FROM production_daily
WHERE outlet_id = 'OUTLET_ID_ANDA'
AND tanggal = '2026-06-10'
ORDER BY created_at DESC;
```

### 3. **Idempotency Log Blocking**
Production_id sudah di-sync sebelumnya, jadi di-skip.

**Cara Cek:**
```sql
-- Cek sync log
SELECT * FROM inventory_sync_log
WHERE outlet_id = 'OUTLET_ID_ANDA'
ORDER BY created_at DESC
LIMIT 10;
```

### 4. **Browser Cache** (Unlikely tapi mungkin)
Data sudah benar di server tapi browser pakai cache lama.

**Fix:** Hard refresh dengan Ctrl+Shift+R

---

## Solusi Sementara (Manual Sync)

Jika data produksi ada tapi inventory kosong, jalankan query ini:

```sql
-- Manual insert inventory dari produksi hari ini
INSERT INTO inventory_non_topping (outlet_id, ukuran, qty_available, production_date, status, last_updated)
SELECT 
  outlet_id,
  ukuran,
  success_qty as qty_available,
  tanggal as production_date,
  'fresh' as status,
  NOW() as last_updated
FROM production_daily
WHERE outlet_id = 'OUTLET_ID_ANDA'
AND tanggal = '2026-06-10'
AND success_qty > 0
ON CONFLICT (outlet_id, ukuran, production_date, status) 
DO UPDATE SET 
  qty_available = inventory_non_topping.qty_available + EXCLUDED.qty_available,
  last_updated = NOW();
```

---

## Langkah Debug

1. **Buka Browser Console** (F12)
2. **Lihat console log** saat buka kasir, cari:
   ```
   [validateStockForPOS] Productions found: X
   [validateStockForPOS] ✅ Stocks HARI INI found: X for date: 2026-06-10
   [validateStockForPOS] ✅ Final stock HARI INI: { standar_qty: 0, mini_qty: 0 }
   ```

3. **Cek Network Tab**
   - Request: `GET /api/inventory/validate?outlet_id=xxx`
   - Response: Lihat `stock_summary.standar.qty_available`

4. **Cek Database Langsung** via Supabase Dashboard
   - Table: `inventory_non_topping`
   - Filter: outlet_id + production_date today
   - Lihat apakah ada data

---

## Fix Permanent

Jika masalahnya adalah fungsi sync tidak jalan, kita perlu:

1. **Tambah error handling** yang lebih baik di `syncInventoryAfterProduction`
2. **Retry mechanism** jika sync gagal
3. **Notification** ke admin jika sync error
4. **Manual sync button** di UI Input Produksi

---

Silakan jalankan query SQL di atas dan screenshot hasilnya agar saya bisa diagnose lebih lanjut.
