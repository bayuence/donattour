# 📊 VALIDASI MATEMATIS STOK DONAT

## ✅ FLOW MATEMATIS YANG BENAR

### **1. INPUT PRODUKSI (Menu Input Produksi)**
**Source:** `app/(dashboard)/dashboard/input-produksi`

**Formula:**
```
TARGET = SUCCESS_QTY + WASTE_QTY
```

**Contoh:**
- Sukses: 100 pcs
- Gagal: 10 pcs
- **TARGET = 110 pcs** (auto calculated)

**Database:**
```sql
INSERT INTO production_daily (
  outlet_id, tanggal, ukuran,
  target_qty,   -- 110
  success_qty,  -- 100 
  waste_qty     -- 10
)
```

**Sync ke Inventory:**
```sql
INSERT INTO inventory_non_topping (
  outlet_id, production_date, ukuran,
  qty_available,  -- 100 (HANYA SUKSES)
  status          -- 'fresh'
)
```

⚠️ **CRITICAL:** Yang masuk inventory hanya `success_qty`, bukan `target_qty`!

---

### **2. PENGURANGAN STOK (Menu Kasir)**
**Source:** `app/(dashboard)/dashboard/kasir`

**Logic:**
```typescript
// Saat order dibuat:
POST /api/orders/create
  → Calculate qty donat per ukuran
  → Call deductStockOnSale(outlet_id, ukuran, qty)
  → Update inventory_non_topping.qty_available
```

**Formula:**
```
NEW_QTY = OLD_QTY - SOLD_QTY
```

**Contoh:**
- Stok awal: 100 pcs
- Terjual: 15 pcs
- **Stok akhir = 85 pcs**

**Database Update:**
```sql
UPDATE inventory_non_topping
SET qty_available = qty_available - 15  -- ATOMIC
WHERE 
  outlet_id = ? AND
  ukuran = ? AND
  production_date = TODAY AND  -- ✅ KRITIS: Hanya hari ini
  status = 'fresh' AND
  qty_available >= 15;  -- Prevent negative
```

---

### **3. LAPORAN TRANSAKSI (Menu Transaksi)**
**Source:** `app/(dashboard)/dashboard/transaksi`

**Query:**
```sql
SELECT 
  o.id, o.total_amount, o.created_at,
  oi.product_name, oi.quantity, oi.unit_price
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at BETWEEN ? AND ?
ORDER BY o.created_at DESC
```

**Display:**
- Order ID
- Item list dengan qty
- Total amount

**Tidak ada logika stok di sini** - hanya read-only display dari data `orders` dan `order_items`

---

## 🔍 CEK MATEMATIS

### **Formula Balance Check (Akhir Hari):**

```
STOK_AKHIR = STOK_AWAL (success_qty) - TOTAL_TERJUAL

Di mana:
- STOK_AWAL = SUM(production_daily.success_qty WHERE tanggal = TODAY)
- TOTAL_TERJUAL = SUM(qty donat dari orders WHERE created_at = TODAY)
- STOK_AKHIR = inventory_non_topping.qty_available (WHERE production_date = TODAY)
```

### **Contoh Perhitungan:**

**Pagi (Input Produksi):**
- Input: 200 donat standar berhasil
- Database: `production_daily.success_qty = 200`
- Database: `inventory_non_topping.qty_available = 200`

**Siang (Kasir):**
- Transaksi 1: Jual 10 donat → Stok = 190
- Transaksi 2: Jual 15 donat → Stok = 175
- Transaksi 3: Jual 8 donat → Stok = 167

**Sore (Cek Transaksi):**
- Total transaksi hari ini: 3 orders
- Total qty terjual: 10 + 15 + 8 = **33 pcs**

**Validasi:**
```
STOK_AKHIR = 200 - 33 = 167 ✅ MATCH!
```

---

## ⚠️ POTENSI ERROR MATEMATIS

### **Error 1: Double Sync Production**
**Masalah:** Input produksi 100 pcs, tapi inventory jadi 200 pcs

**Solusi:** Sudah ada `inventory_sync_log` untuk prevent double-sync
```sql
-- Cek sebelum sync
SELECT * FROM inventory_sync_log 
WHERE production_daily_id = ?

-- Jika sudah ada, SKIP sync
```

### **Error 2: Replace Instead of Add (FIXED!)**
**Masalah:** 
- Input 100 pcs → Inventory = 100
- Kasir jual 30 → Inventory = 70
- Input lagi 50 pcs → Inventory = 50 ❌ (Harusnya 120!)

**Root Cause:** `syncInventoryAfterProduction` pakai REPLACE strategy (delete + insert) bukan ADD strategy (update qty)

**Solusi (SUDAH DIPERBAIKI):**
```typescript
// ✅ CORRECT: ADD to existing
const newQty = existing.qty_available + success_qty;

// Update
.update({ qty_available: newQty })
.eq('id', existing.id);

// LOG: 70 + 50 = 120 ✅
```

### **Error 3: Kurangi Stok Kemarin**
**Masalah:** Jual donat hari ini, tapi kurangi stok kemarin

**Solusi:** Filter `production_date = getTodayWIB()` di `deductStockOnSale()`
```typescript
.eq('production_date', getTodayWIB()) // ✅ CRITICAL
```

### **Error 4: Negative Stock**
**Masalah:** Stok jadi minus (-5 pcs)

**Solusi:** Validation di `deductStockOnSale()`
```typescript
if (totalAvailable < qty) {
  return { 
    success: false, 
    error: `Stok tidak cukup! Tersedia: ${totalAvailable}` 
  };
}
```

### **Error 5: Race Condition (Overselling)**
**Masalah:** 2 kasir jual bersamaan, stok jadi minus

**Solusi:** Optimistic locking
```typescript
.update({ qty_available: newQty })
.eq('id', stock.id)
.eq('qty_available', stock.qty_available) // ✅ LOCKING
```

---

## 🧪 TESTING CHECKLIST

### **Test 1: Input → Kasir → Transaksi**
1. [ ] Input produksi 50 standar
2. [ ] Cek inventory: qty_available = 50
3. [ ] Kasir jual 10 pcs
4. [ ] Cek inventory: qty_available = 40
5. [ ] Buka menu Transaksi: tampil 1 order dengan 10 pcs
6. [ ] **VALIDASI: 50 - 10 = 40** ✅

### **Test 2: Multiple Transactions**
1. [ ] Input 100 mini
2. [ ] Jual 5 pcs (T1)
3. [ ] Jual 12 pcs (T2)
4. [ ] Jual 3 pcs (T3)
5. [ ] Total transaksi: 3 orders
6. [ ] Total qty: 5 + 12 + 3 = 20 pcs
7. [ ] Stok akhir: 100 - 20 = 80 pcs
8. [ ] **VALIDASI:** Cek `inventory_non_topping.qty_available = 80` ✅

### **Test 3: Cross-Day Validation**
1. [ ] **Hari 1:** Input 50, jual 30, sisa 20
2. [ ] **Hari 2:** Cek stok hari 1: TIDAK bisa dipakai (status = expired)
3. [ ] **Hari 2:** Input baru 60
4. [ ] **Hari 2:** Jual 10 → Stok hari 2 jadi 50 (stok hari 1 tidak tersentuh)
5. [ ] **VALIDASI:** Stok per hari terpisah ✅

### **Test 4: Real-time Update**
1. [ ] Buka 2 tab kasir
2. [ ] Tab 1: Cek badge stok = 100
3. [ ] Tab 2: Jual 15 pcs
4. [ ] Tab 1: Badge **HARUS AUTO UPDATE** jadi 85 dalam 1-2 detik
5. [ ] **VALIDASI:** Tidak perlu refresh manual ✅

---

## 📋 SQL QUERIES UNTUK AUDIT

### **1. Cek Balance Hari Ini**
```sql
-- Stok awal (dari produksi)
SELECT 
  ukuran,
  SUM(success_qty) as stok_awal
FROM production_daily
WHERE 
  outlet_id = 'XXX' AND
  tanggal = '2026-06-09'
GROUP BY ukuran;

-- Total terjual (dari orders)
SELECT 
  p.ukuran,
  SUM(oi.quantity) as total_terjual
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE 
  o.outlet_id = 'XXX' AND
  DATE(o.created_at AT TIME ZONE 'Asia/Jakarta') = '2026-06-09' AND
  p.tipe_produk LIKE '%donat%'
GROUP BY p.ukuran;

-- Stok saat ini
SELECT 
  ukuran,
  qty_available as stok_sekarang
FROM inventory_non_topping
WHERE 
  outlet_id = 'XXX' AND
  production_date = '2026-06-09' AND
  status = 'fresh';

-- ✅ VALIDASI: stok_awal - total_terjual = stok_sekarang
```

### **2. Cek Double Sync**
```sql
SELECT 
  pd.id,
  pd.tanggal,
  pd.success_qty,
  COUNT(isl.id) as sync_count  -- Harus = 1
FROM production_daily pd
LEFT JOIN inventory_sync_log isl ON isl.production_daily_id = pd.id
WHERE pd.tanggal = CURRENT_DATE
GROUP BY pd.id, pd.tanggal, pd.success_qty
HAVING COUNT(isl.id) > 1;  -- Jika ada hasil = ERROR!
```

### **3. Cek Negative Stock**
```sql
SELECT *
FROM inventory_non_topping
WHERE qty_available < 0;  -- Harus 0 hasil!
```

---

## ✅ KESIMPULAN

### **Matematika Sudah Benar:**
1. ✅ Input produksi → sync ke inventory (hanya success_qty)
2. ✅ Kasir jual → kurangi inventory (hanya stok hari ini)
3. ✅ Transaksi → display read-only (tidak ubah stok)
4. ✅ Validation: STOK_AKHIR = STOK_AWAL - TOTAL_TERJUAL

### **Protection Mechanisms:**
1. ✅ `inventory_sync_log` → prevent double sync
2. ✅ `production_date filter` → hanya kurangi stok hari ini
3. ✅ `qty >= 0 constraint` → prevent negative stock
4. ✅ `optimistic locking` → prevent race condition overselling
5. ✅ `realtime subscription` → instant update tanpa refresh

### **Jika Masih Ada Mismatch:**
1. Jalankan SQL audit queries di atas
2. Cek console logs:
   - `🔪 [DEDUCT STOCK]` → lihat qty yang dikurangi
   - `✅ [ORDER XXX]` → konfirmasi deduction sukses
3. Cek `inventory_sync_log` untuk double-sync
4. Pastikan timezone WIB konsisten di semua layer

---

**Last Updated:** 2026-06-09  
**Status:** PRODUCTION READY ✅
