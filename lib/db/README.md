# Database Helper Functions

This directory contains database helper functions for the Donut POS system.

## Production Tracking System

### `production-tracking.ts`

Type-safe database operations for the production tracking system.

#### Features

- **Production Daily Operations**: CRUD operations for daily production records
- **Inventory Management**: Real-time inventory tracking for non-topping donuts
- **Topping Error Tracking**: Record and query topping errors
- **Daily Closing**: Complete closing operations with loss summaries
- **Validation Helpers**: Business logic validation functions

#### Usage Examples

##### Get Production Records

```typescript
import { getProductionDaily } from '@/lib/db/production-tracking';

// Get all production for an outlet
const productions = await getProductionDaily({
  outlet_id: 'outlet-123',
  tanggal: '2024-01-15',
});

// Get production with date range
const productionRange = await getProductionDaily({
  outlet_id: 'outlet-123',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  limit: 20,
  offset: 0,
});
```

##### Create Production Record

```typescript
import { createProductionDaily } from '@/lib/db/production-tracking';

const production = await createProductionDaily(
  {
    outlet_id: 'outlet-123',
    tanggal: '2024-01-15',
    ukuran: 'standar',
    target_qty: 300,
    success_qty: 280,
    waste_qty: 20,
    total_hpp_loss: 60000,
    created_by: 'user-123',
  },
  [
    {
      reason: 'gosong',
      qty: 10,
      hpp_per_pcs: 3000,
    },
    {
      reason: 'bentuk_jelek',
      qty: 10,
      hpp_per_pcs: 3000,
    },
  ]
);
```

##### Validate Kasir Operation

```typescript
import { validateKasirCanOperate } from '@/lib/db/production-tracking';

const validation = await validateKasirCanOperate(
  'outlet-123',
  '2024-01-15'
);

if (!validation.can_operate) {
  console.log(validation.message); // "Belum ada input produksi hari ini"
}
```

##### Get Stock Summary

```typescript
import { getStockSummary } from '@/lib/db/production-tracking';

const summary = await getStockSummary('outlet-123', '2024-01-15');

console.log(summary.standar.total_available); // 150
console.log(summary.mini.total_available); // 80
```

## Error Handling

All database functions throw errors on failure. Always wrap calls in try-catch blocks:

```typescript
try {
  const production = await getProductionDaily({ outlet_id: 'outlet-123' });
} catch (error) {
  console.error('Failed to fetch production:', error);
  // Handle error appropriately
}
```

## Type Safety

All functions use TypeScript types from `@/lib/types/production` for type safety:

```typescript
import type {
  ProductionDaily,
  ProductionDailyWithDetails,
  CreateProductionDaily,
} from '@/lib/types/production';
```

## Best Practices

1. **Use filters**: Always filter queries to avoid fetching unnecessary data
2. **Pagination**: Use `limit` and `offset` for large datasets
3. **Error handling**: Always handle errors appropriately
4. **Type safety**: Use TypeScript types for all operations
5. **Transactions**: Use transaction wrappers for complex operations (see `@/lib/utils/transaction`)

## Related Files

- `@/lib/types/production.ts` - TypeScript types
- `@/lib/utils/transaction.ts` - Transaction wrappers
- `@/lib/utils/auth-helpers.ts` - Authentication helpers
- `@/lib/supabase/client.ts` - Supabase client configuration
