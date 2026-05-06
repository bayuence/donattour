# Panduan Laporan Kesalahan Topping

**Date:** 2026-05-03  
**Version:** 1.0  
**Status:** ✅ Implemented

---

## 📋 Cara Melaporkan Kesalahan Topping

### 1. Buka Form Laporan

**Lokasi:** Dashboard Kasir → Tombol "Lapor Error" (di header)

**Langkah:**
1. Buka halaman kasir: `/dashboard/kasir`
2. Klik tombol **"Lapor Error"** di header (icon ⚠️)
3. Form akan muncul

---

### 2. Isi Form Laporan

**Field yang Harus Diisi:**

1. **Produk yang Dipesan** (dropdown)
   - Pilih produk yang customer pesan
   - Dropdown sudah urut alfabetis A-Z ✅

2. **Produk yang Dibuat** (dropdown)
   - Pilih produk yang salah dibuat
   - Harus berbeda dengan produk yang dipesan

3. **Jumlah** (angka)
   - Berapa pcs yang salah
   - Minimal 1 pcs

4. **Alasan / Keterangan** (textarea)
   - Jelaskan kenapa terjadi kesalahan
   - Minimal 10 karakter
   - Contoh: "Salah dengar pesanan customer"

**Catatan:**
- ✅ HPP dan biaya topping **dihitung otomatis** oleh sistem
- ✅ Tidak perlu input manual HPP
- ✅ Sistem akan query database untuk HPP yang akurat per outlet

---

### 3. Konfirmasi & Submit

**Setelah klik "Laporkan Kesalahan":**
1. Muncul dialog konfirmasi
2. Cek kembali data yang diisi
3. Klik **"Ya, Laporkan"**
4. Tunggu proses (loading...)

**Jika Berhasil:**
- ✅ Muncul dialog sukses dengan icon hijau
- ✅ Menampilkan rincian HPP:
  - HPP Polos: Rp X
  - Biaya Topping: Rp Y
  - Jumlah: Z pcs
  - **Total Rugi: Rp ABC**
- ✅ Dialog otomatis tutup setelah 3 detik

**Jika Gagal:**
- ❌ Muncul pesan error di dialog konfirmasi
- ❌ Error message menjelaskan masalahnya
- ❌ Bisa klik "Kembali" untuk edit atau coba lagi

---

## 📊 Cara Melihat Laporan Kesalahan Topping

### Opsi 1: Query Database Langsung

**Tabel:** `topping_errors`

**Query untuk melihat semua laporan:**
```sql
SELECT 
  id,
  outlet_id,
  product_ordered,
  product_made,
  qty,
  reason,
  hpp_per_pcs,
  topping_cost,
  total_hpp_loss,
  reported_by,
  reported_at,
  created_at
FROM topping_errors
ORDER BY reported_at DESC
LIMIT 50;
```

**Query untuk melihat laporan hari ini:**
```sql
SELECT 
  te.*,
  o.nama as outlet_name
FROM topping_errors te
LEFT JOIN outlets o ON te.outlet_id = o.id
WHERE DATE(te.reported_at) = CURRENT_DATE
ORDER BY te.reported_at DESC;
```

**Query untuk melihat total rugi per outlet:**
```sql
SELECT 
  o.nama as outlet_name,
  COUNT(*) as total_errors,
  SUM(te.qty) as total_qty,
  SUM(te.total_hpp_loss) as total_rugi
FROM topping_errors te
LEFT JOIN outlets o ON te.outlet_id = o.id
WHERE DATE(te.reported_at) = CURRENT_DATE
GROUP BY o.id, o.nama
ORDER BY total_rugi DESC;
```

---

### Opsi 2: API Endpoint (Untuk Developer)

**Endpoint:** `GET /api/topping-errors`

**Query Parameters:**
- `outlet_id` (optional) - Filter by outlet
- `start_date` (optional) - Filter by date range start
- `end_date` (optional) - Filter by date range end
- `limit` (optional) - Limit results (default: 50)
- `offset` (optional) - Offset for pagination (default: 0)

**Contoh Request:**
```bash
# Semua laporan
GET /api/topping-errors

# Laporan outlet tertentu
GET /api/topping-errors?outlet_id=90b1763b-60b4-4899-99a1-da3358ec8877

# Laporan hari ini
GET /api/topping-errors?start_date=2026-05-03&end_date=2026-05-03

# Dengan pagination
GET /api/topping-errors?limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "outlet_id": "uuid",
        "product_ordered": "Donat Coklat",
        "product_made": "Donat Strawberry",
        "qty": 2,
        "reason": "Salah dengar pesanan customer",
        "hpp_per_pcs": 2000,
        "topping_cost": 4000,
        "total_hpp_loss": 12000,
        "reported_by": "user-uuid",
        "reported_at": "2026-05-03T12:00:00Z",
        "created_at": "2026-05-03T12:00:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Opsi 3: Dashboard Owner (Future Implementation)

**Status:** 🚧 Belum diimplementasi (Task 7.1 - 7.4)

**Akan tersedia di:**
- Dashboard Owner → Laporan Harian
- Section: Detail Rugi → Kesalahan Topping
- Menampilkan:
  - Total qty kesalahan topping
  - Total HPP loss
  - Persentase dari total rugi
  - Breakdown per produk
  - Trend chart

---

## 🔍 Troubleshooting

### Error: "Failed to create topping error report"

**Kemungkinan Penyebab:**

1. **Product not found in database**
   - Error: `Product "X" not found in database`
   - Solusi: Pastikan produk aktif di database
   - Cek: `SELECT * FROM products WHERE nama = 'X' AND is_active = true;`

2. **Production costs not found for outlet**
   - Error: `Production costs not found for outlet X`
   - Solusi: Setting HPP polos di outlet production costs
   - Cek: `SELECT * FROM outlet_production_costs WHERE outlet_id = 'X';`

3. **Invalid HPP total**
   - Error: `Product "X" has invalid HPP (must be > 0)`
   - Solusi: Update HPP produk di database
   - Cek: `SELECT nama, harga_pokok_penjualan FROM products WHERE nama = 'X';`

4. **HPP polos not configured**
   - Error: `HPP polos for ukuran "standar" is not configured`
   - Solusi: Setting cost_polos_standar atau cost_polos_mini
   - Cek: `SELECT * FROM outlet_production_costs WHERE outlet_id = 'X';`

5. **Invalid HPP calculation**
   - Error: `HPP total (6000) is less than HPP polos (8000)`
   - Solusi: Perbaiki data HPP (HPP total harus >= HPP polos)
   - Fix: Update harga_pokok_penjualan atau cost_polos

---

### Error: "Validation failed"

**Kemungkinan Penyebab:**

1. **Field kosong**
   - Error: `outlet_id is required`
   - Solusi: Pastikan outlet sudah dipilih

2. **Produk sama**
   - Error: `product_ordered and product_made must be different`
   - Solusi: Pilih produk yang berbeda

3. **Qty invalid**
   - Error: `qty must be greater than 0`
   - Solusi: Isi qty minimal 1

4. **Alasan terlalu pendek**
   - Error: `reason is required and must be at least 10 characters`
   - Solusi: Isi alasan minimal 10 karakter

---

## 📈 Analisis Data

### Query untuk Analisis

**1. Top 5 Produk dengan Kesalahan Terbanyak:**
```sql
SELECT 
  product_made,
  COUNT(*) as total_errors,
  SUM(qty) as total_qty,
  SUM(total_hpp_loss) as total_rugi
FROM topping_errors
WHERE DATE(reported_at) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY product_made
ORDER BY total_errors DESC
LIMIT 5;
```

**2. Kesalahan per Kasir:**
```sql
SELECT 
  u.name as kasir_name,
  COUNT(*) as total_errors,
  SUM(te.total_hpp_loss) as total_rugi
FROM topping_errors te
LEFT JOIN users u ON te.reported_by = u.id
WHERE DATE(te.reported_at) = CURRENT_DATE
GROUP BY u.id, u.name
ORDER BY total_errors DESC;
```

**3. Trend Kesalahan per Hari:**
```sql
SELECT 
  DATE(reported_at) as tanggal,
  COUNT(*) as total_errors,
  SUM(qty) as total_qty,
  SUM(total_hpp_loss) as total_rugi
FROM topping_errors
WHERE DATE(reported_at) >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(reported_at)
ORDER BY tanggal DESC;
```

---

## ✅ Checklist Implementasi

- [x] Form laporan kesalahan topping
- [x] API endpoint POST /api/topping-errors
- [x] API endpoint GET /api/topping-errors
- [x] HPP calculation otomatis (query outlet_production_costs + products)
- [x] Validation lengkap
- [x] Error handling dengan pesan jelas
- [x] Success message dengan breakdown HPP
- [x] Dropdown produk urut alfabetis A-Z
- [ ] Dashboard untuk lihat laporan (Task 7.1 - 7.4)
- [ ] Export laporan ke Excel/PDF (Task 9.3 - 9.4)
- [ ] Alert jika kesalahan topping tinggi (Task 8.1 - 8.4)

---

**Last Updated:** 2026-05-03  
**Status:** ✅ Fully Implemented & Documented

