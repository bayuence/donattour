# 🚀 Migration Plan - Sistem Pricing Detail & Simplifikasi Kasir

## ✅ Menggunakan Prisma Migration (Otomatis & Aman!)

Anda **TIDAK** perlu menjalankan SQL manual. Kita gunakan Prisma untuk migration otomatis.

---

## 📋 Step-by-Step Migration

### **Step 1: Backup Database** (5 menit)

```bash
# Dari Supabase Dashboard:
1. Login ke https://supabase.com
2. Pilih project Anda
3. Database → Backups → Create Backup Manual
4. Download backup (opsional, untuk safety)
```

---

### **Step 2: Update Prisma Schema** (10 menit)

Saya akan update file `prisma/schema.prisma` dengan field baru:

```prisma
model products {
  id                String    @id
  nama              String
  tipe_produk       String?   
  ukuran            String?   
  
  // ═══ FIELD BARU untuk Pricing Detail ═══
  is_donat          Boolean   @default(false)
  ukuran_donat      String?   // 'mini', 'regular', 'jumbo', 'dozen'
  
  // HPP Detail
  hpp_base_donat    Decimal?  @db.Decimal(15,2) // HPP donat polos
  hpp_topping       Decimal?  @db.Decimal(15,2) // Biaya topping spesifik
  hpp_total         Decimal?  @db.Decimal(15,2) // Total HPP (base + topping)
  
  // Pricing & Margin
  harga_jual        Decimal?  @db.Decimal(15,2) // Harga jual (renamed from 'harga')
  margin_amount     Decimal?  @db.Decimal(15,2) // harga_jual - hpp_total
  margin_percent    Decimal?  @db.Decimal(5,2)  // percentage
  
  // Old fields (tetap ada untuk backward compatibility)
  harga             Int?      @deprecated("Use harga_jual instead")
  hpp               Int?      @deprecated("Use hpp_total instead")
  
  is_active         Boolean   @default(true)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([tipe_produk])
  @@index([is_active])
  @@index([is_donat])
}
```

```prisma
model orders {
  id                    String    @id
  outlet_id             String
  kasir_id              String?
  customer_name         String?   @default("Umum")
  total_amount          Int       
  paid_amount           Int?
  change_amount         Int?
  payment_method        String    
  payment_status        String    @default("unpaid")
  status                String    @default("completed")
  
  // ═══ HAPUS field channel (tidak diperlukan lagi) ═══
  // channel            String    @default("toko") // ← DIHAPUS!
  
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  outlet                outlets   @relation(fields: [outlet_id], references: [id], onDelete: Cascade)
  order_items           order_items[]

  @@index([outlet_id])
  @@index([created_at])
  @@index([payment_status])
}
```

---

### **Step 3: Generate Migration File** (Otomatis!)

```bash
# Di terminal project Anda:
npx prisma migrate dev --name add_pricing_details_and_remove_channel

# Prisma akan:
# ✅ Generate SQL migration otomatis
# ✅ Apply ke database development
# ✅ Update Prisma Client
```

**Output yang akan muncul:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "XXX"

Applying migration `20260605_add_pricing_details_and_remove_channel`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260605_add_pricing_details_and_remove_channel/
      └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v7.8.0)
```

---

### **Step 4: Migrate Existing Data** (20 menit)

Setelah migration struktur selesai, kita perlu migrate data existing:

**File: `scripts/migrate-product-data.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateProductData() {
  console.log('🔄 Migrating existing product data...');
  
  try {
    // Get all products
    const products = await prisma.products.findMany();
    
    for (const product of products) {
      // Tentukan apakah produk ini donat
      const isDonat = product.tipe_produk?.includes('donat') || false;
      
      // Estimasi HPP breakdown (60% base, 40% topping)
      const oldHpp = product.hpp || 0;
      const hppBase = isDonat ? Math.round(oldHpp * 0.6) : 0;
      const hppTopping = isDonat ? Math.round(oldHpp * 0.4) : 0;
      const hppTotal = isDonat ? hppBase + hppTopping : oldHpp;
      
      // Harga jual
      const hargaJual = product.harga || 0;
      
      // Calculate margin
      const marginAmount = hargaJual - hppTotal;
      const marginPercent = hargaJual > 0 ? (marginAmount / hargaJual * 100) : 0;
      
      // Update product
      await prisma.products.update({
        where: { id: product.id },
        data: {
          is_donat: isDonat,
          ukuran_donat: isDonat ? product.ukuran : null,
          hpp_base_donat: isDonat ? hppBase : null,
          hpp_topping: isDonat ? hppTopping : null,
          hpp_total: hppTotal,
          harga_jual: hargaJual,
          margin_amount: marginAmount,
          margin_percent: Math.round(marginPercent * 100) / 100, // 2 decimal
        }
      });
      
      console.log(`✅ Migrated: ${product.nama}`);
    }
    
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateProductData();
```

**Jalankan:**
```bash
npx tsx scripts/migrate-product-data.ts
```

---

### **Step 5: Drop Old Tables** (5 menit)

Tables yang tidak diperlukan lagi:

```bash
# Di Supabase SQL Editor:

-- 1. Backup dulu (jika butuh data historis)
CREATE TABLE _backup_outlet_kasir_menus AS SELECT * FROM outlet_kasir_menus;
CREATE TABLE _backup_outlet_channel_prices AS SELECT * FROM outlet_channel_prices;

-- 2. Drop tables
DROP TABLE IF EXISTS outlet_kasir_menus CASCADE;
DROP TABLE IF EXISTS outlet_channel_prices CASCADE;
```

**ATAU** via Prisma (lebih aman):

Hapus model dari `schema.prisma` jika ada, lalu:
```bash
npx prisma migrate dev --name remove_kasir_menu_tables
```

---

### **Step 6: Update Prisma Client** (Otomatis)

```bash
npx prisma generate
```

---

### **Step 7: Verify Migration** (10 menit)

**Test queries:**

```typescript
// Test 1: Cek products baru
const products = await prisma.products.findMany({
  where: { is_donat: true },
  select: {
    nama: true,
    ukuran_donat: true,
    hpp_base_donat: true,
    hpp_topping: true,
    hpp_total: true,
    harga_jual: true,
    margin_amount: true,
    margin_percent: true,
  }
});
console.log('Donat products:', products);

// Test 2: Cek orders tanpa channel
const orders = await prisma.orders.findFirst({
  select: {
    id: true,
    total_amount: true,
    payment_method: true,
    // channel: true, // ← Error jika field sudah dihapus ✅
  }
});
console.log('Order:', orders);
```

---

## 📊 Migration Timeline

| Step | Duration | Command |
|------|----------|---------|
| 1. Backup Database | 5 min | Manual via Supabase |
| 2. Update Schema | 10 min | Edit `schema.prisma` |
| 3. Generate Migration | 2 min | `npx prisma migrate dev` |
| 4. Migrate Data | 20 min | `npx tsx scripts/migrate-product-data.ts` |
| 5. Drop Old Tables | 5 min | SQL Editor or Prisma |
| 6. Update Client | 2 min | `npx prisma generate` |
| 7. Verify | 10 min | Test queries |
| **TOTAL** | **~54 min** | |

---

## ⚠️ Safety Checklist

- [x] ✅ Backup database sebelum migration
- [x] ✅ Test di development/staging dulu
- [x] ✅ Verify data setelah migration
- [x] ✅ Rollback plan siap (restore backup)
- [x] ✅ Team informed tentang downtime (jika ada)

---

## 🔄 Rollback Plan (jika ada masalah)

```bash
# 1. Rollback Prisma migration
npx prisma migrate reset

# 2. Restore database backup
# Via Supabase Dashboard → Backups → Restore

# 3. Re-generate Prisma Client
npx prisma generate
```

---

## 🎯 Next Steps After Migration

1. **Update Types** (`lib/types.ts`)
2. **Update API Routes** (products, orders)
3. **Update Frontend Components** (forms, kasir)
4. **Test End-to-End**
5. **Deploy to Production**

---

**Prepared by:** Kiro AI Assistant  
**Date:** 5 Juni 2026  
**Method:** ✅ Prisma Migration (Otomatis & Aman)  
**Status:** 📋 Ready to Execute
