import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/alerts/read-all
 * 
 * Mark all alerts as read for the current user
 * 
 * Query params:
 * - outlet_id: Filter by outlet (optional)
 * - user_id: Filter by user (optional)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const user_id = searchParams.get('user_id');

    // Build query
    let query = (supabase as any)
      .from('alerts')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('is_read', false);

    // Apply filters
    if (outlet_id) {
      query = query.eq('outlet_id', outlet_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Execute update
    const { data, error, count } = await query.select();

    if (error) {
      console.error('Error marking all alerts as read:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to mark all alerts as read',
            details: error.message 
          } 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_count: data?.length || 0,
      },
      message: `${data?.length || 0} alerts marked as read`,
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/alerts/read-all:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An unexpected error occurred' 
        } 
      },
      { status: 500 }
    );
  }
}
