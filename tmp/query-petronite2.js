// Script deep query Petronite dari tabel stocks dan production_daily
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(supabaseUrl, supabaseKey);

const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

async function tryTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (!error) {
    return { exists: true, sample: data };
  }
  return { exists: false };
}

async function main() {
  // 1. Cek tabel stocks - kolom apa saja
  console.log('=== TABEL stocks - SEMUA DATA PETRONITE ===');
  const { data: stocks, error: stocksErr } = await supabase
    .from('stocks')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .order('date', { ascending: true });
  
  if (stocksErr) {
    console.log('Error stocks:', stocksErr.message);
    // Coba tanpa filter dulu
    const { data: s2, error: e2 } = await supabase.from('stocks').select('*').limit(3);
    if (!e2) {
      console.log('Sample stocks columns:', Object.keys(s2[0] || {}));
      console.log('Sample:', s2);
    }
  } else {
    console.log('Jumlah records stocks:', stocks.length);
    if (stocks.length > 0) {
      console.log('Kolom:', Object.keys(stocks[0]));
      stocks.forEach(s => console.log(JSON.stringify(s)));
    }
  }

  // 2. Cek inventory_sync_log lebih detail
  console.log('\n=== inventory_sync_log PETRONITE FULL ===');
  const { data: syncLog, error: syncErr } = await supabase
    .from('inventory_sync_log')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .order('synced_at', { ascending: true });
  
  if (!syncErr) {
    console.log('Total sync log:', syncLog.length);
    syncLog.forEach(s => console.log(JSON.stringify(s)));
    
    // Grouping per production_daily_id
    const byProd = {};
    syncLog.forEach(s => {
      if (!byProd[s.production_daily_id]) byProd[s.production_daily_id] = [];
      byProd[s.production_daily_id].push(s);
    });
    console.log('\nUnique production_daily_id:', Object.keys(byProd));
  }

  // 3. Coba semua tabel yang mungkin ada production_daily
  console.log('\n=== CEK TABEL production_daily DAN SEJENISNYA ===');
  const moreTables = ['production_daily', 'productions_daily', 'daily_productions', 
                      'production_batches', 'batches', 'donat_production',
                      'orders_items', 'order_items'];
  for (const t of moreTables) {
    const res = await tryTable(t);
    if (res.exists) {
      console.log(`✅ "${t}" ADA - kolom:`, res.sample.length > 0 ? Object.keys(res.sample[0]) : 'kosong');
    } else {
      console.log(`❌ "${t}"`);
    }
  }

  // 4. Query order_items untuk Petronite untuk data donat terjual
  console.log('\n=== ORDER ITEMS PETRONITE - DONAT TERJUAL PER HARI ===');
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select(`
      id, created_at, total_amount, payment_method,
      order_items (product_id, product_name, quantity, unit_price, subtotal)
    `)
    .eq('outlet_id', PETRONITE_ID)
    .eq('status', 'completed')
    .eq('payment_status', 'paid')
    .gte('created_at', '2026-06-01T00:00:00.000Z')
    .lte('created_at', '2026-07-07T23:59:59.000Z')
    .order('created_at', { ascending: true });
  
  if (ordersErr) {
    console.log('Error:', ordersErr);
    return;
  }

  // Grouping per tanggal
  const perTanggal = {};
  orders.forEach(order => {
    const wibDate = new Date(new Date(order.created_at).getTime() + 7 * 60 * 60 * 1000);
    const tanggal = wibDate.toISOString().split('T')[0];
    
    if (!perTanggal[tanggal]) {
      perTanggal[tanggal] = { cash: 0, ori: 0, total: 0, donat_terjual: 0 };
    }
    
    const method = order.payment_method.toLowerCase();
    if (method === 'cash' || method === 'tunai') {
      perTanggal[tanggal].cash += order.total_amount;
    } else {
      perTanggal[tanggal].ori += order.total_amount;
    }
    perTanggal[tanggal].total += order.total_amount;
    
    // Hitung donat terjual dari order_items
    if (order.order_items) {
      order.order_items.forEach(item => {
        perTanggal[tanggal].donat_terjual += item.quantity;
      });
    }
  });

  console.log('\nFORMAT UNTUK SPREADSHEET:');
  console.log('TANGGAL\t\tCASH\t\t\tORI\t\t\tJUMLAH\t\t\tDONAT TERJUAL');
  console.log('='.repeat(100));
  Object.values(perTanggal).sort((a,b) => a.tanggal < b.tanggal ? -1 : 1).forEach(d => {
    const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');
    // Cari tanggal
    const tgl = Object.keys(perTanggal).find(k => perTanggal[k] === d);
    // Format tanggal ke dd/MM/yyyy
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    console.log(`${tglFmt}\t${fmt(d.cash)}\t\t${fmt(d.ori)}\t\t${fmt(d.total)}\t\t${d.donat_terjual}`);
  });

  // 5. Cek expenses Petronite
  console.log('\n=== PENGELUARAN PETRONITE ===');
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .order('tanggal', { ascending: true });
  
  if (expenses && expenses.length > 0) {
    expenses.forEach(e => {
      const parts = e.tanggal.split('T')[0].split('-');
      const tgl = `${parts[2]}/${parts[1]}/${parts[0]}`;
      const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');
      console.log(`${tgl} | ${e.kategori} | ${e.keterangan} | ${fmt(e.jumlah)}`);
    });
  } else {
    console.log('Tidak ada data pengeluaran');
  }
}

main().catch(console.error);
