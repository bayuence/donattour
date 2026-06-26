// ============================================================================
// FIX NEGATIVE STOCK SCRIPT
// ============================================================================
// File: scripts/fix-negative-stock.ts
// Description: Clean corrupted inventory data and reset negative stocks
// Usage: npx tsx scripts/fix-negative-stock.ts
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTodayWIB(): string {
  const now = new Date();
  const wibOffset = 7 * 60; // WIB = UTC+7
  const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
  return wibTime.toISOString().split('T')[0];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function fixNegativeStock() {
  console.log('🔧 Starting negative stock fix...\n');
  
  const today = getTodayWIB();
  console.log('📅 Today (WIB):', today);
  
  try {
    // 1. Find all inventory records with negative qty_available
    console.log('\n🔍 Step 1: Finding negative stocks...');
    const { data: negativeStocks, error: findError } = await supabase
      .from('inventory_non_topping')
      .select('*')
      .lt('qty_available', 0);
    
    if (findError) {
      console.error('❌ Error finding negative stocks:', findError);
      throw findError;
    }
    
    if (!negativeStocks || negativeStocks.length === 0) {
      console.log('✅ No negative stocks found! Database is clean.');
    } else {
      console.log(`⚠️  Found ${negativeStocks.length} negative stock records:`);
      negativeStocks.forEach((stock: any) => {
        console.log(`   - ${stock.outlet_id} | ${stock.ukuran} | ${stock.qty_available} pcs | ${stock.production_date}`);
      });
      
      // Fix them by setting to 0
      console.log('\n🔧 Fixing negative stocks to 0...');
      const { error: fixError } = await supabase
        .from('inventory_non_topping')
        .update({ qty_available: 0, last_updated: new Date().toISOString() })
        .lt('qty_available', 0);
      
      if (fixError) {
        console.error('❌ Error fixing negative stocks:', fixError);
        throw fixError;
      }
      
      console.log('✅ All negative stocks fixed!');
    }
    
    // 2. Find old inventory records (not today)
    console.log('\n🔍 Step 2: Finding old inventory records (not today)...');
    const { data: oldStocks, error: oldError } = await supabase
      .from('inventory_non_topping')
      .select('*')
      .neq('production_date', today);
    
    if (oldError) {
      console.error('❌ Error finding old stocks:', oldError);
      throw oldError;
    }
    
    if (!oldStocks || oldStocks.length === 0) {
      console.log('✅ No old inventory records found.');
    } else {
      console.log(`⚠️  Found ${oldStocks.length} old inventory records:`);
      
      // Group by date
      const byDate: Record<string, number> = {};
      oldStocks.forEach((stock: any) => {
        byDate[stock.production_date] = (byDate[stock.production_date] || 0) + 1;
      });
      
      Object.entries(byDate).forEach(([date, count]) => {
        console.log(`   - ${date}: ${count} records`);
      });
      
      console.log('\n⚠️  Old records found. Do you want to delete them? (yes/no)');
      console.log('   Note: Only today\'s stock should be active in production.');
      // For automated cleanup, you can uncomment below:
      // await supabase.from('inventory_non_topping').delete().neq('production_date', today);
      // console.log('✅ Old records deleted!');
    }
    
    // 3. Check today's inventory
    console.log('\n🔍 Step 3: Checking today\'s inventory...');
    const { data: todayStocks, error: todayError } = await supabase
      .from('inventory_non_topping')
      .select('*')
      .eq('production_date', today);
    
    if (todayError) {
      console.error('❌ Error fetching today\'s stocks:', todayError);
      throw todayError;
    }
    
    if (!todayStocks || todayStocks.length === 0) {
      console.log('⚠️  No inventory for today. Make sure production has been input!');
    } else {
      console.log(`✅ Found ${todayStocks.length} inventory records for today:`);
      
      // Group by outlet
      const byOutlet: Record<string, any> = {};
      todayStocks.forEach((stock: any) => {
        if (!byOutlet[stock.outlet_id]) {
          byOutlet[stock.outlet_id] = { standar: 0, mini: 0 };
        }
        byOutlet[stock.outlet_id][stock.ukuran] += stock.qty_available;
      });
      
      Object.entries(byOutlet).forEach(([outlet, stocks]: [string, any]) => {
        console.log(`   - ${outlet}: Standar ${stocks.standar} pcs, Mini ${stocks.mini} pcs`);
      });
    }
    
    // 4. Check production records for today
    console.log('\n🔍 Step 4: Checking today\'s production...');
    const { data: productions, error: prodError } = await supabase
      .from('production_daily')
      .select('*')
      .eq('tanggal', today);
    
    if (prodError) {
      console.error('❌ Error fetching productions:', prodError);
      throw prodError;
    }
    
    if (!productions || productions.length === 0) {
      console.log('⚠️  No production records for today!');
      console.log('   Action: Input production first before using kasir.');
    } else {
      console.log(`✅ Found ${productions.length} production records for today:`);
      
      const byOutletProd: Record<string, any> = {};
      productions.forEach((prod: any) => {
        if (!byOutletProd[prod.outlet_id]) {
          byOutletProd[prod.outlet_id] = { standar: 0, mini: 0 };
        }
        byOutletProd[prod.outlet_id][prod.ukuran] += prod.success_qty || 0;
      });
      
      Object.entries(byOutletProd).forEach(([outlet, prods]: [string, any]) => {
        console.log(`   - ${outlet}: Standar ${prods.standar} pcs, Mini ${prods.mini} pcs`);
      });
    }
    
    console.log('\n✅ Fix completed!');
    console.log('\n📋 Summary:');
    console.log('   - Negative stocks have been fixed to 0');
    console.log('   - Inventory and production data verified');
    console.log('   - System ready for testing\n');
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixNegativeStock();
