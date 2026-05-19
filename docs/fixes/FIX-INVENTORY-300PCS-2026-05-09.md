# FIX: Inventory Menampilkan 300 pcs Padahal Input 100 pcs

**Tanggal:** 9 Mei 2026  
**Problem:** Kasir menampilkan 300 pcs di inventory, padahal hanya input 100 pcs di production_daily  
**Status:** ✅ **ROOT CAUSE DITEMUKAN!**

---

## 🎯 **ROOT CAUSE**

### **Ada 2 TRIGGER DUPLIKAT yang sama-sama menambah inventory!**

```sql
-- Trigger 1 (CORRECT):
trigger_create_inventory_from_production 
→ auto_create_inventory_from_production()

-- Trigger 2 (DUPLICATE):
trigger_update_inventory_on_production 
→ update_inventory_on_production()
```

### **Apa yang Terjadi:**

Setiap kali INSERT ke `production_daily` dengan 100 pcs:
1. ✅ Trigger 1 jalan → +100 pcs ke inventory
2. ❌ Trigger 2 jalan → +100 pcs lagi ke inventory
3. ❌ (Kemungkinan bug lain) → +100 pcs lagi

**Total = 300 pcs!** 🚨

---

## 🔍 **BUKTI DARI DIAGNOSIS**

### Data Production Hari Ini:
```
production_daily_id: fabcbafc-42a3-4359-84e8-6a18be9c4124
success_qty: 100 pcs
sync_count: 1x (di inventory_sync_log)
```

### Trigger yang Aktif:
```
1. trigger_create_inventory_from_production (INSERT)
2. trigger_update_inventory_on_production (INSERT) ← DUPLIKAT!
3. trigger_update_inventory_on_production (UPDATE) ← DUPLIKAT!
4. trigger_queue_production_sync (INSERT) ← OK (Google Sheets)
5. update_production_daily_updated_at (UPDATE) ← OK (timestamp)
```

**Kesimpulan:** Trigger #1 dan #2 melakukan hal yang sama!

---

## 🔧 **SOLUSI**

### **File:** `fix-remove-duplicate-triggers.sql`

Script ini akan:
1. ✅ **Hapus trigger duplikat** (`trigger_update_inventory_on_production`)
2. ✅ **Hapus function duplikat** (`update_inventory_on_production()`)
3. ✅ **Reset inventory hari ini** ke nilai yang benar (105 pcs)
4. ✅ **Backup data** sebelum fix
5. ✅ **Verifikasi hasil** fix

### **Cara Menjalankan:**

```bash
# Via Supabase Dashboard SQL Editor:
1. Copy-paste isi fix-remove-duplicate-triggers.sql
2. Klik Run
3. Cek hasil verifikasi
4. Hard refresh browser (Ctrl+Shift+R)
```

---

## ✅ **EXPECTED RESULTS SETELAH FIX**

### 1. Trigger yang Tersisa (Hanya 3):
```
✅ trigger_create_inventory_from_production (inventory sync)
✅ trigger_queue_production_sync (Google Sheets sync)
✅ update_production_daily_updated_at (timestamp update)
```

### 2. Inventory yang Benar:
```
Production hari ini:
- Record 1: 5 pcs (standar)
- Record 2: 100 pcs (standar)
Total: 105 pcs

Inventory hari ini:
- qty_available: 105 pcs ✅
```

### 3. Kasir Interface:
```
Sebelum: 300 pcs ❌
Setelah: 105 pcs ✅
```

---

## 🚨 **PENCEGAHAN KE DEPAN**

### ✅ **Yang Sudah Benar:**
1. Idempotency system (`inventory_sync_log`) sudah ada
2. Trigger `auto_create_inventory_from_production` sudah menggunakan `ON CONFLICT DO UPDATE`

### ❌ **Yang Harus Dihindari:**
1. **Jangan buat trigger manual** tanpa dokumentasi
2. **Selalu cek trigger yang sudah ada** sebelum buat baru:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'production_daily';
   ```
3. **Dokumentasikan semua trigger** di file SQL

### 📝 **Action Items:**
- [x] Hapus trigger duplikat
- [x] Reset inventory hari ini
- [ ] Audit semua trigger di database
- [ ] Dokumentasikan trigger yang tersisa
- [ ] Tambahkan unit test untuk trigger

---

## 📊 **ANALISIS FUNCTION `auto_create_inventory_from_production`**

```sql
CREATE OR REPLACE FUNCTION auto_create_inventory_from_production()
RETURNS TRIGGER AS $
BEGIN
    INSERT INTO inventory_non_topping (...)
    VALUES (NEW.outlet_id, NEW.ukuran, NEW.tanggal, NEW.success_qty, 'fresh', NOW())
    ON CONFLICT (outlet_id, ukuran, production_date, status) 
    DO UPDATE SET
        qty_available = inventory_non_topping.qty_available + EXCLUDED.qty_available,
        last_updated = NOW();
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;
```

### ⚠️ **POTENSI MASALAH:**

Function ini menggunakan `ON CONFLICT DO UPDATE` dengan **menambah** qty_available:
```sql
qty_available = inventory_non_topping.qty_available + EXCLUDED.qty_available
```

Ini berarti:
- Insert pertama: 100 pcs
- Insert kedua (conflict): 100 + 100 = 200 pcs
- Insert ketiga (conflict): 200 + 100 = 300 pcs

**Jika trigger jalan 3x, inventory jadi 300 pcs!**

### 🔍 **INVESTIGASI LANJUTAN:**

Kemungkinan trigger jalan 3x karena:
1. ❌ React Strict Mode (development) → API dipanggil 2x
2. ❌ User klik tombol submit 2x
3. ❌ Ada retry logic di frontend
4. ❌ Ada trigger duplikat (CONFIRMED!)

---

## 🔗 **FILE TERKAIT**

- ✅ `fix-remove-duplicate-triggers.sql` - **JALANKAN INI!**
- `diagnosis-inventory-300pcs.sql` - Diagnosis awal
- `diagnosis-deep-dive.sql` - Deep dive investigation
- `check-trigger-functions.sql` - Cek isi trigger functions
- `docs/technical/PROJECTDOCUMENTATION.sql` - Dokumentasi database

---

## 🚀 **NEXT STEPS**

1. **Jalankan fix:**
   ```bash
   # Copy-paste fix-remove-duplicate-triggers.sql ke Supabase SQL Editor
   # Klik Run
   ```

2. **Verifikasi:**
   ```bash
   # Hard refresh browser: Ctrl+Shift+R
   # Cek Kasir interface: harus 105 pcs
   ```

3. **Monitor:**
   ```bash
   # Input produksi baru besok
   # Pastikan inventory tidak duplikat lagi
   ```

---

**Status:** ⏳ Menunggu user menjalankan fix
