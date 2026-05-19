import { NextRequest, NextResponse } from 'next/server';
import { runAlertChecks, runAlertChecksForAllOutlets } from '@/lib/services/alert-service';
import { createClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB

/**
 * POST /api/alerts/check
 * 
 * Trigger alert checks manually or via cron
 * 
 * Body:
 * - outlet_id: UUID (optional, if not provided checks all outlets)
 * - date: YYYY-MM-DD (optional, defaults to today)
 * 
 * This endpoint can be called:
 * 1. Manually by admin/manager
 * 2. Via cron job (e.g., Vercel Cron, GitHub Actions)
 * 3. After key events (production input, closing, etc.)
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { outlet_id, date } = body;

    const checkDate = date || getTodayWIB(); // ✅ WIB bukan UTC

    // Run checks
    if (outlet_id) {
      // Check single outlet
      await runAlertChecks(outlet_id, checkDate);
      
      return NextResponse.json({
        success: true,
        message: `Alert checks completed for outlet ${outlet_id}`,
        data: {
          outlet_id,
          date: checkDate,
        },
      });
    } else {
      // Check all outlets
      await runAlertChecksForAllOutlets(checkDate);
      
      return NextResponse.json({
        success: true,
        message: 'Alert checks completed for all outlets',
        data: {
          date: checkDate,
        },
      });
    }

  } catch (error) {
    console.error('Error in POST /api/alerts/check:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to run alert checks',
          details: error instanceof Error ? error.message : 'Unknown error',
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/check
 * 
 * Trigger alert checks via GET (for cron jobs that only support GET)
 * 
 * Query params:
 * - outlet_id: UUID (optional)
 * - date: YYYY-MM-DD (optional)
 * - token: Secret token for authentication (required for cron)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const date = searchParams.get('date');
    const token = searchParams.get('token');

    // Verify cron token (if provided)
    const cronToken = process.env.CRON_SECRET_TOKEN;
    if (cronToken && token !== cronToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    const checkDate = date || getTodayWIB(); // ✅ WIB bukan UTC

    // Run checks
    if (outlet_id) {
      // Check single outlet
      await runAlertChecks(outlet_id, checkDate);
      
      return NextResponse.json({
        success: true,
        message: `Alert checks completed for outlet ${outlet_id}`,
        data: {
          outlet_id,
          date: checkDate,
        },
      });
    } else {
      // Check all outlets
      await runAlertChecksForAllOutlets(checkDate);
      
      return NextResponse.json({
        success: true,
        message: 'Alert checks completed for all outlets',
        data: {
          date: checkDate,
        },
      });
    }

  } catch (error) {
    console.error('Error in GET /api/alerts/check:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to run alert checks',
          details: error instanceof Error ? error.message : 'Unknown error',
        } 
      },
      { status: 500 }
    );
  }
}
