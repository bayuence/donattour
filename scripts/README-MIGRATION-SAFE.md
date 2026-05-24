# 🔒 SAFE MIGRATION GUIDE - Expense Module v2.0

## 📋 Overview

Migration script yang **AMAN** untuk upgrade database expense module ke v2.0.

**Dirancang untuk:**
- ✅ Proyek PT dengan 10,000+ outlets
- ✅ Database production yang sudah ada data
- ✅ Zero downtime migration
- ✅ Tidak merusak data existing

---

## 🎯 3 LANGKAH MUDAH

### **LANGKAH 1: Cek Database Anda**

Jalankan checker untuk melihat kondisi database saat ini:

```bash
npm run check:db
```

**Output yang akan Anda lihat:**
- ✅ Table expenses: EXISTS dengan X kolom
- ⚠️ Missing v2.0 columns: status, approved_by, dll
- ⚠️ Table expense_audit_logs: MISSING
- ⚠️ Table outlet_expense_budgets: MISSING

**File report:** `scripts/database-schema-report.json`

---

### **LANGKAH 2: Review Migration Plan**

Script akan otomatis:
1. Cek database Anda
2. Tampilkan apa yang akan ditambahkan
3. Minta konfirmasi sebelum eksekusi

**Yang AKAN ditambahkan:**
- Kolom baru di table `expenses` (jika belum ada)
- Table `expense_audit_logs` (jika belum ada)
- Table `outlet_expense_budgets` (jika belum ada)
- Indexes untuk performance
- Functions untuk budget tracking
- Triggers untuk audit logging

**Yang TIDAK akan diubah:**
- ❌ Data existing tidak akan dihapus
- ❌ Kolom existing tidak akan dimodifikasi
- ❌ Table existing tidak akan di-drop

---

### **LANGKAH 3: Jalankan Migration**

```bash
npm run migrate:expenses
```

**Proses:**
1. 🔌 Connect ke Supabase
2. 🔍 Check database state
3. 📋 Preview perubahan
4. ❓ Minta konfirmasi (y/n)
5. 🚀 Execute migration (10-30 detik)
6. ✅ Verify hasil

**Jika sukses:**
```
🎉 MIGRATION COMPLETE
Database berhasil di-upgrade ke v2.0!
```

**Jika gagal:**
```
❌ MIGRATION FAILED
Database tetap aman, tidak ada perubahan yang diterapkan.
```

---

## 🔧 Troubleshooting

### Problem 1: "exec_sql function not found"

**Solusi:**
1. Buka Supabase Dashboard → SQL Editor
2. Copy paste isi file: `scripts/supabase-exec.sql`
3. Klik "Run"
4. Jalankan ulang migration

---

### Problem 2: "Missing Supabase credentials"

**Solusi:**
Pastikan file `.env.local` ada dan berisi:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

**PENTING:** Gunakan `SUPABASE_SERVICE_ROLE_KEY`, bukan `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Problem 3: "Table expenses not found"

**Kemungkinan:**
- Database belum di-setup
- Salah project Supabase
- Credentials salah

**Solusi:**
1. Cek Supabase Dashboard → Table Editor
2. Pastikan table `expenses` ada
3. Cek URL dan credentials di `.env.local`

---

### Problem 4: Migration stuck atau timeout

**Solusi:**
1. Stop script (Ctrl+C)
2. Cek Supabase Dashboard → Logs
3. Jalankan manual di SQL Editor:
   - Copy isi file: `QueryDATABASE/11-schema-expenses-v2-migration.sql`
   - Paste di SQL Editor
   - Klik "Run"

---

## 📊 Verification

Setelah migration, verify dengan:

```bash
npm run check:db
```

**Expected output:**
```
✅ Table "expenses" EXISTS with X columns
✅ All v2.0 columns present
✅ Table "expense_audit_logs" EXISTS
✅ Table "outlet_expense_budgets" EXISTS
```

---

## 🎯 Next Steps

Setelah migration sukses:

1. **Test di browser:**
   - Buka: `/dashboard/pengeluaran-outlet`
   - Pilih outlet
   - Test input pengeluaran
   - Cek apakah data tersimpan

2. **Review changelog:**
   - File: `CHANGELOG_EXPENSE_V2.md`

3. **Baca dokumentasi:**
   - File: `.kiro/IMPLEMENTATION_PLAN_EXPENSE_ENTERPRISE.md`

---

## 🔒 Safety Features

Script ini memiliki safety features:

1. **Preview Before Execute**
   - Tampilkan perubahan sebelum eksekusi
   - Minta konfirmasi user

2. **Check Database First**
   - Cek kondisi database sebelum migration
   - Hanya tambah yang belum ada

3. **No Data Loss**
   - Tidak ada DELETE statement
   - Tidak ada DROP statement
   - Hanya ADD COLUMN dan CREATE TABLE

4. **Verification**
   - Auto verify setelah migration
   - Report hasil ke console

5. **Error Handling**
   - Rollback otomatis jika error
   - Database tetap aman

---

## 📞 Support

Jika ada masalah:

1. Jalankan: `npm run check:db`
2. Cek file: `scripts/database-schema-report.json`
3. Screenshot error message
4. Cek Supabase Dashboard → Logs

---

## 📝 Files

- `scripts/check-database-schema.js` - Database checker
- `scripts/migrate-expenses-safe.js` - Safe migration script
- `scripts/supabase-exec.sql` - Helper function untuk Supabase
- `QueryDATABASE/11-schema-expenses-v2-migration.sql` - Migration SQL
- `scripts/database-schema-report.json` - Report hasil check (auto-generated)

---

## ⚠️ IMPORTANT NOTES

1. **Backup First (Optional but Recommended)**
   - Supabase otomatis backup daily
   - Untuk extra safety, export data manual dari Dashboard

2. **Service Role Key**
   - Migration butuh `SUPABASE_SERVICE_ROLE_KEY`
   - Jangan commit key ini ke Git
   - Simpan di `.env.local` (sudah di .gitignore)

3. **Production Safety**
   - Script ini aman untuk production
   - Tidak ada downtime
   - Backward compatible dengan kode existing

4. **Rollback**
   - Jika perlu rollback, jalankan SQL manual di Supabase
   - Drop table yang baru dibuat
   - Drop column yang baru ditambahkan

---

**Last Updated:** 2026-05-20  
**Version:** 2.0  
**Author:** Kiro AI
