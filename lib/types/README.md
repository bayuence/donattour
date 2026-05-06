# Production Tracking System - Types & Schemas

## Overview

This directory contains TypeScript types and Zod validation schemas for the Production Tracking System.

## File Structure

```
lib/
├── types/
│   ├── production.ts          # Core database table types
│   ├── production-api.ts      # API request/response types
│   └── index.ts               # Re-exports
├── validations/
│   ├── production.ts          # Zod validation schemas
│   └── index.ts               # Re-exports
└── constants/
    ├── production.ts          # Constants and configurations
    └── index.ts               # Re-exports
```

## Usage

### Importing Types

```typescript
// Import from main types file (recommended)
import type { ProductionDaily, DonutSize } from '@/lib/types';

// Or import directly
import type { ProductionDaily } from '@/lib/types/production';
```

### Importing Validation Schemas

```typescript
// Import from validations
import { CreateProductionDailySchema, validateProductionInput } from '@/lib/validations';

// Validate data
const result = validateProductionInput(data);
if (!result.success) {
  console.error(result.error);
}
```

### Importing Constants

```typescript
// Import constants
import { DONUT_SIZES, WASTE_RATE_THRESHOLD, formatCurrency } from '@/lib/constants';

// Use constants
console.log(DONUT_SIZES.standar); // "Standar"
console.log(WASTE_RATE_THRESHOLD); // 15
console.log(formatCurrency(50000)); // "Rp 50.000"
```

## Core Types

### Database Tables

1. **ProductionDaily** - Daily production records
2. **ProductionWasteDetail** - Production waste details
3. **InventoryNonTopping** - Non-topping inventory
4. **ToppingUsage** - Topping usage tracking
5. **ToppingError** - Topping error reports
6. **DailyClosing** - Daily closing records
7. **ClosingNonToppingStatus** - Closing non-topping status
8. **ClosingFinishedProduct** - Closing finished products
9. **DailyLossSummary** - Daily loss summary

### Enums

- **DonutSize**: `'standar' | 'mini'`
- **InventoryStatus**: `'fresh' | 'aging' | 'expired'`
- **FinishedProductStatus**: `'fresh' | 'aging' | 'reject'`
- **ProductionUserRole**: `'admin' | 'owner' | 'manager' | 'bagian_dapur' | 'kasir' | 'closing_staff'`

### Utility Types

- **CreateProductionDaily** - Type for creating production (without auto-generated fields)
- **UpdateProductionDaily** - Type for updating production
- **ProductionSummary** - Calculated production metrics
- **InventoryStockSummary** - Stock summary with status
- **LossBreakdown** - Loss breakdown by category
- **StockValidationResult** - Stock validation result

## Validation Schemas

### Production Input

```typescript
import { CreateProductionDailySchema } from '@/lib/validations';

const schema = CreateProductionDailySchema;
// Validates:
// - outlet_id (UUID)
// - tanggal (YYYY-MM-DD, not future)
// - ukuran (standar/mini)
// - target_qty (positive integer)
// - success_qty (non-negative integer)
// - waste_details (array with reason, qty, hpp_per_pcs)
// - Business rule: success_qty + sum(waste_details.qty) <= target_qty
```

### Topping Error

```typescript
import { CreateToppingErrorSchema } from '@/lib/validations';

const schema = CreateToppingErrorSchema;
// Validates:
// - outlet_id, kasir_id (UUID)
// - tanggal (YYYY-MM-DD, not future)
// - product_ordered, product_made (min 3 chars, must be different)
// - qty (positive integer)
// - hpp_loss (positive number)
// - reason (min 10 chars)
```

### Daily Closing

```typescript
import { CreateDailyClosingSchema } from '@/lib/validations';

const schema = CreateDailyClosingSchema;
// Validates:
// - outlet_id, closed_by (UUID)
// - tanggal (YYYY-MM-DD, not future)
// - non_topping_status (array, min 1 item)
//   - Business rule: total_sisa = qty_fresh + qty_aging + qty_expired
//   - Business rule: reason_expired required if qty_expired > 0
// - finished_products (array, optional)
//   - Business rule: total_sisa = qty_fresh + qty_aging + qty_reject
//   - Business rule: reason_reject required if qty_reject > 0
// - notes (optional, max 1000 chars)
```

## API Response Types

### Standard Response Format

```typescript
// Success
{
  success: true,
  data: T,
  message?: string
}

// Error
{
  success: false,
  error: {
    code: ErrorCode,
    message: string,
    details?: Record<string, string[]>
  }
}
```

### Paginated Response

```typescript
{
  items: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    total_pages: number
  }
}
```

## Constants

### Thresholds

- `WASTE_RATE_THRESHOLD` = 15% - Alert if waste rate exceeds this
- `LOW_STOCK_THRESHOLD` = 20% - Alert if stock below this percentage
- `MAX_PRODUCTION_QTY` = 10,000 - Maximum production quantity
- `MAX_HPP_PER_PCS` = Rp 100,000 - Maximum HPP per piece

### Waste Reasons

- **Production Waste**: Gosong, Bentuk Jelek, Adonan Gagal, etc.
- **Non-Topping Expired**: Terlalu Lama Disimpan, Kering, Keras, etc.
- **Finished Product Reject**: Topping Meleleh, Topping Kering, Jatuh, etc.
- **Topping Error**: Salah Dengar Pesanan, Salah Baca Nota, etc.

### Helper Functions

```typescript
// Permission check
hasPermission(userRole, 'INPUT_PRODUCTION') // boolean

// Status colors
getInventoryStatusColor('fresh') // 'green'
getFinishedProductStatusColor('reject') // 'red'

// Calculations
calculateWasteRate(wasteQty, targetQty) // number (percentage)
calculateSuccessRate(successQty, targetQty) // number (percentage)
isWasteRateHigh(wasteRate) // boolean
isStockLow(currentQty, productionQty) // boolean
getStockStatus(currentQty, productionQty) // 'sufficient' | 'low' | 'out_of_stock'

// Formatting
formatCurrency(50000) // "Rp 50.000"
```

## Type Guards

```typescript
import { isDonutSize, isInventoryStatus, isProductionEditable } from '@/lib/types';

// Check if value is valid DonutSize
if (isDonutSize(value)) {
  // value is 'standar' | 'mini'
}

// Check if value is valid InventoryStatus
if (isInventoryStatus(value)) {
  // value is 'fresh' | 'aging' | 'expired'
}

// Check if production is editable (only today's production)
if (isProductionEditable(production)) {
  // Can edit
}
```

## Best Practices

1. **Always use type imports** for types (not runtime values):
   ```typescript
   import type { ProductionDaily } from '@/lib/types';
   ```

2. **Validate all user input** with Zod schemas:
   ```typescript
   const result = CreateProductionDailySchema.safeParse(data);
   if (!result.success) {
     return { error: formatValidationErrors(result.error) };
   }
   ```

3. **Use constants** instead of magic numbers/strings:
   ```typescript
   // Bad
   if (wasteRate > 15) { ... }
   
   // Good
   if (wasteRate > WASTE_RATE_THRESHOLD) { ... }
   ```

4. **Use type guards** for runtime type checking:
   ```typescript
   // Bad
   if (status === 'fresh' || status === 'aging' || status === 'expired') { ... }
   
   // Good
   if (isInventoryStatus(status)) { ... }
   ```

5. **Use utility types** for creating/updating:
   ```typescript
   // For creating (without id, timestamps)
   const newProduction: CreateProductionDaily = { ... };
   
   // For updating (all fields optional except id)
   const updates: UpdateProductionDaily = { success_qty: 100 };
   ```

## Examples

### Example 1: Create Production Input

```typescript
import { CreateProductionDailySchema, validateProductionInput } from '@/lib/validations';
import type { CreateProductionRequest } from '@/lib/types';

const data: CreateProductionRequest = {
  outlet_id: '123e4567-e89b-12d3-a456-426614174000',
  tanggal: '2026-05-02',
  ukuran: 'standar',
  target_qty: 500,
  success_qty: 450,
  waste_details: [
    { reason: 'Gosong', qty: 30, hpp_per_pcs: 3000 },
    { reason: 'Bentuk Jelek', qty: 20, hpp_per_pcs: 3000 },
  ],
};

const result = validateProductionInput(data);
if (!result.success) {
  console.error('Validation failed:', result.error);
} else {
  // Save to database
  await saveProduction(result.data);
}
```

### Example 2: Check Stock Validation

```typescript
import { isStockLow, getStockStatus } from '@/lib/constants';
import type { InventoryStockSummary } from '@/lib/types';

const stockSummary: InventoryStockSummary = {
  ukuran: 'standar',
  total_available: 50,
  fresh: 50,
  aging: 0,
  expired: 0,
  status: 'low',
  percentage: 10,
};

if (isStockLow(stockSummary.total_available, 500)) {
  console.log('⚠️ Stock is low!');
}

const status = getStockStatus(stockSummary.total_available, 500);
console.log('Stock status:', status); // 'low'
```

### Example 3: Format Loss Breakdown

```typescript
import { formatCurrency, LOSS_BREAKDOWN_COLORS } from '@/lib/constants';
import type { LossBreakdown } from '@/lib/types';

const lossBreakdown: LossBreakdown = {
  production_waste: {
    qty: 50,
    hpp_loss: 150000,
    percentage: 40,
    details: [
      { reason: 'Gosong', qty: 30, hpp_loss: 90000 },
      { reason: 'Bentuk Jelek', qty: 20, hpp_loss: 60000 },
    ],
  },
  topping_errors: {
    qty: 10,
    hpp_loss: 50000,
    percentage: 13.3,
  },
  non_topping_expired: {
    qty: 20,
    hpp_loss: 60000,
    percentage: 16,
  },
  finished_product_reject: {
    qty: 15,
    hpp_loss: 115000,
    percentage: 30.7,
  },
};

console.log('Production Waste:', formatCurrency(lossBreakdown.production_waste.hpp_loss));
console.log('Color:', LOSS_BREAKDOWN_COLORS.production_waste);
```

## Migration Guide

If you're migrating from old types to new production tracking types:

1. Update imports:
   ```typescript
   // Old
   import { ProductionBatch } from '@/lib/types';
   
   // New
   import type { ProductionDaily } from '@/lib/types';
   ```

2. Update field names:
   ```typescript
   // Old
   batch.quantity_produced
   
   // New
   production.success_qty
   ```

3. Use new validation schemas:
   ```typescript
   // Old
   if (!data.outlet_id || !data.quantity) { ... }
   
   // New
   const result = CreateProductionDailySchema.safeParse(data);
   if (!result.success) { ... }
   ```

## Support

For questions or issues with types and schemas, please refer to:
- Design document: `.kiro/specs/production-tracking-system/design.md`
- Requirements: `.kiro/specs/production-tracking-system/requirements.md`
- Database schema: `QueryDATABASE/31-production-tracking-system.sql`
