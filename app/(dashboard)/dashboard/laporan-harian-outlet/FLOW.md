# 🔄 Flow Diagram - Proses Closing Outlet

## 📊 Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAPORAN HARIAN OUTLET                         │
│                                                                  │
│  Header: [🟢 OPEN] [📍 Outlet: Cabang Utama] [🔄]              │
│                         👆                                        │
│                         │                                        │
│         ┌───────────────┴───────────────┐                       │
│         │ Klik "Tutup Kasir"            │                       │
│         └───────────────┬───────────────┘                       │
│                         ↓                                        │
│  Header: [🔴 CLOSE] [📍 Outlet: Cabang Utama] [🔄]             │
│          (Kasir Dikunci!)                                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💰 Financial Summary (masih bisa dilihat)                      │
│  📊 Production Metrics (masih bisa dilihat)                     │
│  🛒 Sales & Payment (masih bisa dilihat)                        │
│  💸 Expense (masih bisa dilihat)                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔒 OPERASIONAL PENUTUPAN                                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔵 1  Rekap Sisa Produk Jadi    [📦 Buka Form Rekap]  │   │
│  │       Input sisa produk yang sudah di-topping...        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         │ (Opsional, tapi direkomendasikan)    │
│                         │                                        │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🟠 2  Laporan & Konfirmasi    [🔒 Buka Form Closing]  │   │
│  │       ⚠️ Kasir sudah dikunci. Klik tombol...           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│         ┌───────────────┴───────────────┐                       │
│         │ User Klik Manual               │                       │
│         │ "Buka Form Closing"            │                       │
│         └───────────────┬───────────────┘                       │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔴 2  FORM CLOSING TERBUKA INLINE           [✕ Tutup] │   │
│  │                                                          │   │
│  │  📋 Review Data:                                        │   │
│  │  • Pendapatan: Rp XXX                                   │   │
│  │  • Pengeluaran: Rp XXX                                  │   │
│  │  • Laba Bersih: Rp XXX                                  │   │
│  │                                                          │   │
│  │  📝 Catatan Closing: ___________________               │   │
│  │                                                          │   │
│  │  [❌ Batal]  [✅ Konfirmasi & Submit Closing]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│         ┌───────────────┴───────────────┐                       │
│         │ Submit Success                 │                       │
│         └───────────────┬───────────────┘                       │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔵 ✓  Laporan & Konfirmasi Closing                     │   │
│  │       ✅ Toko sudah berhasil ditutup untuk hari ini.   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 3 State Step 2 (Laporan & Konfirmasi Closing)

### State A: Kasir Belum Dikunci
```
┌─────────────────────────────────────────────────────────┐
│ ⚪ 2  Laporan & Konfirmasi Closing                     │
│                                                         │
│       💡 Klik tombol "Tutup Kasir" di header untuk     │
│          mengunci kasir terlebih dahulu sebelum        │
│          melakukan closing.                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
        ↑
   Background: Gray
   Icon: Gray circle dengan nomor 2
   Tombol: Tidak ada
```

### State B: Kasir Dikunci, Belum Closing
```
┌─────────────────────────────────────────────────────────┐
│ 🟠 2  Laporan & Konfirmasi    [🔒 Buka Form Closing]  │
│                                                         │
│       ⚠️ Kasir sudah dikunci. Silakan lakukan rekap   │
│          sisa produk (Step 1) lalu klik tombol di      │
│          samping untuk memulai closing.                │
│                                                         │
└─────────────────────────────────────────────────────────┘
        ↑
   Background: Amber (kuning)
   Icon: Amber circle dengan nomor 2
   Tombol: "Buka Form Closing" (merah) ← KLIK INI!
```

### State C: Sudah Closing Final
```
┌─────────────────────────────────────────────────────────┐
│ 🔵 ✓  Laporan & Konfirmasi Closing                     │
│                                                         │
│       ✅ Toko sudah berhasil ditutup untuk hari ini.   │
│                                                         │
└─────────────────────────────────────────────────────────┘
        ↑
   Background: Blue
   Icon: Blue circle dengan checkmark ✓
   Tombol: Tidak ada
```

## 🚦 Status Flags

| Flag | Deskripsi | Set By |
|------|-----------|--------|
| `is_kasir_locked` | Kasir dikunci, tidak bisa transaksi | Tombol "Tutup Kasir" di header |
| `has_closing` | Closing final sudah dilakukan | Submit form closing (Step 2) |

### Kombinasi Status:

| is_kasir_locked | has_closing | State | Visual |
|-----------------|-------------|-------|--------|
| `false` | `false` | Kasir terbuka | 🟢 OPEN |
| `true` | `false` | Kasir dikunci, belum closing | 🟠 Step 2 amber |
| `true` | `true` | Closing final selesai | 🔵 CLOSE ✓ |

## ⏱️ Timeline Proses

```
10:00  ──→  Outlet buka, kasir aktif
            Header: [🟢 OPEN]

...

20:00  ──→  Siap tutup toko
            
20:01  ──→  Klik "Tutup Kasir" di header
            ├─ API: /api/closing/lock
            ├─ Set: is_kasir_locked = true
            ├─ Set: has_closing = false
            ├─ BroadcastChannel: OUTLET_CLOSED
            └─ Toast: "Kasir berhasil dikunci!"
            Header: [🔴 CLOSE]

20:05  ──→  Scroll ke bawah
            Step 1: Klik "Buka Form Rekap"
            ├─ Input sisa Donat Original: 5 pcs
            ├─ Input sisa Donat Coklat: 3 pcs
            └─ Submit

20:10  ──→  Step 2: Klik "Buka Form Closing" (manual!)
            Form closing terbuka inline
            
20:12  ──→  Review data, tulis catatan
            
20:15  ──→  Klik "Konfirmasi & Submit Closing"
            ├─ API: /api/closing/submit
            ├─ Set: has_closing = true
            └─ Redirect atau reload
            
20:16  ──→  Step 2 berubah: 🔵 ✓ Closing selesai!
```

## 🔐 Security Flow

```
Client Side                Server Side               Database
    │                          │                        │
    ├─ Klik "Tutup Kasir"      │                        │
    │                          │                        │
    ├─────── POST ────────────►│                        │
    │  /api/closing/lock       │                        │
    │  { outlet_id }           │                        │
    │                          │                        │
    │                          ├──── INSERT ───────────►│
    │                          │  daily_closing         │
    │                          │  (notes: 'LOCKED')     │
    │                          │                        │
    │                          ◄──── Success ──────────┤
    │                          │                        │
    │◄────── Response ─────────┤                        │
    │  { success: true }       │                        │
    │                          │                        │
    ├─ BroadcastChannel        │                        │
    │  'OUTLET_CLOSED'         │                        │
    │  (notify other tabs)     │                        │
    │                          │                        │
    
    ... User manual action ...
    
    ├─ Klik "Buka Form"        │                        │
    │  (UI only)               │                        │
    │                          │                        │
    ├─ Submit Closing          │                        │
    │                          │                        │
    ├─────── POST ────────────►│                        │
    │  /api/closing/submit     │                        │
    │  { outlet_id, notes }    │                        │
    │                          │                        │
    │                          ├──── UPDATE ───────────►│
    │                          │  daily_closing         │
    │                          │  (notes: user_input)   │
    │                          │                        │
    │                          ◄──── Success ──────────┤
    │                          │                        │
    │◄────── Response ─────────┤                        │
    │  { success: true }       │                        │
    │                          │                        │
```

## 📱 Multi-Device Sync

```
Device A (Kasir)          BroadcastChannel          Device B (Manager)
     │                          │                          │
     ├─ Masih bisa input        │                          │
     │  transaksi               │                          │
     │                          │                          │
     │                          │      Device C (Laptop)   │
     │                          │             │            │
     │                          │             ├─ Klik      │
     │                          │             │  "Tutup    │
     │                          │             │   Kasir"   │
     │                          │             │            │
     │                          ◄──────────── OUTLET_CLOSED│
     │                          │                          │
     ◄────── LOCKED ────────────┤                          │
     │                          │                          │
     ├─ UI: Kasir disabled      │                          │
     ├─ Transaksi blocked       │                          │
     │                          ├────────── LOCKED ───────►│
     │                          │                          │
     │                          │                          ├─ UI: Kasir
     │                          │                          │   disabled
```

---

**Status:** ✅ Updated  
**Version:** 2.1.0  
**Last Modified:** 5 Juni 2026, 23:00 WIB
