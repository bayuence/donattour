# 🚀 CARA MIGRATION EXPENSE MODULE v2.0

## 📌 Ringkasan

Upgrade database expense module dari versi lama ke v2.0 dengan fitur:
- ✅ Approval workflow
- ✅ Audit trail lengkap
- ✅ Budget control per kategori
- ✅ Closing integration

---

## 🎯 3 LANGKAH MUDAH

### **LANGKAH 1: Cek Database Dulu**

Buka terminal/command prompt, jalankan:

```bash
npm run check:db
```

**Tunggu sampai selesai.** Anda akan lihat:
- ✅ Table apa saja yang sudah ada
- ⚠️ Kolom apa yang perlu ditambah
- ⚠️ Table apa yang perlu dibuat

**Contoh output:**
```
✅ Table "expenses" EXISTS with 12 columns
⚠️  Missing v2.0 columns: status, approved_by, is_included_in_closing
⚠️  Table "expense_audit_logs" NOT FOUND (will be created)
⚠️  Table "outlet_expense_budgets" NOT FOUND (will be created)
```

---

### **LANGKAH 2: Jalankan Migration**

Masih di terminal, jalankan:

```bash
npm run migrate:expenses
```

**Anda akan lihat:**
1. Koneksi ke database ✅
2. Pengecekan database 🔍
3. Preview perubahan 📋
4. Pertanyaan konfirmasi ❓

**Contoh:**
```
📋 PREVIEW PERUBAHAN

Migration ini akan menambahkan:

📊 KOLOM BARU di table "expenses":
   • status
   • approved_by
   • is_included_in_closing
   • device_info

📋 TABLE BARU:
   • expense_audit_logs
   • outlet_expense_budgets

🔒 JAMINAN KEAMANAN:
   ✅ Tidak ada data yang akan dihapus
   ✅ Tidak ada kolom yang akan diubah
   ✅ Semua data existing tetap aman

❓ Lanjutkan migration? (y/n):
```

**Ketik `y` lalu Enter** untuk lanjut.

---

### **LANGKAH 3: Tunggu Selesai**

Migration akan berjalan 10-30 detik.

**Jika SUKSES:**
```
✅ Migration executed successfully!
✅ Semua perubahan berhasil diverifikasi!
🎉 MIGRATION COMPLETE
Database berhasil di-upgrade ke v2.0!
```

**Jika GAGAL:**
```
❌ Migration failed: [error message]
Database tetap aman, tidak ada perubahan yang diterapkan.
```

---

## ✅ Verifikasi Hasil

Setelah migration sukses, test di browser:

1. **Buka aplikasi:** `http://localhost:3000`
2. **Login** dengan akun Anda
3. **Buka menu:** Dashboard → Pengeluaran Outlet
4. **Pilih outlet** dari daftar
5. **Test input pengeluaran:**
   - Isi keterangan
   - Isi jumlah
   - Pilih kategori
   - Klik "Simpan Pengeluaran"
6. **Cek apakah data tersimpan** di tabel riwayat

---

## 🔧 Jika Ada Masalah

### Problem: "exec_sql function not found"

**Artinya:** Function helper belum dibuat di Supabase.

**Solusi:**
1. Buka **Supabase Dashboard** (https://supabase.com)
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Buka file: `scripts/supabase-exec.sql`
5. **Copy semua isinya**
6. **Paste** di SQL Editor
7. Klik tombol **"Run"** (pojok kanan bawah)
8. Tunggu sampai muncul "Success"
9. **Jalankan ulang migration:** `npm run migrate:expenses`

---

### Problem: "Missing Supabase credentials"

**Artinya:** File `.env.local` tidak ada atau isinya salah.

**Solusi:**
1. Cek apakah file `.env.local` ada di root project
2. Buka file tersebut
3. Pastikan ada 2 baris ini:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```
4. **PENTING:** Gunakan `SUPABASE_SERVICE_ROLE_KEY`, bukan `ANON_KEY`
5. Cara dapat Service Role Key:
   - Buka Supabase Dashboard
   - Klik **Settings** → **API**
   - Scroll ke bawah
   - Copy **service_role key** (bukan anon key!)

---

### Problem: "Table expenses not found"

**Artinya:** Database belum di-setup atau salah project.

**Solusi:**
1. Buka **Supabase Dashboard**
2. Klik **Table Editor** di sidebar
3. Cek apakah table `expenses` ada
4. Jika tidak ada:
   - Anda mungkin salah project
   - Atau database belum di-setup
   - Jalankan setup database dulu dari folder `QueryDATABASE/`

---

### Problem: Migration stuck atau lama sekali

**Solusi:**
1. **Stop script:** Tekan `Ctrl+C`
2. **Jalankan manual di Supabase:**
   - Buka Supabase Dashboard → SQL Editor
   - Buka file: `QueryDATABASE/11-schema-expenses-v2-migration.sql`
   - Copy semua isinya
   - Paste di SQL Editor
   - Klik "Run"
   - Tunggu sampai selesai

---

## 📊 Cek Hasil Migration

Jalankan lagi checker:

```bash
npm run check:db
```

**Expected output setelah migration sukses:**
```
✅ Table "expenses" EXISTS with 20 columns
✅ All v2.0 columns present
✅ Table "expense_audit_logs" EXISTS
✅ Table "outlet_expense_budgets" EXISTS
```

---

## 🎉 Selesai!

Setelah migration sukses:

1. ✅ Database sudah upgrade ke v2.0
2. ✅ Fitur baru sudah aktif
3. ✅ Data lama tetap aman
4. ✅ Siap digunakan

**Test fitur baru:**
- Pilih outlet
- Input pengeluaran
- Lihat summary per kategori
- Lihat chart analytics
- Export ke Excel

---

## 📞 Butuh Bantuan?

Jika masih ada masalah:

1. Jalankan: `npm run check:db`
2. Screenshot error message
3. Cek file: `scripts/database-schema-report.json`
4. Cek Supabase Dashboard → Logs

---

**Dibuat:** 2026-05-20  
**Untuk:** PT DonattourSystem  
**Skala:** 10,000+ outlets
