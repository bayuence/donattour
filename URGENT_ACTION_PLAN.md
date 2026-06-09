# 🚨 URGENT ACTION PLAN

## Current Status

✅ **COMPLETED:**
- Prisma schema updated with new pricing fields
- Migration SQL created
- TypeScript types updated
- Pricing utilities created
- Database functions updated (`lib/db/products.ts`)
- `lib/db/kasir-menus.ts` DELETED
- `TabKasirMenu.tsx` component DELETED
- **Kelola Produk page.tsx** updated (kasir menu removed)

⚠️ **CRITICAL RUNTIME ERRORS EXPECTED:**
The system will crash because:
1. `TabVarian` and `TabPaket` components still expect `kasirMenus` prop
2. `useKasir` hook still tries to import from deleted `kasir-menus.ts`
3. Kasir page still has channel selector UI

---

## 🎯 IMMEDIATE FIX (To Stop Crashes)

### Option A: Quick Bandaid (5 minutes)
**Goal:** Make system runnable NOW

1. **Restore kasir-menus.ts temporarily**
   - Create stub file that returns empty array
   - Prevents import errors

2. **Add empty kasirMenus prop**
   - Pass `kasirMenus={[]}` to TabVarian and TabPaket
   - Components will render without channel pricing section

### Option B: Complete Refactor (2-3 hours)
**Goal:** Fully remove multi-channel system

1. **TabVarian.tsx** - Remove all channel pricing logic (400+ lines to modify)
2. **TabPaket.tsx** - Remove all channel pricing logic (200+ lines to modify)
3. **useKasir.ts** - Remove channel state and logic (100+ lines to modify)
4. **Kasir page.tsx** - Remove channel selector UI

---

## 📋 USER'S CHOICE NEEDED

**Which path should we take?**

### Path 1: BANDAID FIRST, REFACTOR LATER ⚡
- ✅ System works in 5 minutes
- ✅ Can test basic functionality
- ⚠️ Channel pricing UI still visible (but won't work)
- 📅 Do full refactor later when have time

### Path 2: COMPLETE REFACTOR NOW 🔨
- ⏳ Takes 2-3 hours
- ✅ Fully clean system
- ✅ No legacy code left
- ❌ System down during refactor

---

## 🚀 RECOMMENDED: Path 1 (Bandaid)

**Why?**
1. Get system running FAST
2. Test new pricing utilities work correctly
3. Execute database migration safely
4. Do visual refactor incrementally

**Implementation:**
```bash
# 1. Create stub kasir-menus.ts
# 2. Update kelola-produk/page.tsx to pass kasirMenus={[]}
# 3. Test system loads
# 4. Execute database migration
# 5. Add new pricing form component
# 6. LATER: Remove channel UI from TabVarian/TabPaket
```

---

## 💬 NEXT STEPS

**Tell me:**
- "bandaid" → I'll implement quick fix now
- "refactor" → I'll do complete rewrite now
- "show me errors" → I'll run diagnostics first

Your choice? 🎯
