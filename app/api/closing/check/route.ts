// ============================================================================
// CLOSING CHECK API ROUTE
// ============================================================================
// File: app/api/closing/check/route.ts
// Description: API endpoint untuk cek apakah outlet sudah closing hari ini
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB

// ============================================================================
// GET /api/closing/check
// ============================================================================

/**
 * Check if outlet already closed today
 * 
 * Query Parameters:
 * - outlet_id: string (required)
 * - tanggal: string (optional, default: today)
 * 
 * Response:
 * - 200 OK: Check result with has_closed flag
 * - 400 Bad Request: Missing outlet_id
 * - 500 Internal Server Error: Database error
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const tanggal = searchParams.get('tanggal') || getTodayWIB(); // ✅ WIB bukan UTC

    // 2. Validation
    if (!outlet_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'outlet_id is required',
        },
        { status: 400 }
      );
    }

    // 3. Check if closing exists
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_closing')
      .select(`
        *,
        closing_non_topping_status(*),
        closing_finished_products(*),
        daily_loss_summary(*)
      `)
      .eq('outlet_id', outlet_id)
      .eq('tanggal', tanggal)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (not an error)
      console.error('Error checking closing:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to check closing',
          error: error.message,
        },
        { status: 500 }
      );
    }

    // 4. Return result
    return NextResponse.json(
      {
        success: true,
        data: {
          has_closed: !!data,
          closing_data: data || null,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error in GET /api/closing/check:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
