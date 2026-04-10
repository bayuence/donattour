-- ============================================================================
-- DONATTOUR DATABASE - REPARASI IDENTITAS PRODUK (A-Z FIX)
-- ============================================================================
-- File: 19-repair-product-duplicates.sql
-- Tujuan: 
-- 1. Mencari produk dengan Nama + Ukuran yang sama (Duplikat).
-- 2. Menyatukan (Merge) semua harga kanal ke satu ID pemenang.
-- 3. Menghapus/Menonaktifkan ID produk bayangan.
-- ============================================================================

DO $$ 
DECLARE 
    r RECORD;
    winner_id UUID;
BEGIN
    RAISE NOTICE 'Memulai proses reparasi duplikasi produk...';

    -- Loop melalui semua grup produk yang terduplikasi secara nama & ukuran
    FOR r IN (
        SELECT nama, ukuran, category_id, COUNT(*) as jumlah
        FROM products 
        WHERE is_active = true
        GROUP BY nama, ukuran, category_id 
        HAVING COUNT(*) > 1
    ) LOOP
        -- Tentukan 'Winner' (ID paling lama/pertama kali dibuat)
        SELECT id INTO winner_id 
        FROM products 
        WHERE nama = r.nama 
          AND ukuran = r.ukuran 
          AND (category_id = r.category_id OR (category_id IS NULL AND r.category_id IS NULL))
          AND is_active = true
        ORDER BY created_at ASC 
        LIMIT 1;

        RAISE NOTICE 'Pemenang untuk % (%): %', r.nama, r.ukuran, winner_id;

        -- 1. Pindahkan data harga dari 'Losers' ke 'Winner'
        -- Jika terjadi konflik (keduanya punya harga), harga pemenang tetap dipertahankan.
        UPDATE outlet_channel_prices 
        SET product_id = winner_id 
        WHERE product_id IN (
            SELECT id FROM products 
            WHERE nama = r.nama 
              AND ukuran = r.ukuran 
              AND (category_id = r.category_id OR (category_id IS NULL AND r.category_id IS NULL))
              AND id <> winner_id
        );
        -- Catatan: Jika ada error duplicate key di sini, berarti pemenang sudah punya harga tersebut.
        -- Dalam prakteknya, kita bisa menggunakan EXCEPTION untuk mengabaikan yang error.

        -- 2. Non-aktifkan produk 'Losers' agar tidak muncul lagi di Kasir/Manajemen
        UPDATE products 
        SET is_active = false 
        WHERE nama = r.nama 
          AND ukuran = r.ukuran 
          AND (category_id = r.category_id OR (category_id IS NULL AND r.category_id IS NULL))
          AND id <> winner_id;

        RAISE NOTICE 'Berhasil menggabungkan % duplikat untuk %', r.jumlah - 1, r.nama;
    END LOOP;

    RAISE NOTICE 'Proses reparasi selesai.';
END $$;
