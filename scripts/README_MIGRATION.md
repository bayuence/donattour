# 🚀 Smart Migration Script - Expense v2.0

## ✨ Features

Script ini **SMART** karena:

1. ✅ **Cek database dulu** - Lihat apa yang sudah ada sebelum migrate
2. ✅ **Preview changes** - Tampilkan apa yang akan diubah
3. ✅ **Ask confirmation** - Kamu approve dulu sebelum run
4. ✅ **Safe execution** - Tidak akan merusak data existing
5. ✅ **Auto verification** - Cek apakah migration berhasil
6. ✅ **Colored output** - Easy to read dengan warna

---

## 📋 Prerequisites

Sebelum run migration, pastikan:

1. ✅ **Node.js installed** (v18 atau lebih baru)
2. ✅ **Dependencies installed**: `npm install`
3. ✅ **`.env.local` configured** dengan:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. ✅ **Supabase project active** dan accessible

---

## 🎯 How to Use

### Step 1: Setup Helper Function (ONE TIME ONLY)

Pertama kali, kamu perlu setup helper function di Supabase:

```bash
# 1. Buka Supabase Dashboard → SQL Editor
# 2. Copy paste isi file: scripts/supabase-exec.sql
# 3. Klik "Run"
```

**PENTING**: Ini hanya perlu dilakukan **SEKALI** saja!

---

### Step 2: Run Migration Script

```bash
npm run migrate:expenses
```

Atau langsung:

```bash
node scripts/migrate-expenses-v2.js
```

---

## 📺 What You'll See

### 1. Connection Check
```
🔌 Connecting to Supabase...
   ✅ Connected successfully
```

### 2. Database State Check
```
📊 CHECKING CURRENT DATABASE STATE
✅ Table 'expenses': EXISTS
   Columns found: 9
   Missing columns: status, approved_by, is_included_in_closing, device_info
⚠️ Table 'expense_audit_logs': WILL BE CREATED
⚠️ Table 'outlet_expense_budgets': WILL BE CREATED
```

### 3. Migration Preview
```
📋 MIGRATION PREVIEW

This migration will:

✨ ADD NEW FEATURES:
   • Column: status (pending/approved/rejected)
   • Column: approved_by (approval tracking)
   • Column: is_included_in_closing (closing integration)
   • Column: device_info (audit trail)
   • Table: expense_audit_logs (full audit trail)
   • Table: outlet_expense_budgets (budget control)
   • Indexes: 6 new indexes for better performance
   • Function: get_budget_status() for budget tracking
   • Trigger: Auto audit logging

🔒 SAFETY GUARANTEES:
   ✅ No data will be deleted
   ✅ No existing columns will be modified
   ✅ All existing data will remain intact
   ✅ Backward compatible with existing code
   ✅ Rollback available if error occurs
```

### 4. Confirmation Prompt
```
❓ Do you want to proceed with migration? (y/n):
```

Ketik `y` untuk lanjut, atau `n` untuk cancel.

### 5. Migration Execution
```
🚀 RUNNING MIGRATION
📄 Reading migration SQL...
   File: 11-schema-expenses-v2-migration.sql
   Size: 12.45 KB

⏳ Executing migration... (this may take 10-30 seconds)

✅ Migration completed successfully!
```

### 6. Verification
```
✅ VERIFYING MIGRATION
Checking new columns...
   ✅ New columns added successfully
Checking new tables...
   ✅ New tables created successfully

🎉 Migration verified successfully!
```

### 7. Success Message
```
🎉 MIGRATION COMPLETE

Your database has been successfully upgraded to v2.0!

Next steps:
1. Test the new features in /dashboard/pengeluaran-outlet
2. Check the changelog: CHANGELOG_EXPENSE_V2.md
3. Review documentation: .kiro/IMPLEMENTATION_PLAN_EXPENSE_ENTERPRISE.md
```

---

## ❌ Troubleshooting

### Error: ".env.local file not found"

**Solution:**
```bash
# Create .env.local file
cp .env.example .env.local

# Edit and add your Supabase credentials
```

### Error: "Missing Supabase credentials"

**Solution:**
Pastikan `.env.local` punya:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # NOT anon key!
```

**PENTING**: Gunakan **SERVICE_ROLE_KEY**, bukan `ANON_KEY`!

### Error: "exec_sql function does not exist"

**Solution:**
Run helper function dulu (Step 1):
```bash
# Buka Supabase Dashboard → SQL Editor
# Copy paste: scripts/supabase-exec.sql
# Run
```

### Error: "permission denied"

**Solution:**
Pastikan kamu pakai **SERVICE_ROLE_KEY** yang punya full access.

### Migration stuck/timeout

**Solution:**
1. Check Supabase dashboard untuk error logs
2. Coba run manual via SQL Editor
3. Check internet connection

---

## 🔄 Rollback (If Needed)

Kalau ada masalah dan mau rollback:

### Option 1: Restore from Backup (RECOMMENDED)
```bash
# 1. Go to Supabase Dashboard → Database → Backups
# 2. Select backup before migration
# 3. Click "Restore"
```

### Option 2: Manual Rollback
```sql
-- Drop new tables
DROP TABLE IF EXISTS expense_audit_logs CASCADE;
DROP TABLE IF EXISTS outlet_expense_budgets CASCADE;

-- Drop new columns (CAREFUL!)
ALTER TABLE expenses DROP COLUMN IF EXISTS status;
ALTER TABLE expenses DROP COLUMN IF EXISTS approved_by;
ALTER TABLE expenses DROP COLUMN IF EXISTS approved_at;
ALTER TABLE expenses DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE expenses DROP COLUMN IF EXISTS is_included_in_closing;
ALTER TABLE expenses DROP COLUMN IF EXISTS closing_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS device_info;
ALTER TABLE expenses DROP COLUMN IF EXISTS ip_address;

-- Drop new indexes
DROP INDEX IF EXISTS idx_expenses_status;
DROP INDEX IF EXISTS idx_expenses_closing;
DROP INDEX IF EXISTS idx_expenses_approval;

-- Drop new function
DROP FUNCTION IF EXISTS get_budget_status;
DROP FUNCTION IF EXISTS log_expense_audit;
```

**WARNING**: Rollback akan menghapus semua data baru (audit logs, budgets)!

---

## 🔐 Security Notes

1. **SERVICE_ROLE_KEY** adalah **SUPER ADMIN** key
2. **JANGAN** commit `.env.local` ke git
3. **JANGAN** share SERVICE_ROLE_KEY ke orang lain
4. Script ini hanya baca credentials dari `.env.local` (tidak kirim kemana-mana)
5. Semua operasi dilakukan langsung ke Supabase kamu

---

## 📊 What Gets Modified

### Tables
- ✅ `expenses` - Add 8 new columns
- ✅ `expense_audit_logs` - NEW table
- ✅ `outlet_expense_budgets` - NEW table

### Indexes
- ✅ 6 new indexes for better performance

### Functions
- ✅ `get_budget_status()` - NEW function
- ✅ `log_expense_audit()` - NEW trigger function

### RLS Policies
- ✅ 4 new policies for new tables

### Data
- ✅ **NO DATA DELETED**
- ✅ **NO DATA MODIFIED**
- ✅ All existing data remains intact

---

## 🎯 After Migration

### Test the New Features

1. **Open Expense Module**
   ```
   http://localhost:3000/dashboard/pengeluaran-outlet
   ```

2. **Test Outlet Selector**
   - Should see outlet selector first
   - Try search
   - Try favorites
   - Select outlet

3. **Test Expense Input**
   - Add new expense
   - Check if saved
   - Check new columns in database

4. **Verify Database**
   ```sql
   -- Check new columns
   SELECT * FROM expenses LIMIT 1;
   
   -- Check audit logs
   SELECT * FROM expense_audit_logs LIMIT 10;
   
   -- Check budgets
   SELECT * FROM outlet_expense_budgets;
   ```

---

## 💡 Tips

1. **Run during low traffic** - Best time: late night or early morning
2. **Backup first** - Always backup before migration
3. **Test on staging** - If you have staging environment, test there first
4. **Monitor logs** - Watch Supabase logs during migration
5. **Keep terminal open** - Don't close terminal until migration complete

---

## 📞 Support

If you encounter issues:

1. **Check logs** in Supabase Dashboard
2. **Read error message** carefully
3. **Check troubleshooting** section above
4. **Contact support** if still stuck

---

## ✅ Checklist

Before running migration:

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` configured with SERVICE_ROLE_KEY
- [ ] Supabase project accessible
- [ ] Helper function created (scripts/supabase-exec.sql)
- [ ] Database backed up (optional but recommended)
- [ ] Low traffic time (optional but recommended)

Ready to migrate? Run:
```bash
npm run migrate:expenses
```

---

**Version**: 2.0.0  
**Last Updated**: 2026-05-20  
**Status**: ✅ Ready to Use

