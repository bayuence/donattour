// ============================================================================
// PRODUCTION DAILY [ID] API ROUTE
// ============================================================================
// File: app/api/production/daily/[id]/route.ts
// Description: API endpoints for single production daily record
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getProductionDailyById, 
  updateProductionDaily,
  deleteProductionDaily 
} from '@/lib/db/production-tracking';
import { getCurrentUserWithRole } from '@/lib/utils/auth-helpers';

// ============================================================================
// GET /api/production/daily/[id]
// ============================================================================

/**
 * Get single production daily record by ID
 * 
 * Authorization: bagian_dapur, manager, admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id } = await params;
    
    // 1. Authentication check
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Authorization check
    const allowedRoles = ['admin', 'owner', 'manager', 'bagian_dapur'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Forbidden: Insufficient permissions' 
        },
        { status: 403 }
      );
    }

    // 3. Fetch production by ID
    const production = await getProductionDailyById(id);

    if (!production) {
      return NextResponse.json(
        {
          success: false,
          message: 'Production not found',
        },
        { status: 404 }
      );
    }

    // 4. Calculate rates
    const productionWithRates = {
      ...production,
      success_rate: production.target_qty > 0
        ? Math.round((production.success_qty / production.target_qty) * 100 * 100) / 100
        : 0,
      waste_rate: production.target_qty > 0
        ? Math.round((production.waste_qty / production.target_qty) * 100 * 100) / 100
        : 0,
    };

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: productionWithRates,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error fetching production:', error);

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

// ============================================================================
// PUT /api/production/daily/[id]
// ============================================================================

/**
 * Update production daily record
 * 
 * Authorization: bagian_dapur, manager, admin
 * 
 * Note: Only allow update for same day
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id } = await params;
    
    // 1. Authentication check
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Authorization check
    const allowedRoles = ['admin', 'manager', 'bagian_dapur'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Forbidden: Insufficient permissions' 
        },
        { status: 403 }
      );
    }

    // 3. Fetch existing production
    const existing = await getProductionDailyById(id);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: 'Production not found',
        },
        { status: 404 }
      );
    }

    // 4. Check if production is from today (only allow same-day edit)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const productionDate = new Date(existing.tanggal);
    productionDate.setHours(0, 0, 0, 0);

    if (productionDate.getTime() !== today.getTime()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Hanya bisa edit produksi hari ini',
        },
        { status: 403 }
      );
    }

    // 5. Parse request body
    const body = await request.json();

    // 6. Basic validation (since UpdateProductionDailySchema is not available)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body',
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // 7. If updating quantities, recalculate waste_qty and total_hpp_loss
    let finalUpdates: any = { ...updates };
    
    if (updates.success_qty !== undefined || updates.waste_details !== undefined) {
      const wasteDetails = updates.waste_details || existing.waste_details || [];
      const totalWaste = wasteDetails.reduce((sum: number, detail: any) => sum + detail.qty, 0);
      const totalHppLoss = wasteDetails.reduce(
        (sum: number, detail: any) => sum + (detail.qty * detail.hpp_per_pcs),
        0
      );

      finalUpdates.waste_qty = totalWaste;
      finalUpdates.total_hpp_loss = totalHppLoss;

      // Validate: success + waste <= target
      const targetQty = updates.target_qty || existing.target_qty;
      const successQty = updates.success_qty !== undefined ? updates.success_qty : existing.success_qty;

      if (successQty + totalWaste > targetQty) {
        return NextResponse.json(
          {
            success: false,
            message: 'Total success + waste tidak boleh melebihi target',
            details: {
              target_qty: targetQty,
              success_qty: successQty,
              waste_qty: totalWaste,
              total: successQty + totalWaste,
            },
          },
          { status: 400 }
        );
      }
    }

    // 8. Update production
    const updated = await updateProductionDaily(id, finalUpdates);

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: 'Produksi berhasil diupdate',
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error updating production:', error);

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

// ============================================================================
// DELETE /api/production/daily/[id]
// ============================================================================

/**
 * Delete production daily record
 * 
 * Authorization: admin only
 * 
 * Note: Only allow delete for same day
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id } = await params;
    
    // 1. Authentication check
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Authorization check (admin only)
    if (user.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Forbidden: Only admin can delete production' 
        },
        { status: 403 }
      );
    }

    // 3. Fetch existing production
    const existing = await getProductionDailyById(id);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: 'Production not found',
        },
        { status: 404 }
      );
    }

    // 4. Check if production is from today (only allow same-day delete)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const productionDate = new Date(existing.tanggal);
    productionDate.setHours(0, 0, 0, 0);

    if (productionDate.getTime() !== today.getTime()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Hanya bisa hapus produksi hari ini',
        },
        { status: 403 }
      );
    }

    // 5. Delete production
    await deleteProductionDaily(id);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Produksi berhasil dihapus',
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error deleting production:', error);

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
