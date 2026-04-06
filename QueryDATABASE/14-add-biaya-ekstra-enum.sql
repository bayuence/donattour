-- Update constraint to allow 'biaya_ekstra'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tipe_produk_check;
ALTER TABLE products ADD CONSTRAINT products_tipe_produk_check 
    CHECK (tipe_produk IN ('donat_base', 'donat_varian', 'tambahan', 'box', 'paket', 'bundling', 'biaya_ekstra'));
