// Script untuk cari tabel yang ada di Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';

const supabase = createClient(supabaseUrl, supabaseKey);

const PETRONITE_ID = 'c0d15f88-c2b7-42fb-a6c7-23e681c4447e';

async function tryTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (!error) {
    console.log(`✅ Table "${tableName}" ADA`);
    return true;
  } else {
    console.log(`❌ Table "${tableName}": ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== CEK TABEL YANG ADA ===');
  
  // Cek berbagai kemungkinan nama tabel
  const tables = [
    'production', 'productions', 'produksi',
    'inventory', 'inventories', 'stock', 'stocks', 'stok',
    'inventory_sync_log', 'daily_stock', 'daily_inventory',
    'closing', 'laporan_harian', 'daily_report',
    'channel_stock', 'channel_stocks'
  ];

  for (const t of tables) {
    await tryTable(t);
  }

  // Coba query dengan nama yg mungkin ada
  console.log('\n=== COBA inventory_sync_log ===');
  const { data: syncLog, error: syncErr } = await supabase
    .from('inventory_sync_log')
    .select('*')
    .limit(5);
  if (!syncErr) {
    console.log('Kolom:', syncLog.length > 0 ? Object.keys(syncLog[0]) : 'kosong');
    console.log(syncLog);
  }

  // Coba query channel_stock_deductions
  console.log('\n=== COBA channel_stock_deductions untuk Petronite ===');
  const { data: csd, error: csdErr } = await supabase
    .from('channel_stock_deductions')
    .select('*')
    .eq('outlet_id', PETRONITE_ID)
    .gte('created_at', '2026-06-01')
    .order('created_at', { ascending: true });
  if (!csdErr) {
    console.log('Data channel_stock_deductions:');
    console.table(csd);
  } else {
    console.log('Error:', csdErr.message);
  }
}

main().catch(console.error);
