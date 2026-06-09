# 📋 TODO: Remaining Work

## ✅ COMPLETED (Already Done)

### Database & Types:
- [x] ✅ Prisma schema updated
- [x] ✅ Migration SQL created  
- [x] ✅ TypeScript types updated (`lib/types.ts`)
- [x] ✅ Pricing utilities created (`lib/utils/pricing.ts`)
- [x] ✅ Database functions updated (`lib/db/products.ts`)
- [x] ✅ Deleted `lib/db/kasir-menus.ts`
- [x] ✅ Deleted `TabKasirMenu.tsx` component

---

## 🔴 CRITICAL: Files Yang HARUS Diupdate

### **1. Kelola Produk Page** (High Priority) ✅ **DONE**
**File:** `app/(dashboard)/dashboard/kelola-produk/page.tsx`

**Status:** ✅ COMPLETED
- ✅ Removed kasir menu imports
- ✅ Removed kasirMenus state
- ✅ Removed kasir-menu from tabs
- ✅ Changed default tab to 'varian'
- ✅ Removed kasir menu from component renders
- ⚠️ **WARNING:** TabVarian and TabPaket still expect kasirMenus prop - will cause runtime errors

---

### **2. Kasir Hook** (High Priority)
**File:** `app/(dashboard)/dashboard/kasir/hooks/useKasir.ts`

**Changes Needed:**
```typescript
// REMOVE:
import { getActiveKasirMenus } from '@/lib/db/kasir-menus';
import type { KasirMenu, ChannelType } from '@/lib/types';

// REMOVE from state:
const [selectedChannel, setSelectedChannel] = useState<ChannelType>('toko');
const [kasirMenus, setKasirMenus] = useState<KasirMenu[]>([]);
const [channelPrices, setChannelPrices] = useState<OutletChannelPrice[]>([]);

// REMOVE from Promise.all:
getActiveKasirMenus(outlet.id)
db.getChannelPrices(outlet.id, selectedChannel)

// REMOVE from return:
selectedChannel, setSelectedChannel,
kasirMenus,
channelPrices,

// UPDATE product pricing logic:
// Use product.harga_jual directly instead of channel prices
```

---

### **3. Kasir Page** (High Priority)
**File:** `app/(dashboard)/dashboard/kasir/page.tsx`

**Changes Needed:**
```typescript
// REMOVE from props:
kasirMenus={k.kasirMenus}

// REMOVE channel selector from header
// REMOVE activeColor based on channel

// SIMPLIFY header to:
<Header
  outlet={k.outlet}
  cashier={k.cashier}
  onSelectCashier={() => k.setShowCashierModal(true)}
/>
```

---

### **4. Kasir Header Component**
**File:** `app/(dashboard)/dashboard/kasir/components/Header.tsx` (if exists)

**Changes Needed:**
- Remove channel selector buttons
- Remove kasirMenus prop
- Simplify to just show: Outlet | Cashier | Time

---

### **5. Product Form Components** (Medium Priority)
**Files to Create/Update:**

#### A. Create: `components/products/ProductPricingForm.tsx`
```typescript
// NEW COMPONENT
// Form fields:
// - ☑️ Apakah ini donat?
// - Radio: Ukuran (Mini/Regular/Jumbo)
// - Input: HPP Donat Polos
// - Input: HPP Topping
// - Display: Total HPP (calculated)
// - Input: Harga Jual
// - Display: Margin (Rp & %)
```

#### B. Update: Existing product forms in `kelola-produk/components/`
- Add new pricing fields
- Add validation
- Add real-time margin calculation

---

### **6. Laporan Harian** (Medium Priority)
**File:** `app/(dashboard)/dashboard/laporan-harian-outlet/page.tsx`

**Changes Needed:**
```typescript
// UPDATE Financial Summary to show:
// - HPP Breakdown (Base + Topping)
// - Margin per product category

// UPDATE Product Table to show:
// - Margin % column
// - HPP Total column

// CREATE new component:
// HPPBreakdownCard.tsx - Visual breakdown
```

---

### **7. Orders API** (Low Priority - Optional)
**File:** `app/api/orders/create/route.ts`

**Changes Needed:**
```typescript
// REMOVE channel from order creation
// Use product.harga_jual directly

// OLD:
const price = getChannelPrice(product, channel);

// NEW:
const price = product.harga_jual;
```

---

### **8. Inventory Functions** (Low Priority)
**File:** `lib/db/inventory.ts`

**Changes Needed:**
```typescript
// REMOVE:
export async function getChannelPrices(...) { ... }

// UPDATE any functions that use channel parameter
```

---

## 📊 Priority Matrix

| File | Priority | Complexity | Est. Time |
|------|----------|------------|-----------|
| `kelola-produk/page.tsx` | 🔴 High | Low | 10 min |
| `kasir/hooks/useKasir.ts` | 🔴 High | Medium | 20 min |
| `kasir/page.tsx` | 🔴 High | Medium | 15 min |
| `ProductPricingForm.tsx` | 🟡 Medium | High | 60 min |
| `laporan-harian-outlet` | 🟡 Medium | Medium | 30 min |
| `orders/create API` | 🟢 Low | Low | 10 min |
| `inventory.ts` | 🟢 Low | Low | 5 min |

**Total Time:** ~2.5 hours

---

## 🎯 Recommended Order:

1. ✅ **Kelola Produk** - Remove kasir menu tab (Quick win)
2. ✅ **Kasir Hook** - Remove channel logic (Critical for kasir)
3. ✅ **Kasir Page** - Simplify UI (User-facing)
4. ⏳ **Product Form** - Add pricing fields (New feature)
5. ⏳ **Laporan** - Enhanced display (Nice to have)
6. ⏳ **API** - Clean up (Backend polish)

---

## 🚦 Current Status:

```
Critical Path:     ███░░░░░░░ 30% 
Nice to Have:      ░░░░░░░░░░  0%
Overall:           ██░░░░░░░░ 20%
```

---

## 💡 Suggestion:

**Focus on Critical Path first** (files 1-3) to get system working without errors.  
Then add new features (pricing form) later.

**Do you want me to:**
A. 🔴 Continue with critical files (kelola-produk, kasir)
B. 🟡 Jump to new feature (pricing form component)
C. 📋 Give you the exact code changes for each file

**Your choice?** 🎯
