# 📡 Offline Transaction Setup - Donattour System

## 🎯 Overview

Sistem Offline Transaction memungkinkan aplikasi POS Donattour untuk:
- ✅ Bekerja tanpa koneksi internet
- ✅ Menyimpan transaksi offline ke IndexedDB
- ✅ Sinkronisasi otomatis saat koneksi kembali
- ✅ Real-time update stok antar kasir (Supabase Realtime)
- ✅ Cache data produk dan transaksi untuk performa optimal

---

## 📦 Dependencies

Tambahkan package berikut ke `package.json`:

```bash
npm install @tanstack/react-query-persist-client
```

Package ini diperlukan untuk persist TanStack Query cache ke IndexedDB.

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     POS Interface                            │
│  (useOfflineTransaction, useRealtimeInventory)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TanStack Query + Persister                      │
│  (Cache di IndexedDB, Offline-First Strategy)               │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│   Online?    │          │  Offline?    │
│   ↓          │          │   ↓          │
│ Supabase API │          │ IndexedDB    │
│ (Direct)     │          │ Queue        │
└──────────────┘          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │ Sync Manager │
                          │ (Auto Sync)  │
                          └──────────────┘
```

---

## 🚀 Setup Steps

### 1. Install Dependencies

```bash
npm install @tanstack/react-query-persist-client
```

### 2. File Structure

Struktur file yang sudah dibuat:

```
lib/
├── offline/
│   ├── indexeddb.ts          # IndexedDB utilities
│   ├── persister.ts          # TanStack Query persister
│   ├── queue.ts              # Offline queue manager
│   └── sync.ts               # Sync manager
├── hooks/
│   ├── use-offline-mutation.ts      # Offline-first mutation hook
│   ├── use-offline-transaction.ts   # Transaction hook
│   └── use-realtime-inventory.ts    # Realtime inventory hook
└── query/
    ├── query-client.ts       # Updated with offline support
    └── query-provider.tsx    # Updated with persister

components/
└── offline/
    └── offline-indicator.tsx # Offline status indicator
```

### 3. Update Query Provider (✅ Sudah Selesai)

File `lib/query/query-provider.tsx` sudah diupdate dengan:
- IndexedDB persister
- Offline sync manager initialization
- Persist cache selama 7 hari

### 4. Update Query Client (✅ Sudah Selesai)

File `lib/query/query-client.ts` sudah diupdate dengan:
- `networkMode: 'offlineFirst'` untuk queries dan mutations
- Cache akan digunakan saat offline

---

## 💻 Usage Examples

### Example 1: Offline Transaction di POS

```tsx
'use client';

import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';
import { useRealtimeInventory } from '@/lib/hooks/use-realtime-inventory';
import { OfflineIndicator } from '@/components/offline/offline-indicator';

export function POSInterface() {
  const createTransaction = useOfflineTransaction();
  const { isConnected } = useRealtimeInventory({
    outletId: user.outlet_id,
    onUpdate: (update) => {
      console.log('Stock updated:', update);
      // Refresh product list or show notification
    }
  });

  const handleCheckout = async () => {
    await createTransaction.mutateAsync({
      orderData: {
        outlet_id: user.outlet_id,
        customer_name: 'Walk-in Customer',
        total_amount: 50000,
        payment_method: 'cash',
        channel: 'toko',
        paid_amount: 50000,
        change_amount: 0,
        kasir_name: user.name,
        kasir_id: user.id,
      },
      items: [
        {
          product_id: 'prod-123',
          product_name: 'Donat Coklat',
          quantity: 2,
          unit_price: 25000,
          subtotal: 50000,
        }
      ],
      outletId: user.outlet_id,
    });
  };

  return (
    <div>
      {/* Offline Indicator */}
      <div className="mb-4">
        <OfflineIndicator />
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        disabled={createTransaction.isPending}
      >
        {createTransaction.isPending ? 'Processing...' : 'Checkout'}
      </button>

      {/* Realtime Status */}
      <div className="text-xs text-gray-500">
        {isConnected ? '🟢 Real-time Active' : '🔴 Real-time Inactive'}
      </div>
    </div>
  );
}
```

### Example 2: Custom Offline Mutation

```tsx
import { useOfflineMutation } from '@/lib/hooks/use-offline-mutation';

export function useUpdateStock() {
  return useOfflineMutation({
    mutationFn: async (data: { productId: string; quantity: number }) => {
      const response = await fetch('/api/inventory/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update stock');
      }

      return response.json();
    },
    queueType: 'inventory',
    queueAction: 'update_stock',
    offlineMessage: 'Stock update queued for sync',
    onSuccess: () => {
      console.log('Stock updated successfully');
    },
  });
}
```

### Example 3: Offline Status Badge

```tsx
import { OfflineBadge } from '@/components/offline/offline-indicator';

export default function DashboardLayout({ children }) {
  return (
    <div>
      {children}
      
      {/* Floating offline badge */}
      <OfflineBadge />
    </div>
  );
}
```

---

## 🔄 How It Works

### 1. **Online Mode**
- Transaksi langsung dikirim ke Supabase
- Real-time updates aktif
- Cache di-update otomatis

### 2. **Offline Mode**
- Transaksi disimpan ke IndexedDB queue
- User tetap bisa bekerja normal
- Toast notification: "📡 Transaksi disimpan offline"

### 3. **Back Online**
- Sync manager otomatis mendeteksi koneksi
- Queue di-sync ke Supabase satu per satu
- Queries di-invalidate untuk refresh data
- Toast notification: "✅ Transaksi berhasil!"

### 4. **Real-time Sync**
- Supabase Realtime mendengarkan perubahan `stocks` table
- Semua kasir mendapat update stok secara instan
- Tidak perlu refresh manual

---

## 🎛️ Configuration

### Cache Duration

Edit `lib/query/query-provider.tsx`:

```tsx
persistOptions={{
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (ubah sesuai kebutuhan)
}}
```

### Sync Interval

Edit `lib/offline/sync.ts`:

```tsx
// Default: 30 detik
syncManager.startAutoSync(30000);

// Ubah ke 1 menit:
syncManager.startAutoSync(60000);
```

### Retry Configuration

Edit `lib/offline/queue.ts`:

```tsx
if (item.retryCount < 3) { // Max 3 retries (ubah sesuai kebutuhan)
  item.status = 'pending';
  await updateInStore(STORES.OFFLINE_QUEUE, item);
}
```

---

## 🧪 Testing

### Test Offline Mode

1. Buka Chrome DevTools → Network tab
2. Set throttling ke "Offline"
3. Coba buat transaksi
4. Lihat toast: "📡 Transaksi disimpan offline"
5. Cek IndexedDB: Application → IndexedDB → `donattour_offline_db`
6. Set throttling kembali ke "Online"
7. Tunggu 30 detik atau refresh page
8. Transaksi akan ter-sync otomatis

### Test Real-time Updates

1. Buka 2 tab browser (simulasi 2 kasir)
2. Login di kedua tab dengan outlet yang sama
3. Di tab 1: buat transaksi yang mengurangi stok
4. Di tab 2: stok akan ter-update otomatis tanpa refresh

---

## 📊 Monitoring

### Check Queue Status

```tsx
import { getQueueStats } from '@/lib/offline/queue';

const stats = await getQueueStats();
console.log('Queue stats:', stats);
// { total: 5, pending: 3, syncing: 1, synced: 0, failed: 1 }
```

### Check Storage Usage

```tsx
import { getStorageEstimate } from '@/lib/offline/indexeddb';

const estimate = await getStorageEstimate();
console.log('Storage:', estimate);
// { usage: 5242880, quota: 52428800, usagePercent: 10 }
```

---

## 🐛 Troubleshooting

### Issue: Cache tidak ter-restore setelah refresh

**Solution:**
- Pastikan `@tanstack/react-query-persist-client` sudah terinstall
- Cek browser console untuk error IndexedDB
- Coba clear IndexedDB: Application → IndexedDB → Delete database

### Issue: Transaksi tidak ter-sync

**Solution:**
- Cek network tab untuk error API
- Cek offline queue: `getAllQueueItems()`
- Cek retry count: jika > 3, item tidak akan di-retry lagi
- Manual sync: `syncManager.syncQueue()`

### Issue: Real-time tidak bekerja

**Solution:**
- Pastikan Supabase Realtime enabled di dashboard
- Cek Supabase console untuk error
- Pastikan table `stocks` memiliki RLS policy yang benar
- Cek browser console untuk subscription status

---

## 🔐 Security Considerations

1. **RLS Policies**: Pastikan Supabase RLS policies sudah benar
2. **Auth Headers**: Semua API calls harus include auth headers
3. **Data Validation**: Validate data sebelum sync ke server
4. **Queue Cleanup**: Hapus queue items yang sudah > 7 hari

---

## 📈 Performance Tips

1. **Limit Cache Size**: Jangan cache data yang terlalu besar
2. **Selective Persistence**: Hanya persist queries yang penting
3. **Throttle Sync**: Jangan sync terlalu sering (min 30 detik)
4. **Clean Old Data**: Hapus cache yang sudah expired

---

## 🎉 Done!

Sistem Offline Transaction sudah siap digunakan! 🚀

Untuk pertanyaan atau issue, silakan hubungi tim development.
