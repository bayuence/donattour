import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getNowWIB } from '@/lib/utils/timezone'; // ✅ WIB

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isRead = searchParams.get('is_read');
    const limit = parseInt(searchParams.get('limit') || '10');
    const outletId = searchParams.get('outlet_id');

    const supabase = createAdminClient();

    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by is_read if provided
    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true');
    }

    // Optional outlet filter
    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Always return unread_count separately so the AlertContext can show
    // the bell badge correctly even when filtering by is_read=true.
    let unreadCount = 0;
    {
      let countQuery = supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (outletId) {
        countQuery = countQuery.eq('outlet_id', outletId);
      }
      const { count, error: countError } = await countQuery;
      if (!countError && typeof count === 'number') {
        unreadCount = count;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items: data || [],
        unread_count: unreadCount,
      },
    });
  } catch (error: any) {
    console.error('GET /api/alerts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, user_id, type, severity, title, message, metadata } = body;

    if (!type || !severity || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        outlet_id,
        user_id,
        type,
        severity,
        title,
        message,
        metadata,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('POST /api/alerts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_read } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: any = { is_read };
    if (is_read) {
      updateData.read_at = getNowWIB(); // ✅ WIB
    }

    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('PATCH /api/alerts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
