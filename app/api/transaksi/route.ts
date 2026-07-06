import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    const startUTC   = searchParams.get('start') || '';
    const endUTC     = searchParams.get('end')   || '';
    const status     = searchParams.get('status') || 'all';
    const outletIds  = searchParams.get('outlet_ids') || ''; // comma-separated

    if (!startUTC || !endUTC) {
      return NextResponse.json({ success: false, error: 'Missing start/end params' }, { status: 400 });
    }

    let query = (supabase as any)
      .from('orders')
      .select(`
        id, created_at, status, total_amount,
        payment_method, payment_method_detail, customer_name,
        kasir_name, kasir_id, channel, outlet_id,
        paid_amount, change_amount,
        outlets ( nama, alamat ),
        users:kasir_id ( name ),
        order_items (
          quantity, unit_price, product_name
        )
      `)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (outletIds) {
      const ids = outletIds.split(',').filter(Boolean);
      if (ids.length > 0) {
        query = query.in('outlet_id', ids);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [GET /api/transaksi] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('❌ [GET /api/transaksi] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
