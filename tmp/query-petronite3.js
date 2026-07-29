// Script final query Petronite dari production_daily + stocks
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(supabaseUrl, supabaseKey);

const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

function fmt(n) {
  if (n == null) return '-';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

async function main() {
  // 1. Query production_daily Petronite
  console.log('=== DATA production_daily PETRONITE ===');
  const { data: prods, error: prodErr } = await supabase
    .from('production_daily')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .gte('tanggal', '2026-06-01')
    .lte('tanggal', '2026-07-07')
    .order('tanggal', { ascending: true });

  if (prodErr) {
    console.log('Error production_daily:', prodErr.message);
  } else {
    console.log(`Total production_daily records: ${prods.length}`);
    console.log('Semua data:');
    prods.forEach(p => console.log(JSON.stringify(p)));
    
    // Grouping per tanggal
    const prodPerTanggal = {};
    prods.forEach(p => {
      const tgl = p.tanggal.split('T')[0];
      if (!prodPerTanggal[tgl]) prodPerTanggal[tgl] = { target: 0, success: 0, waste: 0, records: [] };
      prodPerTanggal[tgl].target += (p.target_qty || 0);
      prodPerTanggal[tgl].success += (p.success_qty || 0);
      prodPerTanggal[tgl].waste += (p.waste_qty || 0);
      prodPerTanggal[tgl].records.push(p);
    });
    
    console.log('\nREKAP PRODUKSI PER TANGGAL:');
    Object.entries(prodPerTanggal).sort().forEach(([tgl, d]) => {
      const parts = tgl.split('-');
      console.log(`${parts[2]}/${parts[1]}/${parts[0]} | TARGET: ${d.target} | SUKSES: ${d.success} | WASTE: ${d.waste}`);
    });
  }

  // 2. Query stocks Petronite
  console.log('\n=== DATA stocks PETRONITE ===');
  const { data: stocks, error: stockErr } = await supabase
    .from('stocks')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .order('created_at', { ascending: true });

  if (stockErr) {
    // Coba tanpa filter outlet_id, lihat kolom apa yang ada
    const { data: s, error: e } = await supabase.from('stocks').select('*').limit(5);
    if (!e && s.length > 0) {
      console.log('Kolom stocks:', Object.keys(s[0]));
      console.log('Sample data:', s);
    } else {
      console.log('Error stocks:', stockErr.message);
    }
  } else {
    console.log(`Total stocks records: ${stocks.length}`);
    if (stocks.length > 0) console.log('Kolom:', Object.keys(stocks[0]));
    stocks.forEach(s => console.log(JSON.stringify(s)));
  }

  // 3. inventory_sync_log grouped per tanggal = stok yang MASUK / DIKIRIM ke Petronite
  console.log('\n=== STOK MASUK (inventory_sync_log) PER TANGGAL ===');
  const { data: syncLog } = await supabase
    .from('inventory_sync_log')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .order('synced_at', { ascending: true });
  
  const syncPerTanggal = {};
  syncLog.forEach(s => {
    const wib = new Date(new Date(s.synced_at).getTime());
    const tgl = s.synced_at.split('T')[0];
    if (!syncPerTanggal[tgl]) syncPerTanggal[tgl] = { total_masuk: 0, records: [] };
    syncPerTanggal[tgl].total_masuk += s.qty_synced;
    syncPerTanggal[tgl].records.push(s);
  });
  
  console.log('Stok masuk per tanggal:');
  Object.entries(syncPerTanggal).sort().forEach(([tgl, d]) => {
    const parts = tgl.split('-');
    const details = d.records.map(r => `${r.qty_synced} (${r.ukuran})`).join(', ');
    console.log(`${parts[2]}/${parts[1]}/${parts[0]} | TOTAL MASUK: ${d.total_masuk} | Detail: ${details}`);
  });

  // 4. REKAP LENGKAP untuk spreadsheet
  console.log('\n' + '='.repeat(120));
  console.log('REKAP FINAL UNTUK SPREADSHEET PETRONITE 2026');
  console.log('='.repeat(120));

  // Orders per tanggal
  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, total_amount, payment_method, order_items(quantity)')
    .eq('outlet_id', PETRONITE_ID)
    .eq('status', 'completed')
    .eq('payment_status', 'paid')
    .gte('created_at', '2026-06-01T00:00:00')
    .lte('created_at', '2026-07-07T23:59:59')
    .order('created_at', { ascending: true });

  const pendapatan = {};
  orders.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    const tgl = wib.toISOString().split('T')[0];
    if (!pendapatan[tgl]) pendapatan[tgl] = { cash: 0, ori: 0, total: 0 };
    const m = o.payment_method.toLowerCase();
    const amt = o.total_amount;
    if (m === 'cash' || m === 'tunai') pendapatan[tgl].cash += amt;
    else pendapatan[tgl].ori += amt;
    pendapatan[tgl].total += amt;
  });

  // Expenses per tanggal
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .order('tanggal', { ascending: true });
  
  const expPerTanggal = {};
  expenses.forEach(e => {
    const tgl = e.tanggal.split('T')[0];
    if (!expPerTanggal[tgl]) expPerTanggal[tgl] = { total: 0, items: [] };
    expPerTanggal[tgl].total += e.jumlah;
    expPerTanggal[tgl].items.push(`${e.keterangan} (${fmt(e.jumlah)})`);
  });

  const allDates = [...new Set([...Object.keys(pendapatan), ...Object.keys(syncPerTanggal)])].sort();

  console.log('\n📊 BAGIAN KANAN SPREADSHEET: PENJUALAN PETRONITE');
  console.log('TANGGAL\t\tSTOK MASUK\tDI KIRIM (per batch)');
  console.log('-'.repeat(80));
  allDates.forEach(tgl => {
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const stokMasuk = syncPerTanggal[tgl] ? syncPerTanggal[tgl].total_masuk : 0;
    const detail = syncPerTanggal[tgl] ? syncPerTanggal[tgl].records.map(r => r.qty_synced).join(' + ') : '-';
    console.log(`${tglFmt}\t${stokMasuk}\t\t${detail}`);
  });

  console.log('\n💰 BAGIAN KANAN SPREADSHEET: PENDAPATAN PETRONITE');
  console.log('TANGGAL\t\tCASH\t\t\tORI\t\t\tJUMLAH\t\t\tPENGELUARAN\tCATATAN');
  console.log('-'.repeat(120));
  allDates.forEach(tgl => {
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const p = pendapatan[tgl] || { cash: 0, ori: 0, total: 0 };
    const exp = expPerTanggal[tgl];
    const expStr = exp ? fmt(exp.total) : '-';
    const catatan = exp ? exp.items.join('; ') : '';
    console.log(`${tglFmt}\t${fmt(p.cash)}\t\t${fmt(p.ori)}\t\t${fmt(p.total)}\t\t${expStr}\t${catatan}`);
  });
}

main().catch(console.error);
