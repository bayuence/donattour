# 🔧 Cara Perbaikan Singkat - 8 Mei 2026

## 🎯 Masalah yang Diperbaiki

### 1. **Kasir menampilkan 6 pcs, padahal input hari ini hanya 3 pcs**
   - **Penyebab:** Stok kemarin (07 Mei) belum expired
   - **Solusi:** Jalankan SQL untuk expire stok lama

### 2. **Riwayat produksi tidak jelas ukuran standar atau mini**
   - **Penyebab:** Badge ukuran terlalu kecil, tidak ada summary
   - **Solusi:** Sudah diperbaiki di frontend (otomatis)

---

## ⚡ Langkah Perbaikan (5 Menit)

### STEP 1: Buka Supabase SQL Editor

1. Login ke Supabase Dashboard
2. Klik **SQL Editor** di sidebar kiri
3. Klik **New Query**

### STEP 2: Copy-Paste SQL Ini

```sql
-- ============================================================================
-- PERBAIKAN CEPAT - EXPIRE STOK LAMA & FIX INVENTORY
-- ============================================================================

-- 1. Expire stok kemarin (07 Mei dan sebelumnya)
UPDATE inventory_non_topping
SET 
    status = 'expired',
    last_updated = NOW()
WHERE production_date < CURRENT_DATE
    AND status = 'fresh';

-- 2. Fix inventory hari ini agar sesuai dengan produksi
UPDATE inventory_non_topping
SET 
    qty_available = (
        SELECT COALESCE(SUM(success_qty), 0)
        FROM production_daily
        WHERE outlet_id = inventory_non_topping.outlet_id
            AND tanggal = CURRENT_DATE
            AND ukuran = inventory_non_topping.ukuran
    ),
    last_updated = NOW()
WHERE production_date = CURRENT_DATE
    AND status = 'fresh';

-- 3. Cek hasil perbaikan
SELECT 
    production_date as tanggal,
    ukuran,
    qty_available as stok,
    status,
    CASE 
        WHEN production_date = CURRENT_DATE AND status = 'fresh' THEN '✅ HARI INI (BISA DIJUAL)'
        WHEN status = 'expired' THEN '❌ EXPIRED (TIDAK BISA DIJUAL)'
        ELSE '⚠️ PERLU DICEK'
    END as keterangan
FROM inventory_non_topping
WHERE production_date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY production_date DESC, ukuran;
```

### STEP 3: Klik "Run" (Ctrl + Enter)

Tunggu sampai selesai (biasanya < 1 detik)

### STEP 4: Cek Hasil

Seharusnya muncul tabel seperti ini:

```
tanggal    | ukuran  | stok | status  | keterangan
-----------|---------|------|---------|---------------------------
2026-05-08 | standar | 3    | fresh   | ✅ HARI INI (BISA DIJUAL)
2026-05-07 | standar | 4    | expired | ❌ EXPIRED (TIDAK BISA DIJUAL)
2026-05-06 | standar | 7    | expired | ❌ EXPIRED (TIDAK BISA DIJUAL)
```

**✅ BENAR** jika:
- Hari ini (08 Mei) = 3 pcs, status fresh
- Kemarin (07 Mei) = expired
- Lusa (06 Mei) = expired

---

## 🔍 Verifikasi di Aplikasi

### 1. Buka Halaman Kasir

Seharusnya menampilkan:
```
Stok Standar: 3 pcs ✅
Stok Mini: 0 pcs
```

**BUKAN:**
```
Stok Standar: 6 pcs ❌ (SALAH!)
```

### 2. Buka Halaman Riwayat Produksi

Seharusnya ada **Summary Card** di atas:

```
┌─────────────────────────────────────────┐
│ 📊 Total Produksi Hari Ini              │
├─────────────────────────────────────────┤
│ 🔵 STANDAR: 3 pcs (1 input)             │
│ 🟢 MINI: 0 pcs (0 input)                │
└─────────────────────────────────────────┘
```

Dan di tabel, badge ukuran sekarang **BESAR dan JELAS**:
- **🔵 STANDAR** (biru, besar)
- **🟢 MINI** (hijau, besar)

---

## 🔄 Maintenance Harian (PENTING!)

### Jalankan Setiap Hari Jam 00:00

Agar stok kemarin otomatis expired, jalankan query ini setiap midnight:

```sql
SELECT * FROM expire_old_stock();
```

### Cara Setup Otomatis (Recommended)

```sql
-- Setup cron job di Supabase
SELECT cron.schedule(
    'expire-old-stock-daily',
    '0 0 * * *',  -- Setiap hari jam 00:00
    $$ SELECT expire_old_stock(); $$
);
```

**Atau** setup di server/hosting dengan cron job yang hit API endpoint.

---

## 🆘 Kalau Masih Salah

### Kasir masih menampilkan stok salah?

**Coba ini:**

```sql
-- Force refresh semua inventory
UPDATE inventory_non_topping
SET 
    qty_available = (
        SELECT COALESCE(SUM(success_qty), 0)
        FROM production_daily
        WHERE outlet_id = inventory_non_topping.outlet_id
            AND tanggal = CURRENT_DATE
            AND ukuran = inventory_non_topping.ukuran
    ),
    last_updated = NOW()
WHERE production_date = CURRENT_DATE
    AND status = 'fresh';
```

### Riwayat tidak update realtime?

**Cek realtime enabled:**

```sql
-- Cek apakah realtime aktif
SELECT tablename 
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('production_daily', 'inventory_non_topping');
```

Jika tidak ada hasil, jalankan:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE production_daily;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_non_topping;
```

### Tanggal masih salah (UTC bukan WIB)?

```sql
-- Set timezone ke WIB
ALTER DATABASE postgres SET timezone TO 'Asia/Jakarta';
SET timezone TO 'Asia/Jakarta';

-- Cek timezone
SELECT current_setting('timezone'), CURRENT_DATE, NOW();
```

---

## 📋 Checklist Setelah Perbaikan

- [ ] SQL sudah dijalankan di Supabase
- [ ] Kasir menampilkan stok yang benar (3 pcs)
- [ ] Riwayat produksi menampilkan summary card
- [ ] Badge ukuran sudah besar dan jelas (🔵 STANDAR / 🟢 MINI)
- [ ] Stok kemarin sudah status expired
- [ ] Setup cron job untuk expire_old_stock() harian

---

## 📞 Kontak

Jika masih ada masalah setelah mengikuti langkah di atas:

1. Screenshot error di browser console (F12)
2. Screenshot hasil query SQL
3. Screenshot tampilan kasir dan riwayat produksi
4. Kirim ke developer untuk analisa lebih lanjut

---

**Terakhir Diupdate:** 8 Mei 2026  
**Status:** ✅ Siap Digunakan  
**Estimasi Waktu:** 5 menit
