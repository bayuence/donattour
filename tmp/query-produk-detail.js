// Query order_items per produk per tanggal untuk Petronite
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';
const supabase = createClient(supabaseUrl, supabaseKey);

const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

// Ambil semua order_items dengan paginasi
async function fetchAllOrderItems(startUtc, endUtc) {
  // Ambil dulu semua order IDs untuk Petronite di rentang tanggal
  let allOrders = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, payment_method, total_amount')
      .eq('outlet_id', PETRONITE_ID)
      .gte('created_at', startUtc)
      .lte('created_at', endUtc)
      .range(from, from + 999);
    if (error || !data) break;
    allOrders = allOrders.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  
  if (allOrders.length === 0) return { orders: [], items: [] };
  
  // Ambil order_items untuk order-order tersebut
  const orderIds = allOrders.map(o => o.id);
  let allItems = [];
  from = 0;
  
  // Bagi order IDs jadi chunks 200
  for (let i = 0; i < orderIds.length; i += 200) {
    const chunk = orderIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from('order_items')
      .select('order_id, product_id, product_name, quantity, unit_price, subtotal')
      .in('order_id', chunk);
    if (!error && data) allItems = allItems.concat(data);
  }
  
  return { orders: allOrders, items: allItems };
}

async function main() {
  // Cek semua produk yang ada di Petronite dulu
  console.log('=== CEK PRODUK YANG ADA DI PETRONITE ===');
  const { orders: sampleOrders, items: sampleItems } = await fetchAllOrderItems(
    '2026-06-26T17:00:00.000Z',
    '2026-06-27T16:59:59.000Z'
  );
  
  // Kumpulkan semua unique product_name
  const prodNames = {};
  sampleItems.forEach(item => {
    const name = item.product_name || '(null)';
    if (!prodNames[name]) prodNames[name] = { count: 0, price: item.unit_price, id: item.product_id };
    prodNames[name].count += item.quantity;
  });
  
  console.log('Produk yang terjual (sample 27 Jun):');
  Object.entries(prodNames).sort().forEach(([name, v]) => {
    console.log(`  "${name}" | harga: ${v.price} | qty: ${v.count} | id: ${v.id}`);
  });

  // Query semua tanggal yang dibutuhkan: 27 Jun - 5 Jul
  console.log('\n=== QUERY SEMUA TANGGAL ===');
  const { orders, items } = await fetchAllOrderItems(
    '2026-06-26T17:00:00.000Z', // 27 Jun 00:00 WIB
    '2026-07-05T16:59:59.000Z'  // 5 Jul 23:59 WIB
  );
  
  console.log(`Total orders: ${orders.length}, Total items: ${items.length}`);
  
  // Map order_id -> tanggal WIB & payment_method
  const orderMap = {};
  orders.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    const tgl = wib.toISOString().split('T')[0];
    orderMap[o.id] = { tgl, method: o.payment_method, total: o.total_amount };
  });
  
  // Grouping per tanggal + produk
  const perTanggalProduk = {};
  items.forEach(item => {
    const ord = orderMap[item.order_id];
    if (!ord) return;
    const { tgl } = ord;
    const name = (item.product_name || '').toLowerCase().trim();
    
    if (!perTanggalProduk[tgl]) perTanggalProduk[tgl] = {};
    if (!perTanggalProduk[tgl][name]) perTanggalProduk[tgl][name] = { qty: 0, revenue: 0 };
    perTanggalProduk[tgl][name].qty += item.quantity;
    perTanggalProduk[tgl][name].revenue += item.subtotal;
  });
  
  // Tampilkan semua produk per tanggal
  console.log('\n=== BREAKDOWN PRODUK PER TANGGAL ===');
  Object.entries(perTanggalProduk).sort().forEach(([tgl, prods]) => {
    const parts = tgl.split('-');
    console.log(`\n📅 ${parts[2]}/${parts[1]}/${parts[0]}:`);
    Object.entries(prods).sort().forEach(([name, v]) => {
      console.log(`   "${name}" | qty: ${v.qty} | revenue: Rp${v.revenue.toLocaleString('id-ID')}`);
    });
  });
}

main().catch(console.error);
