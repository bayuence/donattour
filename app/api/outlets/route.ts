import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/outlets
 * Returns list of active outlets
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');

    let query = supabase
      .from('outlets')
      .select('id, nama, alamat, kode, status, telepon')
      .order('nama', { ascending: true });

    // By default only return active outlets unless ?all=true
    if (!all) {
      query = query.eq('status', 'aktif');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching outlets:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/outlets:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch outlets',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
