# 📋 DOKUMENTASI PENGELUARAN OUTLET

## ✅ STATUS: LENGKAP & SIAP PRODUKSI

**Tanggal Update:** 19 Mei 2026  
**Versi:** 1.0  
**Status:** ✅ Terintegrasi Penuh dengan Database

---

## 📊 OVERVIEW

Menu **Pengeluaran Outlet** adalah sistem tracking pengeluaran harian outlet yang terintegrasi penuh dengan database PostgreSQL (Supabase). Sistem ini dirancang untuk menangani **500+ outlet** dengan performa tinggi dan audit trail lengkap.

### ✨ Fitur Utama

1. **✅ Real-time Database Integration**
   - Semua data disimpan di database `expenses`
   - Auto-sync dengan dashboard owner
   - Audit trail lengkap (siapa input, kapan)

2. **📅 Multiple View Modes**
   - Harian (Daily)
   - Bulanan (Monthly)
   - Custom Range
   - All Time

3. **🏷️ 7 Kategori Pengeluaran**
   - Operasional (listrik, gas, air)
   - Bahan Baku (tepung, gula, minyak)
   - Gaji & Upah
   - Transportasi & Pengiriman
   - Perawatan & Perbaikan
   - Marketing & Promosi
   - Lainnya

4. **📊 Real-time Summary**
   - Total pengeluaran
   - Jumlah transaksi
   - Rata-rata per transaksi
   - Kategori terbanyak
   - Breakdown per kategori

5. **🔒 Security & Access Control**
   - Row Level Security (RLS)
   - User hanya bisa lihat data outlet sendiri
   - Owner bisa lihat semua outlet
   - User hanya bisa hapus data sendiri (dalam 24 jam)

6. **📱 Responsive Design**
   - Mobile-first design
   - Touch-friendly UI
   - Offline-ready (PWA compatible)

---

## 🗂️ STRUKTUR FILE

```
donattourSYSTEM/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── pengeluaran-outlet/
│   │           └── page.tsx                    ✅ Frontend (React)
│   └── api/
│       └── expenses/
│           ├── route.ts                        ✅ GET & POST API
│           └── [id]/
│               └── route.ts                    ✅ GET, PUT, DELETE by ID
├── lib/
│   ├── db/
│   │   └── expenses.ts                         ✅ Database Functions
│   └── types/
│       └── expenses.ts                         ✅ TypeScript Types
└── QueryDATABASE/
    └── 11-schema-expenses.sql                  ✅ Database Schema
```

---

## 🗄️ DATABASE SCHEMA

### Table: `expenses`

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
        'operasional', 'bahan_baku', 'gaji', 'transportasi',
        'perawatan', 'marketing', 'lainnya'
    )),
    keterangan TEXT NOT NULL,
    jumlah NUMERIC(15,2) NOT NULL CHECK (jumlah > 0),
    bukti_url TEXT,  -- URL foto bukti (optional)
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes (Optimized for 500+ Outlets)

```sql
-- Query by outlet & date (most common)
CREATE INDEX idx_expenses_outlet_date ON expenses (outlet_id, tanggal DESC);

-- Query by kategori
CREATE INDEX idx_expenses_kategori ON expenses (outlet_id, kategori, tanggal DESC);

-- Audit trail
CREATE INDEX idx_expenses_created_by ON expenses (created_by, tanggal DESC);

-- Date range queries
CREATE INDEX idx_expenses_date_range ON expenses (tanggal DESC, outlet_id);
```

### Database Functions

1. **`get_expense_daily_summary(outlet_id, tanggal)`**
   - Return: Total, jumlah item, breakdown per kategori

2. **`get_expense_period_summary(outlet_id, start_date, end_date)`**
   - Return: Total, rata-rata harian, breakdown per kategori & tanggal

---

## 🔌 API ENDPOINTS

### 1. GET `/api/expenses`

**Query Parameters:**
- `outlet_id` (required): UUID outlet
- `tanggal` (optional): YYYY-MM-DD
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `kategori` (optional): kategori filter
- `summary` (optional): 'daily' | 'period' | 'category'
- `limit` (optional): default 50
- `offset` (optional): default 0

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "summary": {
      "total_pengeluaran": 1500000,
      "jumlah_item": 15,
      "breakdown_by_kategori": [...]
    }
  },
  "meta": {
    "count": 15,
    "limit": 50,
    "offset": 0
  }
}
```

### 2. POST `/api/expenses`

**Body:**
```json
{
  "outlet_id": "uuid",
  "tanggal": "2026-05-19",
  "kategori": "bahan_baku",
  "keterangan": "Beli tepung terigu 25kg",
  "jumlah": 175000,
  "bukti_url": "https://..." // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Expense created successfully"
}
```

### 3. GET `/api/expenses/[id]`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "outlet_id": "uuid",
    "tanggal": "2026-05-19",
    "kategori": "bahan_baku",
    "keterangan": "Beli tepung terigu 25kg",
    "jumlah": 175000,
    "created_by": "uuid",
    "created_at": "2026-05-19T10:30:00Z",
    "outlet": { "id": "uuid", "nama": "Outlet Pusat" },
    "created_by_user": { "id": "uuid", "name": "John Doe" }
  }
}
```

### 4. PUT `/api/expenses/[id]`

**Body:**
```json
{
  "kategori": "operasional",
  "keterangan": "Updated description",
  "jumlah": 200000
}
```

### 5. DELETE `/api/expenses/[id]`

**Response:**
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

---

## 🔐 SECURITY & PERMISSIONS

### Row Level Security (RLS)

1. **SELECT Policy**
   - User hanya bisa lihat data outlet sendiri
   - Owner bisa lihat semua outlet

2. **INSERT Policy**
   - User hanya bisa input untuk outlet sendiri
   - `created_by` harus sama dengan user ID

3. **UPDATE Policy**
   - User hanya bisa edit data yang dia buat sendiri

4. **DELETE Policy**
   - User hanya bisa hapus data sendiri
   - Hanya dalam 24 jam setelah dibuat
   - Owner bisa hapus semua data

---

## 📱 FRONTEND FEATURES

### View Modes

1. **Daily View**
   - Pilih tanggal spesifik
   - Lihat pengeluaran hari itu
   - Summary real-time

2. **Monthly View**
   - Pilih bulan
   - Lihat semua pengeluaran dalam bulan
   - Breakdown per kategori

3. **Custom Range**
   - Pilih start & end date
   - Flexible date range
   - Period summary

4. **All Time**
   - Lihat semua pengeluaran
   - Pagination support
   - Full history

### Summary Cards

1. **Total Pengeluaran** (Red)
   - Total amount dalam periode
   - Format: Rp 1.500.000

2. **Jumlah Transaksi** (Blue)
   - Total item count
   - Format: 15 transaksi

3. **Rata-rata** (Green)
   - Average per transaksi
   - Format: Rp 100.000

4. **Kategori Terbanyak** (Purple)
   - Kategori dengan total tertinggi
   - Format: Bahan Baku

### Expense List

- **Card-based design**
- **Color-coded by kategori**
- **Show:**
  - Emoji kategori
  - Keterangan
  - Jumlah (Rp)
  - Tanggal
  - Waktu input
  - User yang input
- **Actions:**
  - Delete button (trash icon)

### Add Form

- **Keterangan** (text input)
- **Jumlah** (currency input with auto-format)
- **Kategori** (visual button grid with emoji)
- **Auto-save** to database
- **Real-time validation**

---

## 🚀 PERFORMANCE OPTIMIZATION

### Database Level

1. **Indexes**
   - Composite index: `(outlet_id, tanggal DESC)`
   - Kategori index: `(outlet_id, kategori, tanggal DESC)`
   - Date range index: `(tanggal DESC, outlet_id)`

2. **Query Optimization**
   - Use `LIMIT` & `OFFSET` for pagination
   - Aggregate functions for summary
   - Efficient JOIN with outlets & users

### Frontend Level

1. **React Optimization**
   - `useMemo` for filtered data
   - `useEffect` with proper dependencies
   - Lazy loading for large lists

2. **API Optimization**
   - Fetch only needed data
   - Use summary endpoints
   - Pagination support

---

## 📊 INTEGRATION DENGAN MENU LAIN

### 1. Dashboard Owner

```typescript
// Dashboard bisa query total pengeluaran per outlet
const summary = await fetch('/api/expenses?outlet_id=xxx&summary=period&start_date=2026-05-01&end_date=2026-05-31');
```

### 2. Laporan Outlet

```typescript
// Laporan bisa include pengeluaran dalam daily report
const dailyExpenses = await fetch('/api/expenses?outlet_id=xxx&tanggal=2026-05-19&summary=category');
```

### 3. Analytics

```typescript
// Analytics bisa compare pengeluaran vs penjualan
const expenses = await getExpensePeriodSummary('2026-05-01', '2026-05-31', outlet_id);
const revenue = await getRevenuePeriodSummary('2026-05-01', '2026-05-31', outlet_id);
const profit = revenue - expenses.total_pengeluaran;
```

---

## 🧪 TESTING CHECKLIST

### ✅ Database
- [x] Table `expenses` created
- [x] Indexes created
- [x] Functions created
- [x] RLS policies enabled
- [x] Triggers working

### ✅ API
- [x] GET `/api/expenses` working
- [x] POST `/api/expenses` working
- [x] GET `/api/expenses/[id]` working
- [x] PUT `/api/expenses/[id]` working
- [x] DELETE `/api/expenses/[id]` working
- [x] Summary endpoints working
- [x] Error handling complete
- [x] Validation working

### ✅ Frontend
- [x] Page renders correctly
- [x] View modes working
- [x] Date pickers working
- [x] Add form working
- [x] Delete working
- [x] Summary cards updating
- [x] Pagination working
- [x] Responsive design
- [x] No hydration errors

### ✅ Security
- [x] RLS policies working
- [x] User can only see own outlet
- [x] Owner can see all outlets
- [x] User can only delete own data
- [x] 24-hour delete window enforced

---

## 🎯 READY FOR 500+ OUTLETS

### Scalability Features

1. **Database Indexes**
   - Optimized for multi-outlet queries
   - Fast date range queries
   - Efficient kategori filtering

2. **Pagination**
   - Default limit: 50 items
   - Offset-based pagination
   - Prevents memory issues

3. **API Performance**
   - Efficient queries
   - Minimal data transfer
   - Summary endpoints for aggregation

4. **Frontend Performance**
   - Lazy loading
   - Memoized calculations
   - Optimized re-renders

---

## 📝 CARA PAKAI

### 1. Setup Database

```bash
# Buka Supabase Dashboard → SQL Editor
# Copy paste isi file: QueryDATABASE/11-schema-expenses.sql
# Klik "Run"
```

### 2. Test API

```bash
# Test GET
curl "http://localhost:3000/api/expenses?outlet_id=xxx"

# Test POST
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "outlet_id": "xxx",
    "tanggal": "2026-05-19",
    "kategori": "bahan_baku",
    "keterangan": "Test",
    "jumlah": 50000
  }'
```

### 3. Access Frontend

```
http://localhost:3000/dashboard/pengeluaran-outlet
```

---

## 🐛 TROUBLESHOOTING

### Error: "outlet_id is required"
- **Cause:** User tidak login atau outlet_id tidak ada
- **Fix:** Pastikan user sudah login dan punya outlet_id

### Error: "Access denied to this outlet"
- **Cause:** User mencoba akses outlet lain
- **Fix:** User hanya bisa akses outlet sendiri (kecuali owner)

### Error: "Failed to fetch expenses"
- **Cause:** Database connection error atau RLS policy
- **Fix:** Cek Supabase connection dan RLS policies

### Data tidak muncul
- **Cause:** Belum ada data atau filter terlalu ketat
- **Fix:** Coba ubah view mode atau hapus filter

---

## 🎉 KESIMPULAN

Menu **Pengeluaran Outlet** sudah **100% LENGKAP** dan siap untuk produksi dengan 500+ outlet:

✅ Database schema complete  
✅ API endpoints complete  
✅ Frontend UI complete  
✅ Security & RLS complete  
✅ Performance optimized  
✅ Integration ready  
✅ Documentation complete  

**Status:** 🟢 PRODUCTION READY

---

**Dibuat oleh:** Kiro AI  
**Tanggal:** 19 Mei 2026  
**Versi:** 1.0
