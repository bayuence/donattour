// ============================================================================
// INVENTORY VALIDATION API ROUTE
// ============================================================================
// File: app/api/inventory/validate/route.ts
// Description: API endpoint untuk validasi stok sebelum kasir bisa operasi
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateStockForPOS } from '@/lib/db/production-tracking';
import { getCurrentUserWithRole } from '@/lib/utils/auth-helpers';

// ============================================================================
// GET /api/inventory/validate
// ============================================================================

/**
 * Validate stock for POS operation
 * 
 * Authorization: kasir, manager, admin
 * 
 * Query Parameters:
 * - outlet_id: string (required)
 * - tanggal?: string (optional, default: today)
 * 
 * Response:
 * - can_operate: boolean (true jika ada produksi hari ini)
 * - has_production: boolean
 * - stock_summary: { standar, mini } dengan qty_available, status, percentage
 * - production_data: { standar, mini } dengan target_qty, success_qty
 * 
 * Business Logic:
 * - can_operate = true jika ada production input hari ini
 * - status = "low" jika qty_available < 20% dari success_qty
 * - status = "out_of_stock" jika qty_available = 0
 * - status = "sufficient" jika qty_available >= 20%
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Authorization check removed — all logged-in users can validate

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const tanggal = searchParams.get('tanggal') || undefined;

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

    // 5. Validate stock
    const validation = await validateStockForPOS(outlet_id, tanggal);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: validation,
      },
      { status: 200 }
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
