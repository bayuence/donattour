// ============================================================================
// INVENTORY STOCK API ROUTE
// ============================================================================
// File: app/api/inventory/stock/route.ts
// Description: API endpoint untuk get real-time stock non-topping
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getInventoryStock } from '@/lib/db/production-tracking';
import { getCurrentUserWithRole } from '@/lib/utils/auth-helpers';
import type { DonutSize, InventoryStatus } from '@/lib/types/production';

// ============================================================================
// GET /api/inventory/stock
// ============================================================================

/**
 * Get real-time stock non-topping per outlet
 * 
 * Authorization: kasir, bagian_dapur, manager, admin
 * 
 * Query Parameters:
 * - outlet_id: string (required)
 * - ukuran?: "standar" | "mini" (optional)
 * - status?: "fresh" | "aging" | "expired" (optional)
 * - production_date?: string (optional, YYYY-MM-DD)
 * 
 * Response:
 * - outlet_id: string
 * - stocks: Array of inventory records
 * - total_by_size: { standar, mini } total quantities
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Authorization check
    const allowedRoles = ['admin', 'manager', 'kasir', 'bagian_dapur'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Forbidden: Insufficient permissions' 
        },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const ukuran = searchParams.get('ukuran') as DonutSize | undefined;
    const status = searchParams.get('status') as InventoryStatus | undefined;
    const production_date = searchParams.get('production_date') || undefined;

    // 4. Validate required parameters
    if (!outlet_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'outlet_id is required',
        },
        { status: 400 }
      );
    }

    // 5. Validate enum values
    if (ukuran && !['standar', 'mini'].includes(ukuran)) {
      return NextResponse.json(
        {
          success: false,
          message: 'ukuran must be "standar" or "mini"',
        },
        { status: 400 }
      );
    }

    if (status && !['fresh', 'aging', 'expired'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'status must be "fresh", "aging", or "expired"',
        },
        { status: 400 }
      );
    }

    // 6. Get inventory stock
    const result = await getInventoryStock({
      outlet_id,
      ukuran,
      status,
      production_date,
    });

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error fetching inventory stock:', error);

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
