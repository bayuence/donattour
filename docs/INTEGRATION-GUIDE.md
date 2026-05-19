# 🔧 Integration Guide - Add Offline Support to Existing POS

## Overview

Panduan ini menjelaskan cara menambahkan offline support ke POS interface yang sudah ada (`components/pos/pos-interface.tsx`).

---

## Step 1: Import Hooks & Components

Tambahkan import di bagian atas file:

```tsx
// Add these imports
import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';
import { useRealtimeInventory } from '@/lib/hooks/use-realtime-inventory';
import { OfflineIndicator } from '@/components/offline/offline-indicator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

---

## Step 2: Replace State Management dengan TanStack Query

### Before (Current):

```tsx
const [products, setProducts] = useState<Types.ProductWithCategory[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    const loadedProducts = await db.getProducts();
    setProducts(loadedProducts);
    setLoading(false);
  };
  loadData();
}, []);
```

### After (With Offline Cache):

```tsx
// Remove useState for products and loading

// Use TanStack Query with offline cache
const { data: products = [], isLoading: loading } = useQuery({
  queryKey: ['products', user?.outlet_id],
  queryFn: async () => {
    return await db.getProducts();
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  enabled: !!user?.outlet_id,
});
```

---

## Step 3: Add Offline Transaction Hook

Tambahkan hook untuk offline transaction:

```tsx
export function PosInterface() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Add offline transaction hook
  const createTransaction = useOfflineTransaction();
  
  // Add realtime inventory hook
  const { isConnected } = useRealtimeInventory({
    outletId: user?.outlet_id,
    enabled: !!user?.outlet_id,
    onUpdate: (update) => {
      // Invalidate products query to refresh stock
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // ... rest of your code
}
```

---

## Step 4: Update Payment Handler

### Before (Current):

```tsx
const handlePayment = async (paymentData: any) => {
  try {
    const result = await db.createOrder(orderData, cart, user.outlet_id);
    
    if (result.success) {
      toast.success('Transaksi berhasil!');
      setCart([]);
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error('Gagal membuat transaksi');
  }
};
```

### After (With Offline Support):

```tsx
const handlePayment = async (paymentData: any) => {
  try {
    await createTransaction.mutateAsync({
      orderData: {
        outlet_id: user.outlet_id,
        customer_name: paymentData.customerName || 'Walk-in',
        total_amount: calculateTotal(),
        payment_method: paymentData.method,
        channel: paymentData.channel || 'toko',
        paid_amount: paymentData.paidAmount,
        change_amount: paymentData.changeAmount,
        kasir_name: user.name,
        kasir_id: user.id,
      },
      items: cart,
      outletId: user.outlet_id,
    });

    // Clear cart on success
    setCart([]);
    setShowPayment(false);
  } catch (error) {
    // Error handling is done in the hook
    console.error('Payment error:', error);
  }
};
```

---

## Step 5: Add Offline Indicator to UI

Tambahkan offline indicator di header POS:

```tsx
return (
  <div className="flex h-screen">
    {/* Header with Offline Indicator */}
    <div className="border-b p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">POS - {user?.name}</h1>
        
        {/* Add Offline Indicator */}
        <OfflineIndicator />
      </div>
      
      {/* Optional: Realtime Status */}
      <div className="mt-2 text-xs text-gray-500">
        {isConnected ? '🟢 Real-time Active' : '🔴 Real-time Inactive'}
      </div>
    </div>

    {/* Rest of your POS UI */}
    {/* ... */}
  </div>
);
```

---

## Step 6: Update Categories & Settings Query

Sama seperti products, convert ke TanStack Query:

```tsx
// Categories
const { data: categories = [] } = useQuery({
  queryKey: ['categories'],
  queryFn: async () => {
    return await db.getCategories();
  },
  staleTime: 30 * 60 * 1000, // 30 minutes (categories jarang berubah)
});

// Settings
const { data: settings } = useQuery({
  queryKey: ['shop-settings', user?.outlet_id],
  queryFn: async () => {
    return await db.getShopSettings(user?.outlet_id);
  },
  staleTime: 30 * 60 * 1000,
  enabled: !!user?.outlet_id,
});
```

---

## Complete Example

Berikut contoh lengkap integrasi:

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';
import { useRealtimeInventory } from '@/lib/hooks/use-realtime-inventory';
import { OfflineIndicator } from '@/components/offline/offline-indicator';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';

export function PosInterface() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Types.CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);

  // Offline transaction hook
  const createTransaction = useOfflineTransaction();

  // Realtime inventory hook
  const { isConnected } = useRealtimeInventory({
    outletId: user?.outlet_id,
    enabled: !!user?.outlet_id,
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Products query with offline cache
  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ['products', user?.outlet_id],
    queryFn: () => db.getProducts(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.outlet_id,
  });

  // Categories query
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.getCategories(),
    staleTime: 30 * 60 * 1000,
  });

  // Settings query
  const { data: settings } = useQuery({
    queryKey: ['shop-settings', user?.outlet_id],
    queryFn: () => db.getShopSettings(user?.outlet_id),
    staleTime: 30 * 60 * 1000,
    enabled: !!user?.outlet_id,
  });

  // Payment handler with offline support
  const handlePayment = async (paymentData: any) => {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

    await createTransaction.mutateAsync({
      orderData: {
        outlet_id: user!.outlet_id!,
        customer_name: paymentData.customerName || 'Walk-in',
        total_amount: total,
        payment_method: paymentData.method,
        channel: paymentData.channel || 'toko',
        paid_amount: paymentData.paidAmount,
        change_amount: paymentData.changeAmount,
        kasir_name: user!.name,
        kasir_id: user!.id,
      },
      items: cart,
      outletId: user!.outlet_id!,
    });

    setCart([]);
    setShowPayment(false);
  };

  // Rest of your component logic...
  // (handleAddToCart, handleUpdateQuantity, etc.)

  return (
    <div className="flex h-screen">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">POS - {user?.name}</h1>
          <OfflineIndicator />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {isConnected ? '🟢 Real-time Active' : '🔴 Real-time Inactive'}
        </div>
      </div>

      {/* Your existing POS UI */}
      {/* ... */}
    </div>
  );
}
```

---

## Testing Checklist

After integration, test these scenarios:

### ✅ Online Mode
- [ ] Products load correctly
- [ ] Create transaction works
- [ ] Real-time updates work (test with 2 tabs)
- [ ] Offline indicator shows "Online"

### ✅ Offline Mode
- [ ] Products load from cache
- [ ] Create transaction queues successfully
- [ ] Toast shows "📡 Transaksi disimpan offline"
- [ ] Offline indicator shows "Offline" + pending count

### ✅ Back Online
- [ ] Queued transactions sync automatically
- [ ] Toast shows "✅ Transaksi berhasil!"
- [ ] Offline indicator clears pending count
- [ ] Products refresh with latest data

### ✅ Real-time Sync
- [ ] Open 2 tabs with same outlet
- [ ] Create transaction in tab 1
- [ ] Stock updates in tab 2 without refresh

---

## Troubleshooting

### Products not loading from cache
- Check if `@tanstack/react-query-persist-client` is installed
- Check browser console for IndexedDB errors
- Clear IndexedDB: DevTools → Application → IndexedDB → Delete

### Transactions not syncing
- Check network tab for API errors
- Check offline queue: `getAllQueueItems()`
- Manual sync: `syncManager.syncQueue()`

### Real-time not working
- Check Supabase Realtime is enabled
- Check RLS policies on `stocks` table
- Check browser console for subscription errors

---

## Performance Tips

1. **Adjust staleTime** based on data freshness needs:
   - Products: 5 minutes (frequently changing)
   - Categories: 30 minutes (rarely changing)
   - Settings: 30 minutes (rarely changing)

2. **Selective invalidation**:
   ```tsx
   // Only invalidate specific queries
   queryClient.invalidateQueries({ queryKey: ['products', outletId] });
   ```

3. **Prefetch data**:
   ```tsx
   // Prefetch products on app load
   queryClient.prefetchQuery({
     queryKey: ['products', outletId],
     queryFn: () => db.getProducts(),
   });
   ```

---

## Next Steps

1. ✅ Install dependency: `npm install @tanstack/react-query-persist-client`
2. ✅ Apply changes to `components/pos/pos-interface.tsx`
3. ✅ Test offline mode
4. ✅ Test real-time sync
5. ✅ Deploy to production

---

## Support

Untuk pertanyaan atau issue, lihat:
- `docs/OFFLINE-SETUP.md` - Complete setup guide
- `docs/EXAMPLE-POS-OFFLINE.tsx` - Full example
- `OFFLINE-SUMMARY.md` - Implementation summary

**Happy coding! 🚀**
