# 📋 Proposal Perubahan Sistem Donattour

## 🎯 Tujuan Perubahan

Merombak sistem untuk:
1. **Perhitungan keuntungan yang lebih akurat** dengan rincian per produk
2. **Simplifikasi kasir** dari multi-channel menjadi single kasir per outlet

---

## 📊 Analisis Sistem Saat Ini

### **A. Struktur Pricing Saat Ini:**
```sql
products table:
  - harga_jual: DECIMAL (harga rata-rata)
  - hpp: DECIMAL (HPP rata-rata, tidak detail)
  - biaya_topping: DECIMAL (flat untuk semua)
```

**Masalah:**
- ❌ HPP donat polos dipukul rata
- ❌ Biaya topping tidak detail per varian
- ❌ Profit calculation tidak akurat per produk
- ❌ Ukuran (mini, regular, jumbo) tidak mempengaruhi HPP

### **B. Struktur Kasir Saat Ini:**
```
1 Outlet = Multiple Kasir Channels:
  - Kasir Toko (offline)
  - Kasir GoFood
  - Kasir ShopeeFood  
  - Kasir GrabFood
  - Kasir Online
  - Kasir OTR (On The Road)
```

**Masalah:**
- ❌ Kompleks untuk dikelola
- ❌ Harus maintain harga per channel
- ❌ User bingung pilih channel
- ❌ Laporan keuangan harus di-aggregate per channel

---

## 🎯 Sistem Baru yang Diusulkan

### **1. Perubahan Database - Products Table**

#### **A. Field Baru untuk Detail Pricing:**

```sql
ALTER TABLE products
  -- Kategori Produk
  ADD COLUMN is_donat BOOLEAN DEFAULT false,
  ADD COLUMN ukuran_donat VARCHAR(20), -- 'mini', 'regular', 'jumbo', 'dozen'
  
  -- HPP Detail
  ADD COLUMN hpp_base_donat DECIMAL(15,2) DEFAULT 0, -- HPP donat polos saja
  ADD COLUMN hpp_topping DECIMAL(15,2) DEFAULT 0,     -- Biaya topping spesifik
  ADD COLUMN hpp_total DECIMAL(15,2) GENERATED ALWAYS AS (hpp_base_donat + hpp_topping) STORED,
  
  -- Profit Calculation
  ADD COLUMN margin_amount DECIMAL(15,2) GENERATED ALWAYS AS (harga_jual - hpp_total) STORED,
  ADD COLUMN margin_percent DECIMAL(5,2) GENERATED ALWAYS AS 
      (CASE WHEN harga_jual > 0 THEN ((harga_jual - hpp_total) / harga_jual * 100) ELSE 0 END) STORED;
```

#### **B. Contoh Data Produk Baru:**

| Nama Produk | is_donat | ukuran | hpp_base | hpp_topping | hpp_total | harga_jual | margin |
|-------------|----------|--------|----------|-------------|-----------|------------|--------|
| Donat Original Regular | ✅ | regular | 2,000 | 500 | 2,500 | 5,000 | 50% |
| Donat Coklat Regular | ✅ | regular | 2,000 | 1,500 | 3,500 | 6,000 | 41.7% |
| Donat Strawberry Mini | ✅ | mini | 1,200 | 1,000 | 2,200 | 4,000 | 45% |
| Donat Premium Jumbo | ✅ | jumbo | 3,500 | 2,500 | 6,000 | 12,000 | 50% |
| Es Teh | ❌ | - | 1,000 | 0 | 1,000 | 3,000 | 66.7% |
| Paket 6 Mix | ❌ | - | - | - | (calculated) | 30,000 | - |

---

### **2. Perubahan Kasir System**

#### **A. Hapus Multi-Channel Kasir**

**Tables yang Dihapus/Deprecated:**
```sql
-- Hapus table
DROP TABLE IF EXISTS outlet_kasir_menus;
DROP TABLE IF EXISTS outlet_channel_prices;

-- Update orders table
ALTER TABLE orders
  DROP COLUMN channel; -- Tidak perlu lagi
```

#### **B. Simplify ke Single Kasir:**

**Sebelum:**
```
Orders Table:
  - outlet_id
  - channel: 'toko' | 'gofood' | 'shopee' | etc
  - harga berdasarkan channel
```

**Sesudah:**
```
Orders Table:
  - outlet_id
  - harga dari product.harga_jual saja
  - NO channel field
```

---

### **3. Perubahan UI/UX**

#### **A. Halaman Kelola Produk**

**Form Tambah/Edit Produk - Section Baru:**

```
┌─────────────────────────────────────────────────────────┐
│ INFORMASI PRODUK                                        │
├─────────────────────────────────────────────────────────┤
│ Nama Produk: [_______________________________]          │
│ Kode: [________]  Kategori: [Dropdown]                  │
│                                                          │
│ ☐ Apakah ini produk donat?                             │
│                                                          │
│   [Jika dicentang, muncul section:]                     │
│                                                          │
│   Ukuran Donat:                                         │
│   ○ Mini (1 papan = 20 pcs)                            │
│   ○ Regular (1 papan = 12 pcs)                         │
│   ○ Jumbo (1 papan = 6 pcs)                            │
│   ○ Dozen (1 papan = 12 pcs khusus paket)              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ RINCIAN HARGA & HPP                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [Jika is_donat = true:]                                │
│                                                          │
│ HPP Donat Polos:  Rp [________] ← Base cost           │
│ HPP Topping:      Rp [________] ← Topping cost        │
│ ─────────────────────────────────────                   │
│ Total HPP:        Rp 3,500 (auto calculate)           │
│                                                          │
│ Harga Jual:       Rp [________]                         │
│ ─────────────────────────────────────                   │
│ Margin:           Rp 2,500 (41.7%) ✅                 │
│                                                          │
│ [Jika is_donat = false:]                               │
│                                                          │
│ HPP Total:        Rp [________]                         │
│ Harga Jual:       Rp [________]                         │
│ ─────────────────────────────────────                   │
│ Margin:           Rp XXX (XX%) ✅                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### **B. Halaman Kasir**

**Sebelum:**
```
Header: [Kasir Toko] [GoFood] [Shopee] [Grab] [Online] [OTR]
        ↑ User pilih channel
```

**Sesudah:**
```
Header: [Outlet: Cabang Utama] [Kasir: John Doe] [Shift: Pagi]
        ↑ Simple, no channel selection
```

---

### **4. Perubahan Laporan**

#### **A. Laporan Harian Outlet - Financial Summary**

**Enhanced Profit Breakdown:**

```
┌────────────────────────────────────────────────────────┐
│ RINGKASAN KEUANGAN                                     │
├────────────────────────────────────────────────────────┤
│ Pendapatan Kotor:        Rp 5,000,000                 │
│                                                         │
│ Rincian HPP:                                           │
│ • HPP Donat Polos:      Rp 1,200,000                  │
│ • HPP Topping:          Rp   800,000                  │
│ • HPP Produk Lain:      Rp   300,000                  │
│ ─────────────────────────────────                      │
│ Total HPP:              Rp 2,300,000                  │
│                                                         │
│ Laba Kotor:             Rp 2,700,000 (54%)           │
│                                                         │
│ Biaya Operasional:      Rp   500,000                  │
│ ─────────────────────────────────                      │
│ Laba Bersih:            Rp 2,200,000 (44%)           │
│                                                         │
└────────────────────────────────────────────────────────┘
```

#### **B. Laporan Per Produk**

**Tabel Performa Produk dengan Detail:**

| Produk | Terjual | HPP Base | HPP Topping | HPP Total | Revenue | Margin |
|--------|---------|----------|-------------|-----------|---------|--------|
| Donat Coklat Regular | 50 | 100k | 75k | 175k | 300k | 125k (41.7%) |
| Donat Original Mini | 80 | 96k | 40k | 136k | 320k | 184k (57.5%) |
| Es Teh | 30 | - | - | 30k | 90k | 60k (66.7%) |

---

## 🗺️ Migration Plan

### **Phase 1: Database Migration (2-3 jam)**

1. **Backup Database**
   ```bash
   # Full backup sebelum migration
   pg_dump donattour_db > backup_before_migration.sql
   ```

2. **Add New Columns**
   ```sql
   -- Script migration ada di file terpisah
   \i migration_001_add_pricing_details.sql
   ```

3. **Data Migration**
   ```sql
   -- Migrate existing products
   UPDATE products SET
     is_donat = CASE WHEN tipe_produk = 'donat_varian' THEN true ELSE false END,
     ukuran_donat = ukuran, -- sudah ada field ukuran
     hpp_base_donat = hpp * 0.6, -- Estimasi 60% dari HPP adalah base
     hpp_topping = hpp * 0.4; -- 40% adalah topping
   ```

4. **Drop Old Tables**
   ```sql
   DROP TABLE outlet_kasir_menus CASCADE;
   DROP TABLE outlet_channel_prices CASCADE;
   ```

### **Phase 2: Backend Updates (4-6 jam)**

**Files yang Perlu Diupdate:**

1. **Types:**
   - `lib/types.ts` → Update Product interface
   - Hapus `KasirMenu`, `ChannelType`

2. **Database Functions:**
   - `lib/db/products.ts` → Update CRUD functions
   - Hapus `lib/db/kasir-menus.ts`
   - Update `lib/db/orders.ts` → Remove channel logic

3. **API Routes:**
   - `app/api/products/route.ts` → Add new fields
   - `app/api/orders/route.ts` → Simplify, remove channel
   - `app/api/dashboard/daily/route.ts` → Enhanced profit calc

### **Phase 3: Frontend Updates (6-8 jam)**

**Components yang Perlu Diupdate:**

1. **Kelola Produk:**
   - Form add/edit produk → Add pricing details section
   - Validation untuk is_donat fields

2. **Kasir:**
   - Remove channel selector di header
   - Remove `kasirMenus` state & logic
   - Simplify cart pricing (no channel prices)

3. **Laporan:**
   - Update financial cards → Show HPP breakdown
   - Update product table → Show margin details

4. **Production:**
   - Input produksi → Aware of ukuran_donat

---

## ✅ Checklist Implementation

### **Database**
- [ ] Create migration script
- [ ] Backup database
- [ ] Run migration
- [ ] Verify data integrity
- [ ] Drop old tables

### **Backend**
- [ ] Update types
- [ ] Update product CRUD
- [ ] Update order creation
- [ ] Update dashboard calculations
- [ ] Remove kasir-menus logic
- [ ] Test API endpoints

### **Frontend**
- [ ] Update product form
- [ ] Remove kasir channel UI
- [ ] Update laporan calculations
- [ ] Update production input
- [ ] Test all workflows

### **Testing**
- [ ] Test product CRUD
- [ ] Test order creation
- [ ] Test profit calculations
- [ ] Test laporan accuracy
- [ ] Test production input

### **Documentation**
- [ ] Update API docs
- [ ] Update user manual
- [ ] Migration guide for users

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | 🔴 High | Full backup + test on staging first |
| Existing orders have channel data | 🟠 Medium | Keep old data, add migration note |
| UI confusion for existing users | 🟡 Low | Add release notes + onboarding |
| Calculation errors | 🔴 High | Extensive testing + validation |

---

## 📅 Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Database Migration | 2-3 hours | ⏳ Pending |
| Backend Updates | 4-6 hours | ⏳ Pending |
| Frontend Updates | 6-8 hours | ⏳ Pending |
| Testing | 3-4 hours | ⏳ Pending |
| **Total** | **15-21 hours** | **⏳ Pending** |

---

## 🎯 Next Steps

1. **Review & Approval** → Anda review proposal ini
2. **Staging Environment** → Setup untuk testing
3. **Migration Script** → Saya buat script SQL
4. **Implementation** → Execute phase by phase
5. **Testing** → Comprehensive testing
6. **Production Deployment** → Go live!

---

**Prepared by:** Kiro AI Assistant  
**Date:** 5 Juni 2026  
**Status:** 📋 Proposal - Menunggu Approval
