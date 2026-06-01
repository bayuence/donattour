// ============================================================================
// EXPENSES [ID] API ROUTE
// ============================================================================
// File: app/api/expenses/[id]/route.ts
// Description: API endpoints for single expense operations (GET, PUT, DELETE)
// Version: 1.0
// Date: 2026-05-19
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithRole, getUserFromRequest } from '@/lib/utils/auth-helpers';
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '@/lib/db/expenses';
import type { UpdateExpense } from '@/lib/types/expenses';

// ============================================================================
// GET /api/expenses/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole());
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const expense = await getExpenseById(id);

    // Check access
    if (user.role !== 'owner' && user.outlet_id !== expense.outlet_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });

  } catch (error: any) {
    console.error('[GET /api/expenses/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch expense',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/expenses/[id]
// ============================================================================
// Body:
// {
//   kategori?: ExpenseCategory,
//   keterangan?: string,
//   jumlah?: number,
//   bukti_url?: string
// }
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole());
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get existing expense
    const existingExpense = await getExpenseById(id);

    // Check if user is the creator
    if (existingExpense.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own expenses' } },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { kategori, keterangan, jumlah, bukti_url } = body;

    // Validate kategori if provided
    if (kategori) {
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
    }

    // Validate jumlah if provided
    if (jumlah !== undefined && (typeof jumlah !== 'number' || jumlah <= 0)) {
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

    // Build update data
    const updateData: UpdateExpense = {};
    if (kategori !== undefined) updateData.kategori = kategori;
    if (keterangan !== undefined) updateData.keterangan = keterangan;
    if (jumlah !== undefined) updateData.jumlah = jumlah;
    if (bukti_url !== undefined) updateData.bukti_url = bukti_url;

    // Update expense
    const updatedExpense = await updateExpense(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedExpense,
      message: 'Expense updated successfully',
    });

  } catch (error: any) {
    console.error('[PUT /api/expenses/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to update expense',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/expenses/[id]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole());
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get existing expense
    const existingExpense = await getExpenseById(id);

    // Check if user is the creator or owner
    if (existingExpense.created_by !== user.id && user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own expenses' } },
        { status: 403 }
      );
    }

    // Delete expense
    await deleteExpense(id);

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });

  } catch (error: any) {
    console.error('[DELETE /api/expenses/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to delete expense',
        },
      },
      { status: 500 }
    );
  }
}
