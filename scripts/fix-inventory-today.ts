// Script untuk fix inventory hari ini
// Hapus record yang salah (top-up) dan sync ulang dari production_daily

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInventoryToday() {
  const outletId = '86a545ed-9420-41f9-9f26-bcdcfba4437c';
  const tanggal = '2026-06-10';

  console.log('\n========================================');
  console.log('🔧 FIX INVENTORY HARI INI');
  console.log('========================================\n');

  // 1. Delete inventory_non_topping untuk hari ini
  console.log('🗑️  Deleting existing inventory records for today...');
  const { error: deleteError } = await supabase
    .from('inventory_non_topping')
    .delete()
    .eq('outlet_id', outletId)
    .eq('production_date', tanggal);

  if (deleteError) {
    console.error('❌ Error deleting:', deleteError);
    return;
  }
  console.log('✅ Deleted old inventory records\n');

  // 2. Get production_daily untuk hari ini
  console.log('📋 Fetching production records for today...');
  const { data: productions, error: prodError } = await supabase
    .from('production_daily')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('tanggal', tanggal);

  if (prodError) {
    console.error('❌ Error fetching production:', prodError);
    return;
  }

  console.log(`✅ Found ${productions?.length || 0} production records\n`);

  // 3. Insert ulang ke inventory_non_topping (setiap produksi = 1 batch)
  if (productions && productions.length > 0) {
    console.log('📦 Inserting fresh inventory batches...\n');
    
    for (const prod of productions) {
      if (prod.success_qty > 0) {
        const { error: insertError } = await supabase
          .from('inventory_non_topping')
          .insert({
            outlet_id: prod.outlet_id,
            ukuran: prod.ukuran,
            qty_available: prod.success_qty,
            production_date: prod.tanggal,
            status: 'fresh',
            last_updated: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`❌ Error inserting batch for ${prod.ukuran}:`, insertError);
        } else {
          console.log(`✅ Inserted batch: ${prod.ukuran} = ${prod.success_qty} pcs (from production ${prod.id.substring(0, 8)}...)`);
        }
      }
    }
  }

  // 4. Verify hasil
  console.log('\n📊 Verifying result...');
  const { data: finalInventory } = await supabase
    .from('inventory_non_topping')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('production_date', tanggal);

  console.log(`\n✅ Final inventory count: ${finalInventory?.length || 0} batches`);
  
  const totalStandar = finalInventory?.filter(i => i.ukuran === 'standar').reduce((sum, i) => sum + i.qty_available, 0) || 0;
  const totalMini = finalInventory?.filter(i => i.ukuran === 'mini').reduce((sum, i) => sum + i.qty_available, 0) || 0;
  
  console.log(`   Standar: ${totalStandar} pcs`);
  console.log(`   Mini: ${totalMini} pcs`);
  
  console.log('\n========================================');
  console.log('✅ DONE! Inventory fixed.');
  console.log('========================================\n');
}

fixInventoryToday().catch(console.error);
