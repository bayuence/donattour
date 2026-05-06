# 🇮🇩 Indonesian Localization Guide

## 🎯 Overview

Sistem ini menggunakan format Indonesia untuk semua tampilan:
- ✅ Format tanggal: **DD/MM/YYYY** (06/05/2026)
- ✅ Format uang: **Rp 1.000.000** (titik sebagai pemisah ribuan)
- ✅ Format desimal: **1.500,50** (koma sebagai pemisah desimal)
- ✅ Format persentase: **25,5%** (koma untuk desimal)

---

## 📁 File Utility: `lib/utils/format.ts`

### Functions Available:

#### 1. `formatRupiah(value, showDecimals?)`
Format angka ke Rupiah Indonesia

```typescript
formatRupiah(1000000)        // "Rp 1.000.000"
formatRupiah(1500.50, true)  // "Rp 1.500,50"
formatRupiah(0)              // "Rp 0"
```

**Parameters:**
- `value: number` - Nilai yang akan diformat
- `showDecimals?: boolean` - Tampilkan desimal (default: false)

**Returns:** `string` - Format Rupiah Indonesia

---

#### 2. `formatNumber(value, decimals?)`
Format angka dengan pemisah ribuan Indonesia

```typescript
formatNumber(1000000)      // "1.000.000"
formatNumber(1500.50, 2)   // "1.500,50"
formatNumber(1234)         // "1.234"
```

**Parameters:**
- `value: number` - Nilai yang akan diformat
- `decimals?: number` - Jumlah desimal (default: 0)

**Returns:** `string` - Angka dengan format Indonesia

---

#### 3. `formatDate(date)`
Format tanggal ke DD/MM/YYYY

```typescript
formatDate('2026-05-06')           // "06/05/2026"
formatDate(new Date())             // "06/05/2026"
formatDate('2026-12-31')           // "31/12/2026"
```

**Parameters:**
- `date: string | Date` - Tanggal ISO atau Date object

**Returns:** `string` - Format DD/MM/YYYY

---

#### 4. `formatDateLong(date)`
Format tanggal lengkap dengan nama bulan

```typescript
formatDateLong('2026-05-06')      // "6 Mei 2026"
formatDateLong('2026-12-25')      // "25 Desember 2026"
```

**Parameters:**
- `date: string | Date` - Tanggal ISO atau Date object

**Returns:** `string` - Format lengkap Indonesia

---

#### 5. `formatDateTime(date)`
Format tanggal dan waktu

```typescript
formatDateTime('2026-05-06T14:30:00')  // "06/05/2026 14:30"
formatDateTime(new Date())             // "06/05/2026 15:45"
```

**Parameters:**
- `date: string | Date` - Timestamp ISO atau Date object

**Returns:** `string` - Format DD/MM/YYYY HH:MM

---

#### 6. `formatPercent(value, decimals?)`
Format persentase

```typescript
formatPercent(25.5)       // "25,5%"
formatPercent(100)        // "100%"
formatPercent(33.333, 2)  // "33,33%"
```

**Parameters:**
- `value: number` - Nilai persentase (tanpa %)
- `decimals?: number` - Jumlah desimal (default: 1)

**Returns:** `string` - Format persentase Indonesia

---

#### 7. `formatCompact(value)`
Format compact untuk angka besar

```typescript
formatCompact(1500000)      // "1,5 Jt"
formatCompact(2500000000)   // "2,5 M"
formatCompact(5000)         // "5 Rb"
formatCompact(500)          // "500"
```

**Parameters:**
- `value: number` - Nilai yang akan diformat

**Returns:** `string` - Format compact Indonesia

---

#### 8. `parseIndonesianDate(dateStr)`
Parse tanggal Indonesia ke ISO

```typescript
parseIndonesianDate('06/05/2026')  // "2026-05-06"
parseIndonesianDate('31/12/2026')  // "2026-12-31"
```

**Parameters:**
- `dateStr: string` - Tanggal format DD/MM/YYYY

**Returns:** `string` - Format ISO YYYY-MM-DD

---

#### 9. `toInputDate(date)`
Convert ke format input date HTML5

```typescript
toInputDate('2026-05-06')   // "2026-05-06"
toInputDate(new Date())     // "2026-05-06"
```

**Parameters:**
- `date: string | Date` - Tanggal

**Returns:** `string` - Format YYYY-MM-DD untuk input[type="date"]

---

#### 10. `getTodayISO()`
Get hari ini dalam format ISO

```typescript
getTodayISO()  // "2026-05-06"
```

**Returns:** `string` - Tanggal hari ini format YYYY-MM-DD

---

## 📝 Usage Examples

### Dashboard Page

```typescript
import { formatDate, formatRupiah, formatPercent } from '@/lib/utils/format';

// Display tanggal
<p>Laporan untuk tanggal {formatDate(selectedDate)}</p>
// Output: "Laporan untuk tanggal 06/05/2026"

// Display uang
<p>Omzet: {formatRupiah(1500000)}</p>
// Output: "Omzet: Rp 1.500.000"

// Display persentase
<p>Margin: {formatPercent(35.5)}</p>
// Output: "Margin: 35,5%"
```

### Financial Cards

```typescript
import { formatRupiah, formatPercent } from '@/lib/utils/format';

<Card>
  <CardTitle>Omzet</CardTitle>
  <CardContent>
    <p className="text-2xl">{formatRupiah(data.omzet)}</p>
    <p className="text-sm">Margin: {formatPercent(data.margin)}</p>
  </CardContent>
</Card>
```

### Reports & Tables

```typescript
import { formatDate, formatRupiah, formatNumber } from '@/lib/utils/format';

<Table>
  <TableRow>
    <TableCell>{formatDate(row.tanggal)}</TableCell>
    <TableCell>{formatNumber(row.qty)}</TableCell>
    <TableCell>{formatRupiah(row.total)}</TableCell>
  </TableRow>
</Table>
```

---

## 🎨 Format Comparison

### ❌ BEFORE (Format Amerika/Internasional)

```
Tanggal: 2026-05-06          (YYYY-MM-DD)
Uang: $1,000,000             (Dollar sign, comma separator)
Desimal: 1,500.50            (Dot as decimal)
Persentase: 25.5%            (Dot as decimal)
```

### ✅ AFTER (Format Indonesia)

```
Tanggal: 06/05/2026          (DD/MM/YYYY)
Uang: Rp 1.000.000           (Rupiah, dot separator)
Desimal: 1.500,50            (Comma as decimal)
Persentase: 25,5%            (Comma as decimal)
```

---

## 🔧 Implementation Checklist

### ✅ Completed:
- [x] Created `lib/utils/format.ts` utility file
- [x] Updated `app/dashboard/page.tsx` with Indonesian formats
- [x] Updated `app/dashboard/components/FinancialSummaryCards.tsx`
- [x] All numbers use `formatNumber()` or `formatRupiah()`
- [x] All dates use `formatDate()` or `formatDateLong()`
- [x] All percentages use `formatPercent()`

### 🔄 To Do (Next Components):
- [ ] Update `LossBreakdownChart.tsx` component
- [ ] Update `SalesByFlavorChart.tsx` component
- [ ] Update `RecommendationsPanel.tsx` component
- [ ] Update all report pages
- [ ] Update all table components
- [ ] Update all form inputs (date pickers)

---

## 📌 Important Notes

### 1. **Input Date HTML5**
Input `type="date"` di HTML5 **HARUS** menggunakan format `YYYY-MM-DD`:

```typescript
// ✅ BENAR - Internal value tetap ISO
<input 
  type="date" 
  value={selectedDate}  // "2026-05-06"
  onChange={(e) => setSelectedDate(e.target.value)}
/>

// ✅ BENAR - Display pakai format Indonesia
<p>Tanggal dipilih: {formatDate(selectedDate)}</p>
// Output: "Tanggal dipilih: 06/05/2026"
```

### 2. **Database Storage**
Database tetap pakai format ISO:
- `DATE` column: `2026-05-06`
- `TIMESTAMPTZ` column: `2026-05-06T14:30:00+07:00`

**Hanya tampilan UI yang pakai format Indonesia!**

### 3. **API Response**
API response tetap pakai format internasional (JSON standard):

```json
{
  "date": "2026-05-06",
  "omzet": 1500000,
  "margin": 35.5
}
```

**Format Indonesia hanya di frontend (React components)!**

### 4. **SQL `$` Symbol**
Simbol `$$` di SQL adalah **delimiter** PostgreSQL, bukan dollar:

```sql
-- ✅ BENAR - $$ adalah syntax PostgreSQL
DO $$
BEGIN
  RAISE NOTICE 'Hello';
END $$;

-- ❌ SALAH - Ini bukan tentang mata uang
-- Ini syntax untuk anonymous code block
```

---

## 🚀 Next Steps

1. **Test Dashboard** - Pastikan semua format sudah Indonesia
2. **Update Components** - Apply format ke semua komponen lain
3. **Update Reports** - Format laporan Excel/PDF juga pakai Indonesia
4. **User Testing** - Minta feedback dari user Indonesia

---

## 📚 References

- [Intl.NumberFormat - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Intl.DateTimeFormat - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [PostgreSQL Dollar Quoting](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-DOLLAR-QUOTING)

---

**Last Updated**: 2026-05-06  
**Status**: ✅ Implemented - Ready for Testing
