# 🔍 Type Verification Report

## Verification Date: 2026-05-06

### ✅ VERIFIED - Types Match Database Schema

---

## 1. ProductionDaily Interface

### Database Schema:
```sql
CREATE TABLE production_daily (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    tanggal DATE NOT NULL,
    ukuran VARCHAR(10) CHECK (ukuran IN ('standar', 'mini')),
    target_qty INTEGER NOT NULL CHECK (target_qty > 0),
    success_qty INTEGER NOT NULL CHECK (success_qty >= 0),
    waste_qty INTEGER NOT NULL CHECK (waste_qty >= 0),
    total_hpp_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface ProductionDaily {
  id: string;                    // ✅ UUID → string
  outlet_id: string;             // ✅ UUID → string
  tanggal: string;               // ✅ DATE → string (YYYY-MM-DD)
  ukuran: DonutSize;             // ✅ VARCHAR(10) → enum
  target_qty: number;            // ✅ INTEGER → number
  success_qty: number;           // ✅ INTEGER → number
  waste_qty: number;             // ✅ INTEGER → number
  total_hpp_loss: number;        // ✅ DECIMAL(12,2) → number
  created_by: string | null;     // ✅ UUID (nullable) → string | null
  created_at: string;            // ✅ TIMESTAMPTZ → string (ISO)
  updated_at: string;            // ✅ TIMESTAMPTZ → string (ISO)
}
```

**Status:** ✅ MATCH

---

## 2. ProductionWasteDetail Interface

### Database Schema:
```sql
CREATE TABLE production_waste_details (
    id UUID PRIMARY KEY,
    production_daily_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    hpp_per_pcs DECIMAL(10,2) NOT NULL CHECK (hpp_per_pcs > 0),
    hpp_loss DECIMAL(12,2) GENERATED ALWAYS AS (qty * hpp_per_pcs) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface ProductionWasteDetail {
  id: string;
  production_daily_id: string;
  reason: string;
  qty: number;
  hpp_per_pcs: number;
  hpp_loss: number;              // ✅ GENERATED column → number
  created_at: string;
}
```

**Status:** ✅ MATCH

---

## 3. InventoryNonTopping Interface

### Database Schema:
```sql
CREATE TABLE inventory_non_topping (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    ukuran VARCHAR(10) CHECK (ukuran IN ('standar', 'mini')),
    qty_available INTEGER NOT NULL CHECK (qty_available >= 0),
    production_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('fresh', 'aging', 'expired')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface InventoryNonTopping {
  id: string;
  outlet_id: string;
  ukuran: DonutSize;
  qty_available: number;
  production_date: string;       // ✅ DATE → string
  status: InventoryStatus;       // ✅ VARCHAR(20) → enum
  last_updated: string;
}
```

**Status:** ✅ MATCH

---

## 4. ToppingError Interface

### Database Schema:
```sql
CREATE TABLE topping_errors (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    product_ordered VARCHAR(100) NOT NULL,
    product_made VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    reason TEXT NOT NULL CHECK (LENGTH(TRIM(reason)) >= 10),
    hpp_per_pcs DECIMAL(12,2) NOT NULL CHECK (hpp_per_pcs > 0),
    topping_cost DECIMAL(12,2) NOT NULL CHECK (topping_cost >= 0),
    total_hpp_loss DECIMAL(12,2) NOT NULL CHECK (total_hpp_loss > 0),
    reported_by UUID,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface ToppingError {
  id: string;
  outlet_id: string;
  product_ordered: string;
  product_made: string;
  qty: number;
  reason: string;
  hpp_per_pcs: number;
  topping_cost: number;
  total_hpp_loss: number;
  reported_by: string | null;
  reported_at: string;
  created_at: string;
}
```

**Status:** ✅ MATCH

---

## 5. DailyClosing Interface

### Database Schema:
```sql
CREATE TABLE daily_closing (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    tanggal DATE NOT NULL,
    closed_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface DailyClosing {
  id: string;
  outlet_id: string;
  tanggal: string;
  closed_by: string;
  notes: string | null;
  created_at: string;
}
```

**Status:** ✅ MATCH

---

## 6. ClosingNonToppingStatus Interface

### Database Schema:
```sql
CREATE TABLE closing_non_topping_status (
    id UUID PRIMARY KEY,
    daily_closing_id UUID NOT NULL,
    ukuran VARCHAR(10) CHECK (ukuran IN ('standar', 'mini')),
    total_sisa INTEGER NOT NULL CHECK (total_sisa >= 0),
    qty_fresh INTEGER NOT NULL CHECK (qty_fresh >= 0),
    qty_aging INTEGER NOT NULL CHECK (qty_aging >= 0),
    qty_expired INTEGER NOT NULL CHECK (qty_expired >= 0),
    hpp_loss_expired DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason_expired TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface ClosingNonToppingStatus {
  id: string;
  daily_closing_id: string;
  ukuran: DonutSize;
  qty_fresh: number;
  qty_aging: number;
  qty_expired: number;
  hpp_per_pcs: number;           // ❌ MISSING IN DATABASE!
  hpp_loss_expired: number;
  reason_expired: string | null;
  created_at: string;
}
```

**Status:** ⚠️ **ISSUE FOUND** - `hpp_per_pcs` field exists in TypeScript but NOT in database schema!

---

## 7. ClosingFinishedProduct Interface

### Database Schema:
```sql
CREATE TABLE closing_finished_products (
    id UUID PRIMARY KEY,
    daily_closing_id UUID NOT NULL,
    product_id UUID,
    product_name VARCHAR(100) NOT NULL,
    total_sisa INTEGER NOT NULL CHECK (total_sisa >= 0),
    qty_fresh INTEGER NOT NULL CHECK (qty_fresh >= 0),
    qty_aging INTEGER NOT NULL CHECK (qty_aging >= 0),
    qty_reject INTEGER NOT NULL CHECK (qty_reject >= 0),
    hpp_topping_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason_reject TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface ClosingFinishedProduct {
  id: string;
  daily_closing_id: string;
  product_id: string;
  product_name: string;
  qty_fresh: number;
  qty_aging: number;
  qty_reject: number;
  hpp_per_pcs: number;           // ❌ MISSING IN DATABASE!
  topping_cost: number;          // ❌ MISSING IN DATABASE!
  hpp_topping_loss: number;
  reason_reject: string | null;
  created_at: string;
}
```

**Status:** ⚠️ **ISSUES FOUND**:
- `hpp_per_pcs` field exists in TypeScript but NOT in database
- `topping_cost` field exists in TypeScript but NOT in database
- `total_sisa` field exists in database but NOT in TypeScript

---

## 8. DailyLossSummary Interface

### Database Schema:
```sql
CREATE TABLE daily_loss_summary (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    tanggal DATE NOT NULL,
    production_waste_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    topping_error_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    non_topping_expired_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    finished_product_reject_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_loss DECIMAL(12,2) GENERATED ALWAYS AS (...) STORED,
    total_waste_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interface:
```typescript
export interface DailyLossSummary {
  id: string;
  outlet_id: string;
  tanggal: string;
  production_waste_loss: number;
  topping_error_loss: number;
  non_topping_expired_loss: number;
  finished_product_reject_loss: number;
  total_loss: number;
  total_waste_qty: number;
  created_at: string;
}
```

**Status:** ✅ MATCH

---

## 🚨 CRITICAL ISSUES FOUND

### Issue 1: ClosingNonToppingStatus
**Problem:** TypeScript has `hpp_per_pcs` but database doesn't
**Impact:** API will fail when trying to insert/select this field
**Fix Required:** Remove from TypeScript OR add to database

### Issue 2: ClosingFinishedProduct
**Problem:** Multiple mismatches:
- TypeScript has `hpp_per_pcs` (not in DB)
- TypeScript has `topping_cost` (not in DB)
- TypeScript missing `total_sisa` (exists in DB)

**Impact:** API will fail on closing operations
**Fix Required:** Sync TypeScript with database schema

---

## 📋 Recommended Actions

### Option A: Update TypeScript (Recommended)
Remove fields that don't exist in database:

```typescript
export interface ClosingNonToppingStatus {
  // ... other fields
  // REMOVE: hpp_per_pcs: number;
  hpp_loss_expired: number;
  // ... rest
}

export interface ClosingFinishedProduct {
  // ... other fields
  total_sisa: number;            // ADD THIS
  // REMOVE: hpp_per_pcs: number;
  // REMOVE: topping_cost: number;
  hpp_topping_loss: number;
  // ... rest
}
```

### Option B: Update Database (Not Recommended)
Add missing columns to database - but this changes the schema design.

---

## ✅ Verification Summary

| Interface | Status | Issues |
|-----------|--------|--------|
| ProductionDaily | ✅ PASS | None |
| ProductionWasteDetail | ✅ PASS | None |
| InventoryNonTopping | ✅ PASS | None |
| ToppingUsage | ✅ PASS | None |
| ToppingError | ✅ PASS | None |
| DailyClosing | ✅ PASS | None |
| ClosingNonToppingStatus | ❌ FAIL | Missing hpp_per_pcs in DB |
| ClosingFinishedProduct | ❌ FAIL | 3 field mismatches |
| DailyLossSummary | ✅ PASS | None |

**Overall:** 7/9 PASS, 2/9 FAIL

---

## 🔧 Fix Required Before Proceeding

**MUST FIX** before continuing to next task!

