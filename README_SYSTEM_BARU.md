# 🎯 SISTEM HARGA DETAIL - Ringkasan Perubahan

**Tanggal:** 5 Juni 2026  
**Status:** ✅ Backend Selesai | ⏳ Migrasi Database Pending | ⏳ Form UI Pending

---

## 📋 APA YANG SUDAH BERUBAH?

### **SEBELUM (Sistem Lama):**
```
❌ 1 Outlet = Banyak Kasir (toko, gojek, shopee, dll)
❌ Harga berbeda per kasir
❌ HPP donat = harga rata-rata polos saja
❌ Tidak ada tracking topping per donat
❌ Margin tidak akurat
```

### **SEKARANG (Sistem Baru):**
```
✅ 1 Outlet = 1 Kasir (simpel)
✅ 1 Harga per produk
✅ HPP dirinci: Donat Polos + Topping
✅ Margin otomatis dihitung per produk
✅ Laporan keuntungan lebih akurat
```

---

## 🗂️ STRUKTUR DATA BARU

### **Product Table - Field Baru:**

| Field | Tipe | Contoh | Keterangan |
|-------|------|--------|------------|
| `is_donat` | boolean | `true` | Apakah produk ini donat? |
| `ukuran_donat` | enum | `'regular'` | mini, regular, jumbo, dozen |
| `hpp_base_donat` | decimal | `3500` | HPP donat polos (tanpa topping) |
| `hpp_topping` | decimal | `1500` | Biaya topping per pcs |
| `hpp_total` | decimal | `5000` | Total HPP (base + topping) |
| `harga_jual` | decimal | `8000` | Harga jual ke customer |
| `margin_amount` | decimal | `3000` | Keuntungan (Rp) = jual - HPP |
| `margin_percent` | decimal | `37.5` | Keuntungan (%) |

### **Contoh Data:**

**Donat Ceres Regular:**
```json
{
  "nama": "Ceres",
  "is_donat": true,
  "ukuran_donat": "regular",
  "hpp_base_donat": 3500,     // Donat polos
  "hpp_topping": 1500,          // Topping ceres
  "hpp_total": 5000,            // Total modal
  "harga_jual": 8000,           // Harga jual
  "margin_amount": 3000,        // Untung Rp
  "margin_percent": 37.5        // Untung %
}
```

**Minuman (Bukan Donat):**
```json
{
  "nama": "Es Teh Manis",
  "is_donat": false,
  "hpp_total": 2000,
  "harga_jual": 5000,
  "margin_amount": 3000,
  "margin_percent": 60.0
}
```

---

## 🔧 FITUR BARU

### **1. Perhitungan Otomatis**
Sistem akan otomatis hitung:
- ✅ HPP Total = Base + Topping
- ✅ Margin Rp = Harga Jual - HPP Total
- ✅ Margin % = (Margin / Harga Jual) × 100

### **2. Validasi Real-time**
- ⚠️ Warning jika harga jual < HPP
- ⚠️ Warning jika margin < 20%
- ✅ Recommended price berdasarkan target margin

### **3. Laporan Lebih Detail**
- 📊 HPP breakdown per kategori
- 📊 Margin analysis per produk
- 📊 Best-seller vs profit tertinggi

---

## 🚀 CARA MIGRASI DATABASE

### **Langkah 1: Backup** (WAJIB!)
```bash
npx tsx scripts/backup-database.ts
```

### **Langkah 2: Run Migration**
1. Buka **Supabase Dashboard**
2. Masuk ke **SQL Editor**
3. Copy isi file: `prisma/migrations/add_pricing_details/migration.sql`
4. Paste dan klik **RUN**
5. Tunggu sampai selesai

### **Langkah 3: Verify**
Jalankan query ini di SQL Editor:
```sql
-- Cek apakah kolom baru sudah ada
SELECT 
  nama,
  is_donat,
  ukuran_donat,
  hpp_base_donat,
  hpp_topping,
  hpp_total,
  harga_jual,
  margin_amount,
  margin_percent
FROM products
WHERE is_donat = true
LIMIT 10;
```

Harus muncul 10 produk dengan kolom baru terisi!

### **Langkah 4: Generate Prisma**
```bash
npx prisma generate
```

---

## 📝 CARA PAKAI SISTEM BARU

### **Saat Tambah Produk Donat Baru:**

**Form yang akan muncul:**
```
☑️ Apakah ini donat?         [✓] Ya   [ ] Bukan

Jika Ya, pilih ukuran:
⚪ Mini  ⚫ Regular  ⚪ Jumbo

─────────────────────────────────────
HPP Donat Polos:    Rp [    3.500]
HPP Topping:        Rp [    1.500]
                        ─────────
Total HPP:          Rp     5.000 (otomatis)

Harga Jual:         Rp [    8.000]

─────────────────────────────────────
Margin:             Rp     3.000 (37.5%) ✅
─────────────────────────────────────

[Batalkan]  [Simpan Produk]
```

### **Jika Produk Bukan Donat:**
```
☑️ Apakah ini donat?         [ ] Ya   [✓] Bukan

─────────────────────────────────────
HPP Total:          Rp [    2.000]
Harga Jual:         Rp [    5.000]

─────────────────────────────────────
Margin:             Rp     3.000 (60.0%) ✅
─────────────────────────────────────

[Batalkan]  [Simpan Produk]
```

---

## ⚠️ HAL YANG HARUS DIPERHATIKAN

### **Data Lama:**
- ✅ Data existing akan di-migrate otomatis
- ⚠️ HPP donat lama dipecah jadi 60% base + 40% topping (estimasi)
- ⚠️ Anda bisa edit ulang nanti untuk koreksi

### **Kasir:**
- ⚠️ Tombol selector kasir (toko/gojek/shopee) masih muncul
- ⚠️ Tapi tidak berpengaruh (harga sama semua)
- ✅ Akan dihapus di update selanjutnya (cosmetic only)

### **Kelola Produk:**
- ⚠️ Tab "Kasir Menu" sudah dihapus
- ⚠️ Section "Harga Per Channel" masih muncul tapi kosong
- ✅ Akan dihapus di update selanjutnya (cosmetic only)

---

## 📞 BUTUH BANTUAN?

### **Jika Ada Error:**
1. Screenshot error message
2. Cek file: `CURRENT_STATUS.md`
3. Cek file: `URGENT_ACTION_PLAN.md`

### **Jika Migrasi Gagal:**
1. Restore dari backup
2. Screenshot error SQL
3. Kontak developer

### **Jika Ingin Rollback:**
Backup database sudah dibuat, bisa restore kapan saja.

---

## ✅ CHECKLIST

**Sebelum Go Live:**
- [ ] Backup database sudah dibuat
- [ ] Migration SQL sudah dijalankan
- [ ] Verify data (10 produk) berhasil
- [ ] Prisma generate sudah dijalankan
- [ ] Test tambah produk baru
- [ ] Test kasir (harga benar)
- [ ] Test laporan (margin muncul)

**Setelah Go Live:**
- [ ] Monitor error logs
- [ ] Update HPP produk lama (koreksi estimasi)
- [ ] Update UI (hapus channel selector)
- [ ] Training kasir sistem baru

---

## 🎯 SUMMARY

**Yang Sudah Jalan:**
- ✅ Database structure baru
- ✅ Perhitungan otomatis
- ✅ Validasi pricing
- ✅ Sistem tanpa error

**Yang Belum:**
- ⏳ Database migration (user harus jalankan)
- ⏳ Form input pricing baru (next task)
- ⏳ Cleanup UI (cosmetic)

**Total Progress:** 50% ✅

---

**Lanjut?**
Bilang "migrate now" untuk panduan migrasi database step-by-step!
