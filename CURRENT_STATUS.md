# ✅ CURRENT STATUS - System Perubahan Harga Detail

**Last Updated:** 5 Juni 2026, 23:45 WIB  
**Status:** 🟢 READY FOR DATABASE MIGRATION

---

## 📊 Progress Overview

```
Backend (Database & Types):     ████████░░ 80%
Frontend (UI Components):        ███░░░░░░░ 30%
Critical Path (No Errors):       ██████████ 100% ✅
Overall Progress:                █████░░░░░ 50%
```

---

## ✅ COMPLETED WORK

### **1. Database Schema** ✅
- [x] Prisma schema updated with new pricing fields:
  - `is_donat` (boolean)
  - `ukuran_donat` (enum: mini, regular, jumbo, dozen)
  - `hpp_base_donat` (decimal - HPP donat polos)
  - `hpp_topping` (decimal - biaya topping)
  - `hpp_total` (decimal - total HPP)
  - `margin_amount` (decimal - keuntungan Rp)
  - `margin_percent` (decimal - keuntungan %)
- [x] Migration SQL generated
- [x] Backup script created

### **2. TypeScript Types** ✅
- [x] Updated `Product` interface with new pricing fields
- [x] Deprecated `KasirMenu`, `ChannelType`, `OutletChannelPrice`
- [x] Created comprehensive documentation in types.ts

### **3. Utility Functions** ✅
- [x] Created `lib/utils/pricing.ts` with 8 helper functions:
  - `calculateHPPTotal()` - Calculate total HPP
  - `calculateMarginAmount()` - Calculate margin in Rupiah
  - `calculateMarginPercent()` - Calculate margin percentage
  - `calculateProductPricing()` - Auto-calculate all pricing
  - `validateProductPricing()` - Validate pricing data
  - `formatHPPBreakdown()` - Format for display
  - `calculateOrderProfit()` - Calculate profit for orders
  - `calculateRecommendedPrice()` - Suggest price based on margin

### **4. Database Functions** ✅
- [x] Updated `lib/db/products.ts`:
  - `upsertProduct()` with auto-calculation
  - `upsertPackage()` removed channel logic
- [x] Created STUB `lib/db/kasir-menus.ts` (prevents import errors)

### **5. Frontend - Critical Path** ✅
- [x] Removed kasir menu from `kelola-produk/page.tsx`
- [x] Fixed import errors (all components compile without errors)
- [x] System runs without crashes

---

## ⏳ PENDING WORK

### **🔴 HIGH PRIORITY - Must Do Before Production**

#### 1. **Database Migration** (USER ACTION REQUIRED)
```bash
# Step 1: Backup database
npx tsx scripts/backup-database.ts

# Step 2: Run migration in Supabase Dashboard
# Copy SQL from: prisma/migrations/add_pricing_details/migration.sql
# Execute in SQL Editor

# Step 3: Verify
SELECT id, nama, is_donat, hpp_base_donat, hpp_topping, hpp_total, 
       margin_amount, margin_percent 
FROM products 
LIMIT 10;

# Step 4: Generate Prisma client
npx prisma generate
```

#### 2. **Create Product Pricing Form Component**
**File to Create:** `components/products/ProductPricingForm.tsx`

**Features Needed:**
- ☑️ Checkbox: "Apakah ini donat?"
- 🔘 Radio buttons: Ukuran (Mini/Regular/Jumbo)
- 📝 Input: HPP Donat Polos (base cost)
- 📝 Input: HPP Topping (topping cost)
- 💰 Display: Total HPP (auto-calculated)
- 💵 Input: Harga Jual (selling price)
- 📊 Display: Margin (Rp & %, auto-calculated, color-coded)
- ✅ Real-time validation

#### 3. **Update Kelola Produk Forms**
**Files:** `kelola-produk/components/TabVarian.tsx`, `TabPaket.tsx`

**Changes:**
- Remove channel pricing sections (will be empty now)
- Integrate ProductPricingForm component
- Show margin calculations in product list

---

### **🟡 MEDIUM PRIORITY - Nice to Have**

#### 4. **Enhanced Laporan Harian**
**File:** `app/(dashboard)/dashboard/laporan-harian-outlet/page.tsx`

**Features:**
- Add HPP breakdown display
- Add margin columns to product tables
- Create `HPPBreakdownCard.tsx` for visual analytics

#### 5. **Kasir Simplification**
**Files:** `kasir/hooks/useKasir.ts`, `kasir/page.tsx`

**Changes:**
- Remove channel selector UI
- Remove channelPrices state
- Use `product.harga_jual` directly

---

### **🟢 LOW PRIORITY - Polish**

#### 6. **API Routes Cleanup**
**Files:** Various `/api` routes

**Changes:**
- Remove channel parameter from order creation
- Update profit calculations

---

## 🚨 KNOWN ISSUES & LIMITATIONS

### **Visual (Non-Breaking)**
- ⚠️ TabVarian and TabPaket still show channel pricing sections
  - **Impact:** Sections are EMPTY (kasirMenus = [])
  - **User Experience:** Slightly confusing but functional
  - **Fix:** Remove UI sections in next iteration

- ⚠️ Kasir page still has channel selector buttons
  - **Impact:** Buttons work but don't change prices (single price now)
  - **User Experience:** Cosmetic only
  - **Fix:** Hide selector in header

### **Data Migration**
- ⚠️ Migration SQL not executed yet
  - **Impact:** New pricing fields are NULL in existing data
  - **Fix:** User must run migration (instructions above)

---

## 💡 RECOMMENDATIONS

### **For IMMEDIATE Use:**
1. ✅ System is stable and can run
2. ✅ No compile errors or runtime crashes
3. ⚠️ Execute database migration before adding new products
4. ⚠️ Old products will show default values until re-edited

### **For CLEAN System:**
1. Execute database migration
2. Create ProductPricingForm component
3. Update product forms to use new pricing
4. Remove channel UI elements (visual cleanup)

---

## 📞 NEXT STEPS

**Option A: Proceed with Migration** (Recommended)
```
1. Backup database
2. Run migration SQL
3. Verify data
4. Create pricing form
5. Test with new product
```

**Option B: Visual Cleanup First**
```
1. Remove empty channel sections from TabVarian
2. Remove empty channel sections from TabPaket
3. Remove channel selector from Kasir
4. THEN do migration
```

**Your choice?** Tell me:
- "migrate now" → I'll guide migration process
- "cleanup first" → I'll remove channel UI
- "show migration SQL" → I'll display the SQL
- "continue" → I'll proceed with next priority task

---

## 🎯 GOAL COMPLETION

**Main Goal:** Detailed per-product pricing with HPP breakdown
- ✅ Database structure: DONE
- ✅ Business logic: DONE
- ⏳ Data migration: PENDING (user action)
- ⏳ UI forms: PENDING (next task)
- 📊 Progress: **50%**

**Secondary Goal:** Remove multi-kasir system
- ✅ Backend removed: DONE (stub in place)
- ⏳ Frontend removal: PENDING (visual only)
- 📊 Progress: **60%**

---

## 📋 FILES MODIFIED

**Created:**
- `lib/utils/pricing.ts` ✅
- `lib/db/kasir-menus.ts` (stub) ✅
- `prisma/migrations/add_pricing_details/migration.sql` ✅
- `scripts/backup-database.ts` ✅
- `scripts/run-migration.ts` ✅
- Documentation files (this file, URGENT_ACTION_PLAN.md, etc.)

**Modified:**
- `prisma/schema.prisma` ✅
- `lib/types.ts` ✅
- `lib/db/products.ts` ✅
- `app/(dashboard)/dashboard/kelola-produk/page.tsx` ✅

**Deleted:**
- `lib/db/kasir-menus.ts` (original - now replaced with stub) ✅
- `app/(dashboard)/dashboard/kelola-produk/components/TabKasirMenu.tsx` ✅

---

**System Status:** 🟢 STABLE - Ready for next phase
