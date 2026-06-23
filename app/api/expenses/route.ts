// ============================================================================
// EXPENSES API ROUTE
// ============================================================================
// File: app/api/expenses/route.ts
// Description: API endpoints for expense management
// Version: 1.0
// Date: 2026-05-19
// ============================================================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithRole, getUserFromRequest } from '@/lib/utils/auth-helpers';
import { getTodayWIB } from '@/lib/utils/timezone';
import {
  getExpenses,
  createExpense,
  getExpenseDailySummary,
  getExpensePeriodSummary,
  getExpenseSummary,
} from '@/lib/db/expenses';
import type { CreateExpense, ExpenseFilters } from '@/lib/types/expenses';

// ============================================================================
// GET /api/expenses
// ============================================================================
// Query params:
// - outlet_id: string (required)
// - tanggal: string (optional, format: YYYY-MM-DD)
// - start_date: string (optional, format: YYYY-MM-DD)
// - end_date: string (optional, format: YYYY-MM-DD)
// - kategori: string (optional)
// - summary: 'daily' | 'period' | 'category' (optional)
// - limit: number (optional, default: 50)
// - offset: number (optional, default: 0)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get current user - try header-based auth first (custom PIN login),
    // then fall back to Supabase Auth for compatibility.
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole());
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Get outlet_id (required)
    const outlet_id = searchParams.get('outlet_id');
    if (!outlet_id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_OUTLET_ID', message: 'outlet_id is required' } },
        { status: 400 }
      );
    }

    // Check if user has access to this outlet
    if (user.role !== 'admin' && user.role !== 'owner' && user.outlet_id !== outlet_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this outlet' } },
        { status: 403 }
      );
    }

    // Check if summary is requested
    const summaryType = searchParams.get('summary');
    
    if (summaryType === 'daily') {
      // Daily summary
      const tanggal = searchParams.get('tanggal') || getTodayWIB();
      const summary = await getExpenseDailySummary(outlet_id, tanggal);
      
      return NextResponse.json({
        success: true,
        data: summary,
      });
    }
    
    if (summaryType === 'period') {
      // Period summary
      const start_date = searchParams.get('start_date');
      const end_date = searchParams.get('end_date');
      
      if (!start_date || !end_date) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_DATES', message: 'start_date and end_date are required for period summary' } },
          { status: 400 }
        );
      }
      
      const summary = await getExpensePeriodSummary(start_date, end_date, outlet_id);
      
      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    // Build filters
    const filters: ExpenseFilters = {
      outlet_id,
      tanggal: searchParams.get('tanggal') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      kategori: searchParams.get('kategori') as any || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    // Get expenses
    const expenses = await getExpenses(filters);

    // If category summary is requested
    if (summaryType === 'category') {
      const summary = await getExpenseSummary(filters);
      return NextResponse.json({
        success: true,
        data: {
          expenses,
          summary,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: expenses,
      meta: {
        count: expenses.length,
        limit: filters.limit,
        offset: filters.offset,
      },
    });

  } catch (error: any) {
    console.error('[GET /api/expenses] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch expenses',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/expenses
// ============================================================================
// Body:
// {
//   outlet_id: string,
//   tanggal: string (YYYY-MM-DD),
//   kategori: ExpenseCategory,
//   keterangan: string,
//   jumlah: number,
//   bukti_url?: string
// }
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get current user - try header-based auth first (custom PIN login),
    // then fall back to Supabase Auth for compatibility.
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole());
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { outlet_id, tanggal, kategori, keterangan, jumlah, bukti_url } = body;

    // Validate required fields
    if (!outlet_id || !tanggal || !kategori || !keterangan || !jumlah) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: outlet_id, tanggal, kategori, keterangan, jumlah',
          },
        },
        { status: 400 }
      );
    }

    // Check if user has access to this outlet
    if (user.role !== 'admin' && user.role !== 'owner' && user.outlet_id !== outlet_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this outlet' } },
        { status: 403 }
      );
    }

    // Validate kategori
    const validKategori = ['operasional', 'bahan_baku', 'gaji', 'transportasi', 'perawatan', 'marketing', 'lainnya'];
    if (!validKategori.includes(kategori)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_KATEGORI',
            message: `Invalid kategori. Must be one of: ${validKategori.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate jumlah
    if (typeof jumlah !== 'number' || jumlah <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JUMLAH',
            message: 'jumlah must be a positive number',
          },
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: 'tanggal must be in YYYY-MM-DD format',
          },
        },
        { status: 400 }
      );
    }

    // Create expense
    const expenseData: CreateExpense = {
      outlet_id,
      tanggal,
      kategori,
      keterangan,
      jumlah,
      bukti_url: bukti_url || null,
      created_by: user.id,
    };

    const expense = await createExpense(expenseData);

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/expenses] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create expense',
        },
      },
      { status: 500 }
    );
  }
}
