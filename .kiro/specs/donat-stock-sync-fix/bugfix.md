# Bugfix Requirements Document

## Introduction

Bug terjadi pada sinkronisasi real-time stok donat non-toping saat kondisi **ONLINE** yang melibatkan tiga menu utama: **Menu Input Produksi** (Inputan Prodak), **Menu Riwayat Produksi**, dan **Menu POS/Kasir**. Masalah utama adalah:
- Error `UNIQUE_CONSTRAINT_VIOLATION` saat input produksi berulang kali meskipun data berhasil masuk database
- Ketidaksinkronan data antara Menu Input Produksi dan Menu Riwayat Produksi
- Menu Riwayat Produksi tidak bisa mengedit/hapus stok yang salah input
- Stok tidak dikembalikan saat transaksi dihapus di Menu Transaksi
- Tidak ada notifikasi jelas tentang status berhasil/gagal saat input produksi

**Catatan**: Saat offline, semua aturan sudah berjalan dengan baik. Bug hanya terjadi saat sistem dalam kondisi online.

**Context Bisnis**:
- Aplikasi POS/Kasir dan manajemen toko yang menjual 2 jenis produk: Donat dan Non-Donat
- Focus pada Produk Donat saja (Non-Donat sudah berfungsi baik)
- HPP Donat = Harga Donat Polos (non-toping) + Harga/Biaya Toping
- Alur: Dapur produksi donat non-toping → Kasir input ke sistem → Pelanggan pesan → Donat di-toping sesuai varian → Transaksi selesai
- Donat "siap dijual" = sudah diinput tapi belum di-toping dan belum terjual

---

## Bug Analysis

### Current Behavior (Defect)

#### 1.1 Input Produksi - UNIQUE_CONSTRAINT_VIOLATION
**1.1** WHEN kasir menginput produksi donat non-toping di **Menu Input Produksi** (Inputan Prodak) THEN sistem menunjukkan loading yang lama DAN muncul error `UNIQUE_CONSTRAINT_VIOLATION` di console MESKIPUN data berhasil masuk ke **Menu Riwayat Produksi**

#### 1.2 Input Produksi - Tidak Ada Notifikasi Status
**1.2** WHEN kasir menginput produksi donat non-toping di **Menu Input Produksi** THEN sistem TIDAK memberikan notifikasi yang jelas apakah input berhasil atau gagal diterima database

#### 1.3 Input Produksi - Tidak Ada Lock Mekanisme
**1.3** WHEN kasir sedang menginput produksi di satu outlet DAN loading masih berproses THEN kasir lain di outlet yang sama masih bisa melakukan input bersamaan (tidak ada lock/block mechanism)

#### 1.4 Riwayat Produksi - Tidak Sinkron Real-time
**1.4** WHEN kasir menginput produksi di **Menu Input Produksi** THEN data TIDAK langsung muncul secara real-time di **Menu Riwayat Produksi** tanpa refresh manual

#### 1.5 Riwayat Produksi - Edit/Hapus Tidak Berfungsi
**1.5** WHEN kasir salah input stok donat non-toping DAN mencoba mengedit atau menghapus data di **Menu Riwayat Produksi** THEN sistem tidak berhasil melakukan edit/hapus (fitur tidak berfungsi)

#### 1.6 POS/Kasir - Pengurangan Stok Tidak Konsisten
**1.6** WHEN kasir menjual donat dengan toping di **Menu POS/Kasir** DAN struk belum dicetak THEN sistem sudah mengurangi stok donat non-toping di database (seharusnya menunggu struk tercetak)

#### 1.7 Menu Transaksi - Stok Tidak Dikembalikan Saat Hapus
**1.7** WHEN transaksi donat dihapus di **Menu Transaksi** (pembeli batal beli) THEN stok donat non-toping TIDAK dikembalikan ke inventory meskipun struk sudah dicetak dan stok sudah dikurangi sebelumnya

---

### Expected Behavior (Correct)

#### 2.1 Input Produksi - No Duplicate Entry Error
**2.1** WHEN kasir menginput produksi donat non-toping di **Menu Input Produksi** THEN sistem SHALL berhasil menyimpan data tanpa error `UNIQUE_CONSTRAINT_VIOLATION` DAN loading hanya terjadi sekali dengan waktu wajar (<3 detik)

#### 2.2 Input Produksi - Clear Success/Failure Notification
**2.2** WHEN kasir menginput produksi donat non-toping di **Menu Input Produksi** THEN sistem SHALL menampilkan notifikasi jelas: **"✓ Berhasil disimpan"** jika sukses ATAU **"✗ Gagal: [alasan error]"** jika gagal

#### 2.3 Input Produksi - Lock Mechanism During Processing
**2.3** WHEN kasir sedang menginput produksi di satu outlet DAN loading masih berproses THEN sistem SHALL memblokir input baru dari kasir lain di outlet yang sama hingga proses selesai (dengan notifikasi "Sedang memproses input...")

#### 2.4 Riwayat Produksi - Real-time Sync with Input Menu
**2.4** WHEN kasir menginput produksi di **Menu Input Produksi** THEN data SHALL langsung muncul secara real-time di **Menu Riwayat Produksi** tanpa perlu refresh manual (dalam waktu <2 detik)

#### 2.5 Riwayat Produksi - Edit/Delete Functionality Works
**2.5** WHEN kasir salah input stok donat non-toping DAN mencoba mengedit atau menghapus data di **Menu Riwayat Produksi** THEN sistem SHALL berhasil melakukan edit (update qty) ATAU hapus (remove record) DAN sinkronisasi ke inventory_non_topping

#### 2.6 POS/Kasir - Stock Deduction Only After Receipt Printed
**2.6** WHEN kasir menjual donat dengan toping di **Menu POS/Kasir** THEN sistem SHALL mengurangi stok donat non-toping HANYA SETELAH struk berhasil dicetak DAN transaksi selesai (status = 'completed')

#### 2.7 Menu Transaksi - Stock Restoration on Delete
**2.7** WHEN transaksi donat dihapus di **Menu Transaksi** (pembeli batal beli) THEN sistem SHALL mengembalikan stok donat non-toping ke inventory_non_topping sesuai dengan jumlah yang telah dikurangi sebelumnya

---

### Unchanged Behavior (Regression Prevention)

#### 3.1 Offline Mode Tetap Berfungsi
**3.1** WHEN sistem dalam kondisi offline THEN sistem SHALL CONTINUE TO berfungsi dengan baik tanpa error sinkronisasi (sesuai behavior saat ini yang sudah benar)

#### 3.2 Produk Non-Donat Tidak Terpengaruh
**3.2** WHEN kasir menjual produk Non-Donat THEN sistem SHALL CONTINUE TO memproses transaksi dan stok dengan benar tanpa terpengaruh perubahan pada sistem donat

#### 3.3 Stok Header Kasir Tetap Akurat
**3.3** WHEN stok donat non-toping berubah (input produksi, penjualan, atau penghapusan transaksi) THEN badge stok di header **Menu POS/Kasir** SHALL CONTINUE TO menampilkan jumlah yang akurat secara real-time

#### 3.4 HPP Calculation Tetap Benar
**3.4** WHEN sistem menghitung HPP donat (HPP = Harga Donat Polos + Harga Toping) THEN sistem SHALL CONTINUE TO menghitung dengan formula yang sama dan benar

#### 3.5 Transaksi Non-Donat di Menu Transaksi Tidak Berubah
**3.5** WHEN kasir melihat atau mengelola transaksi produk Non-Donat di **Menu Transaksi** THEN sistem SHALL CONTINUE TO menampilkan dan memproses transaksi tersebut tanpa perubahan behavior

#### 3.6 Multi-Outlet Support Tetap Berjalan
**3.6** WHEN ada multiple outlet aktif di sistem THEN setiap outlet SHALL CONTINUE TO memiliki stok dan produksi yang terpisah dan independen satu sama lain

#### 3.7 Channel Pricing (Toko, GoFood, GrabFood, dll) Tetap Konsisten
**3.7** WHEN kasir memilih channel berbeda (Toko, GoFood, GrabFood, Shopee, TikTok) THEN harga produk donat SHALL CONTINUE TO mengikuti pricing per channel yang telah dikonfigurasi

---

## Bug Condition Analysis

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type StockSyncEvent = {
    eventType: string,           // 'input_production' | 'edit_riwayat' | 'delete_riwayat' | 'sale_transaction' | 'delete_transaction'
    isOnline: boolean,            // System online status
    donutType: string,            // 'donat' | 'non-donat'
    outletId: string,
    timestamp: datetime,
    stockBefore: integer,
    stockAfter: integer,
    receiptPrinted: boolean,      // For sale transactions
    hasError: boolean,            // Error occurred during sync
    errorMessage: string          // Error detail (e.g., UNIQUE_CONSTRAINT_VIOLATION)
  }
  OUTPUT: boolean

  // Bug terjadi saat ONLINE dan menyangkut produk DONAT dengan salah satu kondisi berikut:
  RETURN (
    X.isOnline = TRUE AND
    X.donutType = 'donat' AND
    (
      // Kondisi 1: Input produksi error UNIQUE_CONSTRAINT_VIOLATION
      (X.eventType = 'input_production' AND X.hasError = TRUE AND X.errorMessage CONTAINS 'UNIQUE_CONSTRAINT_VIOLATION') OR
      
      // Kondisi 2: Edit/hapus di riwayat produksi gagal
      (X.eventType IN ('edit_riwayat', 'delete_riwayat') AND X.hasError = TRUE) OR
      
      // Kondisi 3: Stok berkurang sebelum struk tercetak
      (X.eventType = 'sale_transaction' AND X.receiptPrinted = FALSE AND X.stockAfter < X.stockBefore) OR
      
      // Kondisi 4: Stok tidak dikembalikan saat transaksi dihapus
      (X.eventType = 'delete_transaction' AND X.stockAfter = X.stockBefore)
    )
  )
END FUNCTION
```

### Fix Checking Property

```pascal
// Property 1: No Duplicate Entry Error After Fix
FOR ALL X WHERE isBugCondition(X) AND X.eventType = 'input_production' DO
  result ← processInputProduction'(X)
  ASSERT (
    result.hasError = FALSE AND
    result.errorMessage NOT CONTAINS 'UNIQUE_CONSTRAINT_VIOLATION' AND
    result.successNotification = TRUE AND
    result.processingTime < 3000 // milliseconds
  )
END FOR

// Property 2: Edit/Delete Works After Fix
FOR ALL X WHERE isBugCondition(X) AND X.eventType IN ('edit_riwayat', 'delete_riwayat') DO
  result ← processRiwayatOperation'(X)
  ASSERT (
    result.hasError = FALSE AND
    result.inventoryUpdated = TRUE AND
    result.syncTime < 2000 // milliseconds
  )
END FOR

// Property 3: Stock Deduction Only After Receipt
FOR ALL X WHERE isBugCondition(X) AND X.eventType = 'sale_transaction' DO
  result ← processSaleTransaction'(X)
  ASSERT (
    (result.receiptPrinted = FALSE IMPLIES result.stockAfter = result.stockBefore) AND
    (result.receiptPrinted = TRUE IMPLIES result.stockAfter = result.stockBefore - result.soldQty)
  )
END FOR

// Property 4: Stock Restoration on Delete
FOR ALL X WHERE isBugCondition(X) AND X.eventType = 'delete_transaction' DO
  result ← processDeleteTransaction'(X)
  ASSERT (
    result.stockAfter = result.stockBefore + result.restoredQty AND
    result.restoredQty = X.originalSoldQty
  )
END FOR

// Property 5: Real-time Sync Between Menus
FOR ALL X WHERE X.eventType = 'input_production' AND X.isOnline = TRUE AND X.donutType = 'donat' DO
  inputMenuData ← getInputMenuData'(X.outletId)
  riwayatMenuData ← getRiwayatMenuData'(X.outletId)
  ASSERT (
    inputMenuData.latestEntry.id = riwayatMenuData.latestEntry.id AND
    inputMenuData.latestEntry.qty = riwayatMenuData.latestEntry.qty AND
    timeDifference(inputMenuData.timestamp, riwayatMenuData.timestamp) < 2000 // milliseconds
  )
END FOR
```

### Preservation Checking Property

```pascal
// Preservation: Non-buggy scenarios harus tetap berfungsi seperti sebelumnya
FOR ALL X WHERE NOT isBugCondition(X) DO
  // X.isOnline = FALSE (offline mode) OR X.donutType = 'non-donat'
  resultOld ← F(X)  // Original function
  resultNew ← F'(X) // Fixed function
  
  ASSERT resultOld = resultNew
  // Offline mode dan Non-Donat harus tetap berfungsi identik seperti sebelum fix
END FOR
```

---

## Key Definitions

- **F**: Fungsi original (kode sebelum fix) yang memiliki bug sinkronisasi stok donat non-toping saat online
- **F'**: Fungsi setelah fix yang mengatasi:
  1. UNIQUE_CONSTRAINT_VIOLATION di input produksi
  2. Real-time sync antara Input Produksi ↔ Riwayat Produksi
  3. Edit/Delete functionality di Riwayat Produksi
  4. Stock deduction hanya setelah struk tercetak
  5. Stock restoration saat transaksi dihapus
  6. Clear notification untuk status berhasil/gagal

---

## Counterexample (Concrete Bug Demonstration)

### Contoh 1: UNIQUE_CONSTRAINT_VIOLATION
```
Input:
- Outlet: Toko Pusat (ID: abc-123)
- Kasir: input 100 donat standar di Menu Input Produksi
- Status: Online

Saat ini (Buggy):
1. Kasir klik Submit
2. Loading... (5 detik)
3. Data masuk ke database (sukses)
4. Console error: UNIQUE_CONSTRAINT_VIOLATION
5. UI tidak menunjukkan notifikasi sukses
6. Kasir bingung, klik Submit lagi → error lagi

Setelah Fix:
1. Kasir klik Submit
2. Loading... (2 detik)
3. Data masuk ke database (sukses)
4. Notifikasi: "✓ Berhasil disimpan: 100 donat standar"
5. UI langsung update, kasir tahu data sudah masuk
6. Input berikutnya tidak error
```

### Contoh 2: Stok Tidak Dikembalikan Saat Delete Transaksi
```
Input:
- Stok awal: 100 donat standar
- Transaksi: Jual 20 donat standar (struk sudah dicetak)
- Stok setelah jual: 80 donat standar
- Pembeli batal beli → Kasir hapus transaksi di Menu Transaksi

Saat ini (Buggy):
- Stok tetap: 80 donat standar (TIDAK dikembalikan)
- Expected: 100 donat standar

Setelah Fix:
- Stok kembali: 100 donat standar
- Inventory_non_topping updated dengan +20 qty_available
```

### Contoh 3: Edit di Riwayat Produksi Tidak Berfungsi
```
Input:
- Kasir salah input: 100 donat standar (seharusnya 150)
- Kasir buka Menu Riwayat Produksi
- Kasir klik Edit → Ubah qty menjadi 150

Saat ini (Buggy):
- Edit tidak berhasil (no action / error)
- Stok tetap 100

Setelah Fix:
- Edit berhasil
- Database updated: production_daily.success_qty = 150
- inventory_non_topping.qty_available += 50
- Notifikasi: "✓ Data berhasil diupdate"
```

---

## Technical Context Notes

Berikut adalah referensi teknis untuk membantu fase Design nanti:

**Tabel Database Terkait:**
- `production_daily`: Input produksi harian (outlet_id, tanggal, ukuran, success_qty, waste_qty)
- `inventory_non_topping`: Stok real-time donat non-toping (outlet_id, ukuran, qty_available)
- `orders`: Transaksi penjualan
- `order_items`: Detail item transaksi

**File Kode Terkait:**
- Input Produksi: (perlu investigasi lokasi file)
- Riwayat Produksi: (perlu investigasi lokasi file)
- POS/Kasir: `app\(dashboard)\dashboard\kasir\page.tsx`
- Menu Transaksi: `app\(dashboard)\dashboard\transaksi\page.tsx`
- Hook Production: `lib\hooks\useProduction.ts` (error UNIQUE_CONSTRAINT_VIOLATION muncul di sini line 108)

**Mekanisme Real-time yang Ada:**
- Supabase Realtime subscription di `kasir\page.tsx` (line ~280-320)
- `useRealtimeOrders` hook di `transaksi\page.tsx`
- Query invalidation dengan React Query

**Constraint Database:**
- UNIQUE constraint di `production_daily` (perlu dicek apakah ini penyebab UNIQUE_CONSTRAINT_VIOLATION)
- Foreign key: `outlet_id`, `product_id`

---

**Catatan untuk Phase Selanjutnya (Design):**
1. Investigasi root cause UNIQUE_CONSTRAINT_VIOLATION (apakah unique constraint terlalu ketat?)
2. Design state management untuk lock mechanism saat input produksi
3. Design real-time sync strategy antara Input Produksi ↔ Riwayat Produksi
4. Design transaction flow untuk stock deduction (should happen AFTER receipt printed)
5. Design rollback/restoration logic untuk delete transaction
6. Design clear notification system dengan toast/alert
