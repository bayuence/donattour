# 🚀 Instruksi Migration Database

## ⚠️ IMPORTANT: Backup Dulu!

### **Step 1: Backup Database (WAJIB!)**

```bash
# Run backup script
npx tsx scripts/backup-database.ts
```

**Output:**
```
💾 Starting database backup...
📦 Backing up products table...
   ✅ Backed up 50 products
📦 Backing up orders table...
   ✅ Backed up 1000 orders
✅ Backup completed successfully!
📁 Backup location: c:\...\backups\2026-06-05T...
```

Backup akan tersimpan di folder `backups/` dengan timestamp.

---

## 🔧 Step 2: Execute Migration SQL

### **Option A: Via Supabase Dashboard (RECOMMENDED)**

1. **Buka Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Login ke project Anda
   - Pilih project donattour

2. **Buka SQL Editor**
   - Sidebar → SQL Editor
   - Click "New Query"

3. **Copy SQL Migration**
   - Buka file: `prisma/migrations/add_pricing_details/migration.sql`
   - Copy SEMUA isi file

4. **Execute SQL**
   - Paste di SQL Editor
   - Click "Run" atau tekan Ctrl+Enter
   - Tunggu sampai selesai (±1-2 menit)

5. **Verify Results**
   ```sql
   -- Check products table
   SELECT 
     nama,
     is_donat,
     ukuran_donat,
     hpp_base_donat,
     hpp_topping,
     hpp_total,
     harga_jual,
     margin_amount,
     margin_percent
   FROM products
   WHERE is_donat = true
   LIMIT 10;
   
   -- Check orders table (channel should not exist)
   SELECT 
     id,
     outlet_id,
     total_amount,
     payment_method,
     created_at
   FROM orders
   LIMIT 10;
   ```

---

### **Option B: Via psql Command Line**

```bash
# Connect to database
psql $DATABASE_URL

# Run migration
\i prisma/migrations/add_pricing_details/migration.sql

# Verify
\d products
\d orders
```

---

## ✅ Step 3: Verify Migration Success

### **Check Products Table:**

```sql
-- Via Supabase SQL Editor
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN is_donat = true THEN 1 END) as donat_products,
  COUNT(CASE WHEN is_donat = false THEN 1 END) as non_donat_products
FROM products;
```

**Expected:**
- ✅ All products have `is_donat` value
- ✅ Donat products have `hpp_base_donat` and `hpp_topping`
- ✅ All products have `margin_amount` and `margin_percent`

### **Check Orders Table:**

```sql
-- Verify channel column removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'channel';
```

**Expected:**
- ✅ Should return 0 rows (channel column removed)

---

## 🎯 Step 4: Generate Prisma Client

```bash
# Update Prisma Client with new schema
npx prisma generate
```

**Output:**
```
✔ Generated Prisma Client (v7.8.0)
```

---

## 🧪 Step 5: Test in Development

```bash
# Start development server
npm run dev
```

**Test checklist:**
- [ ] Products page loads without errors
- [ ] Can view product details with new pricing fields
- [ ] Kasir page loads without channel selector
- [ ] Can create order without channel field
- [ ] Laporan shows correct margin calculations

---

## 🔄 Rollback Plan (If Something Goes Wrong)

### **Option A: Restore from Backup**

1. **Go to Supabase Dashboard**
   - Database → Backups
   - Click "Restore" on latest backup

2. **Or use backup JSON files**
   ```bash
   # Restore from backup folder
   # Files in: backups/[timestamp]/
   #   - products.json
   #   - orders.json
   ```

### **Option B: Manual Rollback SQL**

```sql
-- Drop new columns from products
ALTER TABLE products
  DROP COLUMN IF EXISTS is_donat,
  DROP COLUMN IF EXISTS ukuran_donat,
  DROP COLUMN IF EXISTS hpp_base_donat,
  DROP COLUMN IF EXISTS hpp_topping,
  DROP COLUMN IF EXISTS hpp_total,
  DROP COLUMN IF EXISTS harga_jual,
  DROP COLUMN IF EXISTS margin_amount,
  DROP COLUMN IF EXISTS margin_percent;

-- Add back channel column to orders
ALTER TABLE orders
  ADD COLUMN channel VARCHAR(50) DEFAULT 'toko';
```

---

## 📊 Migration Status Checklist

### **Pre-Migration:**
- [x] ✅ Proposal reviewed & approved
- [x] ✅ Prisma schema updated
- [x] ✅ Migration SQL created
- [x] ✅ Backup script created
- [ ] ⏳ Database backed up → **RUN THIS NOW!**

### **Migration:**
- [ ] ⏳ SQL executed in Supabase
- [ ] ⏳ Data verified
- [ ] ⏳ Prisma client generated

### **Post-Migration:**
- [ ] ⏳ Types updated
- [ ] ⏳ API routes updated
- [ ] ⏳ Frontend components updated
- [ ] ⏳ Testing completed

---

## 🆘 Need Help?

**If migration fails:**
1. Check Supabase logs for error details
2. Restore from backup
3. Share error message for debugging

**Common Issues:**
- **Permission denied** → Use SUPABASE_SERVICE_ROLE_KEY
- **Column already exists** → Safe to ignore, migration is idempotent
- **Syntax error** → Check PostgreSQL version compatibility

---

## 📝 Next Steps After Migration

Once migration is successful, we'll continue with:

1. **Update TypeScript Types** (`lib/types.ts`)
2. **Update API Routes** (products, orders)
3. **Update Frontend Components** (kelola produk, kasir, laporan)
4. **Testing & Verification**

---

**Status:** 🟡 Ready to Execute  
**Last Updated:** 5 Juni 2026  
**Estimated Time:** 10-15 minutes
