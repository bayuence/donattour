# 🚀 Quick Start - Offline Transaction

## 1️⃣ Install Dependency (WAJIB!)

```bash
npm install @tanstack/react-query-persist-client
```

## 2️⃣ Restart Server

```bash
npm run dev
```

## 3️⃣ Implement di POS

### Minimal Implementation

```tsx
'use client';

import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';
import { useRealtimeInventory } from '@/lib/hooks/use-realtime-inventory';
import { OfflineIndicator } from '@/components/offline/offline-indicator';

export function POSInterface() {
  const createTransaction = useOfflineTransaction();
  const { isConnected } = useRealtimeInventory({
    outletId: user.outlet_id,
  });

  const handleCheckout = async () => {
    await createTransaction.mutateAsync({
      orderData: {
        outlet_id: user.outlet_id,
        customer_name: 'Walk-in',
        total_amount: 50000,
        payment_method: 'cash',
        channel: 'toko',
        paid_amount: 50000,
        change_amount: 0,
      },
      items: cartItems,
      outletId: user.outlet_id,
    });
  };

  return (
    <div>
      {/* Offline Status */}
      <OfflineIndicator />

      {/* Your POS UI */}
      <button onClick={handleCheckout}>
        Checkout
      </button>
    </div>
  );
}
```

## 4️⃣ Test Offline Mode

1. Buka Chrome DevTools
2. Network tab → Set "Offline"
3. Buat transaksi
4. Lihat toast: "📡 Transaksi disimpan offline"
5. Set kembali "Online"
6. Tunggu 30 detik → Auto sync!

## 5️⃣ Test Real-time Sync

1. Buka 2 tab browser
2. Login di kedua tab
3. Tab 1: Buat transaksi
4. Tab 2: Stok update otomatis! ✨

---

## 📚 Full Documentation

- **Setup Guide**: `docs/OFFLINE-SETUP.md`
- **Complete Example**: `docs/EXAMPLE-POS-OFFLINE.tsx`
- **Summary**: `OFFLINE-SUMMARY.md`

---

## 🎯 What You Get

✅ Offline transactions (IndexedDB)  
✅ Auto-sync when online  
✅ Real-time inventory updates  
✅ Multi-kasir synchronization  
✅ 7-day cache persistence  
✅ Offline indicator UI  
✅ Toast notifications  

---

## ⚡ That's It!

Sistem offline sudah siap! 🎉

**Next**: Lihat `docs/EXAMPLE-POS-OFFLINE.tsx` untuk implementasi lengkap.
