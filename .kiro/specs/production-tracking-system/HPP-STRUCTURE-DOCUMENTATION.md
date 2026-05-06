# Dokumentasi Struktur HPP (Harga Pokok Penjualan)

**Project:** Production Tracking System - Donattour  
**Date:** 2026-05-03  
**Version:** 1.0  
**Status:** 🚨 CRITICAL - MUST READ BEFORE IMPLEMENTATION

---

## 🎯 KONSEP DASAR HPP

### **HPP Produk Varian = HPP Polos + Biaya Topping**

```
Contoh:
- Donat Coklat Standar = Rp 4,000 (polos) + Rp 2,000 (topping coklat) = Rp 6,000
- Donat Strawberry Mini = Rp 2,500 (polos) + Rp 1,500 (topping strawberry) = Rp 4,000
```

---

## 📊 STRUKTUR DATABASE

### **1. Table: `outlet_production_costs`** (Per Outlet)

Menyimpan HPP donat polos per outlet per ukuran.

**Struktur:**
```sql
CREATE TABLE outlet_production_costs (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    cost_polos_standar DECIMAL(12,2),  -- HPP donat polos ukuran standar
    cost_polos_mini DECIMAL(12,2),     -- HPP donat polos ukuran mini
    harga_jual_polos_standar DECIMAL(12,2),
    harga_jual_polos_mini DECIMAL(12,2),
    updated_at TIMESTAMPTZ
);
```

**Data Real:**
| Outlet | HPP Polos Standar | HPP Polos Mini |
|--------|-------------------|----------------|
| Donattour Pusat | Rp 2,000 | Rp 2,500 |
| Donattour K3PG | Rp 4,000 | Rp 2,500 |

**Kenapa Berbeda?**
- Lokasi berbeda → biaya bahan baku berbeda
- Ekonomi wilayah berbeda → harga supplier berbeda
- Biaya operasional berbeda

---

### **2. Table: `products`** (Global)

Menyimpan HPP total produk varian (sudah include topping).

**Struktur:**
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    nama VARCHAR(100),
    ukuran VARCHAR(10),  -- 'standar' atau 'mini'
    harga_pokok_penjualan DECIMAL(12,2),  -- HPP TOTAL (polos + topping)
    -- NOTE: TIDAK ADA field biaya_topping terpisah!
    ...
);
```

**Data Real:**
| Produk | Ukuran | HPP Total |
|--------|--------|-----------|
| Bomboloni Strawberry | standar | Rp 6,000 |
| Strawberry Cheesecuit | standar | Rp 7,000 |

**HPP Total ini sudah include:**
- HPP Polos (dari outlet_production_costs)
- Biaya Topping

---

## 🧮 RUMUS PERHITUNGAN

### **Untuk Mendapatkan Biaya Topping:**

```
Biaya Topping = HPP Total (products) - HPP Polos (outlet_production_costs)
```

**Contoh Perhitungan:**

**Kasus 1: Bomboloni Strawberry di Donattour Pusat**
```
HPP Total (dari products) = Rp 6,000
HPP Polos Standar (Donattour Pusat) = Rp 2,000
Biaya Topping = 6,000 - 2,000 = Rp 4,000
```

**Kasus 2: Bomboloni Strawberry di Donattour K3PG**
```
HPP Total (dari products) = Rp 6,000
HPP Polos Standar (Donattour K3PG) = Rp 4,000
Biaya Topping = 6,000 - 4,000 = Rp 2,000
```

**⚠️ PENTING:** Biaya topping SAMA untuk produk yang sama, tapi HPP polos BERBEDA per outlet!

---

## 🔄 DATA FLOW UNTUK LAPORAN KESALAHAN TOPPING

### **Input dari User:**
1. Outlet ID
2. Produk yang Dipesan (nama)
3. Produk yang Dibuat (nama) ← Yang salah
4. Quantity
5. Alasan

### **Proses di API:**

```typescript
// 1. Ambil outlet_id dari request
const outlet_id = request.body.outlet_id;
const product_made = request.body.product_made; // "Bomboloni Strawberry"

// 2. Query products untuk dapat HPP Total
const { data: product } = await supabase
  .from('products')
  .select('harga_pokok_penjualan, ukuran')
  .eq('nama', product_made)
  .single();

const hpp_total = product.harga_pokok_penjualan; // 6000
const ukuran = product.ukuran; // 'standar'

// 3. Query outlet_production_costs untuk dapat HPP Polos
const { data: costs } = await supabase
  .from('outlet_production_costs')
  .select('cost_polos_standar, cost_polos_mini')
  .eq('outlet_id', outlet_id)
  .single();

const hpp_polos = ukuran === 'standar' 
  ? costs.cost_polos_standar  // 2000 atau 4000 tergantung outlet
  : costs.cost_polos_mini;    // 2500

// 4. Hitung Biaya Topping
const biaya_topping = hpp_total - hpp_polos; // 6000 - 2000 = 4000

// 5. Hitung Total Rugi
const total_rugi = (hpp_polos + biaya_topping) * qty;
// = (2000 + 4000) * 2 = 12,000

// 6. Simpan ke database
await supabase.from('topping_errors').insert({
  outlet_id,
  product_ordered,
  product_made,
  qty,
  reason,
  hpp_per_pcs: hpp_polos,
  topping_cost: biaya_topping,
  total_hpp_loss: total_rugi
});
```

---

## 📋 STRUKTUR TABLE `topping_errors`

```sql
CREATE TABLE topping_errors (
    id UUID PRIMARY KEY,
    outlet_id UUID NOT NULL,
    product_ordered VARCHAR(100),  -- Yang dipesan customer
    product_made VARCHAR(100),     -- Yang dibuat (salah)
    qty INTEGER,
    reason TEXT,
    hpp_per_pcs DECIMAL(12,2),     -- HPP polos (dari outlet_production_costs)
    topping_cost DECIMAL(12,2),    -- Biaya topping (calculated)
    total_hpp_loss DECIMAL(12,2),  -- (hpp_per_pcs + topping_cost) * qty
    reported_by UUID,
    reported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);
```

---

## ✅ CONTOH KASUS LENGKAP

### **Skenario:**
- **Outlet:** Donattour Pusat
- **Kasir:** Salah buat produk
- **Customer Pesan:** Donat Coklat Standar
- **Kasir Buat:** Bomboloni Strawberry Standar (SALAH!)
- **Quantity:** 2 pcs

### **Data yang Dibutuhkan:**

**1. Dari `outlet_production_costs` (Donattour Pusat):**
```
cost_polos_standar = Rp 2,000
```

**2. Dari `products` (Bomboloni Strawberry):**
```
harga_pokok_penjualan = Rp 6,000
ukuran = 'standar'
```

### **Perhitungan:**

```
HPP Polos = Rp 2,000 (dari outlet_production_costs)
HPP Total = Rp 6,000 (dari products)
Biaya Topping = 6,000 - 2,000 = Rp 4,000

Total Rugi = (HPP Polos + Biaya Topping) × Qty
           = (2,000 + 4,000) × 2
           = 6,000 × 2
           = Rp 12,000
```

### **Data yang Disimpan:**

```json
{
  "outlet_id": "90b1763b-60b4-4899-99a1-da3358ec8877",
  "product_ordered": "Donat Coklat Standar",
  "product_made": "Bomboloni Strawberry Standar",
  "qty": 2,
  "reason": "Salah dengar pesanan customer",
  "hpp_per_pcs": 2000,
  "topping_cost": 4000,
  "total_hpp_loss": 12000,
  "reported_at": "2026-05-03T12:00:00Z"
}
```

---

## 🚨 CRITICAL WARNINGS

### **❌ JANGAN:**
1. ❌ Ambil HPP dari `products.harga_pokok_penjualan` saja (tidak akurat per outlet!)
2. ❌ Pakai field `biaya_topping` di table `products` (TIDAK ADA!)
3. ❌ Hardcode nilai HPP atau biaya topping
4. ❌ Lupa query `outlet_production_costs` untuk dapat HPP polos

### **✅ HARUS:**
1. ✅ Query `outlet_production_costs` untuk HPP polos per outlet
2. ✅ Query `products` untuk HPP total
3. ✅ Hitung biaya topping: `hpp_total - hpp_polos`
4. ✅ Simpan breakdown lengkap (hpp_per_pcs, topping_cost, total_hpp_loss)

---

## 📊 DIAGRAM DATA FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT (Form)                        │
│  - Outlet: Donattour Pusat                                  │
│  - Product Made: Bomboloni Strawberry Standar               │
│  - Qty: 2                                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              QUERY 1: outlet_production_costs               │
│  WHERE outlet_id = 'Donattour Pusat'                        │
│  RESULT: cost_polos_standar = 2,000                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   QUERY 2: products                         │
│  WHERE nama = 'Bomboloni Strawberry'                        │
│  RESULT: harga_pokok_penjualan = 6,000, ukuran = 'standar' │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    CALCULATION                              │
│  hpp_polos = 2,000                                          │
│  hpp_total = 6,000                                          │
│  biaya_topping = 6,000 - 2,000 = 4,000                     │
│  total_rugi = (2,000 + 4,000) × 2 = 12,000                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              INSERT INTO topping_errors                     │
│  hpp_per_pcs: 2,000                                         │
│  topping_cost: 4,000                                        │
│  total_hpp_loss: 12,000                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 VERIFIKASI CHECKLIST

Sebelum implement task yang berhubungan dengan HPP, pastikan:

- [ ] Sudah query `outlet_production_costs` untuk HPP polos
- [ ] Sudah query `products` untuk HPP total
- [ ] Sudah hitung biaya topping dengan benar
- [ ] Sudah simpan breakdown lengkap ke database
- [ ] Sudah test dengan data dari 2 outlet berbeda
- [ ] Sudah verifikasi perhitungan manual vs sistem

---

## 📚 REFERENSI

**Files Terkait:**
- `app/api/topping-errors/route.ts` - API endpoint
- `components/pos/ToppingErrorForm.tsx` - Form component
- `QueryDATABASE/31-production-tracking-system.sql` - Database schema
- `.kiro/specs/production-tracking-system/requirements.md` - Requirements
- `.kiro/specs/production-tracking-system/design.md` - Design document

**Database Tables:**
- `outlet_production_costs` - HPP polos per outlet
- `products` - HPP total produk varian
- `topping_errors` - Laporan kesalahan topping

---

**Status:** ✅ VERIFIED & DOCUMENTED  
**Last Updated:** 2026-05-03  
**Reviewed By:** User & Kiro AI
