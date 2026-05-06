// ============================================================================
// PRODUCTION DAILY API ROUTE
// ============================================================================
// File: app/api/production/daily/route.ts
// Description: API endpoints for production daily management
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createProductionDaily, getProductionDailyList } from '@/lib/db/production-tracking';
import { createProductionSchema } from '@/lib/validations/production';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUserWithRole } from '@/lib/utils/auth-helpers';
import type { CreateProductionDaily, CreateProductionWasteDetail } from '@/lib/types/production';
import { runAlertChecks } from '@/lib/services/alert-service';

// ============================================================================
// POST /api/production/daily
// ============================================================================

/**
 * Create new production daily record
 * 
 * Authorization: bagian_dapur, manager, admin
 * 
 * Request Body:
 * - outlet_id: string
 * - tanggal: string (YYYY-MM-DD)
 * - ukuran: "standar" | "mini"
 * - target_qty: number (> 0)
 * - success_qty: number (>= 0)
 * - waste_details: Array<{ reason, qty, hpp_per_pcs }>
 * 
 * Validation:
 * - success_qty + sum(waste_details.qty) <= target_qty
 * - tanggal tidak boleh masa depan
 * - UNIQUE: outlet_id + tanggal + ukuran
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized (No user headers)' },
        { status: 401 }
      );
    }
    
    const currentUser = { id: userId, role: userRole };

    // 2. Authorization check removed as requested
    
    // 3. Parse request body
    const body = await request.json();

    // 4. Validate with Zod
    const validation = createProductionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: validation.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 5. Additional business validation
    
    // Check date is not in future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(data.tanggal);
    inputDate.setHours(0, 0, 0, 0);
    
    if (inputDate > today) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tanggal tidak boleh di masa depan',
        },
        { status: 400 }
      );
    }

    // Calculate total waste
    const totalWaste = data.waste_details.reduce((sum: number, detail: any) => sum + detail.qty, 0);
    
    // Validate: success + waste <= target
    if (data.success_qty + totalWaste > data.target_qty) {
      return NextResponse.json(
        {
          success: false,
          message: 'Total success + waste tidak boleh melebihi target',
          details: {
            target_qty: data.target_qty,
            success_qty: data.success_qty,
            waste_qty: totalWaste,
            total: data.success_qty + totalWaste,
          },
        },
        { status: 400 }
      );
    }

    // Calculate total HPP loss
    const totalHppLoss = data.waste_details.reduce(
      (sum: number, detail: any) => sum + (detail.qty * detail.hpp_per_pcs),
      0
    );

    // 6. Prepare production data
    const productionData: CreateProductionDaily = {
      outlet_id: data.outlet_id,
      tanggal: data.tanggal,
      ukuran: data.ukuran,
      target_qty: data.target_qty,
      success_qty: data.success_qty,
      waste_qty: totalWaste,
      total_hpp_loss: totalHppLoss,
      created_by: currentUser.id,
    };

    const wasteDetails: CreateProductionWasteDetail[] = data.waste_details.map((detail: any) => ({
      production_daily_id: '', // Will be set by createProductionDaily function
      reason: detail.reason,
      qty: detail.qty,
      hpp_per_pcs: detail.hpp_per_pcs,
    }));

    // 7. Create production with waste details (transaction)
    const result = await createProductionDaily(productionData, wasteDetails);

    // 8. Trigger alert checks (async, don't wait)
    runAlertChecks(data.outlet_id, data.tanggal).catch(err => {
      console.error('Failed to run alert checks after production:', err);
      // Don't fail the production if alert checks fail
    });

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Produksi berhasil disimpan',
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating production:', error);

    // Handle duplicate entry error (UNIQUE constraint violation)
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Produksi untuk outlet, tanggal, dan ukuran ini sudah ada',
          error: 'DUPLICATE_ENTRY',
        },
        { status: 409 }
      );
    }

    // Handle other errors
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
// GET /api/production/daily
// ============================================================================

/**
 * Get list of production daily records with filters
 * 
 * Authorization: bagian_dapur, manager, admin
 * 
 * Query Parameters:
 * - outlet_id?: string
 * - tanggal?: string (YYYY-MM-DD)
 * - start_date?: string
 * - end_date?: string
 * - ukuran?: "standar" | "mini"
 * - page?: number (default: 1)
 * - limit?: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    // 1. Authentication check
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized (No user headers)' },
        { status: 401 }
      );
    }
    
    const currentUser = { id: userId, role: userRole };

    // 2. Authorization check removed as requested
    
    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      outlet_id: searchParams.get('outlet_id') || undefined,
      tanggal: searchParams.get('tanggal') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      ukuran: searchParams.get('ukuran') as 'standar' | 'mini' | undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    // 4. Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    // 5. Fetch production list
    const result = await getProductionDailyList(filters);

    // 6. Calculate success_rate and waste_rate for each item
    const itemsWithRates = result.items.map((item: any) => ({
      ...item,
      success_rate: item.target_qty > 0 
        ? Math.round((item.success_qty / item.target_qty) * 100 * 100) / 100
        : 0,
      waste_rate: item.target_qty > 0
        ? Math.round((item.waste_qty / item.target_qty) * 100 * 100) / 100
        : 0,
    }));

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          items: itemsWithRates,
          pagination: result.pagination,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error fetching production list:', error);

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
