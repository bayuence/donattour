/**
 * scripts/run-migration.js
 * Jalankan: node scripts/run-migration.js
 *
 * Script ini menambahkan kolom HPP per item ke tabel products
 * menggunakan koneksi langsung ke Supabase via pg library.
 */

require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "❌  DIRECT_URL atau DATABASE_URL tidak ditemukan di .env.local",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 10000,
});

const MIGRATION_SQL = `
-- ── 1. Tambah kolom baru (idempotent) ──────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_donat       BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS ukuran_donat   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hpp_base_donat DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS hpp_topping    DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS hpp_total      DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS harga_jual     DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margin_amount  DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2);

-- ── 2. Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_is_donat  ON products(is_donat);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_tipe      ON products(tipe_produk);

-- ── 3. is_donat dari tipe_produk ────────────────────────────────
UPDATE products
SET is_donat = (tipe_produk IN ('donat_varian', 'donat_base'))
WHERE is_donat IS NULL OR is_donat = false;

-- ── 4. Migrasi HPP dari harga_pokok_penjualan ───────────────────
-- Donat: estimasi 60% base / 40% topping (bisa diedit ulang per produk)
-- Non-donat: full HPP ke hpp_topping
UPDATE products
SET
  hpp_base_donat = CASE
    WHEN is_donat = true
    THEN ROUND(COALESCE(harga_pokok_penjualan, 0) * 0.6, 2)
    ELSE 0
  END,
  hpp_topping = CASE
    WHEN is_donat = true
    THEN ROUND(COALESCE(harga_pokok_penjualan, 0) * 0.4, 2)
    ELSE COALESCE(harga_pokok_penjualan, 0)
  END,
  hpp_total = COALESCE(harga_pokok_penjualan, 0)
WHERE hpp_total IS NULL OR hpp_total = 0;

-- ── 5. Hitung margin ────────────────────────────────────────────
UPDATE products
SET
  margin_amount = COALESCE(harga_jual, 0) - COALESCE(hpp_total, 0),
  margin_percent = CASE
    WHEN COALESCE(harga_jual, 0) > 0
    THEN ROUND(
      ((COALESCE(harga_jual, 0) - COALESCE(hpp_total, 0))
       / COALESCE(harga_jual, 0) * 100)::NUMERIC, 2
    )
    ELSE 0
  END
WHERE margin_amount IS NULL;
`;

async function runMigration() {
  let client;
  try {
    console.log("🔌  Connecting to Supabase...");
    console.log("   Host:", connectionString.match(/@([^:\/]+)/)?.[1] ?? "?");

    client = await pool.connect();
    console.log("✅  Connected!\n");

    // Cek kolom yang sudah ada
    const { rows: existing } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('hpp_base_donat','hpp_topping','hpp_total','margin_amount','margin_percent','harga_jual','is_donat')
      ORDER BY column_name;
    `);

    const existingCols = existing.map((r) => r.column_name);
    console.log(
      "📋  Kolom yang sudah ada:",
      existingCols.length > 0 ? existingCols.join(", ") : "(belum ada)",
    );

    if (existingCols.length === 7) {
      console.log(
        "\n✅  Semua kolom sudah ada! Migration tidak perlu dijalankan lagi.",
      );

      // Tampilkan summary data
      const { rows: summary } = await client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN hpp_total > 0 THEN 1 END) AS hpp_terisi,
          COUNT(CASE WHEN is_donat = true THEN 1 END) AS donat,
          ROUND(AVG(CASE WHEN margin_percent IS NOT NULL THEN margin_percent END)::numeric, 1) AS avg_margin
        FROM products WHERE is_active = true;
      `);
      console.log("\n📊  Summary produk:");
      console.table(summary[0]);
      return;
    }

    // Jalankan migration
    console.log("🚀  Running migration...\n");
    await client.query(MIGRATION_SQL);
    console.log("✅  Migration SQL berhasil dijalankan!\n");

    // Verifikasi hasil
    const { rows: verify } = await client.query(`
      SELECT
        COUNT(*) AS total_produk,
        COUNT(CASE WHEN hpp_total > 0 THEN 1 END) AS hpp_terisi,
        COUNT(CASE WHEN is_donat = true THEN 1 END) AS donat,
        COUNT(CASE WHEN hpp_base_donat > 0 THEN 1 END) AS base_donat_terisi,
        ROUND(AVG(CASE WHEN harga_jual > 0 AND margin_percent IS NOT NULL THEN margin_percent END)::numeric, 1) AS avg_margin_pct
      FROM products
      WHERE is_active = true;
    `);

    console.log("📊  Hasil migration:");
    console.table(verify[0]);
    console.log("\n🎉  Database berhasil diupdate!");
    console.log("\n📝  Langkah berikutnya:");
    console.log("   Buka lib/db/products.ts");
    console.log("   Hapus blok [COMPATIBILITY STRIP]");
    console.log("   Uncomment blok [NEW COLUMNS]");
  } catch (err) {
    console.error("\n❌  Migration gagal:", err.message);
    if (
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("timeout")
    ) {
      console.error("\n💡  Coba:");
      console.error("   1. Pastikan Supabase project aktif (buka dashboard)");
      console.error("   2. Cek .env.local memiliki DIRECT_URL yang benar");
    }
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigration();
