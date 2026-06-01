// ============================================================================
// LIVE TRANSACTIONS API
// ============================================================================
// File: app/api/dashboard/live-transactions/route.ts
//
// Returns the most recent N orders across all outlets (or one outlet) so the
// owner dashboard can show a live ticker of transactions happening right now.
//
// Query params:
//   - limit:     default 20, max 100
//   - outlet_id: optional, scope to single outlet
//   - since:     optional ISO timestamp; only return orders newer than this
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
    const outletFilter = searchParams.get('outlet_id') || null;
    const since = searchParams.get('since') || null;

    let q = (supabase as any)
      .from('orders')
      .select(`
        id,
        outlet_id,
        kasir_id,
        kasir_name,
        customer_name,
        channel,
        total_amount,
        payment_method,
        payment_status,
        status,
        created_at,
        outlets(nama),
        order_items(quantity)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (outletFilter) q = q.eq('outlet_id', outletFilter);
    if (since) q = q.gt('created_at', since);

    const { data, error } = await q;
    if (error) throw error;

    const items = ((data ?? []) as Array<any>).map((o) => ({
      id: o.id,
      outlet_id: o.outlet_id,
      outlet_nama: o.outlets?.nama || null,
      kasir_name: o.kasir_name || null,
      customer_name: o.customer_name || null,
      channel: o.channel || 'toko',
      total_amount: Number(o.total_amount) || 0,
      payment_method: o.payment_method || null,
      payment_status: o.payment_status || null,
      status: o.status,
      created_at: o.created_at,
      items_count: Array.isArray(o.order_items)
        ? o.order_items.reduce(
            (sum: number, it: any) => sum + (Number(it.quantity) || 0),
            0
          )
        : 0,
    }));

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('[GET /api/dashboard/live-transactions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to fetch live transactions',
        },
      },
      { status: 500 }
    );
  }
}
