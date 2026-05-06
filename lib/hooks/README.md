# Custom Hooks Documentation

## Overview

This directory contains custom React Query hooks for data fetching and mutations in the Production Tracking System.

## Available Hooks

### 1. Production Hooks (`useProduction.ts`)

#### `useProductionList(filters)`
Fetch production list with filters.

**Parameters:**
- `filters: ProductionFilters` - Filter options

**Returns:** React Query result with production list

**Example:**
```tsx
import { useProductionList } from '@/lib/hooks';

function ProductionListPage() {
  const { data, isLoading, error } = useProductionList({
    outlet_id: 'outlet-1',
    tanggal: '2026-05-02',
    ukuran: 'standar',
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data.data.items.map(prod => (
        <li key={prod.id}>
          {prod.ukuran}: {prod.success_qty}/{prod.target_qty}
        </li>
      ))}
    </ul>
  );
}
```

#### `useProductionDetail(id)`
Fetch single production by ID.

**Example:**
```tsx
const { data, isLoading } = useProductionDetail('prod-123');
```

#### `useCreateProduction()`
Create new production entry.

**Example:**
```tsx
import { useCreateProduction } from '@/lib/hooks';
import { toast } from 'sonner';

function ProductionForm() {
  const createMutation = useCreateProduction();
  
  const handleSubmit = async (formData) => {
    try {
      await createMutation.mutateAsync(formData);
      toast.success('Production created successfully!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button 
        type="submit" 
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

#### `useUpdateProduction()`
Update existing production.

**Example:**
```tsx
const updateMutation = useUpdateProduction();

const handleUpdate = async (id, data) => {
  await updateMutation.mutateAsync({ id, data });
};
```

#### `useDeleteProduction()`
Delete production entry.

**Example:**
```tsx
const deleteMutation = useDeleteProduction();

const handleDelete = async (id) => {
  if (confirm('Are you sure?')) {
    await deleteMutation.mutateAsync(id);
  }
};
```

---

### 2. Inventory Hooks (`useInventory.ts`)

#### `useStockValidation(outlet_id)`
Validate stock before POS can operate. **Auto-refetches every 30 seconds.**

**Example:**
```tsx
import { useStockValidation } from '@/lib/hooks';

function POSPage() {
  const { data, isLoading } = useStockValidation('outlet-1');
  
  if (isLoading) return <div>Checking stock...</div>;
  
  if (!data?.can_operate) {
    return (
      <StockValidationModal>
        <p>Belum ada input produksi hari ini!</p>
        <p>Hubungi bagian dapur untuk input produksi.</p>
      </StockValidationModal>
    );
  }
  
  return <POSInterface />;
}
```

#### `useInventoryStock(outlet_id, filters?)`
Fetch inventory stock levels. **Auto-refetches every 30 seconds.**

**Example:**
```tsx
const { data } = useInventoryStock('outlet-1', {
  ukuran: 'standar',
  status: 'fresh',
});

return (
  <div>
    <p>Standar: {data?.total_by_size.standar} pcs</p>
    <p>Mini: {data?.total_by_size.mini} pcs</p>
  </div>
);
```

#### `useDeductStock()`
Deduct stock on sale. **Includes optimistic updates.**

**Example:**
```tsx
const deductMutation = useDeductStock();

const handleSale = async (items) => {
  for (const item of items) {
    await deductMutation.mutateAsync({
      outlet_id: 'outlet-1',
      ukuran: item.ukuran,
      qty: item.qty,
    });
  }
};
```

---

### 3. Dashboard Hooks (`useDashboard.ts`)

#### `useDashboardData(filters)`
Fetch daily dashboard data.

**Example:**
```tsx
import { useDashboardData } from '@/lib/hooks';

function DashboardPage() {
  const { data, isLoading } = useDashboardData({
    outlet_id: 'outlet-1',
    tanggal: '2026-05-02',
  });
  
  if (isLoading) return <DashboardSkeleton />;
  
  return (
    <div>
      <FinancialSummary data={data.financial} />
      <ProductionOverview data={data.production} />
      <LossBreakdown data={data.loss} />
      <SalesByFlavor data={data.sales} />
    </div>
  );
}
```

#### `useWeeklyDashboard(outlet_id, start_date)`
Fetch weekly dashboard data.

**Example:**
```tsx
const { data } = useWeeklyDashboard('outlet-1', '2026-05-01');
```

#### `useMonthlyDashboard(outlet_id, year, month)`
Fetch monthly dashboard data.

**Example:**
```tsx
const { data } = useMonthlyDashboard('outlet-1', 2026, 5);
```

#### `usePrefetchDashboard()`
Prefetch dashboard data before navigation.

**Example:**
```tsx
const prefetchDashboard = usePrefetchDashboard();

const handleOutletChange = (outlet_id) => {
  // Prefetch data before navigation
  prefetchDashboard(outlet_id, today);
  router.push(`/dashboard?outlet=${outlet_id}`);
};
```

---

### 4. Closing Hooks (`useClosing.ts`)

#### `useClosingCheck(outlet_id, tanggal)`
Check if outlet has closed today.

**Example:**
```tsx
import { useClosingCheck } from '@/lib/hooks';

function ClosingPage() {
  const { data } = useClosingCheck('outlet-1', '2026-05-02');
  
  if (data?.has_closed) {
    return (
      <div>
        <p>Outlet sudah closing hari ini.</p>
        <p>Closing time: {data.closing_data.created_at}</p>
      </div>
    );
  }
  
  return <ClosingForm />;
}
```

#### `useClosingList(filters)`
Fetch closing list with filters.

**Example:**
```tsx
const { data } = useClosingList({
  outlet_id: 'outlet-1',
  start_date: '2026-05-01',
  end_date: '2026-05-31',
});
```

#### `useClosingDetail(id)`
Fetch single closing by ID.

**Example:**
```tsx
const { data } = useClosingDetail('closing-123');
```

#### `useCreateClosing()`
Create daily closing.

**Example:**
```tsx
const createMutation = useCreateClosing();

const handleSubmit = async (closingData) => {
  try {
    await createMutation.mutateAsync(closingData);
    toast.success('Closing berhasil disimpan!');
    router.push('/dashboard');
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

### 5. Alert Hooks (`useAlerts.ts`)

#### `useAlerts()` (from Context)
**Real-time alerts with auto-polling (60s).** Use this for header/navbar.

**Example:**
```tsx
import { useAlerts } from '@/lib/hooks';

function AlertBell() {
  const { alerts, unreadCount, markAsRead } = useAlerts();
  
  return (
    <div>
      <button>
        🔔
        {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      </button>
      
      <Dropdown>
        {alerts.map(alert => (
          <AlertItem 
            key={alert.id}
            alert={alert}
            onClick={() => markAsRead(alert.id)}
          />
        ))}
      </Dropdown>
    </div>
  );
}
```

#### `useAlertsList(filters)`
Fetch alerts list (for alert history page).

**Example:**
```tsx
const { data } = useAlertsList({
  outlet_id: 'outlet-1',
  severity: 'critical',
  is_read: false,
});
```

#### `useUnreadAlertCount(outlet_id?)`
Fetch unread alert count.

**Example:**
```tsx
const { data } = useUnreadAlertCount('outlet-1');
```

#### `useMarkAlertAsRead()`
Mark single alert as read.

**Example:**
```tsx
const markAsReadMutation = useMarkAlertAsRead();

const handleClick = (alertId) => {
  markAsReadMutation.mutate(alertId);
};
```

#### `useMarkAllAlertsAsRead()`
Mark all alerts as read.

**Example:**
```tsx
const markAllMutation = useMarkAllAlertsAsRead();

const handleMarkAllAsRead = () => {
  markAllMutation.mutate('outlet-1');
};
```

---

## Best Practices

### 1. Always handle loading and error states

❌ **Wrong:**
```tsx
const { data } = useProductionList(filters);
return <div>{data.items.length}</div>; // Error if data is undefined
```

✅ **Correct:**
```tsx
const { data, isLoading, error } = useProductionList(filters);

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;

return <div>{data.data.items.length}</div>;
```

### 2. Use optimistic updates for better UX

```tsx
const createMutation = useCreateProduction({
  onMutate: async (newProduction) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['productions'] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['productions']);
    
    // Optimistically update
    queryClient.setQueryData(['productions'], (old) => ({
      ...old,
      items: [...old.items, newProduction],
    }));
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['productions'], context.previous);
  },
});
```

### 3. Invalidate related queries after mutations

```tsx
const createMutation = useCreateProduction();

// Automatically invalidates:
// - queryKeys.productions.all
// - queryKeys.inventory.all
// - queryKeys.dashboard.all
```

### 4. Use enabled option to control when queries run

```tsx
const { data } = useProductionDetail(productionId, {
  enabled: !!productionId, // Only fetch if ID exists
});
```

### 5. Prefetch data for better UX

```tsx
const prefetchDashboard = usePrefetchDashboard();

// Prefetch on hover
<Link 
  href="/dashboard"
  onMouseEnter={() => prefetchDashboard(outletId, today)}
>
  Dashboard
</Link>
```

---

## Cache Strategy

### Real-time queries (30s stale, 5min cache)
- `useStockValidation` - Auto-refetch every 30s
- `useInventoryStock` - Auto-refetch every 30s
- `useAlerts` (context) - Auto-poll every 60s

### Frequent queries (2min stale, 10min cache)
- `useProductionList`
- `useClosingList`
- `useDashboardData`

### Stable queries (5min stale, 30min cache)
- `useProductionDetail`
- `useClosingDetail`

---

## Error Handling

All hooks throw errors that can be caught:

```tsx
const { data, error } = useProductionList(filters);

if (error) {
  return (
    <ErrorBoundary>
      <ErrorMessage 
        title="Failed to load productions"
        message={error.message}
        retry={() => refetch()}
      />
    </ErrorBoundary>
  );
}
```

---

## TypeScript Support

All hooks are fully typed:

```tsx
import type { ProductionFilters } from '@/lib/query';

const filters: ProductionFilters = {
  outlet_id: 'outlet-1',
  tanggal: '2026-05-02',
  ukuran: 'standar', // Type-safe: only 'standar' | 'mini'
};

const { data } = useProductionList(filters);
// data is typed as ProductionListResponse
```

---

## Related Documentation

- [React Query Documentation](../query/README.md)
- [Context Providers Documentation](../context/README.md)
- [API Routes Documentation](../../app/api/README.md)
- [Design Document](../../.kiro/specs/production-tracking-system/design.md)

---

**Version:** 1.0  
**Last Updated:** 2026-05-02  
**Maintained by:** Production Tracking System Team
