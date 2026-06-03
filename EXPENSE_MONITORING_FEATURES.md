# Fitur Monitoring Pengeluaran - Owner Dashboard

## 📋 Ringkasan Umum

Owner dashboard memiliki fitur monitoring pengeluaran yang **sangat rinci dan detail** dengan berbagai cara analisis dan visualisasi data. Semua fitur ini terletak di menu **"Analisis Pengeluaran"** pada bagian **DONATTOUR MANAGEMENT**.

---

## 🎯 1. FITUR PERIODE & TAMPILAN DATA

### 1.1 Pilihan Mode Tampilan
```
Mode yang tersedia:
├── 📅 HARIAN (Daily)
│   └── Pilih tanggal spesifik → lihat pengeluaran per hari
│
├── 📊 BULANAN (Monthly)
│   └── Pilih bulan → lihat semua pengeluaran dalam bulan tersebut
│
├── 📈 CUSTOM RANGE (Custom)
│   ├── From Date: Pilih tanggal mulai
│   └── To Date: Pilih tanggal akhir
│       → Analisis pengeluaran dalam range custom
│
└── 📚 SEMUA HISTORY (All)
    └── Tampilkan semua pengeluaran dari awal dengan pagination
```

**Keunggulan**: Owner bisa melihat data dari periode manapun dengan fleksibilitas penuh.

---

## 📊 2. FITUR ANALYTICS & VISUALISASI

### 2.1 Dua Jenis Chart Interaktif

#### A. **Per Kategori (Category Breakdown)**
```
Menampilkan:
✓ Pie/Bar chart yang menunjukkan komposisi pengeluaran per kategori
✓ Persentase setiap kategori dari total
✓ Identifikasi kategori pengeluaran terbesar

Kategori yang dianalisis:
- ⚙️ Operasional    (misal: utility, office supplies)
- 🧂 Bahan Baku     (misal: donat bahan, filling)
- 👤 Gaji           (gaji karyawan)
- 🚗 Transportasi   (bensin, delivery)
- 🔧 Perawatan      (maintenance, perbaikan)
- 📢 Marketing      (promo, iklan)
- 📌 Lainnya        (misc expenses)
```

#### B. **Trend Waktu (Trend Analysis)**
```
Menampilkan:
✓ Line chart trend pengeluaran harian/mingguan
✓ Pola pengeluaran dari waktu ke waktu
✓ Identifikasi periode dengan pengeluaran tinggi

Insight yang bisa didapat:
- Kapan pengeluaran naik drastis?
- Apakah ada pola musiman?
- Trend pengeluaran meningkat atau menurun?
```

**Fitur**: Button toggle antara "Per Kategori" dan "Trend Waktu"

---

## 🔍 3. FITUR FILTERING & PENCARIAN

### 3.1 Advanced Filters (Tombol Filter)

Owner bisa filter data dengan multiple criteria:

```
Filter Tersedia:
├── 🔎 SEARCH (Pencarian)
│   └── Cari berdasarkan keterangan pengeluaran
│       Contoh: "bensin", "gaji bulan", "perbaikan mesin"
│
├── 🏷️ KATEGORI (Multiple Select)
│   └── Pilih 1 atau lebih kategori sekaligus
│       Contoh: Pilih "Gaji" + "Bahan Baku" → lihat hanya 2 kategori itu
│
├── 💰 RANGE JUMLAH (Min-Max Amount)
│   ├── Min Amount: Filter pengeluaran minimal
│   │   Contoh: Hanya lihat pengeluaran > Rp 500.000
│   └── Max Amount: Filter pengeluaran maksimal
│       Contoh: Hanya lihat pengeluaran < Rp 1.000.000
│
└── 📅 PRESET TANGGAL (Quick Date Filters)
    ├── Today
    ├── Yesterday
    ├── Last 7 Days
    ├── Last 30 Days
    ├── This Month
    └── Custom Date Range
```

**Fitur Badge**: Menampilkan jumlah filter aktif (misal: "Filter 2" jika 2 filter diaktifkan)

**Reset Option**: Button "Reset" untuk clear semua filter

---

## 📈 4. SUMMARY CARDS (KPI Ringkasan)

Empat kartu utama di bagian atas menampilkan metrik kunci:

### 4.1 Card 1: Total Pengeluaran
```
Menampilkan:
┌─────────────────────────────────────┐
│ TOTAL PENGELUARAN                   │
│ Rp 15.250.000                       │ ← Total amount
│ 45 transaksi                        │ ← Jumlah transaksi
└─────────────────────────────────────┘

Konteks:
- Berubah sesuai periode yang dipilih
- Berubah sesuai filter yang diaplikasikan
- Menunjukkan total spending dalam periode
```

### 4.2 Card 2: Rata-rata Per Transaksi
```
Menampilkan:
┌──────────────────────────────────┐
│ RATA-RATA PER TRANSAKSI          │
│ Rp 338.889                        │ ← Total ÷ Jumlah
└──────────────────────────────────┘

Insight:
- Berapa rata-rata pengeluaran per transaksi?
- Jika naik, ada pengeluaran besar yang unexpected
```

### 4.3 Card 3: Kategori Terbesar
```
Menampilkan:
┌────────────────────────────────┐
│ KATEGORI TERBESAR              │
│ Rp 6.500.000                   │ ← Jumlah kategori top
│ Bahan Baku (42%)               │ ← Nama & persentase
└────────────────────────────────┘

Insight:
- Kategori pengeluaran paling besar
- Persentasenya dari total
- Fokus area pengeluaran
```

### 4.4 Card 4: Pengeluaran Terbesar (Single Transaction)
```
Menampilkan:
┌────────────────────────────────────┐
│ PENGELUARAN TERBESAR               │
│ Rp 2.500.000                       │ ← Amount transaksi terbesar
│ Transaksi individual               │
└────────────────────────────────────┘

Insight:
- Transaksi single terbesar dalam periode
- Identifikasi outlier/pengeluaran unusual
```

---

## 📊 5. BREAKDOWN KATEGORI (Detailed View)

Setelah summary cards, ada section "Breakdown Kategori":

### 5.1 Visual Breakdown
```
Untuk setiap kategori ditampilkan:

⚙️ Operasional
[████████░░░░░░░░░░░░] 25%          Rp 3.812.500
                      Progress Bar   Persentase & Amount

🧂 Bahan Baku
[██████████████░░░░░░] 42%          Rp 6.405.000

👤 Gaji
[███████░░░░░░░░░░░░░] 18%          Rp 2.745.000

... (kategori lainnya)
```

### 5.2 Informasi Per Kategori
```
Untuk tiap kategori ditampilkan:
- Emoji kategori (visual indicator)
- Nama kategori
- Progress bar proporsional
- Persentase dari total
- Nominal amount
- Urutan dari terbesar ke terkecil
```

---

## 📋 6. DAFTAR PENGELUARAN (Detailed Transaction List)

Tabel lengkap semua pengeluaran dengan informasi detail:

### 6.1 Kolom Tabel
```
┌─────────┬────────────┬──────────────────┬─────────────┬─────────┐
│ Tanggal │ Kategori   │ Keterangan       │ Jumlah      │ Kasir   │
├─────────┼────────────┼──────────────────┼─────────────┼─────────┤
│ 3 Jun   │ 🧂 Bahan   │ Beli tepung terigu│ Rp 500.000 │ Budi    │
│ 2026    │ Baku       │                  │             │         │
├─────────┼────────────┼──────────────────┼─────────────┼─────────┤
│ 3 Jun   │ 👤 Gaji    │ Gaji Bulan Juni  │ Rp 2.000.000│ Admin   │
│ 2026    │            │                  │             │         │
├─────────┼────────────┼──────────────────┼─────────────┼─────────┤
│ 2 Jun   │ 🚗 Transp. │ Bensin delivery  │ Rp 250.000  │ Eko     │
│ 2026    │            │                  │             │         │
└─────────┴────────────┴──────────────────┴─────────────┴─────────┘
```

### 6.2 Features Tabel
```
✓ Sorting: Urut otomatis dari tanggal terbaru
✓ Kategori badge: Warna-warni per kategori
✓ Pagination: 50 transaksi per halaman (bisa scroll)
✓ Hover effect: Row highlight saat mouse over
✓ Responsive: Scrollable di mobile
```

---

## 💾 7. FITUR EXPORT

### 7.1 Export Button
```
Tombol "Export" di header dengan fitur:

📥 Tipe Export:
├── 📊 Excel (.xlsx)
│   └── Daftar pengeluaran + summary stats
│
└── 📄 PDF
    └── Report yang cantik dengan charts & summary

Nama file otomatis:
└── analisis-pengeluaran-[tanggal-sekarang].xlsx
```

### 7.2 Apa yang di-export
```
✓ Semua transaksi dalam periode yang dipilih
✓ Summary statistics (total, rata-rata, dll)
✓ Breakdown per kategori
✓ Timestamp export
✓ Header dengan info periode & filter
```

---

## 🎨 8. UI/UX FITUR TAMBAHAN

### 8.1 Loading States
```
- Skeleton loading saat fetch data
- Spinner animation pada summary cards
- "Memuat..." text di transaction list
```

### 8.2 Error Handling
```
- Error message jelas dan informatif
- "Retry" button untuk reload data
- "Coba Lagi" link untuk re-fetch
```

### 8.3 Empty States
```
- Icon & message jelas saat tidak ada data
- "Belum ada pengeluaran untuk periode ini"
- Helpful hints untuk action selanjutnya
```

### 8.4 Responsive Design
```
✓ Desktop: Full layout dengan semua fitur
✓ Tablet: Adjusted grid untuk summary cards
✓ Mobile: Single column, toggleable sections
```

---

## 🔑 9. KEY BENEFITS UNTUK OWNER

| Fitur | Manfaat | Use Case |
|-------|---------|----------|
| **Multiple Periods** | Fleksibel analisis | Bandingkan pengeluaran Jan vs Feb |
| **Category Charts** | Visual breakdown | Lihat kategori mana yang paling boros |
| **Trend Analysis** | Pattern recognition | Identifikasi pengeluaran meningkat/menurun |
| **Advanced Filters** | Detailed exploration | Cari pengeluaran > Rp 1jt kategori Gaji |
| **KPI Cards** | Quick insights | Snapshot pengeluaran dalam 10 detik |
| **Category Breakdown** | Proportional view | Lihat kontribusi % setiap kategori |
| **Transaction List** | Full audit trail | Lihat siapa input apa kapan berapa |
| **Export** | External analysis | Download untuk laporan ke akuntan |

---

## 🚀 10. FITUR LANJUTAN (Dalam Roadmap)

Fitur-fitur yang bisa ditambahkan di masa depan:

```
[ ] Multi-outlet comparison (bandingkan pengeluaran per outlet)
[ ] Budget vs Actual tracking (bandingkan dengan budget)
[ ] Recurring expense detection (otomatis identifikasi pengeluaran berkala)
[ ] Anomaly detection (alert jika ada pengeluaran unusual)
[ ] Scheduled reports (kirim report ke email otomatis)
[ ] Approval workflow (approve/reject pengeluaran besar)
[ ] Receipt upload & OCR (attach bukti pengeluaran)
[ ] Cost control recommendations (AI suggestion untuk hemat)
[ ] Comparative analysis (year-over-year atau month-over-month)
[ ] Custom dashboard widget (owner bisa custom layout)
```

---

## 📍 LOKASI MENU

```
DONATTOUR MANAGEMENT
├── 🏠 Dashboard Owner
├── 📊 Laporan Periode
├── 💰 Analisis Pengeluaran  ← FITUR INI
├── 🏪 Kelola Outlet
├── 🍪 Kelola Produk
├── 👥 Kelola Karyawan
├── 🚚 Kelola OTR
├── ✏️ Transaksi (Editor)
└── ⚙️ Pengaturan
```

URL: `/dashboard/expense-analytics`

---

## 🎯 KESIMPULAN

**Analisis Pengeluaran** adalah dashboard komprehensif yang memberikan owner/pengelola kemampuan untuk:

1. ✅ **Monitor** pengeluaran secara real-time
2. ✅ **Analyze** dengan chart & visualization
3. ✅ **Filter** dengan berbagai criteria
4. ✅ **Compare** antar periode
5. ✅ **Identify** kategori terbesar & unusual expenses
6. ✅ **Export** untuk analisis lebih lanjut
7. ✅ **Track** siapa menginput apa kapan

Semua ini membuat owner bisa membuat keputusan bisnis yang lebih informed dan profit control yang lebih baik! 💰📈
