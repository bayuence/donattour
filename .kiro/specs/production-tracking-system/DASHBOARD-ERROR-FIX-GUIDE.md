# 🔧 Dashboard Error Fix Guide

## 🎯 Problem Summary

**Error:** `column topping_errors.tanggal does not exist`

**Root Cause:** 
- Tabel `topping_errors` di database masih menggunakan schema lama dengan kolom `tanggal` (DATE)
- API sudah diupdate untuk menggunakan `reported_at` (TIMESTAMPTZ)
- Terjadi mismatch antara schema database dan kode aplikasi

---

## 📋 Standar Kolom Tanggal (Sudah Konsisten!)

### ✅ Desain yang BENAR untuk Jangka Panjang:

| Tipe Data | Kapan Digunakan | Contoh Tabel |
|-----------|-----------------|--------------|
| **DATE** | Data agregasi harian, business date | `production_daily.tanggal`, `daily_closing.tanggal` |
| **TIMESTAMPTZ** | Data transaksional, butuh waktu presisi | `orders.created_at`, `topping_errors.reported_at` |

### 🎯 Kenapa `topping_errors` Pakai `reported_at` (TIMESTAMPTZ)?

**Alasan:**
1. ✅ Error topping bisa terjadi **berkali-kali dalam sehari**
2. ✅ Butuh tracking **kapan tepatnya** error dilaporkan (jam, menit)
3. ✅ Untuk audit trail dan analisis pattern error
4. ✅ Konsisten dengan tabel transaksional lain (`orders`, `topping_usage`)

**Tabel Agregasi Harian** seperti `production_daily`, `daily_closing`, `daily_loss_summary` tetap pakai `tanggal` (DATE) karena:
- ✅ Data dikelompokkan per hari (bukan per jam)
- ✅ Hanya ada 1 record per outlet per hari
- ✅ Lebih efisien untuk query dan index

---

## 🔍 Step 1: Verifikasi Schema

**Jalankan script ini di Supabase SQL Editor:**

File: `QueryDATABASE/FIX-TOPPING-ERRORS-SIMPLE.sql`

```sql
-- Cek kolom yang ada di tabel topping_errors
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'topping_errors'
ORDER BY ordinal_position;

-- Cek status schema
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'topping_errors' AND column_name = 'tanggal'
        ) THEN '❌ OLD SCHEMA - Must migrate'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'topping_errors' AND column_name = 'reported_at'
        ) THEN '✅ NEW SCHEMA - Correct'
        ELSE '⚠️  TABLE NOT FOUND'
    END as schema_status;
```

---

## 🔧 Step 2: Fix Schema (Jika Perlu)

### Jika Hasil: "❌ OLD SCHEMA"

**Jalankan migration script:**

File: `QueryDATABASE/31-production-tracking-system-migration-topping-errors.sql`

Script ini akan:
1. ✅ Backup data lama (jika ada)
2. ✅ Drop tabel lama
3. ✅ Create tabel baru dengan schema yang benar
4. ✅ Create indexes yang optimal
5. ✅ (Optional) Restore data lama

**Atau jalankan manual:**

```sql
-- Backup data (jika ada)
CREATE TEMP TABLE topping_errors_backup AS 
SELECT * FROM topping_errors;

-- Drop old table
DROP TABLE IF EXISTS topping_errors CASCADE;

-- Create new table
CREATE TABLE topping_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_ordered VARCHAR(100) NOT NULL,
    product_made VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    reason TEXT NOT NULL CHECK (LENGTH(TRIM(reason)) >= 10),
    hpp_per_pcs DECIMAL(12,2) NOT NULL CHECK (hpp_per_pcs > 0),
    topping_cost DECIMAL(12,2) NOT NULL CHECK (topping_cost >= 0),
    total_hpp_loss DECIMAL(12,2) NOT NULL CHECK (total_hpp_loss > 0),
    reported_by UUID REFERENCES users(id),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_topping_errors_outlet ON topping_errors(outlet_id);
CREATE INDEX idx_topping_errors_reported_by ON topping_errors(reported_by);
CREATE INDEX idx_topping_errors_date ON topping_errors(reported_at DESC);
```

### Jika Hasil: "✅ NEW SCHEMA"

Schema sudah benar! Lanjut ke Step 3.

---

## 🧪 Step 3: Test Dashboard

1. **Restart aplikasi Next.js** (jika running)
   ```bash
   # Stop dan start ulang dev server
   npm run dev
   ```

2. **Clear browser cache**
   - Tekan `Ctrl + Shift + R` (Windows/Linux)
   - Tekan `Cmd + Shift + R` (Mac)

3. **Buka dashboard**
   - Navigate ke: `/dashboard`
   - Pilih tanggal hari ini
   - Klik refresh button

4. **Cek console browser**
   - Tekan `F12` untuk buka DevTools
   - Tab "Console"
   - Seharusnya tidak ada error lagi

---

## ✅ Expected Result

### Dashboard Berhasil Load:

```
✅ Financial Summary Cards muncul
✅ Production & Sales metrics tampil
✅ Loss Breakdown chart render
✅ Sales by Product chart render
✅ Recommendations panel muncul
✅ No errors di console
```

### Jika Masih Error:

**Cek di console browser:**
- Error message apa yang muncul?
- Apakah masih error `tanggal does not exist`?
- Atau error lain?

**Cek di Supabase:**
- Buka Table Editor
- Cek tabel `topping_errors`
- Pastikan kolom `reported_at` ada (bukan `tanggal`)

---

## 📊 Query Pattern Reference

### ✅ BENAR - Query untuk topping_errors (TIMESTAMPTZ)

```typescript
// API: app/api/dashboard/daily/route.ts
const date = '2026-05-06';

supabase
  .from('topping_errors')
  .select('*')
  .match(outletFilter)  // { outlet_id: 'xxx' } atau {}
  .gte('reported_at', `${date}T00:00:00`)
  .lte('reported_at', `${date}T23:59:59`)
```

### ✅ BENAR - Query untuk production_daily (DATE)

```typescript
// API: app/api/production/daily/route.ts
const date = '2026-05-06';

supabase
  .from('production_daily')
  .select('*')
  .match({ outlet_id, tanggal: date })
```

---

## 📝 Files Modified

### SQL Files:
- ✅ `QueryDATABASE/31-production-tracking-system.sql` - Schema utama (sudah benar)
- ✅ `QueryDATABASE/31-production-tracking-system-migration-topping-errors.sql` - Migration script
- ✅ `QueryDATABASE/FIX-TOPPING-ERRORS-SIMPLE.sql` - Verification script

### API Files:
- ✅ `app/api/dashboard/daily/route.ts` - Dashboard API (sudah diperbaiki)
- ✅ `app/dashboard/page.tsx` - Dashboard page (error handling improved)

### Documentation:
- ✅ `.kiro/specs/production-tracking-system/DATE-COLUMN-STANDARD.md` - Standar kolom tanggal
- ✅ `.kiro/specs/production-tracking-system/DASHBOARD-ERROR-FIX-GUIDE.md` - Guide ini

---

## 🎯 Kesimpulan

**Sistem sudah KONSISTEN dan OPTIMAL:**

1. ✅ **Tabel transaksional** (`topping_errors`, `orders`) pakai **TIMESTAMPTZ**
2. ✅ **Tabel agregasi harian** (`production_daily`, `daily_closing`) pakai **DATE**
3. ✅ **API queries** sudah disesuaikan dengan tipe kolom yang benar
4. ✅ **Indexes** sudah optimal untuk performa
5. ✅ **Desain scalable** untuk jangka panjang

**Tinggal execute migration di database, lalu dashboard akan berfungsi normal!** 🚀

---

**Last Updated**: 2026-05-06  
**Status**: Ready to Execute
