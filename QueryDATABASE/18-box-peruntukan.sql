-- ============================================================================
-- SCRIPT: TAMBAH PERUNTUKAN DI MASTER BOX
-- File: 18-box-peruntukan.sql
-- ============================================================================

-- Tambahkan kolom peruntukan ke tabel product_boxes.
-- Digunakan oleh Smart Packaging / Auto-Packer di Kasir untuk menentukan
-- box mana yang cocok untuk donat standar, mini, bomboloni, dll.

ALTER TABLE product_boxes 
ADD COLUMN IF NOT EXISTS peruntukan VARCHAR(50) DEFAULT 'standar';

-- (Opsional) Jika Anda ingin mengupdate data lama:
-- UPDATE product_boxes SET peruntukan = 'standar' WHERE peruntukan IS NULL;
