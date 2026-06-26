# 🔧 Troubleshooting Guide - Donattour System

## 📋 Daftar Isi
- [Masalah Stok Negatif](#masalah-stok-negatif)
- [PWA Cache Issues](#pwa-cache-issues)
- [Offline Mode Issues](#offline-mode-issues)
- [Database Sync Issues](#database-sync-issues)

---

## 🐛 Masalah Stok Negatif

### Gejala
- Di kasir muncul stok negatif: **"STANDAR 0 PCS (-5 ❌)"**
- Padahal baru input produksi dan belum ada transaksi
- Stok menunjukkan angka minus secara tiba-tiba

### Penyebab
1. **Data corrupted** dari testing sebelumnya
2. **Transaksi test** yang mengurangi stok sebelum ada produksi
3. **Cache browser PWA** yang menyimpan state lama
4. **Sync issue offline mode** - transaksi offline ter-deduct tapi produksi belum sync

### Solusi

#### 1️⃣ Clear PWA Cache (CEPAT)
```bash
# Di browser tablet:
1. Buka DevTools (F12 atau Menu > Developer Tools)
2. Tab "Application" → "Storage"
3. Klik "Clear site data"
4. Refresh halaman (Ctrl+Shift+R atau Cmd+Shift+R)
5. Re-install PWA jika perlu
```

#### 2️⃣ Run Cleanup Script (RECOMMENDED)
```bash
# Di terminal server/development:
cd /path/to/donattourSYSTEM
npx tsx scripts/fix-negative-stock.ts
```

Script ini akan:
- ✅ Menemukan dan fix semua stok negatif ke 0
- ✅ Menampilkan inventory hari ini
- ✅ Verify production records
- ✅ Membersihkan data lama (opsional)

#### 3️⃣ Manual Database Cleanup
```sql
-- Fix negative stocks to 0
UPDATE inventory_non_topping
SET qty_available = 0, last_updated = NOW()
WHERE qty_available < 0;

-- Check today's inventory
SELECT outlet_id, ukuran, SUM(qty_available) as total
FROM inventory_non_topping
WHERE production_date = CURRENT_DATE
GROUP BY outlet_id, ukuran;

-- Verify production records
SELECT outlet_id, ukuran, SUM(success_qty) as total_produced
FROM production_daily
WHERE tanggal = CURRENT_DATE
GROUP BY outlet_id, ukuran;
```

#### 4️⃣ Reset Outlet Stock (NUCLEAR OPTION)
```sql
-- ⚠️ HATI-HATI: Ini akan menghapus SEMUA inventory outlet
-- Hanya gunakan jika benar-benar stuck

-- Delete all inventory for specific outlet
DELETE FROM inventory_non_topping
WHERE outlet_id = 'O1.12.03'; -- ganti dengan outlet ID

-- Re-input production untuk rebuild inventory
-- Buka: /dashboard/input-produksi
```

### Pencegahan
1. **Jangan test transaksi** di production tanpa produksi
2. **Selalu input produksi** sebelum buka kasir
3. **Clear cache PWA** setelah deployment besar
4. **Monitor logs** untuk error sync offline

---

## 💾 PWA Cache Issues

### Gejala
- Perubahan kode tidak muncul setelah deployment
- Stuck di versi lama aplikasi
- Service worker tidak update

### Solusi
```bash
# 1. Unregister service worker
1. Buka DevTools (F12)
2. Tab "Application" → "Service Workers"
3. Klik "Unregister" untuk service worker aktif
4. Refresh (Ctrl+Shift+R)

# 2. Clear semua cache
1. Tab "Application" → "Storage"
2. Klik "Clear site data"
3. Centang semua: Cookies, Cache, IndexedDB, Local Storage
4. Klik "Clear site data"

# 3. Re-install PWA
1. Uninstall PWA dari device
2. Buka browser lagi ke URL
3. Install ulang sebagai PWA
```

---

## 📡 Offline Mode Issues

### Gejala
- Transaksi offline tidak sync saat online kembali
- Data hilang setelah offline
- Error "Sync failed"

### Solusi

#### Check IndexedDB
```javascript
// Di browser console:
// 1. Open IndexedDB
const request = indexedDB.open('donattour-offline-db', 1);
request.onsuccess = (e) => {
  const db = e.target.result;
  
  // 2. Check pending transactions
  const tx = db.transaction('transactions', 'readonly');
  const store = tx.objectStore('transactions');
  const getAll = store.getAll();
  
  getAll.onsuccess = () => {
    console.log('Pending offline transactions:', getAll.result);
  };
};
```

#### Manual Sync Trigger
```javascript
// Force sync di console:
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then((registration) => {
    return registration.sync.register('sync-transactions');
  });
}
```

#### Reset Offline Database
```javascript
// ⚠️ HATI-HATI: Ini akan HAPUS semua pending transactions
indexedDB.deleteDatabase('donattour-offline-db');
location.reload();
```

---

## 🔄 Database Sync Issues

### Gejala
- Data tidak realtime
- Stok tidak update setelah transaksi
- Laporan tidak sinkron

### Solusi

#### Check Supabase Realtime
```typescript
// Verify realtime connection di console:
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test realtime
const channel = supabase
  .channel('test')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'inventory_non_topping' },
    (payload) => console.log('Realtime update:', payload)
  )
  .subscribe((status) => console.log('Channel status:', status));
```

#### Force Cache Bypass
```typescript
// Di code, tambahkan cache bypass:
const { data } = await fetch('/api/inventory/validate?outlet_id=X', {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
});
```

#### Check Query Cache
```typescript
// Invalidate React Query cache:
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['inventory'] });
```

---

## 🚨 Emergency Contacts

### Development Issues
- **Developer:** Bayuence
- **GitHub:** https://github.com/bayuence/donattour

### Server Issues
- **Hosting:** Vercel
- **Database:** Supabase
- **Check Status:** 
  - Vercel: https://vercel.com/status
  - Supabase: https://status.supabase.com/

---

## 📝 Logging & Debugging

### Enable Debug Mode
```javascript
// Di browser console:
localStorage.setItem('debug', 'donattour:*');
location.reload();
```

### Check Logs
```bash
# Server logs (Vercel)
vercel logs [deployment-url] --follow

# Database logs (Supabase)
# Login ke dashboard.supabase.com → Project → Logs
```

### Common Error Codes
- **401 Unauthorized:** Token expired, re-login
- **403 Forbidden:** Insufficient permissions
- **500 Internal Server Error:** Check server logs
- **ERR_INTERNET_DISCONNECTED:** Device offline, check connection

---

## 🔍 Checklist Before Reporting Bug

- [ ] Clear browser cache & reload
- [ ] Check internet connection
- [ ] Verify device time/date is correct
- [ ] Check if issue happens on different device
- [ ] Take screenshot of error
- [ ] Copy error message from console
- [ ] Note steps to reproduce

---

**Last Updated:** 2026-06-27  
**Version:** 1.0
