# 🚀 Quick Reference - Donattour System

## 📁 New Structure

```
app/
├── (dashboard)/          → Internal dashboard (requires login)
│   ├── dashboard/       → All dashboard pages
│   │   └── kasir/      → POS with offline support ✨
│   └── login/          → Login page
│
├── (public)/            → Public pages (no login required)
│   └── katalog/        → Product catalog ✨ NEW
│
├── api/                 → API routes
├── components/          → Shared components
├── layout.tsx           → Root layout
└── page.tsx             → Root page (smart redirect)
```

---

## 🔗 URLs

| URL | Description | Auth Required |
|-----|-------------|---------------|
| `/` | Root (smart redirect) | No |
| `/katalog` | Public catalog ✨ NEW | No |
| `/login` | Login page | No |
| `/dashboard/kasir` | POS Kasir (offline-enabled) ✨ | Yes |
| `/dashboard/*` | Other dashboard pages | Yes |

---

## 🎯 Key Features

### ✅ Public Catalog
- View products without login
- Filter by category
- Responsive design
- Link to kasir login

### ✅ Offline POS
- Works without internet
- Auto-sync when online
- Real-time inventory updates
- Offline indicator in UI

### ✅ Route Groups
- Better organization
- Separate layouts
- No URL changes

---

## 💻 Usage

### **Use Offline-Enabled Kasir:**

```tsx
// app/(dashboard)/dashboard/kasir/page.tsx

import { useKasirWithOffline } from './hooks/useKasirWithOffline'
import { OfflineIndicator } from '@/components/offline/offline-indicator'

export default function KasirPage() {
  const k = useKasirWithOffline() // ✅ Offline support

  return (
    <div>
      <OfflineIndicator /> {/* Shows online/offline status */}
      {/* Your POS UI */}
    </div>
  )
}
```

### **Access Offline Status:**

```tsx
const k = useKasirWithOffline()

// Check offline status
console.log(k.offlineStatus.isOnline)      // true/false
console.log(k.offlineStatus.pendingCount)  // Number of pending syncs
console.log(k.offlineStatus.isSyncing)     // Currently syncing?

// Check realtime connection
console.log(k.realtimeConnected)           // true/false
```

---

## 🧪 Testing

### **Test Public Catalog:**
```bash
# 1. Open browser
http://localhost:3000/katalog

# 2. Should see:
- Product list
- Category filter
- Login button
```

### **Test Offline Transaction:**
```bash
# 1. Open kasir
http://localhost:3000/dashboard/kasir

# 2. Open DevTools → Network → Set "Offline"

# 3. Create transaction (cash payment)

# 4. Should see toast: "📡 Transaksi disimpan offline"

# 5. Set Network → "Online"

# 6. Wait 30 seconds or refresh

# 7. Should see toast: "✅ Transaksi berhasil!"
```

### **Test Real-time Sync:**
```bash
# 1. Open 2 tabs (same outlet)

# 2. Tab 1: Create transaction

# 3. Tab 2: Stock updates automatically (no refresh)
```

---

## 📦 Dependencies

```bash
# Required for offline support
npm install @tanstack/react-query-persist-client
```

---

## 🔧 Configuration

No configuration changes needed! All environment variables remain the same.

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `RESTRUCTURE-SUMMARY.md` | Complete restructure documentation |
| `OFFLINE-SUMMARY.md` | Offline system documentation |
| `ARCHITECTURE-REPORT.md` | Architecture analysis |
| `QUICK-REFERENCE.md` | This file (quick reference) |

---

## ✅ Checklist

- [ ] Install dependencies
- [ ] Restart dev server
- [ ] Test public catalog
- [ ] Test offline transaction
- [ ] Test real-time sync
- [ ] Deploy to production

---

## 🆘 Troubleshooting

### **Catalog not showing products:**
- Check Supabase connection
- Check RLS policies
- Check browser console for errors

### **Offline not working:**
- Check if dependency installed
- Check browser IndexedDB support
- Check browser console for errors

### **Real-time not working:**
- Check Supabase Realtime enabled
- Check RLS policies on `stocks` table
- Check browser console for subscription errors

---

## 🎉 Quick Start

```bash
# 1. Install dependencies
npm install @tanstack/react-query-persist-client

# 2. Restart server
npm run dev

# 3. Test catalog
open http://localhost:3000/katalog

# 4. Test kasir
open http://localhost:3000/dashboard/kasir

# 5. Test offline (DevTools → Network → Offline)

# 6. Done! 🚀
```

---

**Last Updated:** May 8, 2026  
**Status:** ✅ Production Ready  

*Quick reference by Kiro AI*
