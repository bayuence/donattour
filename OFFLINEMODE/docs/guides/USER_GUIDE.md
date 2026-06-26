# 📴 USER GUIDE: OFFLINE MODE FOR CASHIERS (KASIR)

Panduan ini menjelaskan cara menggunakan Donattour POS dalam mode offline saat toko mengalami gangguan koneksi internet.

## 🟢 1. Cara Kerja Mode Offline

Donattour POS dirancang menggunakan teknologi **Offline-First**. Ini berarti:
- Aplikasi akan terus berfungsi normal walaupun koneksi internet terputus.
- Anda dapat membuat pesanan, mencetak struk, dan melayani pelanggan tanpa hambatan.
- Transaksi offline akan disimpan dengan awalan nomor order **`OFFLINE-XXXXXX`**.
- Data pesanan yang dibuat offline disimpan dengan aman di dalam memori lokal browser komputer/tablet Anda.

---

## 📡 2. Indikator Koneksi

Di pojok kanan atas layar kasir, terdapat indikator koneksi:
- **Wifi Hijau (Online):** Semua fungsi berjalan normal dan data tersinkronisasi langsung ke pusat.
- **Wifi Oranye / WifiOff (Offline):** Menunjukkan bahwa Anda sedang dalam mode offline. Anda tetap bisa melayani transaksi.
- **Badge Pending (Misal: "2 pending"):** Menunjukkan jumlah transaksi yang masih tertahan di komputer Anda dan belum terkirim ke server pusat.

---

## 🛒 3. Melakukan Transaksi Offline

1. Masukkan produk donat ke keranjang belanja pelanggan seperti biasa.
2. Klik tombol **Bayar**.
3. Pilih metode pembayaran (Tunai/Cash atau Transfer sesuai yang tertera).
4. Klik **Konfirmasi**.
5. Struk transaksi akan muncul di layar dan Anda dapat mencetaknya langsung.
6. Aplikasi akan menampilkan notifikasi: **`📡 Mode Offline: Transaksi disimpan offline`**.

---

## 🔄 4. Sinkronisasi Data Otomatis

Begitu koneksi internet toko kembali aktif:
1. Sistem akan secara otomatis mendeteksi internet dan mengirimkan semua transaksi tertunda ke server pusat.
2. Anda akan melihat animasi sinkronisasi di kanan atas.
3. Setelah sinkronisasi selesai, stok donat di server pusat akan diperbarui secara otomatis.
