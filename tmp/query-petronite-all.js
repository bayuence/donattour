// Query SEMUA orders Petronite tanpa filter status
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(supabaseUrl, supabaseKey);

const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

function fmt(n) {
  if (n == null || n === 0) return 'Rp0';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

async function main() {
  console.log('=== SEMUA ORDERS PETRONITE (tanpa filter status) ===\n');

  // Query SEMUA orders tanpa filter payment_status / status
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, total_amount, paid_amount, payment_method,
      payment_status, status,
      order_items (product_id, product_name, quantity, unit_price, subtotal)
    `)
    .eq('outlet_id', PETRONITE_ID)
    .gte('created_at', '2026-06-01T00:00:00')
    .lte('created_at', '2026-07-07T23:59:59')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total orders ditemukan: ${orders.length}\n`);

  // Cek distribusi status
  const statusMap = {};
  orders.forEach(o => {
    const key = `${o.payment_status} / ${o.status}`;
    statusMap[key] = (statusMap[key] || 0) + 1;
  });
  console.log('Distribusi status:');
  Object.entries(statusMap).forEach(([k, v]) => console.log(`  ${k}: ${v} orders`));

  // Grouping per tanggal (semua status)
  const perTanggal = {};
  orders.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    const tgl = wib.toISOString().split('T')[0];

    if (!perTanggal[tgl]) {
      perTanggal[tgl] = {
        cash: 0, ori: 0, total: 0,
        donat_qty: 0, order_count: 0,
        statuses: {}
      };
    }

    const m = (o.payment_method || '').toLowerCase();
    const amt = o.total_amount || 0;

    // Hitung semua (paid + unpaid)
    if (m === 'cash' || m === 'tunai') {
      perTanggal[tgl].cash += amt;
    } else {
      perTanggal[tgl].ori += amt;
    }
    perTanggal[tgl].total += amt;
    perTanggal[tgl].order_count++;

    // Track status
    const sk = `${o.payment_status}/${o.status}`;
    perTanggal[tgl].statuses[sk] = (perTanggal[tgl].statuses[sk] || 0) + 1;

    // Qty donat
    if (o.order_items) {
      o.order_items.forEach(item => {
        perTanggal[tgl].donat_qty += item.quantity;
      });
    }
  });

  console.log('\n' + '='.repeat(120));
  console.log('REKAP PER TANGGAL (SEMUA STATUS)');
  console.log('='.repeat(120));
  console.log('TANGGAL\t\tCASH\t\t\tORI\t\t\tJUMLAH\t\t\tQTY DONAT\tJML ORDER\tSTATUS');
  console.log('-'.repeat(120));

  Object.entries(perTanggal).sort().forEach(([tgl, d]) => {
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const statusStr = Object.entries(d.statuses).map(([k,v]) => `${k}(${v})`).join(', ');
    console.log(`${tglFmt}\t${fmt(d.cash)}\t\t${fmt(d.ori)}\t\t${fmt(d.total)}\t\t${d.donat_qty}\t\t${d.order_count}\t\t${statusStr}`);
  });

  // Khusus 3-5 Juli detail
  console.log('\n' + '='.repeat(120));
  console.log('DETAIL ORDER 3-5 JULI 2026');
  console.log('='.repeat(120));

  const targetDates = ['2026-07-03', '2026-07-04', '2026-07-05'];
  orders.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    const tgl = wib.toISOString().split('T')[0];
    if (targetDates.includes(tgl)) {
      const tglWib = wib.toISOString().replace('T', ' ').substring(0, 16);
      console.log(`[${tglWib} WIB] ${fmt(o.total_amount)} | ${o.payment_method} | status: ${o.payment_status}/${o.status} | items: ${o.order_items?.length || 0}`);
    }
  });

  // Summary keseluruhan untuk spreadsheet
  console.log('\n' + '='.repeat(120));
  console.log('📋 REKAP FINAL UNTUK SPREADSHEET (TERMASUK SEMUA STATUS)');
  console.log('='.repeat(120));
  console.log('\n💰 PENDAPATAN PETRONITE:');
  console.log('TANGGAL\t\t\tCASH\t\t\tORI\t\t\tJUMLAH\t\t\tDONAT TERJUAL');

  Object.entries(perTanggal).sort().forEach(([tgl, d]) => {
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    console.log(`${tglFmt}\t\t${fmt(d.cash)}\t\t${fmt(d.ori)}\t\t${fmt(d.total)}\t\t${d.donat_qty} pcs`);
  });
}

main().catch(console.error);
