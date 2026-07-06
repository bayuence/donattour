/**
 * Script: bulk-update-harga.mjs
 * Tujuan: Update harga jual semua varian donat per kategori
 * 
 * Harga baru:
 *   - Klasik  → Rp 7.000
 *   - Reguler → Rp 10.000
 *   - Premium → Rp 15.000
 * 
 * HPP tidak berubah.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://elduyooybiscdqwwzfwv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ──────────────────────────────────────────────
// Konfigurasi harga baru (edit di sini kalau mau ubah)
// ──────────────────────────────────────────────
const HARGA_BARU = [
  { keyword: 'klasik',  harga_jual: 7000  },
  { keyword: 'reguler', harga_jual: 10000 },
  { keyword: 'premium', harga_jual: 15000 },
];

async function main() {
  console.log('🔍 Mengambil semua kategori dari database...\n');

  // 1. Ambil semua kategori
  const { data: categories, error: catErr } = await supabase
    .from('product_categories')
    .select('id, nama, is_donat');

  if (catErr) {
    console.error('❌ Gagal ambil kategori:', catErr.message);
    process.exit(1);
  }

  console.log('📋 Kategori yang ditemukan:');
  categories.forEach(c => console.log(`   - [${c.id}] ${c.nama} (donat: ${c.is_donat})`));
  console.log('');

  // 2. Ambil semua produk donat_varian yang aktif
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, nama, ukuran, category_id, harga_jual, hpp_base_donat, hpp_topping, hpp_total, harga_pokok_penjualan')
    .eq('tipe_produk', 'donat_varian')
    .eq('is_active', true);

  if (prodErr) {
    console.error('❌ Gagal ambil produk:', prodErr.message);
    process.exit(1);
  }

  console.log(`📦 Total produk donat_varian aktif: ${products.length}\n`);

  // 3. Proses update per keyword kategori
  let totalUpdated = 0;

  for (const { keyword, harga_jual } of HARGA_BARU) {
    // Cari kategori yang namanya mengandung keyword (case-insensitive)
    const matchedCats = categories.filter(c =>
      c.nama.toLowerCase().includes(keyword.toLowerCase())
    );

    if (matchedCats.length === 0) {
      console.warn(`⚠️  Tidak ada kategori yang cocok dengan keyword: "${keyword}"`);
      continue;
    }

    const catIds = matchedCats.map(c => c.id);
    console.log(`\n🏷️  Kategori "${keyword}" → Harga Rp ${harga_jual.toLocaleString('id-ID')}`);
    console.log(`   Kategori cocok: ${matchedCats.map(c => c.nama).join(', ')}`);

    // Filter produk di kategori ini
    const targetProds = products.filter(p => catIds.includes(p.category_id));
    console.log(`   Produk yang akan diupdate: ${targetProds.length}`);

    if (targetProds.length === 0) {
      console.log('   (tidak ada produk di kategori ini)');
      continue;
    }

    // Tampilkan preview
    targetProds.forEach(p => {
      console.log(`   • ${p.nama} (${p.ukuran ?? '-'}) | Harga lama: Rp ${Number(p.harga_jual).toLocaleString('id-ID')} → Rp ${harga_jual.toLocaleString('id-ID')}`);
    });

    // Update ke Supabase
    const prodIds = targetProds.map(p => p.id);

    // Hitung margin baru berdasarkan hpp_total masing-masing produk
    for (const prod of targetProds) {
      const hppTotal = Number(prod.hpp_total ?? prod.harga_pokok_penjualan ?? 0);
      const marginAmount = harga_jual - hppTotal;
      const marginPercent = harga_jual > 0 ? Math.round((marginAmount / harga_jual) * 100 * 100) / 100 : 0;

      const { error: upErr } = await supabase
        .from('products')
        .update({
          harga_jual,
          margin_amount: marginAmount,
          margin_percent: marginPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prod.id);

      if (upErr) {
        console.error(`   ❌ Gagal update ${prod.nama}: ${upErr.message}`);
      } else {
        totalUpdated++;
      }
    }

    console.log(`   ✅ Berhasil diupdate!`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ SELESAI: ${totalUpdated} produk berhasil diupdate harga jualnya`);
  console.log('   HPP tidak berubah.');
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(err => {
  console.error('💥 Error tidak terduga:', err);
  process.exit(1);
});
