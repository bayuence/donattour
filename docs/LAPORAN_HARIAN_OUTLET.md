# Laporan Harian Outlet - Real-Time Dashboard

## Overview
**Laporan Harian Outlet** adalah dashboard real-time yang menampilkan seluruh aktivitas operasional outlet dalam satu hari. Menu ini mengintegrasikan data dari berbagai sumber untuk memberikan gambaran lengkap performa outlet.

## Tujuan & Fungsi

### 1. **Real-Time Monitoring**
Menu ini menampilkan data **secara langsung dan real-time** dari:
- ✅ **Kasir** - Semua transaksi penjualan
- ✅ **Input Pengeluaran** - Semua pengeluaran outlet
- ✅ **Input Produksi** - Data produksi donat (diproduksi, terjual, gagal, dll)
- ✅ **Transaksi** - Detail transaksi harian

### 2. **Centralized Reporting**
Menggabungkan semua data operasional dalam satu dashboard profesional untuk:
- Monitoring performa penjualan
- Tracking pengeluaran
- Analisis produksi
- Perhitungan laba/rugi

### 3. **Business Intelligence**
Memberikan insight bisnis melalui:
- KPI Cards (Pendapatan, Pengeluaran, Laba Kotor, Laba Bersih)
- Metrik Produksi & Operasional
- Success Rate Analysis
- Product Performance Table
- Expense Breakdown

## Struktur Menu

```
DONATTOUR STORE (Kasir Group)
├── Kasir                    → Input transaksi penjualan
├── Input Pengeluaran        → Input pengeluaran outlet
├── Transaksi                → View daftar transaksi
├── Input Produksi           → Input data produksi
└── Laporan Harian Outlet    → ⭐ Dashboard Real-Time (Integrated)
```

## Data Sources Integration

### Input Systems:
1. **Kasir Page** (`/dashboard/kasir`)
   - Transaksi penjualan
   - Total pendapatan
   - Jumlah item terjual

2. **Input Pengeluaran Page** (`/dashboard/input-pengeluaran`)
   - Pengeluaran operasional
   - Kategori: Bahan Baku, Operasional, Gaji, dll
   - Total pengeluaran harian

3. **Input Produksi Page** (`/dashboard/input-produksi`)
   - Jumlah diproduksi
   - Jumlah terjual
   - Gagal produksi
   - Batal beli
   - Sisa bertoping/tanpa toping

4. **Transaksi Page** (`/dashboard/transaksi`)
   - Detail transaksi per customer
   - Metode pembayaran
   - Waktu transaksi

### Output: Real-Time Dashboard
**Laporan Harian Outlet** (`/dashboard/laporan-outlet`) mengambil dan mengagregasi semua data di atas untuk menampilkan:

#### A. Financial Summary
- **Pendapatan**: Total dari semua transaksi kasir
- **Pengeluaran**: Total dari input pengeluaran
- **Laba Kotor**: Pendapatan - HPP (Harga Pokok Penjualan)
- **Laba Bersih**: Pendapatan - Total Pengeluaran

#### B. Production Metrics
- **Diproduksi**: Total unit diproduksi
- **Terjual**: Total unit terjual
- **Gagal Produksi**: Unit gagal dalam proses produksi
- **Batal Beli**: Unit yang dibatalkan customer
- **Sisa Topping**: Unit tersisa dengan topping
- **Sisa Polos**: Unit tersisa tanpa topping
- **Success Rate**: Persentase terjual dari total diproduksi

#### C. Product Performance Analysis
Tabel analisis per produk menampilkan:
- Nama produk & kategori (Standar/Mini)
- Jumlah diproduksi vs terjual
- Revenue per produk
- Profit margin per produk
- Success rate per produk

#### D. Expense Breakdown
Detail pengeluaran dengan:
- Kategori pengeluaran
- Keterangan detail
- Jumlah rupiah
- Persentase dari total pengeluaran

## Use Cases

### 1. **Monitoring Harian Kasir**
Kasir dapat melihat performa outlet secara real-time:
- "Hari ini sudah terjual berapa?"
- "Berapa total pendapatan sejauh ini?"
- "Produk mana yang paling laku?"

### 2. **Decision Making Owner**
Owner dapat mengambil keputusan berdasarkan data:
- "Apakah outlet profitable hari ini?"
- "Pengeluaran apa yang paling besar?"
- "Produk mana yang perlu ditingkatkan produksinya?"

### 3. **Operational Insights**
Membantu operasional outlet:
- Identifikasi produk dengan success rate rendah
- Monitoring efisiensi produksi
- Tracking waste (gagal produksi, batal beli)

## Technical Implementation

### Current State (Demo Data)
Saat ini menggunakan hardcoded demo data untuk development dan design.

### Future State (Real-Time Integration)
Akan diintegrasikan dengan:
- **API Routes**: `/api/transactions`, `/api/expenses`, `/api/production`
- **Real-Time Updates**: Auto-refresh atau WebSocket
- **Date Filter**: Pilih tanggal untuk historical data
- **Outlet Filter**: Multi-outlet support

## UI/UX Design

### Professional Enterprise Design
- ✅ No emojis - Professional icons only
- ✅ Neutral color palette (Gray-based)
- ✅ Clean borders and spacing
- ✅ Data-first approach
- ✅ Responsive design (Mobile, Tablet, Desktop)

### Responsive Breakpoints
- **Mobile** (< 640px): Single column, compact
- **Tablet** (640-1024px): 2-3 columns
- **Desktop** (> 1024px): Full layout, 4-6 columns

## Access Control

### Role: Kasir, Supervisor, Owner, Admin
Semua role di group "kasir" dan "management" dapat mengakses menu ini.

### Permission Level
- **Kasir**: View own outlet data
- **Supervisor**: View managed outlets
- **Owner**: View all outlets
- **Admin**: Full access

## Future Enhancements

1. **Date Range Filter**
   - View historical data
   - Compare multiple dates
   - Trend analysis

2. **Export Functionality**
   - Export to PDF
   - Export to Excel
   - Print-friendly view

3. **Real-Time Notifications**
   - Alert jika laba bersih negatif
   - Notifikasi produk low success rate
   - Warning pengeluaran melebihi budget

4. **Advanced Analytics**
   - Grafik trend
   - Predictive analysis
   - Comparison dengan hari sebelumnya

## Documentation Status

- ✅ Menu renamed: "Laporan Outlet" → "Laporan Harian Outlet"
- ✅ UI redesigned: Professional enterprise-grade
- ✅ Responsive design: Mobile-first approach
- ⏳ Real-time integration: Pending (using demo data)
- ⏳ API integration: Next phase

---

**Last Updated**: June 3, 2026
**Version**: 1.0
**Status**: UI Complete, API Integration Pending
