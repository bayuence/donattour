-- ============================================================================
-- MIGRATION: Tambah Harga Jual Polos ke outlet_production_costs
-- File: 13-alter-production-costs.sql
-- Tanggal: 2026-04-05
-- Keterangan: Menambahkan kolom harga_jual_polos_standar dan harga_jual_polos_mini
--             agar donat polos (tanpa topping) punya harga jual tersimpan.
-- ============================================================================

-- Tambah kolom harga jual polos standar
ALTER TABLE outlet_production_costs
  ADD COLUMN IF NOT EXISTS harga_jual_polos_standar NUMERIC(12, 2) DEFAULT 0;

-- Tambah kolom harga jual polos mini
ALTER TABLE outlet_production_costs
  ADD COLUMN IF NOT EXISTS harga_jual_polos_mini NUMERIC(12, 2) DEFAULT 0;

-- Update baris existing agar harga jual polos = 2x HPP sebagai nilai awal
-- Admin bisa mengubah nilainya di UI.
UPDATE outlet_production_costs
SET
  harga_jual_polos_standar = cost_polos_standar * 2,
  harga_jual_polos_mini    = cost_polos_mini    * 2
WHERE harga_jual_polos_standar = 0 OR harga_jual_polos_mini = 0;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
