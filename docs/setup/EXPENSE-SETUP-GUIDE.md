# 🚀 Expense Tracking Setup Guide

## Panduan Lengkap Setup Sistem Pengeluaran Outlet

**Tanggal:** 19 Mei 2026  
**Status:** Ready for Production

---

## 📋 Prerequisites

Sebelum memulai, pastikan Anda sudah memiliki:
- ✅ Akses ke Supabase Dashboard
- ✅ Project DonattourSYSTEM sudah running
- ✅ Tabel `outlets` dan `users` sudah ada
- ✅ Akses admin ke database

---

## 🔧 Step 1: Setup Database

### 1.1 Buka Supabase SQL Editor

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project **DonattourSYSTEM**
3. Klik menu **SQL Editor** di sidebar kiri
4. Klik **New Query**

### 1.2 Jalankan Schema SQL

Copy seluruh isi file `QueryDATABASE/11-schema-expenses.sql` dan paste ke SQL Editor, lalu klik **Run**.

File ini akan membuat:
- ✅ Tabel `expenses` dengan semua kolom
- ✅ 4 indexes untuk performance
- ✅ 2 database functions untuk summary
- ✅ Trigger untuk auto-update timestamp
- ✅ Row Level Security (RLS) policies

### 1.3 Verifikasi Database

Jalankan query berikut untuk memastikan semua berhasil:

```sql
-- Check table exists
SELECT 
    'expenses' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'expenses'
    ) as table_exists;

-- Check indexes (should return 4 indexes)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'expenses'
    AND schemaname = 'public';

-- Check functions (should return 2 functions)
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%expense%';

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'expenses';
```

**Expected Results:**
- ✅ Table exists: `true`
- ✅ Indexes: 4 rows
- ✅ Functions: 2 rows (`get_expense_daily_summary`, `get_expense_period_summary`)
- ✅ RLS enabled: `true`

---

## 🧪 Step 2: Test Database Functions

### 2.1 Test Daily Summary Function

```sql
-- Test with your actual outlet_id
SELECT * FROM get_expense_daily_summary(
    'your-outlet-uuid-here',
    CURRENT_DATE
);
```

**Expected Result:**
```
total_pengeluaran | jumlah_item | operasional | bahan_baku | gaji | ...
------------------|-------------|-------------|------------|------|----
0                 | 0           | 0           | 0          | 0    | ...
```

### 2.2 Test Period Summary Function

```sql
-- Test with your actual outlet_id
SELECT * FROM get_expense_period_summary(
    'your-outlet-uuid-here',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE
);
```

---

## 🎯 Step 3: Insert Sample Data (Optional)

Untuk testing, Anda bisa insert sample data:

```sql
-- Get outlet_id dan user_id dari database
SELECT 
    o.id as outlet_id,
    o.nama as outlet_nama,
    u.id as user_id,
    u.name as user_name
FROM outlets o
CROSS JOIN users u
WHERE o.is_active = true
    AND u.is_active = true
LIMIT 1;

-- Insert sample expenses (ganti UUID dengan hasil query di atas)
INSERT INTO expenses (outlet_id, tanggal, kategori, keterangan, jumlah, created_by)
VALUES
    ('outlet-uuid-here', CURRENT_DATE, 'bahan_baku', 'Tepung terigu 25kg', 175000, 'user-uuid-here'),
    ('outlet-uuid-here', CURRENT_DATE, 'bahan_baku', 'Gula pasir 10kg', 140000, 'user-uuid-here'),
    ('outlet-uuid-here', CURRENT_DATE, 'operasional', 'Gas LPG 3kg x 2', 44000, 'user-uuid-here'),
    ('outlet-uuid-here', CURRENT_DATE, 'gaji', 'Gaji harian 2 karyawan', 200000, 'user-uuid-here'),
    ('outlet-uuid-here', CURRENT_DATE, 'transportasi', 'Bensin motor', 50000, 'user-uuid-here');

-- Verify data inserted
SELECT 
    e.*,
    o.nama as outlet_nama,
    u.name as created_by_name
FROM expenses e
JOIN outlets o ON e.outlet_id = o.id
JOIN users u ON e.created_by = u.id
WHERE e.tanggal = CURRENT_DATE
ORDER BY e.created_at DESC;
```

---

## 🌐 Step 4: Test API Endpoints

### 4.1 Start Development Server

```bash
npm run dev
```

### 4.2 Test GET Endpoint

Buka browser atau Postman:

```
GET http://localhost:3000/api/expenses?outlet_id=your-outlet-uuid
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "outlet_id": "uuid",
      "tanggal": "2026-05-19",
      "kategori": "bahan_baku",
      "keterangan": "Tepung terigu 25kg",
      "jumlah": 175000,
      ...
    }
  ],
  "meta": {
    "count": 5,
    "limit": 50,
    "offset": 0
  }
}
```

### 4.3 Test POST Endpoint

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "outlet_id": "your-outlet-uuid",
    "tanggal": "2026-05-19",
    "kategori": "bahan_baku",
    "keterangan": "Test pengeluaran",
    "jumlah": 50000
  }'
```

### 4.4 Test Summary Endpoint

```
GET http://localhost:3000/api/expenses?outlet_id=your-outlet-uuid&summary=daily&tanggal=2026-05-19
```

---

## 🎨 Step 5: Test UI

### 5.1 Login ke Dashboard

1. Buka browser: `http://localhost:3000`
2. Login dengan user yang memiliki `outlet_id`

### 5.2 Navigate ke Pengeluaran Outlet

1. Klik menu **Pengeluaran Outlet** di sidebar
2. Atau langsung ke: `http://localhost:3000/dashboard/pengeluaran-outlet`

### 5.3 Test Features

**Test 1: View Expenses**
- ✅ Lihat list pengeluaran hari ini
- ✅ Summary cards menampilkan total dan jumlah item
- ✅ Setiap item menampilkan kategori dengan emoji dan warna

**Test 2: Add Expense**
- ✅ Klik tombol "+ Tambah"
- ✅ Form muncul dengan 3 fields: Keterangan, Jumlah, Kategori
- ✅ Pilih kategori (7 pilihan dengan emoji)
- ✅ Input keterangan: "Test pengeluaran"
- ✅ Input jumlah: 50000
- ✅ Klik "Simpan Pengeluaran"
- ✅ Item baru muncul di list
- ✅ Summary cards ter-update

**Test 3: Change Date**
- ✅ Ubah tanggal di date picker
- ✅ List ter-update sesuai tanggal
- ✅ Summary ter-update

**Test 4: Delete Expense**
- ✅ Klik icon 🗑️ di item
- ✅ Confirm dialog muncul
- ✅ Item terhapus dari list
- ✅ Summary ter-update

---

## 🔒 Step 6: Verify Security

### 6.1 Test RLS Policies

**Test 1: User hanya bisa lihat expense dari outlet sendiri**

```sql
-- Login sebagai user dari outlet A
-- Coba query expense dari outlet B
SELECT * FROM expenses WHERE outlet_id = 'outlet-b-uuid';
-- Expected: Empty result (tidak bisa lihat)
```

**Test 2: User hanya bisa insert untuk outlet sendiri**

```sql
-- Login sebagai user dari outlet A
-- Coba insert expense untuk outlet B
INSERT INTO expenses (outlet_id, tanggal, kategori, keterangan, jumlah, created_by)
VALUES ('outlet-b-uuid', CURRENT_DATE, 'operasional', 'Test', 50000, auth.uid());
-- Expected: Error (RLS policy violation)
```

**Test 3: User hanya bisa edit expense sendiri**

```sql
-- Login sebagai user A
-- Coba update expense yang dibuat user B
UPDATE expenses SET jumlah = 100000 WHERE created_by = 'user-b-uuid';
-- Expected: 0 rows updated
```

---

## 📊 Step 7: Integration with Dashboard

### 7.1 Update Dashboard Owner (Optional)

Tambahkan expense data ke dashboard owner untuk financial summary:

```typescript
// app/(dashboard)/dashboard/page.tsx
// Add expense summary to daily financial data

const expenseSummary = await fetch(
  `/api/expenses?outlet_id=${outletId}&summary=daily&tanggal=${date}`
);

// Display in dashboard cards
```

### 7.2 Update Laporan Outlet (Next Phase)

Expense data akan digunakan di laporan outlet untuk:
- Complete financial picture
- Profit/loss calculation
- Cost analysis

---

## ✅ Verification Checklist

Sebelum deploy ke production, pastikan semua checklist ini sudah ✅:

### Database
- [ ] Tabel `expenses` created
- [ ] 4 indexes created
- [ ] 2 functions working
- [ ] RLS policies active
- [ ] Trigger working
- [ ] Sample data inserted (optional)

### API
- [ ] GET /api/expenses working
- [ ] GET with filters working
- [ ] GET with summary working
- [ ] POST /api/expenses working
- [ ] PUT /api/expenses/[id] working
- [ ] DELETE /api/expenses/[id] working
- [ ] Authentication working
- [ ] Authorization working
- [ ] Error handling working

### UI
- [ ] Page loads without errors
- [ ] Date selector working
- [ ] Form validation working
- [ ] Submit creates expense
- [ ] List displays correctly
- [ ] Delete working
- [ ] Loading states working
- [ ] Error messages working
- [ ] Responsive on mobile

### Security
- [ ] RLS policies tested
- [ ] Users can't access other outlets
- [ ] Users can't edit others' expenses
- [ ] Delete restricted to 24 hours
- [ ] Owner has full access

### Performance
- [ ] Page loads < 2 seconds
- [ ] API response < 500ms
- [ ] No console errors
- [ ] No memory leaks

---

## 🚨 Troubleshooting

### Problem: Table not created
**Solution:**
```sql
-- Check if table exists
SELECT * FROM information_schema.tables WHERE table_name = 'expenses';

-- If not exists, run schema again
-- Make sure no syntax errors in SQL
```

### Problem: RLS blocking all queries
**Solution:**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Test queries
-- Then re-enable
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
```

### Problem: API returns 401 Unauthorized
**Solution:**
- Check if user is logged in
- Check auth cookie is present
- Check `getCurrentUserWithRole()` function

### Problem: API returns 403 Forbidden
**Solution:**
- Check if user has `outlet_id`
- Check if `outlet_id` matches request
- Check RLS policies

### Problem: UI not loading data
**Solution:**
- Check browser console for errors
- Check network tab for API calls
- Check if `user.outlet_id` is available
- Check API response format

---

## 📞 Support

Jika ada masalah:

1. **Check Logs:**
   - Supabase: Dashboard → Logs
   - API: Vercel/deployment logs
   - Browser: Console (F12)

2. **Check Documentation:**
   - `docs/features/EXPENSE-TRACKING.md`
   - `QueryDATABASE/11-schema-expenses.sql`

3. **Common Issues:**
   - RLS policies blocking queries
   - Missing outlet_id in user session
   - Date format mismatch
   - Authentication issues

---

## 🎉 Success!

Jika semua checklist ✅, sistem Pengeluaran Outlet sudah siap untuk:
- ✅ 500+ outlet
- ✅ Real-time tracking
- ✅ Secure multi-tenant
- ✅ Production ready

**Next Steps:**
1. Deploy to production
2. Train users
3. Monitor usage
4. Collect feedback
5. Plan Phase 2 enhancements

---

**Last Updated:** May 19, 2026  
**Version:** 1.0  
**Status:** ✅ Ready for Production
