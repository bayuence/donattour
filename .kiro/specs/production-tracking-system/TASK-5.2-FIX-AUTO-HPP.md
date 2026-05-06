# Task 5.2 - Perbaikan: Auto-Ambil HPP dari Database

**Date:** 2026-05-03  
**Issue:** User harus input manual HPP & topping cost (ribet & bisa salah)  
**Solution:** Sistem auto-ambil dari table `products` berdasarkan produk yang dipilih

---

## 🔴 MASALAH SEBELUMNYA:

### Form ToppingErrorForm:
- ❌ Ada input manual `hpp_per_pcs`
- ❌ Ada input manual `topping_cost`
- ❌ User harus isi sendiri (ribet & bisa salah)
- ❌ Data bisa tidak akurat

### API Endpoint:
- ❌ Terima `hpp_per_pcs` dan `topping_cost` dari request body
- ❌ Tidak validasi dengan data di database

---

## ✅ SOLUSI YANG DITERAPKAN:

### 1. **Update API Endpoint** (`app/api/topping-errors/route.ts`)

**Perubahan:**
- ✅ Hapus `hpp_per_pcs` dan `topping_cost` dari request body
- ✅ Query ke table `products` untuk ambil HPP & topping cost
- ✅ Validasi produk harus ada di database
- ✅ Validasi HPP harus > 0
- ✅ Auto-calculate total HPP loss

**Request Body Baru:**
```typescript
{
  outlet_id: string,
  product_ordered: string,  // Nama produk yang dipesan
  product_made: string,      // Nama produk yang dibuat (salah)
  qty: number,
  reason: string,
  reported_by?: string
}
```

**Business Logic:**
1. Validasi input (produk berbeda, qty > 0, reason >= 10 chars)
2. Query `products` table untuk ambil data `product_made`:
   - `harga_pokok_penjualan` → hpp_per_pcs
   - `biaya_topping` → topping_cost
3. Validasi produk ditemukan dan HPP > 0
4. Calculate: `total_hpp_loss = (hpp_per_pcs + topping_cost) * qty`
5. Insert ke `topping_errors` table
6. Return success dengan detail HPP

**Error Handling:**
- 404: Product not found in database
- 400: Product has invalid HPP (HPP = 0 or null)

---

### 2. **Update Form Component** (`components/pos/ToppingErrorForm.tsx`)

**Perubahan:**
- ✅ Hapus input field `hpp_per_pcs`
- ✅ Hapus input field `topping_cost`
- ✅ Auto-ambil HPP & topping cost dari props `products`
- ✅ Display breakdown: HPP + Topping × Qty = Total
- ✅ Lebih simple & user-friendly

**Form Fields Sekarang:**
1. Produk yang Dipesan (dropdown)
2. Produk yang Dibuat (dropdown)
3. Jumlah (number input)
4. Alasan (textarea, min 10 chars)
5. **Auto-display:** HPP + Topping breakdown & Total Rugi

**Display Total Rugi:**
```
HPP: Rp 2,000 + Topping: Rp 1,000 × 2 pcs
Total Rugi: Rp 6,000
```

---

### 3. **Data Flow Baru:**

```
User Action:
1. Pilih "Produk yang Dipesan" → Donat Coklat
2. Pilih "Produk yang Dibuat" → Donat Strawberry
3. Input Jumlah → 2
4. Input Alasan → "Salah dengar pesanan"
5. Sistem auto-show: Total Rugi Rp 6,000

Submit:
1. Form kirim: { product_ordered, product_made, qty, reason }
2. API query products table untuk "Donat Strawberry"
3. API ambil: hpp = 2000, topping_cost = 1000
4. API calculate: total_loss = (2000 + 1000) × 2 = 6000
5. API insert ke topping_errors table
6. Return success
```

---

## 📊 PERBANDINGAN:

### SEBELUM (Manual Input):
```
Form Fields: 6 input
- Produk Dipesan ✓
- Produk Dibuat ✓
- Jumlah ✓
- HPP per pcs ← MANUAL
- Biaya Topping ← MANUAL
- Alasan ✓

Risiko:
- User bisa salah input HPP
- Data tidak konsisten dengan master produk
- Ribet untuk user
```

### SESUDAH (Auto dari Database):
```
Form Fields: 4 input
- Produk Dipesan ✓
- Produk Dibuat ✓
- Jumlah ✓
- Alasan ✓

Auto-display:
- HPP (dari database)
- Topping Cost (dari database)
- Total Rugi (calculated)

Keuntungan:
- Data akurat (dari master produk)
- Lebih simple untuk user
- Konsisten dengan database
```

---

## 🔧 FILES MODIFIED:

1. **`app/api/topping-errors/route.ts`**
   - Update interface `CreateToppingErrorRequest`
   - Add query to `products` table
   - Add validation for product existence
   - Update documentation

2. **`components/pos/ToppingErrorForm.tsx`**
   - Update interface `FormData`
   - Add `getProductInfo()` helper function
   - Remove HPP & topping cost input fields
   - Update total loss calculation
   - Update display with breakdown

---

## ✅ VERIFICATION:

### TypeScript Compilation:
```bash
npx tsc --noEmit --skipLibCheck
```
**Result:** ✅ Exit Code 0 (No errors)

### Diagnostics:
```bash
getDiagnostics([
  "components/pos/ToppingErrorForm.tsx",
  "app/api/topping-errors/route.ts"
])
```
**Result:** ✅ No diagnostics found

---

## 🎯 BENEFITS:

1. **Akurasi Data:** HPP & topping cost selalu sesuai dengan master produk
2. **User Experience:** Form lebih simple (4 field vs 6 field)
3. **Konsistensi:** Tidak ada perbedaan data antara form dan database
4. **Maintenance:** Update HPP di master produk otomatis apply ke semua laporan
5. **Error Prevention:** User tidak bisa salah input HPP

---

## 📝 NOTES:

- HPP & topping cost diambil dari produk yang **DIBUAT** (product_made), bukan yang dipesan
- Ini karena rugi dihitung dari produk yang salah dibuat
- Jika produk tidak ditemukan di database, API return 404
- Jika HPP = 0 atau null, API return 400 dengan pesan error

---

**Status:** ✅ **FIXED & VERIFIED**  
**Ready for:** Production use
