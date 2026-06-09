# ⚡ QUICK START - Sistem Harga Detail

**TL;DR:** Sistem pricing baru sudah jadi. Tinggal migrate database & test!

---

## 🚀 3 LANGKAH MUDAH

### **1️⃣ MIGRATE DATABASE** (5 menit)

```bash
# Terminal/CMD
cd C:\Users\bayue\Desktop\donattourSYSTEM

# Backup
npx tsx scripts/backup-database.ts

# Buka Supabase Dashboard → SQL Editor
# Copy dari: prisma/migrations/add_pricing_details/migration.sql
# Paste & RUN

# Generate Prisma
npx prisma generate

# Restart
npm run dev
```

---

### **2️⃣ TEST SISTEM** (2 menit)

1. Buka app → **Kelola Produk**
2. Klik **"TAMBAH PRODUK"** (tombol orange)
3. Isi form minimal:
   - Nama: "Test Donat"
   - Kategori: Pilih satu
   - Klik "Ya, ini donat"
   - Ukuran: Regular
   - HPP Donat: 3500
   - HPP Topping: 1500
   - Harga Jual: 8000
4. Lihat margin muncul otomatis: **37.5%** ✅
5. Klik **"Simpan"**

---

### **3️⃣ DONE!** ✅

Sistem sudah berfungsi! Sekarang bisa:
- ✅ Tambah produk dengan pricing detail
- ✅ Lihat margin otomatis
- ✅ Validasi harga real-time
- ✅ Recommended price suggestion

---

## 📸 TAMPILAN FORM BARU

**Before:**
```
Nama: [...]
Harga: [...]
[Simpan]
```

**After:**
```
Nama: [...]
Kategori: [...]

🍩 Apakah ini donat? [✓ Ya] [Bukan]
Ukuran: [●Regular]

💰 HPP:
  Donat Polos: Rp 3.500
  Topping:     Rp 1.500
  ─────────────────────
  Total:       Rp 5.000

💵 Harga Jual: Rp 8.000

✅ MARGIN:
  Rp 3.000 (37.5%) 
  ✓✓ Margin sangat baik!

[Simpan Produk]
```

---

## 🎯 FITUR BARU

1. **HPP Breakdown** - Rinci per komponen (base + topping)
2. **Auto-Calculate** - Margin otomatis dihitung
3. **Color-Coded** - Merah (<20%), Kuning (20-35%), Hijau (>35%)
4. **Recommended Price** - Saran harga berdasarkan margin target
5. **Real-time Validation** - Error langsung muncul

---

## 📂 FILE PENTING

- `SELESAI.md` - Dokumentasi lengkap
- `MIGRATION_STEPS.md` - Panduan migration detail
- `migration.sql` - SQL yang harus dijalankan
- `ProductPricingForm.tsx` - Component form baru

---

## ⚠️ NOTES

- Migration **wajib** dijalankan sebelum test
- Form lama (edit produk) masih pakai system lama
- Kasir masih ada channel selector (tapi tidak berfungsi)
- Semua optional, sistem utama sudah jalan

---

**Stuck?** Buka `SELESAI.md` atau tanya saya!
