# React Query Setup Documentation

## Overview

This directory contains the React Query (TanStack Query) configuration for the Production Tracking System. React Query is used for server state management, providing caching, synchronization, and real-time data updates.

## Files Structure

```
lib/query/
├── query-client.ts      # QueryClient configuration with cache times
├── query-provider.tsx   # QueryClientProvider wrapper component
├── query-keys.ts        # Centralized query key factory
├── index.ts            # Barrel export file
└── README.md           # This file
```

## Installation

The following packages are installed:

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

## Configuration

### 1. Query Client (`query-client.ts`)

Configures the QueryClient with default options and cache strategies.

**Cache Time Configuration:**

- **Real-time** (30s stale, 5min cache): Inventory validation, stock, alerts
- **Frequent** (2min stale, 10min cache): Production lists, closing lists, dashboard
- **Stable** (5min stale, 30min cache): Detail views, loss summaries
- **Static** (1hr stale, 24hr cache): Outlets, products

**Default Options:**

- Refetch on window focus: ✅
- Refetch on reconnect: ✅
- Retry failed requests: 1 time
- Network mode: Online only

### 2. Query Provider (`query-provider.tsx`)

Client component that wraps the app with QueryClientProvider.

**Features:**

- Creates stable QueryClient instance per mount
- Includes React Query Devtools in development
- Handles client-side hydration properly

### 3. Query Keys (`query-keys.ts`)

Centralized query key factory for consistent cache management.

**Query Key Structure:**

```typescript
queryKeys.productions.all              // ['productions']
queryKeys.productions.list(filters)    // ['productions', 'list', filters]
queryKeys.productions.detail(id)       // ['productions', 'detail', id]
```

**Available Query Keys:**

- `productions` - Production daily data
- `inventory` - Inventory validation and stock
- `closing` - Daily closing data
- `toppingErrors` - Topping error reports
- `dashboard` - Dashboard analytics
- `alerts` - System alerts
- `lossSummary` - Loss summaries
- `outlets` - Outlet data
- `products` - Product data

## Usage

### Basic Query Example

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys, getCacheConfig } from '@/lib/query';

function ProductionList({ filters }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.productions.list(filters),
    queryFn: () => fetchProductions(filters),
    ...getCacheConfig('productions-list'),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render data */}</div>;
}
```

### Mutation Example

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getProductionInvalidationKeys } from '@/lib/query';

function CreateProduction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProduction,
    onSuccess: (data) => {
      // Invalidate related queries
      const keys = getProductionInvalidationKeys(data.outlet_id);
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  return (
    <button onClick={() => mutation.mutate(formData)}>
      Create Production
    </button>
  );
}
```

### Real-time Query Example

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys, shouldRefetchOnInterval } from '@/lib/query';

function StockValidation({ outlet_id }) {
  const { data } = useQuery({
    queryKey: queryKeys.inventory.validation(outlet_id),
    queryFn: () => validateStock(outlet_id),
    refetchInterval: shouldRefetchOnInterval('inventory-validation'), // 30s
    refetchOnWindowFocus: true,
  });

  return <div>{/* Render validation status */}</div>;
}
```

## Cache Invalidation

Use helper functions to invalidate related queries after mutations:

```typescript
import { 
  getProductionInvalidationKeys,
  getClosingInvalidationKeys,
  getToppingErrorInvalidationKeys,
  getSaleInvalidationKeys,
} from '@/lib/query';

// After production input
const keys = getProductionInvalidationKeys(outlet_id);
keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

// After closing
const keys = getClosingInvalidationKeys(outlet_id, tanggal);
keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

// After topping error
const keys = getToppingErrorInvalidationKeys(outlet_id);
keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

// After sale
const keys = getSaleInvalidationKeys(outlet_id);
keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
```

## React Query Devtools

In development mode, React Query Devtools is available at the bottom-right corner of the screen.

**Features:**

- View all queries and their states
- Inspect query data and cache
- Manually refetch or invalidate queries
- Monitor query performance

**Access:** Click the React Query icon in the bottom-right corner

## Best Practices

1. **Always use query keys from `queryKeys` factory** - Ensures consistency
2. **Apply appropriate cache config** - Use `getCacheConfig()` for specific query types
3. **Invalidate related queries after mutations** - Use helper functions
4. **Use optimistic updates for better UX** - Update cache before server response
5. **Handle loading and error states** - Provide feedback to users
6. **Use `enabled` option for dependent queries** - Wait for required data
7. **Avoid over-fetching** - Use appropriate stale times

## Integration with Root Layout

The QueryProvider is integrated in `app/layout.tsx`:

```typescript
import { QueryProvider } from '@/lib/query/query-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Note:** QueryProvider wraps AuthProvider to ensure React Query is available throughout the app.

## Performance Considerations

1. **Cache times are optimized per query type** - Real-time data has shorter cache times
2. **Automatic garbage collection** - Unused cache is cleaned up after `cacheTime`
3. **Refetch on window focus** - Ensures data is fresh when user returns
4. **Retry logic** - Failed requests are retried once with exponential backoff
5. **Network mode** - Only fetches when online to avoid unnecessary errors

## Troubleshooting

### Query not refetching

- Check `staleTime` - Data might still be considered fresh
- Verify `enabled` option - Query might be disabled
- Check network mode - Might be offline

### Cache not invalidating

- Verify query key matches exactly
- Use `queryClient.invalidateQueries()` with correct key
- Check if mutation `onSuccess` is called

### Devtools not showing

- Ensure `NODE_ENV=development`
- Check if QueryProvider is properly set up
- Verify `@tanstack/react-query-devtools` is installed

## Related Documentation

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router with React Query](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- Design Document: `.kiro/specs/production-tracking-system/design.md`
- Requirements: `.kiro/specs/production-tracking-system/requirements.md`
