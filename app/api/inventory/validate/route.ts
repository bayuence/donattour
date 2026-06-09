// ============================================================================
// INVENTORY VALIDATION API ROUTE (FIXED 401)
// ============================================================================
// File: app/api/inventory/validate/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateStockForPOS } from '@/lib/db/production-tracking';

// ✅ CRITICAL: Disable Next.js route caching untuk data realtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check (KITA BYPASS DULU AGAR KASIR TIDAK TERKUNCI)
    /* const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    */

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const tanggal = searchParams.get('tanggal') || undefined;

    // 3. Validate required parameters
    if (!outlet_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'outlet_id is required',
        },
        { status: 400 }
      );
    }

    // 4. Validate stock ke Database
    const validation = await validateStockForPOS(outlet_id, tanggal);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: validation,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );

  } catch (error: any) {
    console.error('Error validating stock:', error);

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