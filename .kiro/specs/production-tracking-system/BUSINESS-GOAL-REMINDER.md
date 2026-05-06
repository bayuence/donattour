# 🎯 TUJUAN UTAMA SISTEM - CATATAN PENTING

**Date:** 2026-05-03  
**From:** User Feedback  
**Priority:** 🔥 CRITICAL - JANGAN LUPA!

---

## 💡 TUJUAN UTAMA YANG HARUS SELALU DIINGAT

### **"Saat toko tutup (closing), owner harus bisa lihat JELAS semua jenis rugi"**

Ini adalah **TUJUAN UTAMA** kenapa sistem ini dibuat!

---

## 📊 4 KATEGORI RUGI YANG HARUS TERLIHAT JELAS

### 1. ❌ **Gagal Produksi** (Production Waste)
**Kapan:** Saat produksi donat di pagi hari  
**Contoh:**
- Donat gosong: 10 pcs
- Bentuk jelek: 5 pcs
- Adonan gagal: 3 pcs

**Status Implementasi:** ✅ SUDAH (Task 3.1-3.5)  
**Dimana:** Input Produksi → Waste Details

---

### 2. ❌ **Salah Topping** (Topping Errors)
**Kapan:** Saat kasir salah buat produk  
**Contoh:**
- Customer pesan: Choco Oreo
- Kasir buat: Choco Peanut (SALAH!)
- Qty: 1 pcs
- Donat tidak dijual, jadi rugi

**Status Implementasi:** ✅ SUDAH (Task 5.1-5.2)  
**Dimana:** Kasir → Tombol "Lapor Error"

**⚠️ PENTING:** 
- Donat yang salah **TIDAK DIJUAL** ke customer
- Donat jadi rugi total (HPP + topping)
- Harus dilaporkan untuk tracking

---

### 3. ❌ **Donat Polos Expired** (Non-Topping Expired)
**Kapan:** Saat closing, ada donat polos yang tidak terpakai  
**Contoh:**
- Donat polos standar sisa: 50 pcs
- Yang fresh (simpan besok): 30 pcs
- Yang aging (diskon besok): 10 pcs
- Yang expired (buang): 10 pcs ← INI RUGI!

**Status Implementasi:** ⏳ BELUM (Task 6.3)  
**Dimana:** Closing Harian → Tab 1: Sisa Non-Topping

---

### 4. ❌ **Donat Jadi Reject** (Finished Product Reject)
**Kapan:** Saat closing, ada donat jadi yang tidak laku  
**Contoh:**
- Bomboloni Strawberry sisa: 20 pcs
- Yang fresh (jual besok diskon): 10 pcs
- Yang aging (diskon besar): 5 pcs
- Yang reject (buang): 5 pcs ← INI RUGI!
  - Alasan: Topping meleleh, kering, jatuh

**Status Implementasi:** ⏳ BELUM (Task 6.4)  
**Dimana:** Closing Harian → Tab 2: Sisa Sudah Topping

---

## 📋 LAPORAN RUGI YANG HARUS TERLIHAT

### **Saat Closing (Task 6.5)**

```
═══════════════════════════════════════════════════
LAPORAN RUGI HARIAN
Outlet: Donattour Pusat
Tanggal: 03 Mei 2026
═══════════════════════════════════════════════════

1. GAGAL PRODUKSI
   - Gosong: 10 pcs × Rp 2,000 = Rp 20,000
   - Bentuk jelek: 5 pcs × Rp 2,000 = Rp 10,000
   - Adonan gagal: 3 pcs × Rp 2,000 = Rp 6,000
   ─────────────────────────────────────────────────
   Subtotal: Rp 36,000 (20% dari total rugi)

2. SALAH TOPPING
   - Choco Oreo → Choco Peanut: 1 pcs = Rp 6,000
   - Abon → Strawberry: 2 pcs = Rp 12,000
   - Matcha → Tiramisu: 1 pcs = Rp 6,000
   ─────────────────────────────────────────────────
   Subtotal: Rp 24,000 (13% dari total rugi)

3. DONAT POLOS EXPIRED
   - Standar: 10 pcs × Rp 2,000 = Rp 20,000
   - Mini: 15 pcs × Rp 2,500 = Rp 37,500
   ─────────────────────────────────────────────────
   Subtotal: Rp 57,500 (32% dari total rugi)

4. DONAT JADI REJECT
   - Bomboloni Strawberry: 5 pcs × Rp 6,000 = Rp 30,000
   - Choco Oreo: 3 pcs × Rp 6,000 = Rp 18,000
   - Tiramisu Oreo: 2 pcs × Rp 7,000 = Rp 14,000
   ─────────────────────────────────────────────────
   Subtotal: Rp 62,000 (35% dari total rugi)

═══════════════════════════════════════════════════
TOTAL RUGI HARI INI: Rp 179,500
═══════════════════════════════════════════════════

📊 ANALISIS:
- Rugi terbesar: Donat Jadi Reject (35%)
- Rekomendasi: Kurangi produksi Bomboloni Strawberry
- Waste rate: 18% (Target: <15%)
```

---

### **Di Dashboard Owner (Task 7.4)**

**Pie Chart:**
```
        Gagal Produksi (20%)
              ╱
             ╱
    ────────●────────
   ╱        │        ╲
  ╱   Salah │ Donat   ╲
 ╱   Topping│ Jadi     ╲
╱    (13%)  │ Reject    ╲
            │  (35%)
            │
      Donat Polos
      Expired (32%)
```

**Bar Chart - Trend 7 Hari:**
```
Rp 200k │     ▄▄
        │    ███
Rp 150k │   ████  ▄▄
        │  █████ ███
Rp 100k │ ██████████  ▄▄
        │████████████ ███
Rp 50k  │████████████████
        └─────────────────
         Sen Sel Rab Kam Jum Sab Min
```

---

## ✅ CHECKLIST IMPLEMENTASI

### **Sudah Jadi:**
- [x] Task 3.1-3.5: Input Produksi + Waste Details
- [x] Task 5.1-5.2: Lapor Kesalahan Topping
- [x] Database schema untuk semua kategori rugi
- [x] API untuk topping errors

### **Belum Jadi (PRIORITAS!):**
- [ ] Task 6.1: Daily Closing API
- [ ] Task 6.3: Form Closing - Sisa Non-Topping
- [ ] Task 6.4: Form Closing - Sisa Sudah Topping
- [ ] Task 6.5: Closing Summary (LAPORAN INI!)
- [ ] Task 7.1: Dashboard Data Aggregation
- [ ] Task 7.4: Loss Breakdown Chart

---

## 🎯 KENAPA INI PENTING?

### **Tanpa Sistem Ini:**
- ❌ Owner tidak tahu rugi sebenarnya
- ❌ Tidak tahu mana yang paling banyak rugi
- ❌ Tidak bisa ambil keputusan untuk kurangi rugi
- ❌ Bisnis jalan tapi tidak tahu untung/rugi detail

### **Dengan Sistem Ini:**
- ✅ Owner tahu PERSIS berapa rugi per kategori
- ✅ Tahu mana yang harus diperbaiki
- ✅ Bisa ambil keputusan: kurangi produksi, training kasir, dll
- ✅ Bisa set target: waste rate < 15%
- ✅ Bisa track improvement dari waktu ke waktu

---

## 💰 CONTOH MANFAAT NYATA

**Sebelum Sistem:**
```
Owner: "Kok rugi ya? Tapi gak tau ruginya dari mana..."
```

**Setelah Sistem:**
```
Owner: "Oh, rugi terbesar dari donat jadi reject (35%)!"
       "Berarti harus kurangi produksi atau kasir lebih cepat jual"
       "Bulan ini waste rate 18%, target bulan depan 15%"
       "Kalau bisa turun 3%, hemat Rp 500,000/bulan!"
```

---

## 🚨 REMINDER UNTUK DEVELOPER (KIRO AI)

**Setiap kali implement task, ingat:**

1. ✅ Apakah ini membantu owner lihat rugi dengan jelas?
2. ✅ Apakah breakdown per kategori sudah benar?
3. ✅ Apakah HPP calculation sudah akurat?
4. ✅ Apakah data bisa di-aggregate untuk laporan?
5. ✅ Apakah owner bisa ambil keputusan dari data ini?

**Jika jawaban ada yang TIDAK, maka implementasi SALAH!**

---

## 📝 CATATAN TAMBAHAN

### **User Feedback (2026-05-03):**

> "tidak di jual kalau salah karna ini hubungannya ketika toko tutup 
> nanti terlihat jelas mna yg gagal terjual mna yg gagal produksi dan lain"

**Artinya:**
- Donat salah topping = RUGI (tidak dijual)
- Harus masuk laporan rugi saat closing
- Owner harus bisa bedakan: gagal produksi vs salah topping vs expired vs reject
- Semua harus terlihat JELAS dan TERPISAH

---

## 🎯 NEXT STEPS

**Prioritas Implementasi:**
1. **Task 6.1** - Daily Closing API (aggregate semua rugi)
2. **Task 6.3** - Form Closing Tab 1 (non-topping expired)
3. **Task 6.4** - Form Closing Tab 2 (finished product reject)
4. **Task 6.5** - Closing Summary (LAPORAN LENGKAP!)
5. **Task 7.4** - Dashboard Loss Breakdown (visualisasi)

**Setelah semua jadi:**
- Owner bisa lihat laporan rugi lengkap setiap hari
- Bisa compare hari ini vs kemarin
- Bisa track improvement
- Bisa ambil keputusan bisnis yang tepat

---

**Status:** 📌 PINNED - JANGAN LUPA TUJUAN INI!  
**Last Updated:** 2026-05-03  
**Next Review:** Setelah Task 6.5 selesai

