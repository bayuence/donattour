/**
 * scripts/reset-today.js
 * ─────────────────────────────────────────────────────────────
 * Reset data hari ini untuk keperluan uji coba kasir.
 * Yang dihapus: transaksi + inputan produksi hari ini.
 *
 * Cara jalankan:
 *   node scripts/reset-today.js          → preview saja (AMAN)
 *   node scripts/reset-today.js --hapus  → preview + hapus
 */

require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

// ─── Koneksi ──────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// ─── Helpers ──────────────────────────────────────────────────
const HAPUS_MODE = process.argv.includes("--hapus");

// Tanggal hari ini dalam WIB (YYYY-MM-DD)
function getTodayWIB() {
  const now = new Date();
  const wib = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, "0");
  const d = String(wib.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Rentang waktu hari ini dalam WIB sebagai UTC (untuk filter created_at di tabel orders)
function getTodayRangeUTC() {
  const today = getTodayWIB();
  // WIB = UTC+7 → midnight WIB = 17:00 UTC hari sebelumnya
  const start = new Date(`${today}T00:00:00+07:00`).toISOString();
  const end   = new Date(`${today}T23:59:59+07:00`).toISOString();
  return { start, end };
}

function formatN(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function printHeader(title) {
  console.log("\n" + "─".repeat(60));
  console.log("  " + title);
  console.log("─".repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  const today    = getTodayWIB();
  const { start, end } = getTodayRangeUTC();
  let client;

  try {
    console.log("\n🔌  Menghubungkan ke database...");
    client = await pool.connect();
    console.log("✅  Terhubung!\n");

    console.log(`📅  Tanggal hari ini (WIB): ${today}`);
    if (HAPUS_MODE) {
      console.log("⚠️   MODE HAPUS AKTIF — data akan dihapus permanen!\n");
    } else {
      console.log("👁️   MODE PREVIEW — gunakan --hapus untuk benar-benar menghapus\n");
    }

    // ─── 1. CEK TRANSAKSI ────────────────────────────────────
    printHeader("1. TRANSAKSI (orders + order_items)");

    const { rows: orderRows } = await client.query(`
      SELECT
        o.id,
        o.outlet_id,
        ou.nama AS outlet_nama,
        o.total_amount,
        o.payment_method,
        o.status,
        o.created_at AT TIME ZONE 'Asia/Jakarta' AS created_wib,
        COUNT(oi.id) AS jumlah_item
      FROM orders o
      LEFT JOIN outlets ou ON ou.id = o.outlet_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY o.id, ou.nama
      ORDER BY o.created_at DESC
    `, [start, end]);

    const { rows: orderCount } = await client.query(`
      SELECT COUNT(*) AS total, COALESCE(SUM(total_amount), 0) AS total_omzet
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
    `, [start, end]);

    const { rows: itemCount } = await client.query(`
      SELECT COUNT(*) AS total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at BETWEEN $1 AND $2
    `, [start, end]);

    console.log(`   📦 ${orderCount[0].total} transaksi  |  ${itemCount[0].total} item  |  Omzet: Rp ${formatN(Math.round(orderCount[0].total_omzet))}`);

    if (orderRows.length > 0) {
      console.log("\n   Detail transaksi:");
      orderRows.forEach((r, i) => {
        const jam = new Date(r.created_wib).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        console.log(`   ${String(i + 1).padStart(2)}. [${jam}] ${r.outlet_nama || r.outlet_id} | ${r.jumlah_item} item | Rp ${formatN(r.total_amount)} | ${r.payment_method}`);
      });
    } else {
      console.log("   (tidak ada transaksi hari ini)");
    }

    // ─── 2. CEK INPUT PRODUKSI ───────────────────────────────
    printHeader("2. INPUT PRODUKSI (production_daily)");

    let prodRows = [];
    try {
      const res = await client.query(`
        SELECT pd.*, ou.nama AS outlet_nama
        FROM production_daily pd
        LEFT JOIN outlets ou ON ou.id = pd.outlet_id
        WHERE pd.tanggal = $1
        ORDER BY pd.outlet_id, pd.ukuran
      `, [today]);
      prodRows = res.rows;
    } catch (e) {
      console.log("   ⚠️  Tabel production_daily tidak ditemukan, skip.");
    }

    if (prodRows.length > 0) {
      console.log(`   📊 ${prodRows.length} record produksi hari ini:\n`);
      prodRows.forEach(r => {
        console.log(`   • ${r.outlet_nama || r.outlet_id} | ${r.ukuran} | Target: ${r.target_qty} | Jadi: ${r.success_qty} | Waste: ${r.waste_qty}`);
      });
    } else {
      console.log("   (tidak ada input produksi hari ini)");
    }

    // ─── 3. CEK STOK HARI INI ────────────────────────────────
    printHeader("3. STOK HARI INI (inventory_non_topping)");

    let stokRows = [];
    try {
      const res = await client.query(`
        SELECT inv.*, ou.nama AS outlet_nama
        FROM inventory_non_topping inv
        LEFT JOIN outlets ou ON ou.id = inv.outlet_id
        WHERE inv.production_date = $1
        ORDER BY inv.outlet_id, inv.ukuran
      `, [today]);
      stokRows = res.rows;
    } catch (e) {
      console.log("   ⚠️  Tabel inventory_non_topping tidak ditemukan, skip.");
    }

    if (stokRows.length > 0) {
      console.log(`   🏪 ${stokRows.length} record stok hari ini:\n`);
      stokRows.forEach(r => {
        console.log(`   • ${r.outlet_nama || r.outlet_id} | ${r.ukuran} | Available: ${r.qty_available} | Status: ${r.status}`);
      });
    } else {
      console.log("   (tidak ada stok input hari ini)");
    }

    // ─── 4. CEK DAILY CLOSING ────────────────────────────────
    printHeader("4. CLOSING HARIAN (daily_closing)");

    let closingRows = [];
    try {
      const res = await client.query(`
        SELECT dc.*, ou.nama AS outlet_nama
        FROM daily_closing dc
        LEFT JOIN outlets ou ON ou.id = dc.outlet_id
        WHERE dc.tanggal = $1
      `, [today]);
      closingRows = res.rows;
    } catch (e) {
      console.log("   ⚠️  Tabel daily_closing tidak ditemukan, skip.");
    }

    if (closingRows.length > 0) {
      console.log(`   🔒 ${closingRows.length} closing hari ini — akan ikut dihapus:\n`);
      closingRows.forEach(r => {
        console.log(`   • ${r.outlet_nama || r.outlet_id} | Ditutup: ${r.created_at}`);
      });
    } else {
      console.log("   (tidak ada closing hari ini)");
    }

    // ─── SUMMARY ─────────────────────────────────────────────
    printHeader("RINGKASAN YANG AKAN DIHAPUS");
    console.log(`   🗑️  Transaksi    : ${orderCount[0].total} orders + ${itemCount[0].total} order_items (CASCADE)`);
    console.log(`   🗑️  Produksi     : ${prodRows.length} record`);
    console.log(`   🗑️  Stok         : ${stokRows.length} record inventory_non_topping`);
    console.log(`   🗑️  Closing      : ${closingRows.length} record daily_closing`);

    // ─── HAPUS (jika flag --hapus aktif) ─────────────────────
    if (!HAPUS_MODE) {
      console.log("\n" + "═".repeat(60));
      console.log("  ℹ️  Mode PREVIEW — tidak ada yang dihapus.");
      console.log("  Jalankan: node scripts/reset-today.js --hapus");
      console.log("  untuk menghapus data di atas.");
      console.log("═".repeat(60) + "\n");
      return;
    }

    printHeader("MENGHAPUS DATA...");

    // Hapus daily_closing dulu (bisa ada FK ke orders)
    if (closingRows.length > 0) {
      await client.query(`DELETE FROM daily_closing WHERE tanggal = $1`, [today]);
      console.log(`   ✅ daily_closing dihapus`);
    }

    // Hapus orders (order_items CASCADE otomatis)
    const { rowCount: deletedOrders } = await client.query(`
      DELETE FROM orders
      WHERE created_at BETWEEN $1 AND $2
    `, [start, end]);
    console.log(`   ✅ ${deletedOrders} orders dihapus (+ order_items CASCADE)`);

    // Hapus production_daily
    if (prodRows.length > 0) {
      const { rowCount: deletedProd } = await client.query(
        `DELETE FROM production_daily WHERE tanggal = $1`, [today]
      );
      console.log(`   ✅ ${deletedProd} production_daily dihapus`);
    }

    // Hapus inventory_non_topping hari ini
    if (stokRows.length > 0) {
      const { rowCount: deletedStok } = await client.query(
        `DELETE FROM inventory_non_topping WHERE production_date = $1`, [today]
      );
      console.log(`   ✅ ${deletedStok} inventory_non_topping dihapus`);
    }

    // ─── VERIFIKASI ──────────────────────────────────────────
    printHeader("VERIFIKASI SETELAH HAPUS");

    const { rows: verify } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE created_at BETWEEN $1 AND $2) AS orders_sisa,
        (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.created_at BETWEEN $1 AND $2) AS items_sisa
    `, [start, end]);

    console.log(`   Orders tersisa    : ${verify[0].orders_sisa}`);
    console.log(`   Order items tersisa: ${verify[0].items_sisa}`);

    if (Number(verify[0].orders_sisa) === 0) {
      console.log("\n   ✅ Semua data hari ini berhasil dihapus!");
      console.log("   🚀 Kasir siap untuk uji coba!\n");
    } else {
      console.log("\n   ⚠️  Masih ada sisa data. Cek manual di Supabase.\n");
    }

  } catch (err) {
    console.error("\n❌  Error:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main();
