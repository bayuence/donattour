# 🚀 PANDUAN MIGRASI DATABASE - Step by Step

**WAJIB BACA SEBELUM JALANKAN!**

---

## ⚠️ PENTING

1. ✅ Backup database dulu (safety first!)
2. ✅ Jalankan di jam sepi (jangan saat ada transaksi)
3. ✅ Siapkan Supabase Dashboard (buka tab baru)
4. ✅ Estimasi waktu: 5-10 menit

---

## 📋 LANGKAH 1: Backup Database

### Buka Terminal/CMD di folder project:

```bash
# Windows CMD atau PowerShell
cd C:\Users\bayue\Desktop\donattourSYSTEM

# Jalankan backup
npx tsx scripts/backup-database.ts
```

### Hasil:
```
✅ Backup created: backup/products_2026-06-05.json
✅ Backup created: backup/orders_2026-06-05.json
```

**Jika ada error "SUPABASE_SERVICE_ROLE_KEY not found":**
- Buka file `.env.local`
- Pastikan ada `SUPABASE_SERVICE_ROLE_KEY=...`
- Copy dari Supabase Dashboard → Settings → API → service_role key

---

## 📋 LANGKAH 2: Buka Supabase Dashboard

1. Buka browser → https://supabase.com
2. Login ke project Anda
3. Klik project "DonattourSystem" (atau nama project Anda)
4. Di sidebar kiri, klik **"SQL Editor"**
5. Klik tombol **"New query"**

---

## 📋 LANGKAH 3: Copy Migration SQL

### Buka file migration:
**Lokasi:** `prisma/migrations/add_pricing_details/migration.sql`

### Copy SEMUA isi file tersebut (dari baris pertama sampai terakhir)

**Atau buka di VS Code:**
1. Buka file `migration.sql`
2. Ctrl+A (select all)
3. Ctrl+C (copy)

---

## 📋 LANGKAH 4: Jalankan Migration di Supabase

1. Di SQL Editor Supabase, **Paste** SQL yang sudah di-copy
2. Klik tombol **"Run"** (pojok kanan bawah)
3. Tunggu sampai selesai (biasanya 5-10 detik)

### Jika Berhasil:
```
✅ Success. No rows returned
```

### Jika Ada Error:
Screenshot error message, lalu tunjukkan ke saya.

---

## 📋 LANGKAH 5: Verify Migration

### Di SQL Editor yang sama, jalankan query ini:

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
LIMIT 5;
```

### Hasil yang Benar:
Harus muncul table dengan 9 kolom (termasuk kolom baru) dan 5 baris data.

**Jika kolom baru tidak muncul:** Migration belum berhasil, coba lagi dari Step 4.

---

## 📋 LANGKAH 6: Generate Prisma Client

### Kembali ke Terminal/CMD:

```bash
# Generate Prisma client dengan schema baru
npx prisma generate
```

### Hasil:
```
✔ Generated Prisma Client
```

---

## 📋 LANGKAH 7: Restart Dev Server

### Stop server (Ctrl+C), lalu start lagi:

```bash
npm run dev
```

---

## ✅ SELESAI!

Migration berhasil jika:
- ✅ Tidak ada error di terminal
- ✅ Aplikasi bisa dibuka di browser
- ✅ Menu kelola produk bisa dibuka
- ✅ Tidak ada crash/error

---

## 🆘 TROUBLESHOOTING

### Error: "column already exists"
**Solusi:** Migration sudah pernah dijalankan, skip aja.

### Error: "permission denied"
**Solusi:** Pastikan menggunakan `SUPABASE_SERVICE_ROLE_KEY`, bukan anon key.

### Error: "syntax error near..."
**Solusi:** Copy ulang SQL, pastikan tidak ada karakter aneh.

### Aplikasi crash setelah migration
**Solusi:**
1. Stop server (Ctrl+C)
2. Jalankan: `npx prisma generate`
3. Start server: `npm run dev`

### Mau rollback?
**Solusi:**
1. Buka SQL Editor
2. Run: `DROP TABLE IF EXISTS products CASCADE;`
3. Restore dari backup (hubungi saya untuk script restore)

---

## 📞 BUTUH BANTUAN?

Jika ada error atau stuck di langkah manapun:
1. Screenshot error message
2. Beritahu saya di langkah mana stuck
3. Saya akan bantu troubleshoot

---

**SEKARANG:** Jalankan Step 1 (Backup), lalu kasih tau hasilnya!

Ketik:
- "backup done" jika backup berhasil
- "error" + screenshot jika ada masalah
