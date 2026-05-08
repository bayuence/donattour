// ============================================================================
// TOPPING ERRORS API ROUTE
// ============================================================================
// File: app/api/topping-errors/route.ts
// Description: API endpoint untuk lapor kesalahan topping
// Version: 2.0 - FIXED HPP CALCULATION
// Date: 2026-05-03
// 
// 🚨 CRITICAL CHANGES:
// - Fixed HPP calculation to query outlet_production_costs
// - Calculate biaya_topping from hpp_total - hpp_polos
// - Removed query for non-existent biaya_topping field
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface CreateToppingErrorRequest {
  outlet_id: string;
  product_ordered: string;  // Product name that customer wanted
  product_made: string;      // Product name that was actually made
  qty: number;
  reason: string;
  reported_by?: string;      // User ID who reported
}

// ============================================================================
// POST /api/topping-errors
// ============================================================================

/**
 * Create topping error report
 * 
 * Authorization: kasir, manager, admin
 * 
 * Request Body:
 * - outlet_id: string (required)
 * - product_ordered: string (required) - what customer wanted
 * - product_made: string (required) - what was actually made
 * - qty: number (required, > 0)
 * - reason: string (required, min 10 characters)
 * - reported_by: string (optional)
 * 
 * Response:
 * - 201 Created: Error report created successfully
 * - 400 Bad Request: Validation failed
 * - 404 Not Found: Product or outlet costs not found in database
 * - 500 Internal Server Error: Database error
 * 
 * Business Logic:
 * 🚨 CRITICAL HPP CALCULATION:
 * 1. Query outlet_production_costs for HPP polos (per outlet, per ukuran)
 * 2. Query products for HPP total (harga_pokok_penjualan) and ukuran
 * 3. Calculate biaya_topping = hpp_total - hpp_polos
 * 4. Calculate total_hpp_loss = (hpp_polos + biaya_topping) * qty
 * 5. Save complete breakdown to database
 * 
 * Note: Stock already deducted during original sale (no stock adjustment)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: CreateToppingErrorRequest = await request.json();
    
    const {
      outlet_id,
      product_ordered,
      product_made,
      qty,
      reason,
      reported_by,
    } = body;

    // 2. Validation
    const errors: string[] = [];

    if (!outlet_id) errors.push('outlet_id is required');
    if (!product_ordered) errors.push('product_ordered is required');
    if (!product_made) errors.push('product_made is required');
    if (!qty || qty <= 0) errors.push('qty must be greater than 0');
    if (!reason || reason.trim().length < 10) {
      errors.push('reason is required and must be at least 10 characters');
    }
    if (product_ordered === product_made) {
      errors.push('product_ordered and product_made must be different');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    // 3. Get Supabase client
    const supabase = createClient();

    // 4. Query products table for HPP total and ukuran
    const { data: productData, error: productError } = await (supabase as any)
      .from('products')
      .select('harga_pokok_penjualan, ukuran')
      .eq('nama', product_made)
      .eq('is_active', true)
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        {
          success: false,
          message: `Product "${product_made}" not found in database`,
          error: productError?.message,
        },
        { status: 404 }
      );
    }

    const hpp_total = (productData as any).harga_pokok_penjualan || 0;
    const ukuran = (productData as any).ukuran; // 'standar' or 'mini'

    // Validate HPP total
    if (hpp_total <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Product "${product_made}" has invalid HPP total (must be > 0). Please update product data first.`,
        },
        { status: 400 }
      );
    }

    // 5. Query outlet_production_costs for HPP polos
    const { data: costsData, error: costsError } = await (supabase as any)
      .from('outlet_production_costs')
      .select('cost_polos_standar, cost_polos_mini')
      .eq('outlet_id', outlet_id)
      .single();

    if (costsError || !costsData) {
      return NextResponse.json(
        {
          success: false,
          message: `Production costs not found for outlet ${outlet_id}. Please configure outlet production costs first.`,
          error: costsError?.message,
        },
        { status: 404 }
      );
    }

    // Get HPP polos based on ukuran
    const hpp_polos = ukuran === 'standar'
      ? ((costsData as any).cost_polos_standar || 0)
      : ((costsData as any).cost_polos_mini || 0);

    // Validate HPP polos
    if (hpp_polos <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: `HPP polos for ukuran "${ukuran}" is not configured for this outlet. Please update outlet production costs.`,
        },
        { status: 400 }
      );
    }

    // 6. Calculate biaya topping
    const biaya_topping = hpp_total - hpp_polos;

    // Validate biaya topping
    if (biaya_topping < 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid HPP calculation: HPP total (${hpp_total}) is less than HPP polos (${hpp_polos}). Please check product and outlet cost configuration.`,
        },
        { status: 400 }
      );
    }

    // 7. Calculate total HPP loss
    const total_hpp_loss = (hpp_polos + biaya_topping) * qty;

    // 8. Insert topping error record
    const { data, error } = await (supabase as any)
      .from('topping_errors')
      .insert({
        outlet_id,
        product_ordered,
        product_made,
        qty,
        reason: reason.trim(),
        hpp_per_pcs: hpp_polos,
        topping_cost: biaya_topping,
        total_hpp_loss,
        reported_by,
        reported_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating topping error:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create topping error report',
          error: error.message,
        },
        { status: 500 }
      );
    }

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Topping error reported successfully',
        data: {
          id: data.id,
          hpp_per_pcs: hpp_polos,
          topping_cost: biaya_topping,
          total_hpp_loss,
          breakdown: {
            hpp_polos,
            biaya_topping,
            qty,
            calculation: `(${hpp_polos} + ${biaya_topping}) × ${qty} = ${total_hpp_loss}`
          }
        },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error in POST /api/topping-errors:', error);
    
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
// GET /api/topping-errors
// ============================================================================

/**
 * Get topping error reports with filters
 * 
 * Query Parameters:
 * - outlet_id: string (optional)
 * - start_date: string (optional)
 * - end_date: string (optional)
 * - limit: number (optional, default: 50)
 * - offset: number (optional, default: 0)
 * 
 * Response:
 * - 200 OK: List of topping errors
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 2. Build query
    const supabase = createClient();
    let query = supabase
      .from('topping_errors')
      .select('*', { count: 'exact' })
      .order('reported_at', { ascending: false });

    // Apply filters
    if (outlet_id) {
      query = query.eq('outlet_id', outlet_id);
    }
    if (start_date) {
      query = query.gte('reported_at', start_date);
    }
    if (end_date) {
      query = query.lte('reported_at', end_date);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // 3. Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching topping errors:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch topping errors',
          error: error.message,
        },
        { status: 500 }
      );
    }

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          items: data || [],
          total: count || 0,
          limit,
          offset,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error in GET /api/topping-errors:', error);
    
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
