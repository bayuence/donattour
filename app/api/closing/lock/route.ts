import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

export async function POST(request: NextRequest) {
  try {
    const { outlet_id } = await request.json();

    if (!outlet_id) {
      return NextResponse.json({ success: false, error: 'outlet_id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const today = getTodayWIB();

    // Dapatkan sembarang user valid (Admin/Manager) untuk menghindari Foreign Key error
    // Ini diperlukan jika proses ini dijalankan tanpa user auth session yang valid di lokal
    let validUserId = '00000000-0000-0000-0000-000000000000';
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) {
      validUserId = users[0].id;
    }

    // Insert ke tabel daily_closing
    const { error } = await supabase.from('daily_closing').insert({
      outlet_id,
      tanggal: today,
      closed_by: validUserId,
      notes: 'AUDIT_IN_PROGRESS'
    } as any);

    if (error) {
      console.error('Error locking kasir:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/closing/lock error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
