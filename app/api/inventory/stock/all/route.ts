// ============================================================================
// INVENTORY ALL STOCK API ROUTE
// ============================================================================
// File: app/api/inventory/stock/all/route.ts
// Description: API endpoint untuk get stock summary semua outlet
// Version: 1.0
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const today = getTodayWIB();

    // Fetch semua stok fresh untuk hari ini
    const { data: stocks, error } = await adminSupabase
      .from('inventory_non_topping')
      .select('outlet_id, ukuran, qty_available')
      .eq('production_date', today)
      .eq('status', 'fresh');

    if (error) throw error;

    // Hitung stok per outlet per ukuran
    const summary: Record<string, { standar: number; mini: number }> = {};

    for (const stock of stocks || []) {
      if (!summary[stock.outlet_id]) {
        summary[stock.outlet_id] = { standar: 0, mini: 0 };
      }
      if (stock.ukuran === 'standar') {
        summary[stock.outlet_id].standar += stock.qty_available;
      } else if (stock.ukuran === 'mini') {
        summary[stock.outlet_id].mini += stock.qty_available;
      }
    }

    return NextResponse.json({ success: true, data: summary }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching all inventory stock:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
