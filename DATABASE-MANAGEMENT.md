# 🗄️ DATABASE MANAGEMENT GUIDE

## 📋 Overview

Sistem manajemen database otomatis untuk:
- ✅ Audit database lengkap
- ✅ Deteksi table/kolom yang tidak dipakai
- ✅ Deteksi duplikasi dan inkonsistensi
- ✅ Cleanup otomatis yang aman
- ✅ Kiro AI punya akses penuh untuk development

---

## 🚀 SETUP (WAJIB DILAKUKAN DULU)

### Step 1: Upgrade `exec_sql` Function

Buka **Supabase Dashboard → SQL Editor**, lalu:

1. Copy paste isi file: `scripts/supabase-exec-FULL.sql`
2. Klik **"Run"**
3. Tunggu sampai muncul: ✅ EXEC_SQL FUNCTION UPGRADED!

**Ini memberikan Kiro AI akses penuh untuk:**
- Baca semua table schema
- Baca semua kolom dan tipe data
- Baca indexes, constraints, functions
- Execute query dan dapat hasil

---

## 🔍 AUDIT DATABASE

### Jalankan Audit:

```bash
npm run audit:db
```

**Apa yang di-audit:**
1. ✅ **Semua table** - berapa kolom, berapa row
2. ✅ **Table usage** - dipakai di code atau tidak
3. ✅ **Empty tables** - table yang kosong
4. ✅ **Field mismatches** - nama kolom tidak konsisten
5. ✅ **Missing indexes** - perlu index untuk performance
6. ✅ **Orphaned records** - data yang tidak punya relasi

**Output:**
```
📋 TABLE ANALYSIS
✅ users                                      1,234 rows   ✓ USED
✅ outlets                                    5,678 rows   ✓ USED
✅ expenses                                      45 rows   ✓ USED
⚠️  old_transactions                            0 rows   ❌ NOT USED IN CODE
📭 temp_data                                     0 rows   ⚠️  EMPTY

💡 RECOMMENDATIONS
🗑️  UNUSED TABLES (consider removing):
   • old_transactions
   • temp_data

⚠️  FIELD NAME INCONSISTENCY:
   • expenses table uses "recorded_by_user_id"
   • Code expects "created_by"
   • Recommendation: Add alias or update code
```

**Report disimpan di:** `scripts/database-audit-report.json`

---

## 🧹 CLEANUP DATABASE

### Jalankan Cleanup:

```bash
npm run cleanup:db
```

**Apa yang dilakukan:**

### 1. **Fix Field Mismatches (AUTO)**
   - Deteksi kolom yang namanya beda dengan code
   - Buat alias otomatis
   - Contoh: `created_by` → alias untuk `recorded_by_user_id`

### 2. **Remove Unused Tables (MANUAL CONFIRM)**
   - Tampilkan table yang tidak dipakai
   - Minta konfirmasi sebelum hapus
   - **PERMANENT** - pastikan backup dulu!

### 3. **Clean Orphaned Records (SAFE)**
   - Hapus data yang tidak punya relasi
   - Contoh: expenses tanpa outlet_id yang valid

**Contoh Output:**
```
🔴 HIGH PRIORITY FIXES

⚠️  Field mismatch in table: expenses
   Issue: recorded_by_user_id vs created_by
   Action: Add alias for compatibility
   
   Fix this automatically? (y/n): y
   ✅ Fixed! Added created_by alias

🟡 MEDIUM PRIORITY - UNUSED TABLES

The following tables are not used in your code:
   • old_transactions
   • temp_data

⚠️  WARNING: Removing tables is PERMANENT!
   Make sure you have a backup before proceeding.

Do you want to remove unused tables? (y/n): y

🗑️  Removing table: old_transactions
   ✅ Removed successfully
```

---

## 🔄 WORKFLOW RECOMMENDED

### Setiap Minggu:

```bash
# 1. Audit database
npm run audit:db

# 2. Review report
cat scripts/database-audit-report.json

# 3. Cleanup jika perlu
npm run cleanup:db
```

### Sebelum Deploy Production:

```bash
# 1. Audit
npm run audit:db

# 2. Pastikan tidak ada unused tables
# 3. Pastikan tidak ada field mismatches
# 4. Cleanup jika aman
npm run cleanup:db
```

### Setelah Tambah Fitur Baru:

```bash
# 1. Audit untuk cek table baru
npm run audit:db

# 2. Pastikan table terdeteksi "USED"
# 3. Jika tidak, update code untuk reference table
```

---

## 🎯 BENEFITS

### Untuk Development:

1. **Kiro AI bisa auto-detect schema**
   - Tidak perlu manual kasih tau struktur database
   - Auto-fix field name mismatches
   - Auto-generate migration yang sesuai

2. **Faster feature development**
   - Kiro AI tau table apa saja yang ada
   - Bisa suggest table/kolom yang perlu ditambah
   - Bisa detect duplikasi

3. **Cleaner codebase**
   - Hapus table yang tidak dipakai
   - Hapus kolom yang tidak dipakai
   - Database lebih ringan

### Untuk Production:

1. **Better performance**
   - Deteksi missing indexes
   - Suggest optimization
   - Cleanup orphaned records

2. **Cost savings**
   - Database lebih kecil
   - Backup lebih cepat
   - Query lebih cepat

3. **Easier maintenance**
   - Schema lebih clean
   - Dokumentasi otomatis
   - Audit trail lengkap

---

## 🔒 SAFETY FEATURES

### 1. **Read-Only by Default**
   - Audit hanya baca, tidak ubah apapun
   - Report disimpan di file JSON

### 2. **Confirmation Required**
   - Cleanup minta konfirmasi sebelum hapus
   - Tampilkan preview perubahan
   - Bisa cancel kapan saja

### 3. **Backup Reminder**
   - Selalu remind untuk backup sebelum cleanup
   - Supabase auto-backup daily
   - Bisa manual backup di Dashboard

### 4. **Rollback Available**
   - Jika ada masalah, bisa restore dari backup
   - Supabase punya point-in-time recovery

---

## 📊 AUDIT REPORT STRUCTURE

```json
{
  "timestamp": "2026-05-20T10:30:00Z",
  "summary": {
    "total_tables": 25,
    "total_foreign_keys": 18,
    "total_indexes": 42,
    "total_functions": 8,
    "tables_in_code": 22
  },
  "tables": [
    {
      "name": "expenses",
      "columns": 15,
      "rows": 1234,
      "used_in_code": true,
      "status": "OK"
    }
  ],
  "unused_tables": ["old_transactions"],
  "empty_tables": ["temp_data"],
  "recommendations": [
    {
      "type": "unused_table",
      "severity": "medium",
      "table": "old_transactions",
      "action": "Consider dropping if not needed",
      "sql": "DROP TABLE IF EXISTS old_transactions CASCADE;"
    }
  ]
}
```

---

## 🆘 TROUBLESHOOTING

### Problem: "exec_sql function not found"

**Solusi:**
1. Buka Supabase Dashboard → SQL Editor
2. Run: `scripts/supabase-exec-FULL.sql`
3. Jalankan ulang audit

---

### Problem: "Permission denied"

**Solusi:**
1. Cek `.env.local` punya `SUPABASE_SERVICE_ROLE_KEY`
2. Bukan `ANON_KEY`, harus `SERVICE_ROLE_KEY`
3. Get dari: Supabase Dashboard → Settings → API

---

### Problem: "Table not found in code but it's used"

**Solusi:**
1. Table mungkin dipakai di SQL langsung
2. Atau dipakai di RPC function
3. Review manual sebelum hapus

---

## 📞 SUPPORT

Jika ada masalah:
1. Check audit report: `scripts/database-audit-report.json`
2. Screenshot error message
3. Tanya Kiro AI untuk help

---

**Created:** 2026-05-20  
**For:** PT DonattourSystem  
**Scale:** 10,000+ outlets  
**Purpose:** Database optimization & automation
