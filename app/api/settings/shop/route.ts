import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');

    if (!outlet_id) {
      return NextResponse.json({ success: false, error: 'outlet_id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('outlet_id', outlet_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shop settings:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET /api/settings/shop error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
