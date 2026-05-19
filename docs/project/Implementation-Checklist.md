# ✅ Implementation Checklist - Offline Transaction System

## 📋 Pre-Implementation

- [ ] Backup existing code
- [ ] Review `docs/OFFLINE-SETUP.md`
- [ ] Review `docs/INTEGRATION-GUIDE.md`
- [ ] Understand IndexedDB basics

---

## 🔧 Installation

- [ ] Install dependency:
  ```bash
  npm install @tanstack/react-query-persist-client
  ```
- [ ] Verify installation:
  ```bash
  npm list @tanstack/react-query-persist-client
  ```
- [ ] Restart dev server:
  ```bash
  npm run dev
  ```

---

## 📁 File Verification

Pastikan semua file berikut sudah ada:

### Core Files
- [ ] `lib/offline/indexeddb.ts`
- [ ] `lib/offline/persister.ts`
- [ ] `lib/offline/queue.ts`
- [ ] `lib/offline/sync.ts`

### Hooks
- [ ] `lib/hooks/use-offline-mutation.ts`
- [ ] `lib/hooks/use-offline-transaction.ts`
- [ ] `lib/hooks/use-realtime-inventory.ts`

### Components
- [ ] `components/offline/offline-indicator.tsx`

### Updated Files
- [ ] `lib/query/query-client.ts` (networkMode: 'offlineFirst')
- [ ] `lib/query/query-provider.tsx` (with persister)

### Documentation
- [ ] `docs/OFFLINE-SETUP.md`
- [ ] `docs/INTEGRATION-GUIDE.md`
- [ ] `docs/EXAMPLE-POS-OFFLINE.tsx`
- [ ] `OFFLINE-SUMMARY.md`
- [ ] `QUICK-START-OFFLINE.md`

---

## 🔨 POS Integration

### Step 1: Import Hooks
- [ ] Import `useOfflineTransaction`
- [ ] Import `useRealtimeInventory`
- [ ] Import `OfflineIndicator`
- [ ] Import `useQuery` from TanStack Query

### Step 2: Replace State with Queries
- [ ] Convert products state to `useQuery`
- [ ] Convert categories state to `useQuery`
- [ ] Convert settings state to `useQuery`
- [ ] Remove old `useEffect` data loading

### Step 3: Add Offline Hooks
- [ ] Add `useOfflineTransaction` hook
- [ ] Add `useRealtimeInventory` hook
- [ ] Configure outlet ID
- [ ] Add onUpdate handler

### Step 4: Update Payment Handler
- [ ] Replace `db.createOrder` with `createTransaction.mutateAsync`
- [ ] Update orderData structure
- [ ] Remove manual error handling (handled by hook)
- [ ] Test payment flow

### Step 5: Add UI Components
- [ ] Add `<OfflineIndicator />` to header
- [ ] Add realtime status indicator
- [ ] Test UI responsiveness

---

## 🧪 Testing

### Basic Functionality
- [ ] App loads without errors
- [ ] Products display correctly
- [ ] Cart works normally
- [ ] Payment works online

### Offline Mode Testing
- [ ] Open Chrome DevTools
- [ ] Set Network to "Offline"
- [ ] Products load from cache
- [ ] Create transaction
- [ ] See toast: "📡 Transaksi disimpan offline"
- [ ] Check IndexedDB (Application → IndexedDB)
- [ ] Verify queue item exists

### Sync Testing
- [ ] Set Network back to "Online"
- [ ] Wait 30 seconds OR refresh page
- [ ] Transaction syncs automatically
- [ ] See toast: "✅ Transaksi berhasil!"
- [ ] Queue item removed from IndexedDB
- [ ] Order appears in database

### Real-time Testing
- [ ] Open 2 browser tabs
- [ ] Login to same outlet in both tabs
- [ ] Tab 1: Create transaction
- [ ] Tab 2: Stock updates automatically
- [ ] No manual refresh needed
- [ ] Both tabs show same data

### Edge Cases
- [ ] Slow connection (throttle to "Slow 3G")
- [ ] Multiple offline transactions
- [ ] Failed sync (invalid data)
- [ ] Retry mechanism (max 3 retries)
- [ ] Storage quota (check with large data)

---

## 🔍 Verification

### Browser DevTools Checks

#### IndexedDB
- [ ] Database `donattour_offline_db` exists
- [ ] Store `query_cache` has data
- [ ] Store `offline_queue` empty when online
- [ ] Store `offline_transactions` tracks offline orders

#### Console Logs
- [ ] "✅ IndexedDB opened successfully"
- [ ] "✅ Query cache persisted to IndexedDB"
- [ ] "✅ Sync manager initialized"
- [ ] "✅ Subscribed to inventory realtime updates"
- [ ] No error messages

#### Network Tab
- [ ] API calls include auth headers
- [ ] Supabase Realtime WebSocket connected
- [ ] Failed requests queued (when offline)
- [ ] Successful sync requests (when back online)

---

## 📊 Monitoring Setup

### Add Monitoring Dashboard (Optional)

```tsx
import { getQueueStats } from '@/lib/offline/queue';
import { getStorageEstimate } from '@/lib/offline/indexeddb';

export function OfflineMonitor() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const updateStats = async () => {
      const queueStats = await getQueueStats();
      const storage = await getStorageEstimate();
      setStats({ queueStats, storage });
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      <h3>Offline Monitor</h3>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}
```

- [ ] Add monitoring component
- [ ] Check queue statistics
- [ ] Check storage usage
- [ ] Monitor sync status

---

## 🚀 Production Deployment

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Documentation updated

### Deployment
- [ ] Build production:
  ```bash
  npm run build
  ```
- [ ] Test production build locally:
  ```bash
  npm run start
  ```
- [ ] Deploy to staging
- [ ] Test on staging
- [ ] Deploy to production

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check Supabase Realtime connections
- [ ] Monitor IndexedDB usage
- [ ] Collect user feedback

---

## 📈 Performance Optimization

### Cache Configuration
- [ ] Adjust `staleTime` per query type
- [ ] Adjust `gcTime` for memory management
- [ ] Configure `maxAge` for persistence (default: 7 days)

### Sync Configuration
- [ ] Adjust sync interval (default: 30s)
- [ ] Configure retry strategy
- [ ] Set max retry count (default: 3)

### Storage Management
- [ ] Monitor storage usage
- [ ] Implement cleanup for old data
- [ ] Set storage quotas

---

## 🐛 Troubleshooting Checklist

### Issue: Cache not persisting
- [ ] Check if dependency installed
- [ ] Check browser IndexedDB support
- [ ] Clear browser cache and retry
- [ ] Check console for errors

### Issue: Transactions not syncing
- [ ] Check network connectivity
- [ ] Check API endpoint availability
- [ ] Check auth headers
- [ ] Check queue status
- [ ] Manual sync: `syncManager.syncQueue()`

### Issue: Real-time not working
- [ ] Check Supabase Realtime enabled
- [ ] Check RLS policies
- [ ] Check WebSocket connection
- [ ] Check subscription status in console

### Issue: Performance degradation
- [ ] Check IndexedDB size
- [ ] Clear old cache data
- [ ] Reduce cache duration
- [ ] Optimize query keys

---

## 📚 Training & Documentation

### Team Training
- [ ] Demo offline functionality
- [ ] Explain sync mechanism
- [ ] Show monitoring tools
- [ ] Provide troubleshooting guide

### User Documentation
- [ ] Create user guide for offline mode
- [ ] Explain offline indicator
- [ ] Document sync behavior
- [ ] Provide FAQ

---

## ✅ Final Checklist

- [ ] All features working
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team trained
- [ ] Production deployed
- [ ] Monitoring active
- [ ] Users notified

---

## 🎉 Success Criteria

Your implementation is successful when:

✅ Kasir can create transactions offline  
✅ Transactions sync automatically when online  
✅ Real-time updates work across multiple kasir  
✅ No data loss during offline periods  
✅ UI shows clear offline/online status  
✅ Performance is acceptable  
✅ No critical errors in production  

---

## 📞 Support

If you encounter issues:

1. Check documentation:
   - `docs/OFFLINE-SETUP.md`
   - `docs/INTEGRATION-GUIDE.md`
   - `OFFLINE-SUMMARY.md`

2. Check examples:
   - `docs/EXAMPLE-POS-OFFLINE.tsx`

3. Debug tools:
   - Browser DevTools → Application → IndexedDB
   - Browser DevTools → Console
   - Browser DevTools → Network

4. Contact development team

---

## 🎓 Next Steps

After successful implementation:

1. Monitor production usage
2. Collect user feedback
3. Optimize based on metrics
4. Plan additional offline features
5. Document lessons learned

---

**Good luck with your implementation! 🚀**
