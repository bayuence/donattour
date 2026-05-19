import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getNowWIB } from '@/lib/utils/timezone'; //  WIB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, closing_date, review_data, closed_by } = body;

    if (!outlet_id || !closing_date || !review_data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if already closed
    const { data: existing } = await supabase
      .from('daily_closing_reports')
      .select('id')
      .eq('outlet_id', outlet_id)
      .eq('closing_date', closing_date)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Outlet sudah ditutup untuk hari ini' },
        { status: 400 }
      );
    }

    // Prepare closing report data
    const closingReport = {
      outlet_id,
      closing_date,

      // Sales
      total_transactions: review_data.sales.total_transactions,
      total_revenue: review_data.sales.total_revenue,
      cash_revenue: review_data.sales.cash_revenue,
      digital_revenue: review_data.sales.digital_revenue,
      sales_by_channel: review_data.sales.by_channel,

      // Production
      total_production: review_data.production.total,
      total_production_success: review_data.production.success,
      total_production_waste: review_data.production.waste,
      production_by_size: review_data.production.by_size,

      // Inventory
      total_sold: review_data.inventory.total_sold,
      remaining_plain_standar: review_data.inventory.remaining_plain_standar,
      remaining_plain_mini: review_data.inventory.remaining_plain_mini,
      remaining_finished: review_data.inventory.remaining_finished,
      remaining_finished_items: review_data.inventory.remaining_finished_items,

      // Balance
      is_balanced: review_data.balance.is_balanced,
      balance_notes: review_data.balance.notes,

      // Closing info
      closed_by,
      closed_at: getNowWIB(), // ✅ WIB

      // Full snapshot
      report_snapshot: review_data,

      // Status
      status: 'closed',
    };

    // Insert closing report
    const { data, error } = await supabase
      .from('daily_closing_reports')
      .insert(closingReport)
      .select()
      .single();

    if (error) {
      console.error('Error inserting closing report:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('POST /api/closing/confirm error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
