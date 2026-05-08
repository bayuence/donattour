# Timezone Configuration - Donattour System

## Overview

Sistem Donattour menggunakan **timezone Indonesia (WIB/UTC+7)** untuk semua operasi tanggal dan waktu.

## Timezone Details

- **Timezone**: Asia/Jakarta
- **Offset**: UTC+7
- **Name**: WIB (Waktu Indonesia Barat)

## Implementation

### 1. Database Level

Database PostgreSQL dikonfigurasi untuk menggunakan timezone WIB:

```sql
ALTER DATABASE postgres SET timezone TO 'Asia/Jakarta';
SET timezone TO 'Asia/Jakarta';
```

### 2. Application Level

Semua fungsi tanggal menggunakan helper dari `lib/utils/timezone.ts`:

```typescript
import { getTodayWIB, getNowWIB } from '@/lib/utils/timezone';

// Get today's date in WIB
const today = getTodayWIB(); // "2026-05-07"

// Get current datetime in WIB
const now = getNowWIB(); // "2026-05-07T20:30:00+07:00"
```

### 3. Available Helper Functions

| Function | Description | Example Output |
|----------|-------------|----------------|
| `getTodayWIB()` | Get today's date | `"2026-05-07"` |
| `getNowWIB()` | Get current datetime | `"2026-05-07T20:30:00+07:00"` |
| `getYesterdayWIB()` | Get yesterday's date | `"2026-05-06"` |
| `toWIBDate(date)` | Convert any date to WIB | `"2026-05-07"` |
| `isTodayWIB(date)` | Check if date is today | `true/false` |
| `formatDateWIB(date)` | Format for display | `"7 Mei 2026"` |
| `formatDateTimeWIB(date)` | Format datetime | `"7 Mei 2026, 20:30 WIB"` |

## Why WIB Timezone?

### Problem with UTC

Sebelumnya sistem menggunakan UTC (timezone +00:00), yang menyebabkan:

1. **Date Mismatch**: Jam 8 malam di Indonesia (07 Mei) tersimpan sebagai 06 Mei di UTC
2. **Validation Errors**: Kasir tidak bisa buka karena mencari produksi hari ini (07 Mei) tapi data tersimpan sebagai kemarin (06 Mei)
3. **Confusing Reports**: Laporan menunjukkan tanggal yang berbeda dari yang user lihat

### Solution with WIB

Dengan menggunakan WIB:

1. ✅ **Consistent Dates**: Tanggal yang disimpan sama dengan yang user lihat
2. ✅ **Accurate Validation**: Validasi stok menggunakan tanggal yang benar
3. ✅ **Clear Reports**: Laporan menunjukkan tanggal sesuai waktu Indonesia
4. ✅ **Better UX**: User tidak bingung dengan perbedaan tanggal

## Migration Guide

### For Existing Code

**BEFORE (Wrong - using UTC):**
```typescript
const today = new Date().toISOString().split('T')[0]; // UTC date
```

**AFTER (Correct - using WIB):**
```typescript
import { getTodayWIB } from '@/lib/utils/timezone';
const today = getTodayWIB(); // WIB date
```

### For Database Queries

**BEFORE:**
```sql
WHERE tanggal = CURRENT_DATE -- Uses database timezone (might be UTC)
```

**AFTER:**
```sql
-- Database timezone already set to WIB, so CURRENT_DATE is correct
WHERE tanggal = CURRENT_DATE -- Uses WIB timezone
```

## Testing

### Verify Timezone Setting

```sql
-- Check database timezone
SHOW timezone;
-- Expected: Asia/Jakarta

-- Check current date
SELECT CURRENT_DATE;
-- Expected: 2026-05-07 (if today is May 7 in Indonesia)

-- Check current timestamp
SELECT NOW();
-- Expected: 2026-05-07 20:30:00+07 (with +07 offset)
```

### Verify Application

```typescript
import { getTodayWIB } from '@/lib/utils/timezone';

console.log('Today (WIB):', getTodayWIB());
// Expected: 2026-05-07 (if today is May 7 in Indonesia)
```

## Troubleshooting

### Issue: Dates still showing wrong

**Solution:**
1. Run `QueryDATABASE/FIX-TIMEZONE-WIB.sql` to set database timezone
2. Restart Next.js development server
3. Clear browser cache and refresh

### Issue: Old data has wrong dates

**Solution:**
Run the UPDATE queries in `FIX-TIMEZONE-WIB.sql` to correct existing data.

### Issue: Supabase dashboard shows different dates

**Note:** Supabase dashboard might show dates in UTC. This is normal. The application will convert them to WIB automatically.

## Best Practices

1. **Always use helper functions** from `lib/utils/timezone.ts`
2. **Never use** `new Date().toISOString().split('T')[0]` directly
3. **Store dates as DATE type** in database (not TIMESTAMP)
4. **Use CURRENT_DATE** in SQL queries (database timezone is WIB)
5. **Display dates** using `formatDateWIB()` or `formatDateTimeWIB()`

## References

- PostgreSQL Timezone Documentation: https://www.postgresql.org/docs/current/datatype-datetime.html
- JavaScript Intl API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
- Indonesia Timezones: https://en.wikipedia.org/wiki/Time_in_Indonesia

---

**Last Updated:** May 7, 2026  
**Status:** ✅ Implemented and Tested
