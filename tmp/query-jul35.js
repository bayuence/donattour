// Query khusus 3-5 Juli saja untuk Petronite
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(supabaseUrl, supabaseKey);

const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

function fmt(n) {
  if (!n) return 'Rp0';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

async function fetchAllOrders(startDate, endDate) {
  let allOrders = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, total_amount, paid_amount, payment_method,
        payment_status, status,
        order_items (product_id, product_name, quantity, unit_price, subtotal)
      `)
      .eq('outlet_id', PETRONITE_ID)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }
    allOrders = allOrders.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allOrders;
}

async function main() {
  // Query 3-5 Juli (UTC: 2 Juli 17:00 - 5 Juli 16:59)
  // WIB UTC+7, jadi 3 Juli 00:00 WIB = 2 Juli 17:00 UTC
  console.log('=== QUERY KHUSUS 3-5 JULI 2026 ===\n');
  
  const orders = await fetchAllOrders(
    '2026-07-02T17:00:00.000Z',  // 3 Juli 00:00 WIB
    '2026-07-05T16:59:59.000Z'   // 5 Juli 23:59 WIB
  );
  
  console.log(`Total orders 3-5 Juli: ${orders.length}`);
  
  if (orders.length === 0) {
    console.log('\n⚠️ TIDAK ADA data orders untuk 3-5 Juli di Supabase!');
    console.log('Kemungkinan data ada di POS lokal tapi belum sync ke Supabase.');
  } else {
    const perTanggal = {};
    orders.forEach(o => {
      const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
      const tgl = wib.toISOString().split('T')[0];
      if (!perTanggal[tgl]) perTanggal[tgl] = { cash: 0, ori: 0, total: 0, donat_qty: 0, count: 0 };
      const m = (o.payment_method || '').toLowerCase();
      if (m === 'cash' || m === 'tunai') perTanggal[tgl].cash += o.total_amount;
      else perTanggal[tgl].ori += o.total_amount;
      perTanggal[tgl].total += o.total_amount;
      perTanggal[tgl].count++;
      if (o.order_items) o.order_items.forEach(i => perTanggal[tgl].donat_qty += i.quantity);
    });

    Object.entries(perTanggal).sort().forEach(([tgl, d]) => {
      const parts = tgl.split('-');
      console.log(`${parts[2]}/${parts[1]}/${parts[0]} | CASH: ${fmt(d.cash)} | ORI: ${fmt(d.ori)} | TOTAL: ${fmt(d.total)} | QTY: ${d.donat_qty} | ${d.count} transaksi`);
    });
  }

  // Cek apakah ada orders dengan tanggal aneh (timezone issue)
  console.log('\n=== CEK ORDERS SEKITAR 2-5 JULI (UTC RAW) ===');
  const { data: rawOrders } = await supabase
    .from('orders')
    .select('id, created_at, total_amount, payment_method, payment_status, status')
    .eq('outlet_id', PETRONITE_ID)
    .gte('created_at', '2026-07-02T00:00:00.000Z')
    .lte('created_at', '2026-07-05T23:59:59.000Z')
    .order('created_at', { ascending: true })
    .limit(20);

  console.log(`Orders 2-5 Juli (UTC): ${rawOrders?.length || 0}`);
  rawOrders?.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    console.log(`UTC: ${o.created_at} | WIB: ${wib.toISOString().replace('T',' ').slice(0,16)} | ${fmt(o.total_amount)} | ${o.payment_method} | ${o.payment_status}/${o.status}`);
  });

  // Cek apakah ada orders di POS yang terlihat tapi beda outlet
  console.log('\n=== CEK: APAKAH DATA 3-5 JULI ADA DI OUTLET LAIN? ===');
  const { data: otherOrders } = await supabase
    .from('orders')
    .select('id, outlet_id, created_at, total_amount, payment_method, payment_status, status')
    .gte('created_at', '2026-07-02T17:00:00.000Z')
    .lte('created_at', '2026-07-05T16:59:59.000Z')
    .order('created_at', { ascending: true })
    .limit(30);

  console.log(`Orders semua outlet 3-5 Juli: ${otherOrders?.length || 0}`);
  otherOrders?.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    const outletLabel = o.outlet_id === PETRONITE_ID ? '✅PETRONITE' : `❓ ${o.outlet_id.slice(0,8)}`;
    console.log(`[${outletLabel}] WIB: ${wib.toISOString().slice(0,16)} | ${fmt(o.total_amount)} | ${o.payment_method}`);
  });

  // REKAP LENGKAP semua hari dengan paginasi
  console.log('\n=== REKAP LENGKAP SEMUA HARI (PAGINASI) ===');
  const allOrders = await fetchAllOrders('2026-06-01T00:00:00.000Z', '2026-07-07T23:59:59.000Z');
  console.log(`Total semua orders: ${allOrders.length}`);

  const grandPerTanggal = {};
  allOrders.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    const tgl = wib.toISOString().split('T')[0];
    if (!grandPerTanggal[tgl]) grandPerTanggal[tgl] = { cash: 0, ori: 0, total: 0, donat_qty: 0, count: 0 };
    const m = (o.payment_method || '').toLowerCase();
    if (m === 'cash' || m === 'tunai') grandPerTanggal[tgl].cash += o.total_amount;
    else grandPerTanggal[tgl].ori += o.total_amount;
    grandPerTanggal[tgl].total += o.total_amount;
    grandPerTanggal[tgl].count++;
    if (o.order_items) o.order_items.forEach(i => grandPerTanggal[tgl].donat_qty += i.quantity);
  });

  console.log('\nTANGGAL\t\t\tCASH\t\t\tORI\t\t\tJUMLAH\t\t\tDONAT QTY\tORDER');
  console.log('-'.repeat(120));
  Object.entries(grandPerTanggal).sort().forEach(([tgl, d]) => {
    const parts = tgl.split('-');
    console.log(`${parts[2]}/${parts[1]}/${parts[0]}\t\t${fmt(d.cash)}\t\t${fmt(d.ori)}\t\t${fmt(d.total)}\t\t${d.donat_qty}\t\t${d.count}`);
  });
}

main().catch(console.error);
