// ============================================================================
// RESET DATABASE SCRIPT - CLEAN ALL DATA
// ============================================================================
// File: scripts/reset-database.ts
// Description: Clean all production, transaction, and inventory data
// Usage: npx tsx scripts/reset-database.ts
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import * as readline from 'readline';

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

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function getTableCount(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`Error counting ${tableName}:`, error);
    return 0;
  }
  
  return count || 0;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function resetDatabase() {
  console.log('\n🔥 ============================================');
  console.log('   DATABASE RESET SCRIPT');
  console.log('   ============================================\n');
  
  console.log('⚠️  WARNING: This will DELETE all data from:');
  console.log('   - production_daily (Input Produksi)');
  console.log('   - inventory_non_topping (Stok Donat)');
  console.log('   - orders (Transaksi Penjualan)');
  console.log('   - order_items (Detail Transaksi)');
  console.log('   - channel_stock_deductions (Pemotongan Stok Channel)');
  console.log('   - expenses (Pengeluaran)');
  console.log('   - otr_stock_transfers (Transfer Stok OTR)');
  console.log('   - otr_sales (Penjualan OTR)');
  console.log('\n');

  // Show current data counts
  console.log('📊 Current data counts:');
  const counts = {
    production: await getTableCount('production_daily'),
    inventory: await getTableCount('inventory_non_topping'),
    orders: await getTableCount('orders'),
    orderItems: await getTableCount('order_items'),
    channelDeductions: await getTableCount('channel_stock_deductions'),
    expenses: await getTableCount('expenses'),
    otrTransfers: await getTableCount('otr_stock_transfers'),
    otrSales: await getTableCount('otr_sales'),
  };

  console.log(`   - Production records: ${counts.production}`);
  console.log(`   - Inventory records: ${counts.inventory}`);
  console.log(`   - Orders: ${counts.orders}`);
  console.log(`   - Order items: ${counts.orderItems}`);
  console.log(`   - Channel deductions: ${counts.channelDeductions}`);
  console.log(`   - Expenses: ${counts.expenses}`);
  console.log(`   - OTR transfers: ${counts.otrTransfers}`);
  console.log(`   - OTR sales: ${counts.otrSales}`);
  console.log('\n');

  // Confirmation
  const answer = await askQuestion('❓ Are you ABSOLUTELY SURE you want to delete ALL data? Type "YES DELETE ALL" to confirm: ');
  
  if (answer !== 'yes delete all') {
    console.log('\n✅ Reset cancelled. No data was deleted.');
    process.exit(0);
  }

  console.log('\n🔄 Starting deletion process...\n');

  try {
    // 1. Delete order items first (foreign key dependency)
    console.log('🗑️  [1/8] Deleting order items...');
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (orderItemsError) {
      console.error('❌ Error deleting order items:', orderItemsError);
    } else {
      console.log(`✅ Deleted ${counts.orderItems} order items`);
    }

    // 2. Delete orders
    console.log('🗑️  [2/8] Deleting orders...');
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ordersError) {
      console.error('❌ Error deleting orders:', ordersError);
    } else {
      console.log(`✅ Deleted ${counts.orders} orders`);
    }

    // 3. Delete channel stock deductions
    console.log('🗑️  [3/8] Deleting channel stock deductions...');
    const { error: channelError } = await supabase
      .from('channel_stock_deductions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (channelError) {
      console.error('❌ Error deleting channel deductions:', channelError);
    } else {
      console.log(`✅ Deleted ${counts.channelDeductions} channel deductions`);
    }

    // 4. Delete inventory
    console.log('🗑️  [4/8] Deleting inventory records...');
    const { error: inventoryError } = await supabase
      .from('inventory_non_topping')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (inventoryError) {
      console.error('❌ Error deleting inventory:', inventoryError);
    } else {
      console.log(`✅ Deleted ${counts.inventory} inventory records`);
    }

    // 5. Delete production
    console.log('🗑️  [5/8] Deleting production records...');
    const { error: productionError } = await supabase
      .from('production_daily')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (productionError) {
      console.error('❌ Error deleting production:', productionError);
    } else {
      console.log(`✅ Deleted ${counts.production} production records`);
    }

    // 6. Delete expenses
    console.log('🗑️  [6/8] Deleting expenses...');
    const { error: expensesError } = await supabase
      .from('expenses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (expensesError) {
      console.error('❌ Error deleting expenses:', expensesError);
    } else {
      console.log(`✅ Deleted ${counts.expenses} expenses`);
    }

    // 7. Delete OTR transfers
    console.log('🗑️  [7/8] Deleting OTR transfers...');
    const { error: otrTransfersError } = await supabase
      .from('otr_stock_transfers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (otrTransfersError) {
      console.error('❌ Error deleting OTR transfers:', otrTransfersError);
    } else {
      console.log(`✅ Deleted ${counts.otrTransfers} OTR transfers`);
    }

    // 8. Delete OTR sales
    console.log('🗑️  [8/8] Deleting OTR sales...');
    const { error: otrSalesError } = await supabase
      .from('otr_sales')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (otrSalesError) {
      console.error('❌ Error deleting OTR sales:', otrSalesError);
    } else {
      console.log(`✅ Deleted ${counts.otrSales} OTR sales`);
    }

    console.log('\n✅ ============================================');
    console.log('   DATABASE RESET COMPLETED!');
    console.log('   ============================================\n');
    
    console.log('📋 Summary:');
    console.log(`   - ${counts.production} production records deleted`);
    console.log(`   - ${counts.inventory} inventory records deleted`);
    console.log(`   - ${counts.orders} orders deleted`);
    console.log(`   - ${counts.orderItems} order items deleted`);
    console.log(`   - ${counts.channelDeductions} channel deductions deleted`);
    console.log(`   - ${counts.expenses} expenses deleted`);
    console.log(`   - ${counts.otrTransfers} OTR transfers deleted`);
    console.log(`   - ${counts.otrSales} OTR sales deleted`);
    console.log('\n✅ Database is now clean. Ready for testing from zero!\n');

    // Note about master data
    console.log('ℹ️  Note: Master data (products, outlets, users) NOT deleted.');
    console.log('   Only transaction and operational data has been removed.\n');

  } catch (error) {
    console.error('\n❌ Error during reset:', error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase();
