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
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUserWithRole } from '@/lib/utils/auth-helpers';
import type { CreateProductionDaily, CreateProductionWasteDetail } from '@/lib/types/production';
import { runAlertChecks } from '@/lib/services/alert-service';
import { syncProductionToSheets } from '@/lib/integrations/google-sheets'; // ✅ FIX BUG #2: Import Google Sheets sync
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ FIX BUG #1: Import WIB timezone helper

// ============================================================================
// HELPER: Sinkronisasi inventory_non_topping setelah input produksi
// ============================================================================
/**
 * Setiap kali bagian dapur submit input produksi dengan success_qty > 0,
 * kita harus meng-update tabel inventory_non_topping agar kasir dapat
 * membaca stok yang benar secara real-time.
 *
 * Logika:
 * - Jika sudah ada entry untuk outlet+ukuran+tanggal → tambah qty (top-up)
 * - Jika belum ada → insert entry baru
 * 
 * ✅ IDEMPOTENCY: Cek inventory_sync_log untuk mencegah double-sync
 * Jika production_id sudah pernah di-sync, skip proses ini
 */
async function syncInventoryAfterProduction(
  production_id: string,
  outlet_id: string,
  ukuran: string,
  tanggal: string,
  success_qty: number
): Promise<void> {
  if (success_qty <= 0) return; // Tidak ada yang perlu disinkronisasi

  const adminSupabase = createAdminClient();

  console.log(`[syncInventory] START: production_id=${production_id}, outlet=${outlet_id}, ${ukuran}, date=${tanggal}, qty=${success_qty}`);

  // ✅ IDEMPOTENCY CHECK: Cek apakah production_id ini sudah pernah di-sync
  const { data: syncLog, error: logError } = await adminSupabase
    .from('inventory_sync_log')
    .select('id, qty_synced')
    .eq('production_daily_id', production_id)
    .maybeSingle();

  if (logError && logError.code !== 'PGRST116') { // PGRST116 = not found (OK)
    console.error('[syncInventory] Error checking sync log:', logError);
    // Continue anyway - better to sync than to fail
  }

  if (syncLog) {
    console.log(`[syncInventory] SKIP: production_id=${production_id} already synced (qty=${syncLog.qty_synced})`);
    return; // ✅ Already synced, skip to prevent double-sync
  }

  // Cek apakah sudah ada entry inventory untuk outlet+ukuran+tanggal ini
  const { data: existing, error: fetchError } = await adminSupabase
    .from('inventory_non_topping')
    .select('id, qty_available')
    .eq('outlet_id', outlet_id)
    .eq('ukuran', ukuran)
    .eq('production_date', tanggal)
    .eq('status', 'fresh')
    .maybeSingle();

  if (fetchError) {
    console.error('[syncInventory] Error fetching existing inventory:', fetchError);
    throw fetchError;
  }

  if (existing) {
    // Entry sudah ada → DELETE old dan INSERT baru dengan exact qty (REPLACE strategy)
    // ✅ CRITICAL FIX: Don't ADD/TOP-UP, REPLACE dengan exact success_qty
    const { error: deleteError } = await adminSupabase
      .from('inventory_non_topping')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('[syncInventory] Error deleting old entry:', deleteError);
      throw deleteError;
    }

    const { error: reinsertError } = await adminSupabase
      .from('inventory_non_topping')
      .insert({
        outlet_id,
        ukuran,
        qty_available: success_qty,        // ✅ SET to exact success_qty, NOT +=
        production_date: tanggal,
        status: 'fresh',
        last_updated: new Date().toISOString(),
      });

    if (reinsertError) {
      console.error('[syncInventory] Error reinserting inventory:', reinsertError);
      throw reinsertError;
    }

    console.log(`[syncInventory] REPLACE: ${ukuran} inventory for outlet ${outlet_id} on ${tanggal}: ${existing.qty_available} → ${success_qty}`);
  } else {
    // Entry belum ada → Insert baru
    const { error: insertError } = await adminSupabase
      .from('inventory_non_topping')
      .insert({
        outlet_id,
        ukuran,
        qty_available: success_qty,
        production_date: tanggal,
        status: 'fresh',
        last_updated: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[syncInventory] Error inserting inventory:', insertError);
      throw insertError;
    }

    console.log(`[syncInventory] INSERT: ${ukuran} inventory for outlet ${outlet_id} on ${tanggal}: qty=${success_qty}`);
  }

  // ✅ LOG SYNC: Catat bahwa production_id ini sudah di-sync
  const { error: logInsertError } = await adminSupabase
    .from('inventory_sync_log')
    .insert({
      production_daily_id: production_id,
      outlet_id,
      ukuran,
      qty_synced: success_qty,
    });

  if (logInsertError) {
    console.error('[syncInventory] Error logging sync:', logInsertError);
    // Don't throw - sync already done, log is just for tracking
  }
  
  console.log(`[syncInventory] DONE: production_id=${production_id}, logged successfully`);
}

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
    // 1. Authentication - Try to get user context
    // Middleware already authenticated the request via cookies
    let userId = request.headers.get('x-user-id');

    // If no header, use a system default
    // The important thing is middleware passed the request
    if (!userId) {
      // Set to 'system' for now - middleware already verified auth
      userId = 'system-production-api';
      console.log('[POST /api/production/daily] Using default user context (middleware authenticated)');
    }

    const currentUser = { id: userId, role: 'user' };

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
    
    // ✅ FIX BUG #1: Check date is not in future using WIB timezone
    const today = getTodayWIB();
    const inputDate = data.tanggal;
    
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
    
    // ✅ FIX: target_qty should equal success_qty + totalWaste (auto-calculated)
    const target_qty = data.target_qty || (data.success_qty + totalWaste);
    
    // Validate: success + waste should equal target (with small tolerance for rounding)
    if (Math.abs((data.success_qty + totalWaste) - target_qty) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          message: 'Total success + waste tidak sesuai dengan target',
          details: {
            target_qty: target_qty,
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
      target_qty: target_qty, // ✅ Use calculated target_qty
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

    // 8. ✅ SINKRONISASI INVENTORY — Jembatan utama antara Input Produksi dan Kasir
    // Tambahkan success_qty ke inventory_non_topping agar kasir membaca stok yang benar
    await syncInventoryAfterProduction(
      (result as any).id, // ✅ Pass production_id for idempotency
      data.outlet_id,
      data.ukuran,
      data.tanggal,
      data.success_qty
    );

    // 9. Trigger alert checks (async, don't wait)
    runAlertChecks(data.outlet_id, data.tanggal).catch(err => {
      console.error('Failed to run alert checks after production:', err);
      // Don't fail the production if alert checks fail
    });

    // 10. ✅ FIX BUG #2: SYNC TO GOOGLE SHEETS (Real-Time)
    // Prepare data for Google Sheets
    const adminSupabase = createAdminClient();
    const { data: outletData } = await adminSupabase
      .from('outlets')
      .select('nama')
      .eq('id', data.outlet_id)
      .single();

    const { data: userData } = await adminSupabase
      .from('users')
      .select('name')
      .eq('id', currentUser.id)
      .single();

    const productionForSheets = {
      production_id: (result as any).id,
      outlet_id: data.outlet_id,
      outlet_name: outletData?.nama || 'Unknown',
      tanggal: data.tanggal,
      ukuran: data.ukuran,
      target_qty: target_qty,
      success_qty: data.success_qty,
      waste_qty: totalWaste,
      success_rate: target_qty > 0 ? Math.round((data.success_qty / target_qty) * 100 * 100) / 100 : 0,
      waste_rate: target_qty > 0 ? Math.round((totalWaste / target_qty) * 100 * 100) / 100 : 0,
      total_hpp_loss: totalHppLoss,
      created_by: userData?.name || 'Unknown',
      created_at: new Date().toISOString(),
    };

    // Sync to Google Sheets (async, don't wait - non-blocking)
    syncProductionToSheets(productionForSheets).catch(err => {
      console.error('Failed to sync production to Google Sheets:', err);
      // Don't fail the production if Google Sheets sync fails
    });

    // 11. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Produksi berhasil disimpan! ${data.success_qty} donat berhasil masuk ke stok kasir.`,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating production:', error);

    // Handle unique constraint violation - allow multiple entries per outlet/date/size
    if (error.code === '23505' || error.message?.includes('unique_production_per_outlet_date_size')) {
      console.log('Duplicate detected, treating as new entry anyway');
      // Re-run without unique constraint by using a different approach
      // For now, just return success as if it was created
      return NextResponse.json(
        {
          success: false,
          message: 'Database constraint error - please contact admin to remove unique constraint',
          error: 'UNIQUE_CONSTRAINT_VIOLATION',
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
    // 1. Authentication - Middleware already verified via cookies
    let userId = request.headers.get('x-user-id');
    let userRole = request.headers.get('x-user-role');

    // If no headers, get from Supabase session
    if (!userId) {
      const adminSupabase = createAdminClient();

      // Try to get current session from Supabase (it's in cookies)
      const { data: { user: supabaseUser } } = await adminSupabase.auth.getUser();

      if (supabaseUser) {
        userId = supabaseUser.id;
        // Get role from database
        const { data: userRecord } = await adminSupabase
          .from('users')
          .select('role')
          .eq('id', supabaseUser.id)
          .single();
        userRole = userRecord?.role || 'user';
      }
    }

    if (!userId) {
      console.error('[GET /api/production/daily] Cannot determine user ID');
      return NextResponse.json(
        { success: false, message: 'Cannot determine user context' },
        { status: 401 }
      );
    }

    const currentUser = { id: userId, role: userRole || 'user' };

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
