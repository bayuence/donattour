# 🧪 Quick Test Guide - Offline Transaction

## 🚀 Start Testing (5 Minutes)

### **Step 1: Start Server**
```bash
npm run dev
```

Wait for: `✓ Ready in X.Xs`

---

### **Step 2: Open Kasir**
```
http://localhost:3000/dashboard/kasir
```

**Expected:**
- ✅ Page loads successfully
- ✅ See offline indicator in header: "🟢 Online"
- ✅ See "Real-time Active" indicator
- ✅ No console errors

---

### **Step 3: Test Offline Mode**

1. **Open DevTools** (Press F12)

2. **Go to Network Tab**

3. **Set Throttling to "Offline"**
   ```
   Network → Throttling → Offline
   ```

4. **Check Indicator**
   - Should change to: "🔴 Offline"

5. **Create Transaction**
   - Add products to cart
   - Click "Bayar"
   - Select "Tunai" (Cash)
   - Enter amount
   - Click "Konfirmasi"

6. **Expected Result:**
   - ✅ Toast appears: "📡 Transaksi disimpan offline"
   - ✅ Indicator shows: "🔴 Offline | 1 pending"
   - ✅ Cart clears
   - ✅ Receipt shows

7. **Set Back to Online**
   ```
   Network → Throttling → No throttling
   ```

8. **Wait 30 seconds** (or refresh page)

9. **Expected Result:**
   - ✅ Indicator shows: "🟢 Online | 🔄 Syncing..."
   - ✅ Toast appears: "✅ Transaksi berhasil!"
   - ✅ Pending count goes to 0
   - ✅ Transaction appears in database

---

### **Step 4: Test Real-time Sync**

1. **Open 2 Browser Tabs**
   - Tab 1: `http://localhost:3000/dashboard/kasir`
   - Tab 2: `http://localhost:3000/dashboard/kasir`

2. **Login to Same Outlet** in both tabs

3. **Check Indicators**
   - Both should show: "Real-time Active"

4. **Tab 1: Create Transaction**
   - Add products
   - Complete payment

5. **Tab 2: Watch Stock**
   - Stock should update automatically
   - No refresh needed!

---

### **Step 5: Verify IndexedDB**

1. **Open DevTools** (F12)

2. **Go to Application Tab**

3. **Expand IndexedDB**

4. **Check Database:**
   - Should see: `donattour_offline_db`

5. **Check Stores:**
   - ✅ `query_cache` - TanStack Query cache
   - ✅ `offline_queue` - Pending mutations
   - ✅ `offline_transactions` - Offline transactions
   - ✅ `offline_products` - Product cache
   - ✅ `offline_settings` - App settings

---

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Kasir page loads
- [ ] Offline indicator visible
- [ ] Real-time indicator visible
- [ ] Can create transaction online
- [ ] Can create transaction offline
- [ ] Offline transaction queues
- [ ] Offline transaction syncs when online
- [ ] Real-time sync works across tabs
- [ ] IndexedDB database created
- [ ] No console errors

---

## 🎯 Visual Guide

### **What You Should See:**

#### **1. Header with Indicators**
```
┌────────────────────────────────────────────────────┐
│ Donattour - Outlet Sudirman                        │
│                                                    │
│ 🟢 Online          Real-time Active               │
└────────────────────────────────────────────────────┘
```

#### **2. Offline Mode**
```
┌────────────────────────────────────────────────────┐
│ Donattour - Outlet Sudirman                        │
│                                                    │
│ 🔴 Offline    📦 3 pending                        │
└────────────────────────────────────────────────────┘
```

#### **3. Syncing**
```
┌────────────────────────────────────────────────────┐
│ Donattour - Outlet Sudirman                        │
│                                                    │
│ 🟢 Online    🔄 Syncing...    2 pending           │
└────────────────────────────────────────────────────┘
```

---

## 🐛 Common Issues

### **Issue: Indicator not showing**
```bash
# Solution: Restart server
npm run dev
```

### **Issue: Offline not working**
```bash
# Solution: Check browser console
# Look for: "✅ IndexedDB opened successfully"
```

### **Issue: Real-time not working**
```bash
# Solution: Check Supabase Realtime
# Dashboard → Settings → API → Realtime → Enable
```

---

## 📊 Console Logs to Look For

### **On Page Load:**
```
✅ IndexedDB opened successfully
✅ Query cache persisted to IndexedDB
✅ Sync manager initialized
✅ Subscribed to inventory realtime updates
```

### **When Going Offline:**
```
📡 Offline mode activated
```

### **When Creating Offline Transaction:**
```
📥 Added to offline queue: create_order (ID: 1)
```

### **When Back Online:**
```
📡 Back online, syncing...
🔄 Syncing 1 pending items...
✅ Order synced: TRX-ABC123
✅ Sync completed
```

---

## 🎉 Test Complete!

If all checks pass, your offline system is working perfectly! 🚀

**Next Steps:**
1. Test with real transactions
2. Test with multiple kasir
3. Test with slow connection (Slow 3G)
4. Deploy to production

---

**Test Guide Version:** 1.0  
**Last Updated:** May 8, 2026  

*Quick test guide by Kiro AI*
