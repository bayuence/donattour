const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://elduyooybiscdqwwzfwv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg'
);
const OUTLET = '86a545ed-9420-41f9-9f26-bcdcfba4437c';
const TODAY = '2026-06-09';

// Same implementation as what's in lib/db/production-tracking.ts
async function deductStockOnSale(
  outlet_id,
  ukuran,
  qty,
  customClient
) {
  try {
    const dbClient = customClient || supabase;
    
    // getTodayWIB simulation
    const todayWIB = TODAY;

    console.log(`\n--- deductStockOnSale called ---`);
    console.log(`Outlet: ${outlet_id}, Ukuran: ${ukuran}, Qty: ${qty}, Date: ${todayWIB}`);

    // 1. Get available stock (fresh only, TODAY's production only)
    const { data: stocks, error: fetchError } = await dbClient
      .from('inventory_non_topping')
      .select('*')
      .eq('outlet_id', outlet_id)
      .eq('ukuran', ukuran)
      .eq('status', 'fresh')
      .eq('production_date', todayWIB) // ✅ CRITICAL: Hanya stok hari ini
      .gt('qty_available', 0)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching inventory:', fetchError);
      return { success: false, error: 'Failed to fetch inventory' };
    }

    console.log('Found stocks:', stocks);

    if (!stocks || stocks.length === 0) {
      return { 
        success: false, 
        error: `Stok ${ukuran} hari ini habis! Tidak ada stok fresh untuk tanggal ${todayWIB}.` 
      };
    }

    // 2. Calculate total available today
    const totalAvailable = stocks.reduce((sum, stock) => sum + stock.qty_available, 0);

    if (totalAvailable < qty) {
      return { 
        success: false, 
        error: `Stok ${ukuran} hari ini tidak cukup! Tersedia: ${totalAvailable} pcs, Dibutuhkan: ${qty} pcs` 
      };
    }

    // 3. Deduct stock from today's production records
    let remaining = qty;
    const deducted = [];

    for (const stock of stocks) {
      if (remaining <= 0) break;

      const deductQty = Math.min(stock.qty_available, remaining);
      const newQty = stock.qty_available - deductQty;

      // Update inventory
      const { error: updateError } = await dbClient
        .from('inventory_non_topping')
        .update({
          qty_available: newQty,
          last_updated: new Date().toISOString()
        })
        .eq('id', stock.id);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        return { success: false, error: 'Failed to update inventory' };
      }

      deducted.push({
        inventory_id: stock.id,
        production_date: stock.production_date,
        deducted_qty: deductQty,
        remaining_qty: newQty,
      });

      remaining -= deductQty;
    }

    return { success: true, deducted };

  } catch (error) {
    console.error('Error in deductStockOnSale:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

async function main() {
  const result = await deductStockOnSale(OUTLET, 'standar', 1, supabase);
  console.log('Result:', result);
}

main().catch(console.error);
