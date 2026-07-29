// Script untuk query data Petronite 2026 dari Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Cari outlet Petronite
  console.log('=== MENCARI OUTLET PETRONITE ===');
  const { data: outlets, error: outletError } = await supabase
    .from('outlets')
    .select('*');
  
  if (outletError) {
    console.error('Error outlets:', outletError);
    return;
  }
  console.log('Semua outlets:');
  console.table(outlets);

  // Cari outlet yang namanya ada "petronite" (case insensitive)
  const petronite = outlets.find(o => o.nama.toLowerCase().includes('petronite'));
  if (!petronite) {
    console.log('TIDAK ADA outlet Petronite! Outlet yang ada:', outlets.map(o => o.nama));
    return;
  }
  console.log('\nOutlet Petronite ditemukan:', petronite);

  // 2. Query orders Petronite bulan Juni-Juli 2026
  console.log('\n=== DATA ORDERS PETRONITE (Juni-Juli 2026) ===');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      outlet_id,
      total_amount,
      paid_amount,
      payment_method,
      payment_status,
      status,
      created_at,
      order_items (
        product_id,
        product_name,
        quantity,
        unit_price,
        subtotal
      )
    `)
    .eq('outlet_id', petronite.id)
    .eq('payment_status', 'paid')
    .eq('status', 'completed')
    .gte('created_at', '2026-06-01T00:00:00.000Z')
    .lte('created_at', '2026-07-07T23:59:59.000Z')
    .order('created_at', { ascending: true });

  if (ordersError) {
    console.error('Error orders:', ordersError);
    return;
  }

  // Grouping per tanggal
  const perTanggal = {};
  orders.forEach(order => {
    const date = new Date(order.created_at);
    // Konversi ke WIB (UTC+7)
    const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const tanggal = wibDate.toISOString().split('T')[0];

    if (!perTanggal[tanggal]) {
      perTanggal[tanggal] = {
        tanggal,
        cash: 0,
        non_cash: 0,
        total: 0,
        order_count: 0,
        orders: []
      };
    }

    const method = order.payment_method.toLowerCase();
    const amount = order.total_amount;

    if (method === 'cash' || method === 'tunai') {
      perTanggal[tanggal].cash += amount;
    } else {
      perTanggal[tanggal].non_cash += amount;
    }
    perTanggal[tanggal].total += amount;
    perTanggal[tanggal].order_count += 1;
    perTanggal[tanggal].orders.push({
      id: order.id,
      payment_method: order.payment_method,
      total: order.total_amount
    });
  });

  console.log('\n=== REKAPITULASI PER TANGGAL ===');
  console.log('Format: TANGGAL | CASH | ORI (Non-Cash) | JUMLAH | JML ORDER');
  console.log('='.repeat(80));
  
  Object.values(perTanggal).sort((a,b) => a.tanggal.localeCompare(b.tanggal)).forEach(d => {
    const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');
    console.log(`${d.tanggal} | CASH: ${fmt(d.cash)} | ORI: ${fmt(d.non_cash)} | TOTAL: ${fmt(d.total)} | ${d.order_count} transaksi`);
  });

  // 3. Query production (stok donat) Petronite
  console.log('\n=== DATA PRODUKSI/STOK PETRONITE ===');
  const { data: productions, error: prodError } = await supabase
    .from('production')
    .select('*')
    .eq('outlet_id', petronite.id)
    .gte('tanggal', '2026-06-01')
    .lte('tanggal', '2026-07-07')
    .order('tanggal', { ascending: true });

  if (prodError) {
    console.error('Error production:', prodError);
  } else {
    console.log('Data produksi:');
    productions.forEach(p => {
      const tgl = new Date(p.tanggal).toISOString().split('T')[0];
      console.log(`${tgl} | STANDAR: ${p.standar} | MINI: ${p.mini} | TOTAL: ${p.total_produksi} | WASTE STD: ${p.waste_standar} | WASTE MINI: ${p.waste_mini}`);
    });
  }

  // 4. Query inventory Petronite
  console.log('\n=== STOK INVENTORY PETRONITE ===');
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('*')
    .eq('outlet_id', petronite.id);

  if (invError) {
    console.error('Error inventory:', invError);
  } else {
    console.log('Inventory saat ini:');
    console.table(inventory);
  }

  // 5. Query expenses Petronite
  console.log('\n=== PENGELUARAN PETRONITE (Juni-Juli 2026) ===');
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('*')
    .eq('outlet_id', petronite.id)
    .gte('tanggal', '2026-06-01')
    .lte('tanggal', '2026-07-07')
    .order('tanggal', { ascending: true });

  if (expError) {
    console.error('Error expenses:', expError);
  } else {
    console.log('Pengeluaran:');
    expenses.forEach(e => {
      const tgl = new Date(e.tanggal).toISOString().split('T')[0];
      const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');
      console.log(`${tgl} | ${e.kategori} | ${e.keterangan} | ${fmt(e.jumlah)}`);
    });
  }

  console.log('\n=== SELESAI ===');
}

main().catch(console.error);
