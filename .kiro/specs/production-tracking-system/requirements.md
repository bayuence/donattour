# Requirements: Sistem Tracking Produksi & Rugi Lengkap

## 📋 Overview

Sistem tracking lengkap untuk produksi donat non-topping, penjualan, dan semua jenis kerugian (waste) dalam satu siklus bisnis harian. Sistem ini memastikan setiap donat yang diproduksi, dijual, atau dibuang tercatat dengan detail untuk analisis bisnis dan cost control.

---

## 🚨 CRITICAL: Struktur HPP (Harga Pokok Penjualan)

**PENTING UNTUK DIBACA SEBELUM IMPLEMENTASI!**

### Konsep Dasar HPP

HPP dalam sistem ini memiliki struktur khusus yang **BERBEDA PER OUTLET**:

```
HPP Produk Varian = HPP Polos + Biaya Topping
```

**Contoh:**
- Bomboloni Strawberry di Donattour Pusat = Rp 2,000 (polos) + Rp 4,000 (topping) = Rp 6,000
- Bomboloni Strawberry di Donattour K3PG = Rp 4,000 (polos) + Rp 2,000 (topping) = Rp 6,000

**⚠️ PERHATIAN:** HPP Polos berbeda per outlet karena:
- Lokasi berbeda → biaya bahan baku berbeda
- Ekonomi wilayah berbeda → harga supplier berbeda
- Biaya operasional berbeda

### Sumber Data HPP

1. **HPP Polos** → Disimpan di table `outlet_production_costs`
   - Field: `cost_polos_standar`, `cost_polos_mini`
   - Berbeda per outlet, per ukuran

2. **HPP Total** → Disimpan di table `products`
   - Field: `harga_pokok_penjualan`
   - Global untuk semua outlet (sudah include topping)

3. **Biaya Topping** → **TIDAK DISIMPAN**, harus dihitung:
   ```
   Biaya Topping = HPP Total (products) - HPP Polos (outlet_production_costs)
   ```

### Rumus Perhitungan

**Untuk Laporan Kesalahan Topping:**
```typescript
// 1. Query outlet_production_costs
const hpp_polos = outlet_costs.cost_polos_standar; // atau cost_polos_mini

// 2. Query products
const hpp_total = product.harga_pokok_penjualan;

// 3. Hitung biaya topping
const biaya_topping = hpp_total - hpp_polos;

// 4. Hitung total rugi
const total_rugi = (hpp_polos + biaya_topping) * qty;
```

**Contoh Kasus Nyata:**
```
Outlet: Donattour Pusat
Produk: Bomboloni Strawberry Standar
Qty: 2 pcs

Step 1: Query outlet_production_costs
  → cost_polos_standar = Rp 2,000

Step 2: Query products
  → harga_pokok_penjualan = Rp 6,000

Step 3: Calculate
  → biaya_topping = 6,000 - 2,000 = Rp 4,000

Step 4: Total Rugi
  → (2,000 + 4,000) × 2 = Rp 12,000
```

### ❌ KESALAHAN UMUM YANG HARUS DIHINDARI

1. ❌ Mengambil HPP dari `products.harga_pokok_penjualan` saja (tidak akurat per outlet!)
2. ❌ Mencari field `biaya_topping` di table `products` (TIDAK ADA!)
3. ❌ Hardcode nilai HPP atau biaya topping
4. ❌ Lupa query `outlet_production_costs` untuk HPP polos

### ✅ IMPLEMENTASI YANG BENAR

1. ✅ Selalu query `outlet_production_costs` untuk HPP polos per outlet
2. ✅ Query `products` untuk HPP total
3. ✅ Hitung biaya topping dengan rumus: `hpp_total - hpp_polos`
4. ✅ Simpan breakdown lengkap (hpp_per_pcs, topping_cost, total_hpp_loss)

**📖 Dokumentasi Lengkap:** Lihat file `.kiro/specs/production-tracking-system/HPP-STRUCTURE-DOCUMENTATION.md`

---

## 🎯 Business Goals

### Primary Goals
1. **Track semua donat non-topping** yang diproduksi per outlet per hari
2. **Validasi kasir**: Kasir tidak bisa jual tanpa ada input produksi
3. **Track semua jenis rugi**: Produksi gagal, salah topping, expired, reject
4. **Laporan lengkap**: Owner tahu persis kondisi bisnis setiap hari
5. **Cost control**: Hitung HPP loss untuk setiap jenis waste

### Secondary Goals
1. Alert system untuk stok menipis
2. Rekomendasi produksi berdasarkan data penjualan
3. Export laporan untuk analisis
4. Tracking topping terpakai per rasa

---

## 👥 User Roles & Needs

### 1. Bagian Dapur (Production Staff)
**Kebutuhan:**
- Input hasil produksi donat non-topping (berhasil & gagal)
- Input detail waste produksi dengan alasan
- Lihat target vs actual produksi
- Notifikasi jika waste rate tinggi

### 2. Kasir
**Kebutuhan:**
- Validasi: Cek stok non-topping sebelum bisa jual
- Jual donat dengan berbagai topping
- Lapor kesalahan topping jika terjadi
- Lihat sisa stok non-topping real-time

### 3. Penanggung Jawab Closing
**Kebutuhan:**
- Input status sisa non-topping (fresh/aging/expired)
- Input status sisa sudah topping (fresh/aging/reject)
- Input alasan untuk setiap reject
- Generate summary rugi harian

### 4. Owner/Manager
**Kebutuhan:**
- Dashboard lengkap kondisi bisnis harian
- Laporan rugi per kategori dengan HPP loss
- Analisis penjualan per rasa
- Rekomendasi untuk mengurangi waste
- Export data untuk analisis lebih lanjut

---

## 🔄 Business Process Flow

### **PAGI (Opening) - 06:00-08:00**

#### 1. Input Produksi Donat Non-Topping
**Actor:** Bagian Dapur

**Input:**
- Outlet
- Tanggal produksi
- Ukuran donat (Standar / Mini)
- Target produksi (qty)
- Qty berhasil (non-topping ready)
- Qty gagal (waste) dengan detail:
  - Alasan gagal (gosong, bentuk jelek, adonan gagal, dll)
  - Qty per alasan
  - HPP per pcs
  - Total HPP loss

**Output:**
- Data produksi tersimpan
- Stok non-topping ter-create di inventory
- Kasir bisa mulai operasional

**Business Rules:**
- Target produksi minimal 1 pcs
- Qty berhasil + qty gagal harus <= target (boleh kurang dari target)
- HPP per pcs harus > 0
- Alasan gagal wajib diisi jika ada waste
- Satu outlet hanya bisa input 1x per ukuran per hari (bisa edit jika salah)

**Validation:**
- ✅ Outlet wajib dipilih
- ✅ Tanggal tidak boleh masa depan
- ✅ Target produksi > 0
- ✅ Qty berhasil >= 0
- ✅ Qty gagal >= 0
- ✅ Total (berhasil + gagal) <= target
- ✅ Jika ada waste, alasan wajib diisi

---

### **SIANG-SORE (Operasional) - 08:00-20:00**

#### 2. Validasi Stok Sebelum Kasir Bisa Jual
**Actor:** Sistem (Auto)

**Process:**
- Saat kasir login atau buka halaman kasir
- Sistem cek: Apakah ada input produksi hari ini untuk outlet ini?
- Jika TIDAK ADA → Blokir kasir, tampilkan peringatan
- Jika ADA → Kasir bisa operasional normal

**Business Rules:**
- Kasir TIDAK BISA jual jika belum ada input produksi hari ini
- Validasi dilakukan per outlet
- Validasi dilakukan setiap kali kasir dibuka

**Error Message:**
```
❌ KASIR DIBLOKIR

Belum ada input produksi hari ini!
Hubungi bagian dapur untuk input produksi terlebih dahulu.

[Refresh] [Hubungi Dapur]
```

#### 3. Penjualan Donat (Kasir)
**Actor:** Kasir

**Process:**
1. Customer pesan: "Donat Coklat Standar 5 pcs"
2. Sistem cek stok non-topping standar
3. Jika stok cukup:
   - Kurangi stok non-topping standar: -5 pcs
   - Catat penjualan: 5 pcs Donat Coklat Standar
   - Track topping terpakai: Coklat +5
   - Simpan transaksi
4. Jika stok TIDAK cukup:
   - Tampilkan error: "Stok non-topping standar tidak cukup!"
   - Tampilkan sisa stok

**Business Rules:**
- Setiap penjualan donat WAJIB kurangi stok non-topping
- Stok non-topping tidak boleh negatif
- Track topping yang dipakai per transaksi
- Harga jual sudah include HPP + topping + margin

**Validation:**
- ✅ Stok non-topping cukup
- ✅ Ukuran donat sesuai (standar/mini)
- ✅ Topping tersedia

#### 4. Lapor Kesalahan Topping
**Actor:** Kasir

**Input:**
- Produk yang dipesan customer
- Produk yang dibuat (salah)
- Qty
- HPP + topping loss
- Alasan kesalahan

**Output:**
- Data kesalahan tersimpan
- Masuk ke laporan rugi harian
- Stok non-topping tetap berkurang (sudah terpakai)

**Business Rules:**
- Kesalahan topping tetap mengurangi stok non-topping
- HPP loss = HPP donat + harga topping
- Alasan wajib diisi untuk analisis

**Contoh Kasus:**
```
Customer pesan: Donat Coklat Standar
Kasir buat: Donat Strawberry Standar (SALAH!)

Hasil:
- Stok non-topping standar: -1
- Topping Strawberry terpakai: +1
- Rugi: Rp 5.000 (HPP Rp 3.000 + Topping Rp 2.000)
- Alasan: "Salah dengar pesanan"
```

---

### **MALAM (Closing) - 20:00-22:00**

#### 5. Closing Harian - Cek Sisa Stok
**Actor:** Penanggung Jawab Closing

**Input:**

**A. Sisa Non-Topping (Donat Mentah)**
- Outlet
- Tanggal
- Ukuran (Standar/Mini)
- Total sisa (auto dari sistem)
- Status per qty:
  - ✅ Fresh (simpan untuk besok): X pcs
  - ⚠️ Aging (diskon besok): X pcs
  - ❌ Expired (buang): X pcs
    - HPP loss per pcs
    - Alasan expired

**B. Sisa Sudah Di-Topping (Donat Jadi)** ⭐ PENTING!
- Produk (misal: Donat Coklat Standar)
- Total sisa (input manual)
- Status per qty:
  - ✅ Fresh (jual besok dengan diskon): X pcs
  - ⚠️ Aging (diskon besar): X pcs
  - ❌ Reject (buang): X pcs
    - HPP + topping loss per pcs
    - Alasan reject (topping meleleh, kering, jatuh, dll)

**C. Catatan Closing**
- Catatan umum untuk owner (optional)
- Rekomendasi untuk besok

**Output:**
- Data closing tersimpan
- Summary rugi harian ter-generate
- Stok fresh & aging masuk ke inventory besok
- Laporan lengkap untuk owner

**Business Rules:**
- Closing wajib dilakukan setiap hari
- Total sisa harus sesuai dengan stok sistem
- Setiap reject wajib ada alasan
- HPP loss dihitung otomatis
- Fresh & aging bisa dijual besok (dengan diskon)
- Expired & reject tidak bisa dijual (waste)

**Validation:**
- ✅ Total sisa = fresh + aging + expired/reject
- ✅ Alasan wajib diisi untuk expired/reject
- ✅ HPP loss > 0 untuk expired/reject
- ✅ Tanggal closing = hari ini

---

## 📊 Reports & Analytics

### 1. Dashboard Owner - Laporan Harian

**Sections:**

#### A. Ringkasan Keuangan
- Omzet hari ini
- HPP terjual
- Total rugi/waste
- Gross profit
- Margin %

#### B. Produksi & Penjualan
- Target produksi
- Berhasil produksi (%)
- Gagal produksi (%)
- Terjual (%)
- Sisa (%)

#### C. Detail Rugi (Breakdown)
1. **Gagal Produksi**
   - Per alasan (gosong, bentuk jelek, dll)
   - Qty & HPP loss
   - % dari total rugi

2. **Salah Topping**
   - Qty & HPP loss
   - % dari total rugi

3. **Non-Topping Expired**
   - Per ukuran
   - Qty & HPP loss
   - % dari total rugi

4. **Sudah Topping Reject**
   - Per produk
   - Qty & HPP loss
   - Alasan reject
   - % dari total rugi

#### D. Penjualan Per Rasa
- Ranking rasa terlaris
- Qty & omzet per rasa
- % dari total penjualan

#### E. Rekomendasi
- Alert jika waste rate > 15%
- Saran produksi untuk besok
- Produk yang kurang laku
- Produk yang perlu ditambah

### 2. Laporan Mingguan/Bulanan

**Metrics:**
- Total produksi vs target
- Waste rate trend
- Rugi per kategori (chart)
- Rasa terlaris
- Outlet dengan waste tertinggi
- Cost analysis

---

## 💾 Data Requirements

### Core Data Entities

#### 1. production_daily
**Purpose:** Input produksi harian per outlet per ukuran

**Fields:**
- id (UUID, PK)
- outlet_id (UUID, FK)
- tanggal (DATE)
- ukuran (VARCHAR: 'standar', 'mini')
- target_qty (INTEGER)
- success_qty (INTEGER) - Donat non-topping berhasil
- waste_qty (INTEGER) - Donat gagal produksi
- total_hpp_loss (DECIMAL) - Total rugi produksi
- created_by (UUID, FK users)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

**Constraints:**
- UNIQUE(outlet_id, tanggal, ukuran)
- success_qty + waste_qty <= target_qty
- waste_qty >= 0

#### 2. production_waste_details
**Purpose:** Detail alasan waste produksi

**Fields:**
- id (UUID, PK)
- production_daily_id (UUID, FK)
- reason (VARCHAR) - gosong, bentuk_jelek, adonan_gagal, dll
- qty (INTEGER)
- hpp_per_pcs (DECIMAL)
- hpp_loss (DECIMAL) - qty * hpp_per_pcs
- created_at (TIMESTAMPTZ)

**Constraints:**
- qty > 0
- hpp_per_pcs > 0

#### 3. inventory_non_topping
**Purpose:** Stok donat non-topping real-time per outlet

**Fields:**
- id (UUID, PK)
- outlet_id (UUID, FK)
- ukuran (VARCHAR: 'standar', 'mini')
- qty_available (INTEGER) - Stok tersedia
- production_date (DATE) - Tanggal produksi
- status (VARCHAR: 'fresh', 'aging', 'expired')
- last_updated (TIMESTAMPTZ)

**Constraints:**
- UNIQUE(outlet_id, ukuran, production_date)
- qty_available >= 0

#### 4. topping_usage
**Purpose:** Track topping terpakai per transaksi

**Fields:**
- id (UUID, PK)
- order_id (UUID, FK orders)
- product_id (UUID, FK products) - Produk dengan topping
- topping_name (VARCHAR) - Coklat, Strawberry, dll
- qty (INTEGER)
- created_at (TIMESTAMPTZ)

#### 5. topping_errors
**Purpose:** Kesalahan topping saat penjualan

**Fields:**
- id (UUID, PK)
- outlet_id (UUID, FK)
- kasir_id (UUID, FK users)
- tanggal (DATE)
- product_ordered (VARCHAR) - Yang dipesan customer
- product_made (VARCHAR) - Yang dibuat (salah)
- qty (INTEGER)
- hpp_loss (DECIMAL) - HPP + topping
- reason (TEXT) - Alasan kesalahan
- created_at (TIMESTAMPTZ)

#### 6. daily_closing
**Purpose:** Data closing harian per outlet

**Fields:**
- id (UUID, PK)
- outlet_id (UUID, FK)
- tanggal (DATE)
- closed_by (UUID, FK users)
- notes (TEXT) - Catatan closing
- created_at (TIMESTAMPTZ)

**Constraints:**
- UNIQUE(outlet_id, tanggal)

#### 7. closing_non_topping_status
**Purpose:** Status sisa non-topping saat closing

**Fields:**
- id (UUID, PK)
- daily_closing_id (UUID, FK)
- ukuran (VARCHAR)
- total_sisa (INTEGER)
- qty_fresh (INTEGER) - Simpan besok
- qty_aging (INTEGER) - Diskon besok
- qty_expired (INTEGER) - Buang
- hpp_loss_expired (DECIMAL)
- reason_expired (TEXT)
- created_at (TIMESTAMPTZ)

**Constraints:**
- total_sisa = qty_fresh + qty_aging + qty_expired

#### 8. closing_finished_products
**Purpose:** Status sisa donat sudah topping saat closing

**Fields:**
- id (UUID, PK)
- daily_closing_id (UUID, FK)
- product_id (UUID, FK products)
- product_name (VARCHAR)
- total_sisa (INTEGER)
- qty_fresh (INTEGER) - Jual besok diskon
- qty_aging (INTEGER) - Diskon besar
- qty_reject (INTEGER) - Buang
- hpp_topping_loss (DECIMAL) - HPP + topping
- reason_reject (TEXT)
- created_at (TIMESTAMPTZ)

**Constraints:**
- total_sisa = qty_fresh + qty_aging + qty_reject

#### 9. daily_loss_summary
**Purpose:** Summary rugi harian per outlet

**Fields:**
- id (UUID, PK)
- outlet_id (UUID, FK)
- tanggal (DATE)
- production_waste_loss (DECIMAL)
- topping_error_loss (DECIMAL)
- non_topping_expired_loss (DECIMAL)
- finished_product_reject_loss (DECIMAL)
- total_loss (DECIMAL)
- total_waste_qty (INTEGER)
- created_at (TIMESTAMPTZ)

**Constraints:**
- UNIQUE(outlet_id, tanggal)
- total_loss = sum of all loss categories

---

## 🎨 UI/UX Requirements

### 1. Input Produksi Page

**Layout:**
- Header: Judul, tanggal, outlet selector
- Form Section:
  - Ukuran selector (Standar/Mini)
  - Target produksi input
  - Qty berhasil input
  - Waste section (dynamic):
    - [+ Tambah Alasan Gagal] button
    - List of waste reasons dengan qty & HPP
    - Auto calculate total waste loss
- Summary Card:
  - Target vs Actual
  - Success rate %
  - Waste rate %
  - Total HPP loss
- Submit button

**Validation Messages:**
- Real-time validation
- Error messages in red
- Success messages in green
- Warning if waste rate > 15%

### 2. Kasir Page - Validasi Stok

**Before Opening:**
- Check stok non-topping
- If no production input → Show blocking modal
- If has production → Show stok summary

**Blocking Modal:**
```
┌─────────────────────────────────────┐
│  ❌ KASIR DIBLOKIR                  │
├─────────────────────────────────────┤
│  Belum ada input produksi hari ini! │
│  Hubungi bagian dapur.              │
│                                     │
│  [🔄 Refresh] [📞 Hubungi Dapur]   │
└─────────────────────────────────────┘
```

**Stok Summary (Top Bar):**
```
📦 Stok Non-Topping Hari Ini:
Standar: 250 pcs | Mini: 100 pcs
```

### 3. Closing Harian Page

**Layout:**
- Header: Outlet, tanggal, ringkasan hari ini
- Tab Navigation:
  - Tab 1: Sisa Non-Topping
  - Tab 2: Sisa Sudah Topping
  - Tab 3: Summary & Catatan

**Tab 1: Sisa Non-Topping**
- Per ukuran (Standar, Mini)
- Input qty: Fresh, Aging, Expired
- Alasan expired (textarea)
- Auto calculate HPP loss

**Tab 2: Sisa Sudah Topping**
- [+ Tambah Produk] button
- List produk dengan sisa
- Per produk: Fresh, Aging, Reject
- Alasan reject (textarea)
- Auto calculate HPP + topping loss

**Tab 3: Summary**
- Total rugi breakdown
- Catatan closing (textarea)
- [💾 Simpan Closing] button

### 4. Dashboard Owner

**Layout:**
- Date range selector
- Outlet filter
- Cards:
  - Omzet
  - Gross Profit
  - Total Rugi
  - Waste Rate
- Charts:
  - Rugi per kategori (pie chart)
  - Penjualan per rasa (bar chart)
  - Trend waste rate (line chart)
- Tables:
  - Detail rugi per kategori
  - Penjualan per produk
- Rekomendasi section
- Export button (Excel/PDF)

---

## 🔔 Alert & Notification Requirements

### 1. Real-time Alerts

**Stok Menipis:**
- Trigger: Stok non-topping < 20% dari produksi hari ini
- Target: Kasir & Manager
- Message: "⚠️ Stok non-topping standar tinggal 50 pcs!"

**Waste Rate Tinggi:**
- Trigger: Waste rate > 15%
- Target: Manager & Owner
- Message: "⚠️ Waste rate hari ini 26%! Target: <15%"

**Belum Input Produksi:**
- Trigger: Jam 08:00, belum ada input produksi
- Target: Bagian Dapur & Manager
- Message: "⚠️ Belum ada input produksi hari ini!"

**Belum Closing:**
- Trigger: Jam 21:00, belum closing
- Target: Penanggung Jawab Closing
- Message: "⚠️ Jangan lupa closing harian!"

### 2. Daily Summary Email (Optional)

**Recipients:** Owner, Manager
**Time:** 22:00 setiap hari
**Content:**
- Ringkasan keuangan
- Total rugi & waste
- Top 3 rasa terlaris
- Rekomendasi

---

## ✅ Acceptance Criteria

### Must Have (Priority 1)

1. ✅ **Input Produksi**
   - Bisa input produksi per ukuran
   - Bisa input waste dengan detail alasan
   - Auto calculate HPP loss
   - Validasi: success + waste <= target

2. ✅ **Validasi Kasir**
   - Kasir TIDAK bisa jual tanpa input produksi
   - Tampilkan blocking modal jika belum ada produksi
   - Tampilkan stok non-topping real-time

3. ✅ **Auto Kurangi Stok**
   - Setiap penjualan auto kurangi stok non-topping
   - Validasi: stok tidak boleh negatif
   - Track topping terpakai

4. ✅ **Closing Harian**
   - Input status sisa non-topping (fresh/aging/expired)
   - Input status sisa sudah topping (fresh/aging/reject)
   - Auto calculate total rugi
   - Generate summary

5. ✅ **Dashboard Owner**
   - Tampilkan laporan rugi lengkap
   - Breakdown per kategori
   - Penjualan per rasa
   - Rekomendasi

### Should Have (Priority 2)

1. ⚠️ **Alert System**
   - Alert stok menipis
   - Alert waste rate tinggi
   - Alert belum input produksi
   - Alert belum closing

2. ⚠️ **Laporan Kesalahan Topping**
   - Form lapor kesalahan
   - Track HPP loss
   - Masuk ke summary rugi

3. ⚠️ **Export Laporan**
   - Export Excel
   - Export PDF
   - Filter by date range

### Nice to Have (Priority 3)

1. 💡 **Rekomendasi Produksi**
   - Berdasarkan data penjualan
   - Prediksi demand
   - Optimasi produksi

2. 💡 **Analisis Trend**
   - Waste rate trend
   - Penjualan trend
   - Seasonal analysis

3. 💡 **Mobile App**
   - Input produksi via mobile
   - Closing via mobile
   - Dashboard mobile

---

## 🚫 Out of Scope

Fitur yang TIDAK termasuk dalam scope ini:

1. ❌ Manajemen supplier & pembelian bahan baku
2. ❌ Payroll & HR management
3. ❌ Customer loyalty program
4. ❌ Online ordering system
5. ❌ Delivery tracking
6. ❌ Multi-currency support
7. ❌ Multi-language support

---

## 🔒 Security & Permissions

### Role-Based Access Control

**Admin/Owner:**
- Full access semua fitur
- Lihat semua outlet
- Export data
- Manage users

**Manager:**
- Lihat dashboard outlet yang dikelola
- Approve closing
- Lihat laporan
- Export data outlet sendiri

**Bagian Dapur:**
- Input produksi
- Lihat history produksi
- Lihat target vs actual

**Kasir:**
- Akses kasir (jika ada produksi)
- Lapor kesalahan topping
- Lihat stok non-topping

**Penanggung Jawab Closing:**
- Input closing harian
- Lihat summary hari ini
- Edit closing (jika belum approved)

---

## 📈 Success Metrics

### Key Performance Indicators (KPIs)

1. **Waste Rate**
   - Target: < 15%
   - Measure: (Total waste qty / Total produksi) * 100%

2. **Data Accuracy**
   - Target: 100% outlet input produksi setiap hari
   - Target: 100% outlet closing setiap hari

3. **Cost Control**
   - Target: Reduce total loss by 20% in 3 months
   - Measure: Compare monthly loss reports

4. **User Adoption**
   - Target: 100% staff trained & using system
   - Measure: Daily active users

5. **Report Usage**
   - Target: Owner check dashboard daily
   - Measure: Dashboard views per day

---

## 🎯 Success Criteria

Project dianggap sukses jika:

1. ✅ Semua outlet input produksi setiap hari
2. ✅ Kasir tidak bisa jual tanpa input produksi
3. ✅ Semua outlet closing setiap hari
4. ✅ Owner bisa lihat laporan rugi lengkap real-time
5. ✅ Waste rate terukur dan menurun
6. ✅ HPP loss tercatat akurat
7. ✅ Staff terlatih dan menggunakan sistem dengan baik
8. ✅ Data akurat dan bisa dipercaya untuk decision making

---

## 📝 Notes & Assumptions

### Assumptions

1. Setiap outlet punya koneksi internet stabil
2. Staff sudah familiar dengan sistem POS
3. HPP per donat sudah ditentukan (Rp 3.000 untuk contoh)
4. Harga topping sudah ditentukan per jenis
5. Donat fresh bisa disimpan 1 hari (jual besok dengan diskon)
6. Donat aging harus dijual hari itu atau besok pagi (diskon besar)
7. Donat expired tidak bisa dijual (waste)

### Constraints

1. Budget: Menggunakan infrastruktur existing (Supabase, Vercel)
2. Timeline: Implementasi bertahap (MVP dulu, enhancement later)
3. Resources: 1 developer (Kiro AI)
4. Technology: Next.js, TypeScript, Supabase, Vercel

### Risks & Mitigations

**Risk 1: Staff lupa input produksi**
- Mitigation: Alert system, blocking kasir, training

**Risk 2: Data tidak akurat**
- Mitigation: Validasi ketat, cross-check dengan stok fisik

**Risk 3: Resistance to change**
- Mitigation: Training, show benefits, gradual rollout

**Risk 4: System downtime**
- Mitigation: Offline mode (future), backup manual process

---

## 🚀 Implementation Phases

### Phase 1: MVP (Must Have)
**Timeline:** 2-3 weeks

1. Database schema
2. Input produksi page
3. Validasi kasir
4. Auto kurangi stok
5. Closing harian page
6. Dashboard owner basic

### Phase 2: Enhancement (Should Have)
**Timeline:** 1-2 weeks

1. Alert system
2. Laporan kesalahan topping
3. Export laporan
4. UI/UX improvements

### Phase 3: Advanced (Nice to Have)
**Timeline:** 2-3 weeks

1. Rekomendasi produksi
2. Analisis trend
3. Mobile optimization
4. Advanced analytics

---

## ✅ Definition of Done

Setiap fitur dianggap selesai jika:

1. ✅ Code implemented & tested
2. ✅ Database migration created & tested
3. ✅ UI/UX sesuai requirements
4. ✅ Validation working correctly
5. ✅ Error handling implemented
6. ✅ Tested di lokal & production
7. ✅ Documentation updated
8. ✅ Pushed to GitHub (auto-deploy)
9. ✅ Owner/Manager approved

---

**Document Version:** 1.0  
**Created:** 2026-05-02  
**Status:** ✅ Ready for Design Phase  
**Next Step:** Create Design Document
