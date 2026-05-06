# 📅 Standar Kolom Tanggal - Production Tracking System

## 🎯 Prinsip Desain

### 1. **TIMESTAMPTZ** untuk Data Transaksional
Gunakan `TIMESTAMPTZ` (timestamp with timezone) untuk:
- ✅ Data yang butuh waktu presisi (jam, menit, detik)
- ✅ Data yang bisa terjadi berkali-kali dalam sehari
- ✅ Audit trail dan tracking
- ✅ Data yang perlu timezone awareness

**Contoh:**
- `orders.created_at` - Kapan order dibuat
- `topping_errors.reported_at` - Kapan error dilaporkan
- `production_daily.created_at` - Kapan data input dibuat
- `users.created_at` - Kapan user terdaftar

### 2. **DATE** untuk Data Agregasi Harian
Gunakan `DATE` untuk:
- ✅ Data yang dikelompokkan per hari
- ✅ Summary/report harian
- ✅ Data yang hanya relevan per tanggal (bukan per jam)
- ✅ Business date (tanggal bisnis, bukan waktu teknis)

**Contoh:**
- `production_daily.tanggal` - Tanggal produksi (business date)
- `daily_closing.tanggal` - Tanggal closing (business date)
- `daily_loss_summary.tanggal` - Tanggal laporan (business date)
- `inventory_non_topping.production_date` - Tanggal produksi stok

---

## 📊 Mapping Tabel dalam Sistem

### ✅ Tabel dengan `DATE` (Business Date)
| Tabel | Kolom | Alasan |
|-------|-------|--------|
| `production_daily` | `tanggal` | Data produksi dikelompokkan per hari |
| `daily_closing` | `tanggal` | Closing dilakukan sekali per hari |
| `daily_loss_summary` | `tanggal` | Summary harian |
| `inventory_non_topping` | `production_date` | Stok dikelompokkan per tanggal produksi |

### ✅ Tabel dengan `TIMESTAMPTZ` (Transaction Time)
| Tabel | Kolom | Alasan |
|-------|-------|--------|
| `orders` | `created_at` | Order bisa terjadi kapan saja |
| `topping_errors` | `reported_at` | Error bisa dilaporkan kapan saja |
| `topping_usage` | `created_at` | Usage tracking per transaksi |
| `production_waste_details` | `created_at` | Audit trail |
| `closing_non_topping_status` | `created_at` | Audit trail |
| `closing_finished_products` | `created_at` | Audit trail |

---

## 🔄 Konversi Query Pattern

### ❌ SALAH - Match dengan DATE pada TIMESTAMPTZ
```typescript
// JANGAN LAKUKAN INI!
.match({ tanggal: '2026-05-06' })  // Gagal jika kolom adalah TIMESTAMPTZ
```

### ✅ BENAR - Range Query untuk TIMESTAMPTZ
```typescript
// Untuk kolom TIMESTAMPTZ (orders.created_at, topping_errors.reported_at)
const date = '2026-05-06';
.gte('created_at', `${date}T00:00:00`)
.lte('created_at', `${date}T23:59:59`)
```

### ✅ BENAR - Match untuk DATE
```typescript
// Untuk kolom DATE (production_daily.tanggal, daily_closing.tanggal)
.match({ tanggal: '2026-05-06' })
```

---

## 📝 Checklist Implementasi

### Tabel yang SUDAH BENAR ✅
- [x] `production_daily` - Pakai `tanggal` (DATE) + `created_at` (TIMESTAMPTZ)
- [x] `daily_closing` - Pakai `tanggal` (DATE) + `created_at` (TIMESTAMPTZ)
- [x] `daily_loss_summary` - Pakai `tanggal` (DATE) + `created_at` (TIMESTAMPTZ)
- [x] `inventory_non_topping` - Pakai `production_date` (DATE)
- [x] `topping_errors` - Pakai `reported_at` (TIMESTAMPTZ) + `created_at` (TIMESTAMPTZ)
- [x] `orders` - Pakai `created_at` (TIMESTAMPTZ)

### API Routes yang SUDAH DIPERBAIKI ✅
- [x] `/api/dashboard/daily` - Sudah pakai range query untuk `orders` dan `topping_errors`
- [x] `/api/production/daily` - Sudah pakai `.match({ tanggal })` untuk `production_daily`

---

## 🚀 Best Practices

### 1. Naming Convention
- **Business Date**: Gunakan nama `tanggal` (bahasa Indonesia)
- **Transaction Time**: Gunakan nama `created_at`, `updated_at`, `reported_at`, dll
- **Production Date**: Gunakan nama `production_date` untuk stok/inventory

### 2. Query Pattern
```typescript
// Pattern untuk DATE column
const queryDate = (table: string, dateColumn: string, date: string) => {
  return supabase
    .from(table)
    .select('*')
    .match({ [dateColumn]: date });
};

// Pattern untuk TIMESTAMPTZ column
const queryTimestamp = (table: string, timestampColumn: string, date: string) => {
  return supabase
    .from(table)
    .select('*')
    .gte(timestampColumn, `${date}T00:00:00`)
    .lte(timestampColumn, `${date}T23:59:59`);
};
```

### 3. Index Strategy
```sql
-- Untuk DATE column
CREATE INDEX idx_table_date ON table_name(tanggal DESC);

-- Untuk TIMESTAMPTZ column
CREATE INDEX idx_table_timestamp ON table_name(created_at DESC);

-- Composite index untuk filtering
CREATE INDEX idx_table_outlet_date ON table_name(outlet_id, tanggal);
```

---

## 📌 Kesimpulan

**Sistem sudah KONSISTEN dan OPTIMAL untuk jangka panjang!**

- ✅ Tabel agregasi harian pakai `DATE` (tanggal)
- ✅ Tabel transaksional pakai `TIMESTAMPTZ` (created_at, reported_at)
- ✅ API sudah disesuaikan dengan tipe kolom yang benar
- ✅ Index sudah optimal untuk kedua tipe kolom

**Tidak perlu migrasi besar-besaran**, hanya perlu memastikan:
1. Tabel `topping_errors` di database sudah pakai `reported_at` (TIMESTAMPTZ)
2. API query sudah pakai range query untuk TIMESTAMPTZ columns
3. Semua developer paham pattern ini untuk development selanjutnya

---

**Last Updated**: 2026-05-06  
**Status**: ✅ FINAL - Ready for Production
