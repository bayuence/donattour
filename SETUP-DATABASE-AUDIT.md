# 🔧 SETUP DATABASE AUDIT - MANUAL STEPS

## ⚠️ PENTING: Jalankan Ini Dulu!

Function `exec_sql` perlu di-upgrade agar Kiro AI bisa baca database penuh.

---

## 📝 LANGKAH 1: Upgrade exec_sql Function

### Cara:

1. **Buka Supabase Dashboard**
   - Go to: https://supabase.com
   - Login
   - Pilih project Anda

2. **Buka SQL Editor**
   - Klik **"SQL Editor"** di sidebar kiri
   - Atau: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

3. **Copy Paste SQL**
   - Buka file: `scripts/supabase-exec-FULL.sql`
   - **Copy SEMUA isinya**
   - **Paste** di SQL Editor

4. **Run**
   - Klik tombol **"Run"** (pojok kanan bawah)
   - Atau tekan: `Ctrl + Enter`

5. **Tunggu Success**
   - Akan muncul: "Success. No rows returned"
   - Atau: "✅ EXEC_SQL FUNCTION UPGRADED!"

---

## ✅ LANGKAH 2: Test Audit

Setelah upgrade function, jalankan:

```bash
npm run audit:db
```

**Expected output:**
```
📊 Scanning database...
   Found: 25 tables
   Found: 18 foreign keys
   Found: 42 indexes
   Found: 8 functions

📝 Scanning code for table usage...
   Found: 22 tables referenced in code

📋 TABLE ANALYSIS
✅ users                                      1,234 rows   ✓ USED
✅ outlets                                    5,678 rows   ✓ USED
✅ expenses                                      45 rows   ✓ USED
...
```

---

## 🔍 LANGKAH 3: Review Report

Buka file: `scripts/database-audit-report.json`

Lihat:
- Total tables
- Unused tables
- Empty tables
- Recommendations

---

## 🧹 LANGKAH 4: Cleanup (Optional)

Jika ada recommendations, jalankan:

```bash
npm run cleanup:db
```

---

## ❌ TROUBLESHOOTING

### Problem: "exec_sql function not found"

**Artinya:** Function belum dibuat sama sekali.

**Solusi:**
1. Jalankan `scripts/supabase-exec.sql` dulu (yang lama)
2. Lalu jalankan `scripts/supabase-exec-FULL.sql` (yang baru)

---

### Problem: Audit masih return 0 tables

**Artinya:** Function upgrade belum berhasil atau masih pakai function lama.

**Solusi:**
1. Buka Supabase Dashboard → SQL Editor
2. Jalankan query ini untuk cek:
   ```sql
   SELECT exec_sql('SELECT 1 as test');
   ```
3. Jika return `{"success": true}` saja → function lama
4. Jika return `{"success": true, "data": [...]}` → function baru ✅

5. Jika masih function lama, jalankan ini:
   ```sql
   DROP FUNCTION IF EXISTS exec_sql(TEXT);
   ```
6. Lalu copy paste `scripts/supabase-exec-FULL.sql` lagi

---

### Problem: Permission denied

**Solusi:**
1. Pastikan pakai `SUPABASE_SERVICE_ROLE_KEY`
2. Bukan `ANON_KEY`
3. Get dari: Supabase Dashboard → Settings → API → service_role key

---

## 🎯 SETELAH SETUP BERHASIL

Kiro AI akan bisa:
- ✅ Baca semua table schema
- ✅ Baca semua kolom dan tipe data
- ✅ Deteksi table yang tidak dipakai
- ✅ Deteksi field name mismatch
- ✅ Auto-fix inconsistencies
- ✅ Generate migration yang tepat
- ✅ Suggest optimization

**Benefit:**
- Tidak perlu manual kasih tau struktur database
- Auto-detect saat tambah fitur baru
- Database selalu clean dan optimal
- Development lebih cepat

---

**Next:** Setelah setup berhasil, baca `DATABASE-MANAGEMENT.md` untuk workflow lengkap.
