// Script untuk debug inventory stok
// Run: npx tsx scripts/debug-inventory.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInventory() {
  const outletId = '86a545ed-9420-41f9-9f26-bcdcfba4437c';
  const tanggal = '2026-06-10';

  console.log('\n========================================');
  console.log('🔍 DEBUG INVENTORY STOK');
  console.log('========================================\n');

  // 1. Cek production_daily
  console.log('📋 Checking production_daily...');
  const { data: productions, error: prodError } = await supabase
    .from('production_daily')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('tanggal', tanggal)
    .order('created_at', { ascending: true });

  if (prodError) {
    console.error('❌ Error:', prodError);
  } else {
    console.log(`✅ Found ${productions?.length || 0} production records:\n`);
    productions?.forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p.id.substring(0, 8)}...`);
      console.log(`   Ukuran: ${p.ukuran}`);
      console.log(`   Target: ${p.target_qty} | Success: ${p.success_qty} | Waste: ${p.waste_qty}`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log('');
    });
  }

  // 2. Cek inventory_non_topping
  console.log('\n📦 Checking inventory_non_topping...');
  const { data: inventories, error: invError } = await supabase
    .from('inventory_non_topping')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('production_date', tanggal);

  if (invError) {
    console.error('❌ Error:', invError);
  } else {
    console.log(`✅ Found ${inventories?.length || 0} inventory records:\n`);
    inventories?.forEach((inv, i) => {
      console.log(`${i + 1}. ID: ${inv.id.substring(0, 8)}...`);
      console.log(`   Ukuran: ${inv.ukuran}`);
      console.log(`   Qty Available: ${inv.qty_available}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Production Date: ${inv.production_date}`);
      console.log(`   Last Updated: ${inv.last_updated}`);
      console.log('');
    });
  }

  // 3. Cek inventory_sync_log
  console.log('\n📝 Checking inventory_sync_log...');
  const { data: syncLogs, error: syncError } = await supabase
    .from('inventory_sync_log')
    .select('*')
    .eq('outlet_id', outletId)
    .limit(10);

  if (syncError) {
    console.error('❌ Error:', syncError);
  } else {
    console.log(`✅ Found ${syncLogs?.length || 0} sync log records (last 10):\n`);
    syncLogs?.forEach((log, i) => {
      console.log(`${i + 1}. Production ID: ${log.production_daily_id.substring(0, 8)}...`);
      console.log(`   Ukuran: ${log.ukuran}`);
      console.log(`   Qty Synced: ${log.qty_synced}`);
      console.log('');
    });
  }

  // 4. Summary
  console.log('\n========================================');
  console.log('📊 SUMMARY');
  console.log('========================================\n');
  
  const totalProdStandar = productions?.filter(p => p.ukuran === 'standar').reduce((sum, p) => sum + p.success_qty, 0) || 0;
  const totalProdMini = productions?.filter(p => p.ukuran === 'mini').reduce((sum, p) => sum + p.success_qty, 0) || 0;
  
  const totalInvStandar = inventories?.filter(i => i.ukuran === 'standar').reduce((sum, i) => sum + i.qty_available, 0) || 0;
  const totalInvMini = inventories?.filter(i => i.ukuran === 'mini').reduce((sum, i) => sum + i.qty_available, 0) || 0;

  console.log(`Production Total Standar: ${totalProdStandar} pcs`);
  console.log(`Inventory Total Standar: ${totalInvStandar} pcs`);
  console.log(`${totalProdStandar === totalInvStandar ? '✅' : '❌'} Match: ${totalProdStandar === totalInvStandar}\n`);
  
  console.log(`Production Total Mini: ${totalProdMini} pcs`);
  console.log(`Inventory Total Mini: ${totalInvMini} pcs`);
  console.log(`${totalProdMini === totalInvMini ? '✅' : '❌'} Match: ${totalProdMini === totalInvMini}\n`);

  console.log('========================================\n');
}

debugInventory().catch(console.error);
