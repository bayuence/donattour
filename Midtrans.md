# 📘 Dokumentasi Lengkap Integrasi Midtrans

**Sistem Pembayaran Digital untuk Kasir Donattour**

---

## 📋 Daftar Isi

1. [Ringkasan](#ringkasan)
2. [Cara Kerja Sistem](#cara-kerja-sistem)
3. [Struktur File](#struktur-file)
4. [Konfigurasi](#konfigurasi)
5. [Cara Testing](#cara-testing)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)

---

## 🎯 Ringkasan

### Status: ✅ 100% Selesai

Integrasi Midtrans payment gateway untuk sistem kasir sudah selesai dan siap digunakan.

### Fitur:
- ✅ Pembayaran Tunai (langsung simpan, tidak pakai Midtrans)
- ✅ Pembayaran QRIS (via Midtrans Snap)
- ✅ Pembayaran GoPay (via Midtrans Snap)
- ✅ Pembayaran ShopeePay (via Midtrans Snap)
- ✅ Pembayaran Transfer Bank (via Midtrans Snap)
- ✅ Pembayaran Kartu Kredit (via Midtrans Snap)
- ✅ Webhook untuk update status otomatis
- ✅ Struk dengan detail pembayaran digital

### Mode:
- **Sandbox** (Testing) - Tidak pakai uang beneran ✅
- **Production** (Live) - Siap untuk production

---

## 🔄 Cara Kerja Sistem

### Alur Pembayaran Tunai
```
1. Kasir klik "Bayar"
2. Muncul modal "Pilih Metode Pembayaran" dengan 2 pilihan:
   - Tunai
   - Pembayaran Digital
3. Kasir pilih "Tunai"
4. Muncul modal input nominal bayar
5. Kasir input nominal (misal: Rp 50.000)
6. Klik "Konfirmasi Bayar"
7. ✅ Langsung simpan ke database
8. ✅ Tampilkan struk dengan kembalian
```

### Alur Pembayaran Non-Tunai (Midtrans)
```
1. Kasir klik "Bayar"
2. Muncul modal "Pilih Metode Pembayaran" dengan 2 pilihan:
   - Tunai
   - Pembayaran Digital
3. Kasir pilih "Pembayaran Digital"
4. ✅ Modal langsung tutup
5. ✅ Sistem panggil API: /api/midtrans/create-transaction
6. ✅ API buat transaksi di Midtrans
7. ✅ API return snap_token (TIDAK simpan ke database dulu)
8. ✅ Frontend langsung buka popup Midtrans Snap
9. ✅ Pelanggan pilih metode bayar di popup (QRIS/GoPay/ShopeePay/Transfer/Kartu)
10. ✅ Pelanggan bayar
11. ✅ Midtrans kirim callback ke frontend (onSuccess)
12. ✅ Frontend panggil API: /api/midtrans/save-order
13. ✅ API simpan order ke database (status: paid)
14. ✅ Popup tutup otomatis
15. ✅ Tampilkan struk dengan detail Midtrans
```

**PENTING:** 
- Tidak ada 2 popup yang membingungkan!
- Untuk tunai: 1 modal pilih metode → 1 modal input nominal
- Untuk digital: 1 modal pilih metode → langsung popup Midtrans resmi

---

## 📁 Struktur File

### Backend (API & Database)
```
QueryDATABASE/
  └── 28-add-midtrans-integration.sql    # Schema database

app/api/midtrans/
  ├── create-transaction/route.ts        # Buat transaksi
  ├── webhook/route.ts                   # Terima notifikasi
  └── check-status/route.ts              # Cek status

lib/supabase/
  └── server.ts                          # Supabase client untuk API

types/
  └── midtrans-client.d.ts               # TypeScript types
```

### Frontend (Kasir)
```
app/dashboard/kasir/
  ├── hooks/
  │   └── useKasir.ts                    # Hook utama dengan logic pembayaran
  ├── components/
  │   ├── MidtransSnapWrapper.tsx        # Wrapper untuk popup Midtrans Snap
  │   ├── PaymentMethodSelector.tsx      # Modal pilih metode (Tunai/Digital)
  │   ├── CashPaymentModal.tsx           # Modal input nominal tunai
  │   └── ReceiptModal.tsx               # Struk pembayaran
  └── page.tsx                           # Halaman kasir utama
```

### Helper Files (Opsional)
```
app/dashboard/kasir/midtrans/
  ├── types.ts                           # Type definitions
  ├── config.ts                          # Configuration
  ├── utils/
  │   ├── formatter.ts                   # Format helpers
  │   └── transaction.ts                 # Transaction helpers
  ├── hooks/
  │   └── useMidtrans.ts                 # Midtrans hook
  └── components/
      ├── MidtransSnap.tsx               # Snap component
      └── PaymentStatus.tsx              # Status component
```

---

## ⚙️ Konfigurasi

### 1. Environment Variables

File: `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://elduyooybiscdqwwzfwv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Midtrans Sandbox (Testing)
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your-sandbox-client-key
MIDTRANS_SERVER_KEY=your-sandbox-server-key
MIDTRANS_IS_PRODUCTION=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Cara Mendapatkan API Keys

**Sandbox (Testing):**
1. Daftar di: https://dashboard.sandbox.midtrans.com/register
2. Login ke dashboard
3. Klik "Settings" → "Access Keys"
4. Copy:
   - **Client Key** → `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
   - **Server Key** → `MIDTRANS_SERVER_KEY`

**Production (Live):**
1. Login ke: https://dashboard.midtrans.com
2. Lengkapi verifikasi bisnis
3. Klik "Settings" → "Access Keys"
4. Copy Client Key dan Server Key
5. Update `.env.local`:
   ```env
   MIDTRANS_IS_PRODUCTION=true
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-xxxxx
   MIDTRANS_SERVER_KEY=Mid-server-xxxxx
   ```

### 3. Package Dependencies

```json
{
  "dependencies": {
    "midtrans-client": "^1.3.1"
  }
}
```

Install dengan:
```bash
npm install midtrans-client
```

---

## 🧪 Cara Testing

### Persiapan

1. **Jalankan development server:**
   ```bash
   npm run dev
   ```

2. **Buka halaman kasir:**
   ```
   http://localhost:3000/dashboard/kasir
   ```

### Test 1: Pembayaran Tunai ✅

**Langkah:**
1. Pilih outlet dan kasir
2. Tambah produk ke keranjang
3. Klik "Bayar"
4. Pilih metode **"Tunai"**
5. Input nominal (misal: Rp 50.000)
6. Klik "Konfirmasi Bayar"

**Hasil yang Diharapkan:**
- ✅ Tidak ada popup Midtrans
- ✅ Langsung tampil struk
- ✅ Kembalian dihitung dengan benar
- ✅ Data tersimpan di database

### Test 2: Pembayaran QRIS 💙

**Langkah:**
1. Pilih outlet dan kasir
2. Tambah produk ke keranjang
3. Klik "Bayar"
4. Pilih metode **"Pembayaran Digital"**
5. Popup Midtrans langsung muncul
6. Pilih **"QRIS"** di popup
7. QR code tampil

**Hasil yang Diharapkan:**
- ✅ Tidak ada modal kedua yang mengganggu
- ✅ Langsung muncul popup Midtrans resmi
- ✅ Ada logo ENCE DEV di popup
- ✅ Ada pilihan: QRIS, GoPay, ShopeePay, Transfer Bank, Kartu Kredit

**Cara Bayar (Sandbox):**
- Download app **"Midtrans Simulator"** (Play Store/App Store)
- Scan QR code
- Klik "Pay"

**Setelah Bayar:**
- ✅ Popup tutup otomatis
- ✅ Struk muncul
- ✅ Ada bagian "DETAIL PEMBAYARAN DIGITAL"
- ✅ ID Transaksi tampil
- ✅ Tipe Pembayaran: "qris"
- ✅ Badge "Pembayaran Terverifikasi"

### Test 3: Pembayaran GoPay 💚

**Langkah:**
1. Pilih metode **"Pembayaran Digital"**
2. Popup Midtrans muncul
3. Pilih **"GoPay"**
4. Input nomor: `081234567890`
5. Klik "Pay"
6. Pilih "Success"

**Hasil:**
- ✅ Struk muncul dengan detail Midtrans
- ✅ Tipe Pembayaran: "gopay"

### Test 4: Pembayaran ShopeePay 🟠

**Langkah:**
1. Pilih metode **"Pembayaran Digital"**
2. Popup Midtrans muncul
3. Pilih **"ShopeePay"**
4. Input nomor: `081234567890`
5. Klik "Pay"

**Hasil:**
- ✅ Struk muncul dengan detail Midtrans
- ✅ Tipe Pembayaran: "shopeepay"

### Test 5: Pembayaran Kartu Kredit 💳

**Langkah:**
1. Pilih metode **"Pembayaran Digital"**
2. Popup Midtrans muncul
3. Pilih **"Credit Card"**
4. Input data kartu:
   - Nomor: `4811 1111 1111 1114` (sukses)
   - CVV: `123`
   - Expiry: `12/25`
5. Klik "Pay"

**Hasil:**
- ✅ Struk muncul dengan detail Midtrans
- ✅ Tipe Pembayaran: "credit_card"

### Test 6: Pembatalan ❌

**Langkah:**
1. Klik "Bayar"
2. Pilih metode **"Pembayaran Digital"**
3. Popup Midtrans muncul
4. **Klik tombol X** untuk tutup

**Hasil:**
- ✅ Popup tutup
- ✅ Keranjang masih ada
- ✅ Bisa coba bayar lagi

### Kredensial Test (Sandbox)

| Metode | Kredensial |
|--------|------------|
| **QRIS** | Pakai app "Midtrans Simulator" |
| **GoPay** | Nomor: `081234567890`, PIN: `123456` |
| **ShopeePay** | Nomor: `081234567890` |
| **Kartu Sukses** | `4811 1111 1111 1114`, CVV: `123` |
| **Kartu Gagal** | `4911 1111 1111 1113`, CVV: `123` |

---

## 🐛 Troubleshooting

### Problem 1: Error "item_details Name is required"

**Gejala:**
- Error: `Midtrans API is returning API error. HTTP status code: 400. API response: {"error_messages":["item_details Name is required"]}`

**Penyebab:**
- Ada item di keranjang yang `name` atau `nama` nya kosong/undefined
- Biasanya terjadi pada produk custom atau paket

**Solusi:**
✅ **Sudah diperbaiki!** Sistem sekarang otomatis:
- Validasi semua item sebelum kirim ke Midtrans
- Berikan nama fallback kalau kosong (misal: "Item 1", "Item 2")
- Pastikan price dan quantity tidak negatif

**Kalau masih error:**
1. Buka console browser (F12)
2. Cari log: "📋 Items yang akan dikirim:"
3. Cek apakah ada item dengan `name: ""` atau `name: null`
4. Screenshot dan tanya developer

### Problem 2: Popup Midtrans Tidak Muncul

**Gejala:**
- Pilih "Pembayaran Digital" tapi tidak ada popup

**Penyebab:**
- Client Key salah atau tidak lengkap
- API create-transaction error
- Script Snap tidak load

**Solusi:**
1. Buka console browser (F12)
2. Cek error di console
3. Cari log: "📦 Membuat transaksi Midtrans..."
4. Cari log: "🎫 Snap Token: ..."
5. Pastikan Client Key benar di `.env.local`
6. Restart server: `npm run dev`

### Problem 3: Pembayaran Sukses Tapi Struk Tidak Muncul

**Gejala:**
- Bayar sukses di popup tapi struk tidak tampil

**Penyebab:**
- Callback `onSuccess` tidak jalan
- Error saat set struk data

**Solusi:**
1. Cek console browser untuk error
2. Cari log: "✅ Pembayaran Midtrans sukses"
3. Cek apakah `handleMidtransSuccess` dipanggil
4. Cek state `strukData` di React DevTools

### Problem 4: Webhook Tidak Masuk

**Gejala:**
- Pembayaran sukses tapi status di database tidak update

**CATATAN PENTING:**
- Webhook TIDAK digunakan di sistem ini!
- Order langsung disimpan setelah pembayaran sukses (via callback frontend)
- Webhook hanya untuk backup/audit trail

**Kalau Tetap Ingin Setup Webhook:**
1. Install ngrok: https://ngrok.com/
2. Jalankan: `ngrok http 3000`
3. Copy URL ngrok (misal: `https://abc123.ngrok.io`)
4. Set di Midtrans Dashboard:
   - Settings → Configuration
   - Notification URL: `https://abc123.ngrok.io/api/midtrans/webhook`
5. Test pembayaran lagi
6. Cek terminal untuk log webhook

### Problem 5: Server Key Error

**Gejala:**
- Error: "Unauthorized" atau "Invalid signature"

**Penyebab:**
- Server Key terpotong atau salah

**Solusi:**
1. Login ke https://dashboard.sandbox.midtrans.com
2. Settings → Access Keys
3. Copy Server Key yang lengkap
4. Update `.env.local`
5. Restart server

### Problem 6: Error "Cannot find module 'midtrans-client'"

**Solusi:**
```bash
npm install midtrans-client
```

### Problem 7: TypeScript Error di midtrans-client

**Solusi:**
File `types/midtrans-client.d.ts` sudah dibuat, pastikan ada di project.

---

## 📡 API Reference

### 1. Create Transaction

**Endpoint:** `POST /api/midtrans/create-transaction`

**Request Body:**
```json
{
  "amount": 50000,
  "customerName": "John Doe",
  "customerPhone": "081234567890",
  "items": [
    {
      "id": "prod-123",
      "name": "Donat Coklat",
      "price": 5000,
      "quantity": 10,
      "category": "food"
    }
  ],
  "outletId": "outlet-123",
  "cashierId": "kasir-123",
  "channel": "toko"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "orderId": "ORDER-20260429-123456",
    "snapToken": "abc123xyz...",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

### 2. Webhook

**Endpoint:** `POST /api/midtrans/webhook`

**Request Body (dari Midtrans):**
```json
{
  "order_id": "ORDER-20260429-123456",
  "transaction_status": "settlement",
  "payment_type": "qris",
  "gross_amount": "50000",
  "transaction_time": "2026-04-29 10:30:00",
  "signature_key": "abc123...",
  ...
}
```

**Response:**
```json
{
  "success": true
}
```

**Fungsi:**
- Verifikasi signature untuk keamanan
- Update status order di database
- Simpan log webhook

### 3. Check Status

**Endpoint:** `GET /api/midtrans/check-status?orderId=ORDER-123`

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORDER-20260429-123456",
    "transactionStatus": "settlement",
    "paymentType": "qris",
    "paymentStatus": "paid",
    "grossAmount": "50000",
    "transactionTime": "2026-04-29 10:30:00",
    "settlementTime": "2026-04-29 10:30:05"
  }
}
```

---

## 🗄️ Database Schema

### Tabel: `orders`

**Kolom Baru untuk Midtrans:**

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `midtrans_order_id` | TEXT | ID order dari Midtrans (unik) |
| `snap_token` | TEXT | Token untuk buka Snap popup |
| `snap_redirect_url` | TEXT | URL redirect Snap |
| `payment_status` | TEXT | Status: pending, paid, failed |
| `payment_type` | TEXT | Tipe: qris, gopay, shopeepay, dll |
| `transaction_status` | TEXT | Status dari Midtrans |
| `fraud_status` | TEXT | Status fraud check |
| `transaction_time` | TIMESTAMPTZ | Waktu transaksi |
| `settlement_time` | TIMESTAMPTZ | Waktu settlement |
| `expired_at` | TIMESTAMPTZ | Waktu kadaluarsa |

### Tabel: `midtrans_webhooks`

**Struktur:**

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `order_id` | TEXT | ID order |
| `transaction_status` | TEXT | Status transaksi |
| `payment_type` | TEXT | Tipe pembayaran |
| `raw_notification` | JSONB | Data lengkap dari webhook |
| `created_at` | TIMESTAMPTZ | Waktu webhook masuk |

**Fungsi:**
- Audit trail semua notifikasi
- Debug kalau ada masalah
- Tracking history pembayaran

### Fungsi: `generate_midtrans_order_id()`

**Fungsi:**
Generate ID order unik dengan format: `ORDER-YYYYMMDD-XXXXXX`

**Contoh:**
- `ORDER-20260429-123456`
- `ORDER-20260429-123457`

**Cara Pakai:**
```sql
SELECT generate_midtrans_order_id();
```

---

## 📊 Flow Diagram

### Pembayaran Tunai
```
[Kasir klik "Bayar"] 
       ↓
[PaymentMethodSelector: Pilih "Tunai"]
       ↓
[CashPaymentModal: Input nominal]
       ↓
[prosesBayar()]
       ↓
[Database: Simpan order]
       ↓
[ReceiptModal: Tampilkan struk]
```

### Pembayaran Non-Tunai
```
[Kasir klik "Bayar"]
       ↓
[PaymentMethodSelector: Pilih "Pembayaran Digital"]
       ↓
[prosesBayar()]
       ↓
[API: /api/midtrans/create-transaction]
       ↓
[Midtrans: Buat Snap token]
       ↓
[Return: snap_token]
       ↓
[MidtransSnapWrapper: Load script & buka popup]
       ↓
[Popup Midtrans Snap muncul]
       ↓
[User pilih metode & bayar]
       ↓
[Midtrans: Callback onSuccess]
       ↓
[API: /api/midtrans/save-order]
       ↓
[Database: Simpan order (status: paid)]
       ↓
[Popup tutup]
       ↓
[ReceiptModal: Tampilkan struk dengan detail Midtrans]
```

---

## 🔐 Keamanan

### 1. Signature Verification

Webhook dari Midtrans diverifikasi dengan signature untuk memastikan request benar-benar dari Midtrans.

**Cara Kerja:**
```javascript
const signatureKey = crypto
  .createHash('sha512')
  .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
  .digest('hex');

if (signatureKey !== notification.signature_key) {
  // Reject request
}
```

### 2. Environment Variables

Jangan commit file `.env.local` ke Git!

**File `.gitignore` harus include:**
```
.env.local
.env*.local
```

### 3. Server Key

Server Key harus disimpan di environment variable, **JANGAN** di code!

**❌ SALAH:**
```javascript
const serverKey = 'Mid-server-abc123...'; // Jangan!
```

**✅ BENAR:**
```javascript
const serverKey = process.env.MIDTRANS_SERVER_KEY;
```

---

## 🚀 Deploy ke Production

### 1. Update Environment Variables

```env
# Production
MIDTRANS_IS_PRODUCTION=true
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-xxxxx (production)
MIDTRANS_SERVER_KEY=Mid-server-xxxxx (production)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Set Webhook URL di Midtrans

1. Login ke https://dashboard.midtrans.com
2. Settings → Configuration
3. Set Notification URL:
   ```
   https://yourdomain.com/api/midtrans/webhook
   ```

### 3. Test di Production

**PENTING:** Test dengan nominal kecil dulu!

1. Buat transaksi Rp 1.000
2. Bayar dengan metode yang Anda pakai
3. Verifikasi:
   - Pembayaran masuk ke rekening Midtrans
   - Status order update di database
   - Webhook masuk dengan benar

---

## 📞 Support

### Dokumentasi Midtrans
- Snap: https://docs.midtrans.com/en/snap/overview
- API: https://api-docs.midtrans.com/
- Sandbox Testing: https://docs.midtrans.com/en/technical-reference/sandbox-test

### Dashboard
- Sandbox: https://dashboard.sandbox.midtrans.com
- Production: https://dashboard.midtrans.com

### Kontak Midtrans
- Email: support@midtrans.com
- Slack: https://midtrans.com/slack

---

## ✅ Checklist

### Setup
- [ ] Package `midtrans-client` terinstall
- [ ] File `.env.local` sudah dikonfigurasi
- [ ] SQL migration sudah dijalankan
- [ ] Server bisa jalan tanpa error

### Testing Sandbox
- [ ] Pembayaran tunai jalan normal
- [ ] Pembayaran QRIS berhasil
- [ ] Pembayaran GoPay berhasil
- [ ] Pembayaran ShopeePay berhasil
- [ ] Pembayaran kartu kredit berhasil
- [ ] Pembatalan bisa dilakukan
- [ ] Struk tampil dengan benar
- [ ] Detail Midtrans tampil di struk

### Database
- [ ] Order tersimpan dengan field Midtrans
- [ ] Webhook log tersimpan
- [ ] Status order update otomatis

### Production (Opsional)
- [ ] Akun Midtrans production sudah verified
- [ ] Environment variables production sudah diset
- [ ] Webhook URL sudah diset di dashboard
- [ ] Test dengan nominal kecil berhasil

---

## 🎉 Selesai!

Dokumentasi lengkap integrasi Midtrans untuk sistem kasir Donattour.

**Kalau ada pertanyaan atau masalah, silakan hubungi developer!** 😊

---

**Terakhir diupdate:** 29 April 2026  
**Versi:** 2.0.0  
**Status:** Production Ready ✅  
**Update Terbaru:** Flow pembayaran disederhanakan - tidak ada 2 popup yang membingungkan!

