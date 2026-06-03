# 💰 Analisis Pengeluaran - Quick Reference

## Akses Menu
**Path**: `/dashboard/expense-analytics`  
**Menu**: DONATTOUR MANAGEMENT → 💰 Analisis Pengeluaran

---

## 📊 Fitur Utama (9 Kategori)

### 1️⃣ PERIODE SELECTION
- 📅 Harian (Daily) - Pilih tanggal spesifik
- 📊 Bulanan (Monthly) - Pilih bulan
- 📈 Custom Range - From & To date
- 📚 All History - Semua data dengan pagination

### 2️⃣ ANALYTICS & CHARTS
- **Per Kategori** - Pie/Bar chart breakdown by category
- **Trend Waktu** - Line chart trend over time
- 🔄 Toggle antar 2 jenis chart

### 3️⃣ ADVANCED FILTERS
- 🔎 Search by keterangan (deskripsi pengeluaran)
- 🏷️ Multi-select kategori
- 💰 Min-Max amount range
- 📅 Quick date presets
- 📌 Live filter count badge

### 4️⃣ KPI SUMMARY CARDS (4 cards)
```
Card 1: Total Pengeluaran
        Rp 15.250.000 | 45 transaksi

Card 2: Rata-rata Per Transaksi
        Rp 338.889

Card 3: Kategori Terbesar
        Rp 6.500.000 | Bahan Baku (42%)

Card 4: Pengeluaran Terbesar (Single)
        Rp 2.500.000
```

### 5️⃣ BREAKDOWN KATEGORI
- Visual progress bar untuk setiap kategori
- Persentase dari total
- Nominal amount
- Sorted: Terbesar ke terkecil

**Kategori**:
- ⚙️ Operasional
- 🧂 Bahan Baku
- 👤 Gaji
- 🚗 Transportasi
- 🔧 Perawatan
- 📢 Marketing
- 📌 Lainnya

### 6️⃣ DETAILED TRANSACTION LIST
Tabel dengan kolom:
- Tanggal
- Kategori (dengan badge warna)
- Keterangan
- Jumlah
- Kasir (siapa input)

**Features**:
- ✓ Auto-sorted by date (newest first)
- ✓ Pagination (50 per page)
- ✓ Hover highlight
- ✓ Responsive table

### 7️⃣ EXPORT FUNCTIONALITY
- 📥 Export to Excel (.xlsx)
- 📄 Export to PDF
- Auto filename: `analisis-pengeluaran-[date].xlsx`
- Includes: Transactions + Summary stats

### 8️⃣ STATE MANAGEMENT
- ⏳ Loading states dengan spinner
- ⚠️ Error messages dengan retry button
- 📭 Empty states dengan helpful hints
- 📱 Responsive untuk desktop/tablet/mobile

### 9️⃣ UX FEATURES
- Header dengan title & description
- Toggle buttons: Analytics & Filter
- Filter count badge
- Professional color scheme
- Smooth animations

---

## 🎯 USE CASES & INSIGHTS

### Use Case 1: Monitor Total Spending
```
Owner buka Analisis Pengeluaran
→ Lihat Summary Card "Total Pengeluaran"
→ Instant: Total spending bulan ini
→ Action: Bandingkan dengan bulan lalu via Custom Range
```

### Use Case 2: Identify Budget Leak
```
Chart "Per Kategori" menunjuk:
"Bahan Baku 42%" → Too high!
→ Filter kategori "Bahan Baku"
→ Cek transaction list detail
→ Identifikasi supplier mana yang mahal
```

### Use Case 3: Trend Analysis
```
Switch chart ke "Trend Waktu"
→ Lihat pengeluaran harian trend
→ Spike terlihat pada hari tertentu
→ Investigate: Apa event/reason spike?
```

### Use Case 4: Large Expenses Investigation
```
Card "Pengeluaran Terbesar" show Rp 5jt
→ Filter Min: 2juta
→ Check transaction list
→ Approve/question why that expense
```

### Use Case 5: Search Specific Expense
```
CEO ask: "Berapa bensin minggu ini?"
→ Filter Search: "bensin"
→ Lihat semua transaksi bensin
→ Instant answer dengan total
```

### Use Case 6: Export untuk Akuntan
```
Month-end closing:
→ Select: Monthly view, Juni
→ Click Export → Excel
→ Send file ke akuntan
→ Akuntan bisa analyze di spreadsheet
```

---

## 💡 KEY INSIGHTS OWNER BISA DAPET

| Insight | Source | Benefit |
|---------|--------|---------|
| Total spending trend | Chart + Cards | Control cost growth |
| Biggest cost category | Breakdown % | Focus optimization |
| Average transaction size | Card 2 | Detect unusual spending |
| Single largest expense | Card 4 | Spot outliers |
| Search capability | Filter | Quick answers |
| Kasir accountability | Transaction list | Audit trail |
| Period comparison | Custom Range | YoY or MoM analysis |
| Category granularity | 7 categories | Detailed cost tracking |

---

## ⚡ QUICK ACTIONS WORKFLOW

```
START
  ↓
[Open Analisis Pengeluaran]
  ↓
[Select Period]
  ├─ Harian? → Pick date
  ├─ Bulanan? → Pick month
  ├─ Custom? → Pick from-to date
  └─ History? → See all with pagination
  ↓
[View Summary Cards] ← Quick overview 10 detik
  ├─ Total spending OK?
  ├─ Avg transaction reasonable?
  ├─ Top category expected?
  └─ Largest expense justified?
  ↓
[OPTIONAL: Deep Dive Analysis]
  ├─ View Charts
  │   ├─ Per Kategori → see composition
  │   └─ Trend → see pattern
  ├─ Apply Filters
  │   ├─ Search specific
  │   ├─ Category filter
  │   └─ Amount range
  └─ Check Transaction List
      ├─ Audit who did what
      ├─ Question unusual items
      └─ Track individual kasir
  ↓
[OPTIONAL: Export]
  └─ For external analysis / audit
  ↓
END
```

---

## 📱 DEVICE SUPPORT

| Device | Layout | Notes |
|--------|--------|-------|
| Desktop | Full layout | All features visible |
| Tablet | Responsive grid | Summary cards stack |
| Mobile | Single column | Charts responsive |

---

## 🔐 PERMISSION & ACCESS

- **Who can access**: Owner/Manager role
- **View**: All outlets data
- **Filter**: By date range, category, amount
- **Cannot**: Edit/delete from here (must go Input Pengeluaran page)

---

## 🆚 PERBEDAAN DENGAN KASIR PAGE

| Aspek | Kasir (Input Pengeluaran) | Owner (Analisis) |
|-------|--------------------------|-----------------|
| URL | `/dashboard/input-pengeluaran` | `/dashboard/expense-analytics` |
| Role | Kasir | Owner/Manager |
| Function | Input + Delete + History | Analytics + Reports |
| Period | Today or simple range | Flexible (daily/monthly/custom/all) |
| Charts | None | Yes (2 types) |
| Filters | None | Advanced (search, category, amount) |
| Export | No | Yes (Excel, PDF) |
| UI | Simple & minimal | Comprehensive dashboard |
| Focus | Quick input | Deep analysis |

---

## 🚀 FUTURE ENHANCEMENTS

Coming soon:
- [ ] Multi-outlet comparison
- [ ] Budget vs Actual tracking
- [ ] Recurring expense detection
- [ ] Anomaly alerts
- [ ] AI recommendations
- [ ] Approval workflow
- [ ] Receipt attachment
- [ ] Custom reports builder

---

## 🎓 TUTORIAL TIPS

### Tip 1: Quick Daily Check
```
Every morning (5 min):
1. Open Analisis Pengeluaran
2. Select: Harian (hari ini)
3. Glance Summary Cards
4. Done! Know spending status
```

### Tip 2: Weekly Review
```
Every Monday (15 min):
1. Custom Range: Last 7 days
2. View Charts → see breakdown
3. Check highest category
4. Filter if need investigation
```

### Tip 3: Monthly Close
```
End of month (30 min):
1. Monthly view: Pilih bulan
2. Check all 4 KPI cards
3. Review Breakdown kategori
4. Export to Excel
5. Send ke akuntan/finance
```

---

## 📞 SUPPORT & TROUBLESHOOTING

**Q: Chart tidak load?**
A: Toggle Analytics off-on, atau refresh page

**Q: Filter tidak bekerja?**
A: Click "Reset Filters" → reapply filters

**Q: Data tidak ada?**
A: Check period selection, atau cek apakah ada pengeluaran di period itu

**Q: Export tidak work?**
A: Check popup blocker, atau try different browser

---

## 🎉 KESIMPULAN

**Analisis Pengeluaran** = Complete expense monitoring dashboard untuk owner yang ingin:
- 👁️ Visibility: Lihat semua pengeluaran
- 📊 Analysis: Chart & breakdown
- 🔍 Investigation: Filter & search
- 📋 Audit: Transaction list detail
- 📥 Export: Data untuk analisis lanjutan

**Semua ini dalam 1 halaman yang user-friendly!** ✨
