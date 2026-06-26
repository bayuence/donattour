# 🔍 TROUBLESHOOTING & FAQ: OFFLINE MODE

Dokumen ini berisi solusi untuk kendala yang mungkin terjadi saat menggunakan Donattour POS dalam mode offline.

## 🛠️ Kendala Umum dan Solusi

### 1. Halaman Kasir Tidak Bisa Dibuka Saat Pertama Kali Offline
- **Penyebab:** Kasir belum pernah memuat halaman kasir saat online, sehingga file halaman belum tersimpan di cache komputer.
- **Solusi:** Pastikan minimal satu kali Anda membuka halaman kasir di browser saat online agar Service Worker dapat mengunduh seluruh kebutuhan halaman.

### 2. Transaksi Offline Tidak Muncul di Laporan Harian Server Pusat
- **Penyebab:** Koneksi internet di toko masih bermasalah, sehingga transaksi masih tertahan di komputer lokal.
- **Solusi:** Periksa status ikon Wifi di pojok kanan atas kasir. Jika ada angka "pending", tunggu sampai internet kembali aktif agar proses sinkronisasi otomatis berjalan.

### 3. Error: "Username tidak terdaftar untuk akses offline" saat login
- **Penyebab:** Karyawan belum pernah login dengan akun tersebut di komputer ini saat online.
- **Solusi:** Lakukan login satu kali saat online agar kredensial pengguna terenkripsi dan disimpan di cache lokal komputer tersebut.

---

## ❓ FAQ (Frequently Asked Questions)

**Q: Apakah aman jika komputer kasir dimatikan saat ada transaksi "pending"?**  
*A: Ya, aman. Data transaksi disimpan di memori permanen browser (IndexedDB). Data tidak akan hilang meskipun komputer dimatikan atau browser ditutup. Namun, pastikan jangan melakukan "Clear Cache/Clear Site Data" pada browser sebelum data tersinkronisasi.*

**Q: Apakah struk bisa dicetak saat offline?**  
*A: Bisa. Cetak struk bluetooth/thermal menggunakan printer lokal berfungsi 100% normal saat offline.*
