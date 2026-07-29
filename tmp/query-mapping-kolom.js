// Script mapping produk ke kolom spreadsheet
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';
const supabase = createClient(supabaseUrl, supabaseKey);
const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

// === MAPPING PRODUK KE KOLOM SPREADSHEET ===
// Dari data yang sudah terisi di spreadsheet:
// BESAR: KLASIK, REGULER, PREMIUM
// MINUMAN: MINERAL, SOJU, CENDOL, SAGO, ROASTED, BOLEN, KRESEK

// Harga referensi dari data yang ada:
// KLASIK  = Rp7.000 (350.000/50 pcs)
// REGULER = Rp10.000 (4.090.000/409 pcs)
// PREMIUM = Rp15.000 (1.110.000/74 pcs) = donat premium/crunchy

// Dari analisis produk:
// unit_price = 10000 → REGULER
// unit_price = 15000 → PREMIUM  
// unit_price = 7000  → KLASIK (polos/icing sugar/cinnamon dll)
// Minuman sesuai nama

const KATEGORI = {
  // BESAR - berdasarkan harga
  // Akan dikategorikan by unit_price
  
  // MINUMAN
  'air mineral': 'MINERAL',
  'mineral': 'MINERAL',
  'soju': 'SOJU',
  'cendol kecebong': 'CENDOL',
  'cendol': 'CENDOL',
  'sago': 'SAGO',
  'roasted milk tea': 'ROASTED',
  'brown sugar coffee': 'ROASTED',  // produk minuman lainnya
  'bolen coklat': 'BOLEN',
  'bolen keju': 'BOLEN',
  'bolen': 'BOLEN',
  // Box dan plastik = KRESEK
  'box isi 1': 'KRESEK',
  'box isi 3': 'KRESEK',
  'box isi 6': 'KRESEK',
  'plastik besar': 'KRESEK',
  'plastik kecil': 'KRESEK',
  'plastik': 'KRESEK',
};

function getKategori(name, unitPrice) {
  const lower = (name || '').toLowerCase().trim();
  
  // Cek mapping minuman/lainnya dulu
  for (const [key, kat] of Object.entries(KATEGORI)) {
    if (lower === key || lower.includes(key)) return kat;
  }
  
  // DONAT dikategorikan by harga
  // Berdasarkan data spreadsheet: KLASIK=7000, REGULER=10000, PREMIUM=15000
  if (unitPrice <= 7000) return 'KLASIK';
  if (unitPrice <= 10000) return 'REGULER';
  if (unitPrice >= 15000) return 'PREMIUM';
  
  return 'REGULER'; // default
}

async function fetchAllOrderItems(startUtc, endUtc) {
  let allOrders = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, payment_method, total_amount')
      .eq('outlet_id', PETRONITE_ID)
      .gte('created_at', startUtc)
      .lte('created_at', endUtc)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allOrders = allOrders.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (allOrders.length === 0) return { orders: [], items: [] };
  const orderIds = allOrders.map(o => o.id);
  let allItems = [];
  for (let i = 0; i < orderIds.length; i += 200) {
    const chunk = orderIds.slice(i, i + 200);
    const { data } = await supabase
      .from('order_items')
      .select('order_id, product_name, quantity, unit_price, subtotal')
      .in('order_id', chunk);
    if (data) allItems = allItems.concat(data);
  }
  return { orders: allOrders, items: allItems };
}

function fmt(n) {
  if (!n || n === 0) return '-';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

async function main() {
  const { orders, items } = await fetchAllOrderItems(
    '2026-06-26T17:00:00.000Z',
    '2026-07-05T16:59:59.000Z'
  );

  const orderMap = {};
  orders.forEach(o => {
    const wib = new Date(new Date(o.created_at).getTime() + 7 * 60 * 60 * 1000);
    orderMap[o.id] = { tgl: wib.toISOString().split('T')[0], method: o.payment_method };
  });

  // Kolom yang ada di spreadsheet
  const COLS = ['KLASIK', 'REGULER', 'PREMIUM', 'MINERAL', 'SOJU', 'CENDOL', 'SAGO', 'ROASTED', 'BOLEN', 'KRESEK'];

  // Grouping per tanggal per kategori
  const perTgl = {};
  items.forEach(item => {
    const ord = orderMap[item.order_id];
    if (!ord) return;
    const { tgl } = ord;
    if (!perTgl[tgl]) {
      const d = {};
      COLS.forEach(c => d[c] = { qty: 0, rev: 0 });
      perTgl[tgl] = d;
    }
    const kat = getKategori(item.product_name, item.unit_price);
    if (!COLS.includes(kat)) return; // skip yang tidak dikenali
    perTgl[tgl][kat].qty += item.quantity;
    perTgl[tgl][kat].rev += item.subtotal;
  });

  const dates = Object.keys(perTgl).sort();

  // ==============================
  // OUTPUT 1: TERJUAL JUMLAH DONAT
  // ==============================
  console.log('\n' + '='.repeat(130));
  console.log('📊 TABEL 1: TERJUAL JUMLAH DONAT (qty pcs)');
  console.log('='.repeat(130));
  console.log('TANGGAL\t\tKLASIK\tREGULER\tPREMIUM\tTOTAL\tMINERAL\tSOJU\tCENDOL\tSAGO\tROASTED\tBOLEN\tKRESEK');
  console.log('-'.repeat(130));

  dates.forEach(tgl => {
    const d = perTgl[tgl];
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const klasik  = d['KLASIK'].qty;
    const reguler = d['REGULER'].qty;
    const premium = d['PREMIUM'].qty;
    const total   = klasik + reguler + premium;
    const mineral = d['MINERAL'].qty || '';
    const soju    = d['SOJU'].qty || '';
    const cendol  = d['CENDOL'].qty || '';
    const sago    = d['SAGO'].qty || '';
    const roasted = d['ROASTED'].qty || '';
    const bolen   = d['BOLEN'].qty || '';
    const kresek  = d['KRESEK'].qty || '';
    console.log(`${tglFmt}\t${klasik}\t${reguler}\t${premium}\t${total}\t${mineral}\t${soju}\t${cendol}\t${sago}\t${roasted}\t${bolen}\t${kresek}`);
  });

  // ==============================
  // OUTPUT 2: PENDAPATAN (rupiah)
  // ==============================
  console.log('\n' + '='.repeat(130));
  console.log('💰 TABEL 2: PENDAPATAN (rupiah)');
  console.log('='.repeat(130));
  console.log('TANGGAL\t\tKLASIK\t\t\tREGULER\t\t\tPREMIUM\t\t\tMINERAL\t\t\tSOJU\t\tCENDOL\t\tSAGO\tROASTED\t\tBOLEN\t\t\tKRESEK\t\t\tTOTAL');
  console.log('-'.repeat(130));

  let grandTotal = 0;
  dates.forEach(tgl => {
    const d = perTgl[tgl];
    const parts = tgl.split('-');
    const tglFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const total = COLS.reduce((s, c) => s + d[c].rev, 0);
    grandTotal += total;
    console.log(
      `${tglFmt}\t${fmt(d['KLASIK'].rev)}\t\t${fmt(d['REGULER'].rev)}\t\t${fmt(d['PREMIUM'].rev)}\t\t` +
      `${fmt(d['MINERAL'].rev)}\t\t${fmt(d['SOJU'].rev)}\t${fmt(d['CENDOL'].rev)}\t` +
      `${fmt(d['SAGO'].rev)}\t${fmt(d['ROASTED'].rev)}\t\t${fmt(d['BOLEN'].rev)}\t\t${fmt(d['KRESEK'].rev)}\t\t${fmt(total)}`
    );
  });
  console.log(`\nGRAND TOTAL: ${fmt(grandTotal)}`);
}

main().catch(console.error);
