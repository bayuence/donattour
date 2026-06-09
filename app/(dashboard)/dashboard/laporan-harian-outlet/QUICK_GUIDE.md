# 🚀 Quick Guide - Laporan Harian Outlet

## 📝 Panduan Cepat untuk Developer

### 🎯 Ingin Ubah Tampilan Card Keuangan?
```
1. Buka: components/FinancialSummaryCards.tsx
2. Edit sesuai kebutuhan
3. Save → Done! ✅
```

### 🎯 Ingin Tambah Metrik Baru di Production?
```
1. Buka: components/ProductionMetrics.tsx
2. Tambah item di array metrics
3. Save → Langsung muncul! ✅
```

### 🎯 Ingin Ubah Format Rupiah?
```
1. Buka: utils/helpers.ts
2. Edit function rp()
3. Save → Semua angka terupdate! ✅
```

### 🎯 Ingin Tambah Field di Dashboard Data?
```
1. Buka: types/index.ts
2. Tambah field di interface DashboardData
3. Update komponen yang menggunakan data tersebut
```

### 🎯 Ingin Ubah Logic Fetch Data?
```
1. Buka: utils/hooks.ts
2. Edit useLaporanData hook
3. Save → Logic terupdate di semua komponen! ✅
```

### 🎯 Ingin Ubah Realtime Subscription?
```
1. Buka: utils/hooks.ts
2. Edit useRealtime hook
3. Tambah/kurangi table yang di-subscribe
```

## 🔍 Cari Komponen Berdasarkan Fungsi

| Fungsi | File |
|--------|------|
| Header & Status | `components/StickyHeader.tsx` |
| Pilih Outlet | `components/OutletSelectionModal.tsx` |
| Ringkasan Keuangan | `components/FinancialSummaryCards.tsx` |
| Metrik Produksi | `components/ProductionMetrics.tsx` |
| Metode Pembayaran | `components/PaymentMethodsCard.tsx` |
| Performa Produk | `components/SalesByProductTable.tsx` |
| Kategori Pengeluaran | `components/ExpenseBreakdown.tsx` |
| Detail Pengeluaran | `components/ExpenseList.tsx` |
| Tutup Kasir | `components/ClosingConfirmModal.tsx` |
| Operasional Closing | `components/ClosingOperationalSection.tsx` |

## 🐛 Troubleshooting Cepat

### Error: Module not found
```bash
✅ Cek path import
✅ Pastikan file ada di folder yang benar
✅ Restart dev server (npm run dev)
```

### Komponen tidak muncul
```bash
✅ Cek console browser untuk error
✅ Cek props yang dikirim ke komponen
✅ Cek conditional rendering (if/else)
```

### Data tidak update realtime
```bash
✅ Cek Supabase connection
✅ Cek useRealtime hook di utils/hooks.ts
✅ Cek RLS (Row Level Security) di Supabase
```

### Formatting rupiah salah
```bash
✅ Cek function rp() di utils/helpers.ts
✅ Pastikan input berupa number, bukan string
```

## 💡 Tips

### Tambah Console Log untuk Debug
```typescript
// Di komponen:
console.log('DashboardData:', dashboardData);

// Di hook:
console.log('Fetching data for outlet:', outlet.id);
```

### React DevTools
```
1. Install React DevTools extension
2. Inspect komponen
3. Lihat props & state
```

### Format Code
```bash
# Gunakan Prettier
npm run format

# Atau manual format di VSCode
Shift + Alt + F (Windows)
```

## 📚 Import Cheat Sheet

```typescript
// Import komponen
import { 
  StickyHeader,
  FinancialSummaryCards 
} from './components';

// Import hooks
import { 
  useLaporanData, 
  useRealtime 
} from './utils/hooks';

// Import helpers
import { 
  rp, 
  formatTanggalHariIni 
} from './utils/helpers';

// Import types
import type { 
  DashboardData, 
  ExpenseItem 
} from './types';
```

## ⚡ Performance Tips

### Optimize Re-renders
```typescript
// Wrap dengan React.memo
export const MyComponent = React.memo(({ data }) => {
  // component code
});
```

### Optimize Calculations
```typescript
// Gunakan useMemo
const totalPengeluaran = useMemo(() => 
  expenses.reduce((s, e) => s + e.jumlah, 0),
  [expenses]
);
```

### Optimize Callbacks
```typescript
// Gunakan useCallback
const handleClick = useCallback(() => {
  // handler code
}, [dependencies]);
```

## 🎨 Styling Guidelines

```typescript
// Gunakan Tailwind classes yang konsisten
className="px-4 py-2 bg-blue-500 text-white rounded-lg"

// Responsive classes
className="text-sm sm:text-base md:text-lg"

// Dark mode ready (jika diperlukan)
className="bg-white dark:bg-gray-800"
```

## 📞 Need Help?

1. **Check README.md** - Dokumentasi lengkap
2. **Check REFACTORING_SUMMARY.md** - Detail perubahan
3. **Check STRUCTURE.txt** - Visual struktur
4. **Check code comments** - Inline documentation

---

**Last Updated:** 5 Juni 2026  
**Version:** 2.0 (Refactored)  
**Status:** ✅ Production Ready
