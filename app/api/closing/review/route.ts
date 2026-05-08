import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!outletId) {
      return NextResponse.json(
        { success: false, error: 'outlet_id is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if already closed
    const { data: existingClosing } = await supabase
      .from('daily_closing_reports')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('closing_date', date)
      .single();

    if (existingClosing) {
      return NextResponse.json({
        success: false,
        error: 'Outlet sudah ditutup untuk hari ini',
        already_closed: true,
        closing_data: existingClosing,
      });
    }

    // ============================================================================
    // 1. FETCH SALES DATA (by channel)
    // ============================================================================
    const { data: orders } = await supabase
      .from('orders')
      .select('id, channel, total_amount, payment_method, status, created_at')
      .eq('outlet_id', outletId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .eq('status', 'completed');

    // Group by channel
    const salesByChannel: any[] = [];
    const channelMap = new Map();

    orders?.forEach((order) => {
      const channel = order.channel || 'unknown';
      if (!channelMap.has(channel)) {
        channelMap.set(channel, {
          channel,
          transactions: 0,
          cash: 0,
          digital: 0,
          total: 0,
        });
      }

      const channelData = channelMap.get(channel);
      channelData.transactions += 1;
      channelData.total += order.total_amount;

      if (order.payment_method === 'cash') {
        channelData.cash += order.total_amount;
      } else {
        channelData.digital += order.total_amount;
      }
    });

    channelMap.forEach((value) => salesByChannel.push(value));

    const totalTransactions = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const cashRevenue = orders?.filter((o) => o.payment_method === 'cash').reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const digitalRevenue = totalRevenue - cashRevenue;

    // ============================================================================
    // 2. FETCH PRODUCTION DATA
    // ============================================================================
    const { data: production } = await supabase
      .from('production_daily')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('tanggal_produksi', date);

    const productionBySize: any[] = [];
    const sizeMap = new Map();

    production?.forEach((prod) => {
      const size = prod.ukuran;
      if (!sizeMap.has(size)) {
        sizeMap.set(size, {
          size,
          total: 0,
          success: 0,
          waste: 0,
        });
      }

      const sizeData = sizeMap.get(size);
      sizeData.total += prod.target || 0;
      sizeData.success += prod.berhasil || 0;
      sizeData.waste += prod.gagal || 0;
    });

    sizeMap.forEach((value) => productionBySize.push(value));

    const totalProduction = production?.reduce((sum, p) => sum + (p.target || 0), 0) || 0;
    const totalProductionSuccess = production?.reduce((sum, p) => sum + (p.berhasil || 0), 0) || 0;
    const totalProductionWaste = production?.reduce((sum, p) => sum + (p.gagal || 0), 0) || 0;

    // ============================================================================
    // 3. FETCH INVENTORY DATA (Remaining Plain)
    // ============================================================================
    const { data: inventoryPlain } = await supabase
      .from('inventory_non_topping')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('production_date', date)
      .eq('status', 'fresh');

    const remainingPlainStandar = inventoryPlain?.filter((i) => i.ukuran === 'standar').reduce((sum, i) => sum + i.qty_available, 0) || 0;
    const remainingPlainMini = inventoryPlain?.filter((i) => i.ukuran === 'mini').reduce((sum, i) => sum + i.qty_available, 0) || 0;

    // ============================================================================
    // 4. FETCH FINISHED PRODUCTS RECAP
    // ============================================================================
    const { data: finishedProducts } = await supabase
      .from('finished_products_recap')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('recap_date', date);

    const remainingFinishedItems = finishedProducts?.map((fp) => ({
      product_name: fp.product_name,
      quantity: fp.quantity,
    })) || [];

    const remainingFinished = finishedProducts?.reduce((sum, fp) => sum + fp.quantity, 0) || 0;

    // ============================================================================
    // 5. CALCULATE SOLD (from order_items)
    // ============================================================================
    const orderIds = orders?.map((o) => o.id) || [];
    let totalSold = 0;

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity')
        .in('order_id', orderIds);

      totalSold = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }

    // ============================================================================
    // 6. BALANCE CHECK
    // ============================================================================
    const leftSide = totalProductionSuccess;
    const rightSide = totalSold + remainingPlainStandar + remainingPlainMini + remainingFinished;
    const isBalanced = leftSide === rightSide;
    const balanceNotes = isBalanced
      ? 'Balance check passed'
      : `Balance mismatch: Production (${leftSide}) ≠ Sold + Remaining (${rightSide})`;

    // ============================================================================
    // 7. BUILD RESPONSE
    // ============================================================================
    const reviewData = {
      outlet_id: outletId,
      closing_date: date,

      // Sales
      sales: {
        total_transactions: totalTransactions,
        total_revenue: totalRevenue,
        cash_revenue: cashRevenue,
        digital_revenue: digitalRevenue,
        by_channel: salesByChannel,
      },

      // Production
      production: {
        total: totalProduction,
        success: totalProductionSuccess,
        waste: totalProductionWaste,
        by_size: productionBySize,
      },

      // Inventory
      inventory: {
        total_sold: totalSold,
        remaining_plain_standar: remainingPlainStandar,
        remaining_plain_mini: remainingPlainMini,
        remaining_finished: remainingFinished,
        remaining_finished_items: remainingFinishedItems,
      },

      // Balance
      balance: {
        is_balanced: isBalanced,
        notes: balanceNotes,
        left_side: leftSide,
        right_side: rightSide,
      },
    };

    return NextResponse.json({ success: true, data: reviewData });
  } catch (error: any) {
    console.error('GET /api/closing/review error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
