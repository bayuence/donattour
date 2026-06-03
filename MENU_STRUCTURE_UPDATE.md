# Menu Structure Update - Expense Management Separation

## Overview
Memisahkan UI expense management menjadi 2 bagian: 
- **Kasir**: Simple & Professional (Input + History)
- **Owner/Manager**: Comprehensive Analytics & Reporting

---

## Changes Made

### 1. **Menu Rename & Reorganization**

#### Kasir Menu (DONATTOUR STORE)
```
❌ "Pengeluaran Outlet" → ✅ "Input Pengeluaran"
```
- **New Route**: `/dashboard/input-pengeluaran`
- **Purpose**: Simplified input form + history untuk kasir
- **Features**: 
  - Quick expense entry form
  - Daily history view
  - Delete capability
  - Total & count summary

#### Owner Menu (DONATTOUR MANAGEMENT)
```
✅ NEW: "Analisis Pengeluaran"
```
- **Route**: `/dashboard/expense-analytics`
- **Purpose**: Comprehensive analytics untuk owner/pengelola
- **Features**:
  - Advanced filtering & date ranges
  - Charts & visualizations (category & trend)
  - Multi-outlet support
  - Category breakdown with percentages
  - Export capabilities
  - Complete transaction history

---

## File Structure

### New Components
```
components/expenses/
├── ExpenseInputSimple.tsx          # NEW: Simplified component for cashiers
└── ExpenseOwnerDashboard.tsx       # NEW: Advanced analytics for owners
```

### New Pages
```
app/(dashboard)/dashboard/
├── input-pengeluaran/              # NEW: Cashier expense input page
│   └── page.tsx
└── expense-analytics/              # NEW: Owner analytics page
    └── page.tsx
```

### Updated Files
```
app/(dashboard)/dashboard/layout.tsx
├── Menu label updated: "Pengeluaran Outlet" → "Input Pengeluaran"
├── Added "Analisis Pengeluaran" to management group
└── Routing updated accordingly
```

---

## UI/UX Differences

### ExpenseInputSimple (Kasir)
- **Fokus**: Simpel, cepat, profesional
- **Main Actions**: Input form + history
- **Tidak Ada**: Charts, advanced filters, analytics
- **Tampilan**: Clean, minimalist
- **Data**: Hanya hari ini atau pilihan sederhana

### ExpenseOwnerDashboard (Owner)
- **Fokus**: Lengkap, analytics-driven
- **Main Features**: Analytics, filtering, charting, reporting
- **Tampilan**: Komprehensif dashboard
- **Data**: Multi-period, multi-outlet, detailed analysis
- **Summary Cards**: 4 KPI cards (total, avg, top category, largest transaction)
- **Charts**: Category breakdown + trend analysis
- **Export**: Built-in export functionality

---

## Menu Structure

### Kasir Section
```
📱 Kasir
💳 Input Pengeluaran      ← Baru (was: Pengeluaran Outlet)
📋 Transaksi
➕ Input Produksi
📄 Laporan Harian Outlet
```

### Management Section
```
🏠 Dashboard Owner
📊 Laporan Periode
💰 Analisis Pengeluaran    ← Baru
🏪 Kelola Outlet
🍪 Kelola Produk
👥 Kelola Karyawan
🚚 Kelola OTR
✏️ Transaksi (Editor)
⚙️ Pengaturan
```

---

## Migration Notes

- **Old route** `/dashboard/pengeluaran-outlet` still works tapi akan lama-lama dihapus
- **New route** `/dashboard/input-pengeluaran` untuk kasir
- **New route** `/dashboard/expense-analytics` untuk owner/management
- Local storage key updated: `expense_selected_outlet` → `input_pengeluaran_selected_outlet`

---

## Testing Checklist

- [ ] Kasir dapat membuka `/dashboard/input-pengeluaran`
- [ ] Simple form bekerja: input, simpan, delete
- [ ] Owner dapat membuka `/dashboard/expense-analytics`
- [ ] Analytics charts render correctly
- [ ] Filters work properly
- [ ] Export functionality works
- [ ] Mobile responsive untuk kedua pages
- [ ] Menu navigation updated di sidebar

---

## Future Improvements

1. **Multi-outlet analytics** untuk owner
2. **Permission-based access** (role authorization)
3. **Real-time sync** untuk pengeluaran
4. **Advanced reporting** (PDF, scheduled exports)
5. **Approval workflow** untuk pengeluaran tertentu
