# 🚀 RUN THIS FIRST!

## ⚡ Quick Setup (5 menit)

### 1. Install Dependency

```bash
npm install @tanstack/react-query-persist-client
```

**PENTING**: Package ini WAJIB diinstall agar offline system berfungsi!

### 2. Restart Development Server

```bash
# Stop server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Verify Installation

Buka browser dan cek Console (F12):

Anda harus melihat log berikut:
```
✅ IndexedDB opened successfully
✅ Query cache persisted to IndexedDB
✅ Sync manager initialized
✅ Subscribed to inventory realtime updates
```

Jika ada error, lihat troubleshooting di bawah.

---

## 🧪 Quick Test

### Test 1: Offline Mode (2 menit)

1. Buka aplikasi di browser
2. Tekan F12 → Network tab
3. Set dropdown ke **"Offline"**
4. Coba buat transaksi di POS
5. Anda akan lihat toast: **"📡 Transaksi disimpan offline"**
6. Set kembali ke **"Online"**
7. Tunggu 30 detik atau refresh page
8. Transaksi akan sync otomatis!

### Test 2: Real-time Sync (2 menit)

1. Buka 2 tab browser
2. Login di kedua tab dengan outlet yang sama
3. Di Tab 1: Buat transaksi
4. Di Tab 2: Lihat stok update otomatis tanpa refresh!

---

## 📁 What Was Created?

### Core System (Auto-working)
- ✅ IndexedDB storage
- ✅ Offline queue manager
- ✅ Auto-sync system
- ✅ TanStack Query persister
- ✅ Supabase Realtime integration

### Ready-to-Use Hooks
- ✅ `useOfflineTransaction()` - For POS transactions
- ✅ `useRealtimeInventory()` - For real-time stock updates
- ✅ `useOfflineMutation()` - For custom offline mutations

### UI Components
- ✅ `<OfflineIndicator />` - Shows online/offline status
- ✅ `<OfflineBadge />` - Floating badge for mobile

---

## 🎯 Next Steps

### Option A: Use Example (Fastest)

Copy example POS interface:
```bash
# File: docs/EXAMPLE-POS-OFFLINE.tsx
# Copy this to your POS component
```

### Option B: Integrate to Existing POS

Follow integration guide:
```bash
# Read: docs/INTEGRATION-GUIDE.md
# Step-by-step guide to add offline support
```

### Option C: Custom Implementation

Use hooks directly:
```tsx
import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';

const createTransaction = useOfflineTransaction();

await createTransaction.mutateAsync({
  orderData: { ... },
  items: [ ... ],
  outletId: '...'
});
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `QUICK-START-OFFLINE.md` | Quick start guide (5 min) |
| `docs/OFFLINE-SETUP.md` | Complete setup guide |
| `docs/INTEGRATION-GUIDE.md` | Integration to existing POS |
| `docs/EXAMPLE-POS-OFFLINE.tsx` | Complete working example |
| `OFFLINE-SUMMARY.md` | Implementation summary |
| `IMPLEMENTATION-CHECKLIST.md` | Step-by-step checklist |

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@tanstack/react-query-persist-client'"

**Solution:**
```bash
npm install @tanstack/react-query-persist-client
npm run dev
```

### Error: "IndexedDB is not available"

**Solution:**
- Use modern browser (Chrome, Firefox, Safari, Edge)
- Check if browser is in private/incognito mode (IndexedDB may be disabled)
- Clear browser cache and retry

### Error: "Failed to persist query cache"

**Solution:**
```bash
# Clear browser storage
# DevTools → Application → Clear storage → Clear site data

# Then restart
npm run dev
```

### Transactions not syncing

**Solution:**
```bash
# Check offline queue in browser console:
import { getAllQueueItems } from '@/lib/offline/queue';
const items = await getAllQueueItems();
console.log(items);

# Manual sync:
import { syncManager } from '@/lib/offline/sync';
await syncManager.syncQueue();
```

---

## ✅ Success Indicators

You'll know it's working when:

1. **Console shows:**
   ```
   ✅ IndexedDB opened successfully
   ✅ Query cache persisted to IndexedDB
   ✅ Sync manager initialized
   ```

2. **DevTools → Application → IndexedDB shows:**
   - Database: `donattour_offline_db`
   - Stores: `query_cache`, `offline_queue`, etc.

3. **Offline mode works:**
   - Can create transactions offline
   - Toast shows "📡 Transaksi disimpan offline"
   - Auto-syncs when back online

4. **Real-time works:**
   - Stock updates across multiple tabs
   - No manual refresh needed

---

## 🎉 You're Done!

Sistem offline sudah aktif dan siap digunakan!

**Next:**
1. ✅ Test offline mode
2. ✅ Test real-time sync
3. ✅ Integrate to your POS
4. ✅ Deploy to production

---

## 💡 Pro Tips

1. **Monitor storage usage:**
   ```tsx
   import { getStorageEstimate } from '@/lib/offline/indexeddb';
   const estimate = await getStorageEstimate();
   console.log(`Using ${estimate.usagePercent}% of storage`);
   ```

2. **Check queue status:**
   ```tsx
   import { getQueueStats } from '@/lib/offline/queue';
   const stats = await getQueueStats();
   console.log(`${stats.pending} pending, ${stats.failed} failed`);
   ```

3. **Manual sync:**
   ```tsx
   import { syncManager } from '@/lib/offline/sync';
   await syncManager.syncQueue();
   ```

---

## 📞 Need Help?

1. Read documentation in `docs/` folder
2. Check examples in `docs/EXAMPLE-POS-OFFLINE.tsx`
3. Review checklist in `IMPLEMENTATION-CHECKLIST.md`
4. Contact development team

---

**Happy coding! 🚀**

*Sistem offline transaction by encedev*
