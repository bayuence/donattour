import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/outlet-production-costs
 * Fetch HPP polos costs for an outlet
 * 
 * Query params:
 * - outlet_id: UUID (required)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     outlet_id: string,
 *     cost_polos_standar: number,
 *     cost_polos_mini: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outlet_id');

    // Validate outlet_id
    if (!outletId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_OUTLET_ID',
            message: 'outlet_id query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    // Query outlet_production_costs
    const { data, error } = await supabase
      .from('outlet_production_costs')
      .select('outlet_id, cost_polos_standar, cost_polos_mini')
      .eq('outlet_id', outletId)
      .single();

    if (error) {
      console.error('Error fetching outlet production costs:', error);

      // If not found, return 404
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'OUTLET_COSTS_NOT_FOUND',
              message: `Production costs not found for outlet ${outletId}`,
            },
          },
          { status: 404 }
        );
      }

      throw error;
    }

    // Validate data
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OUTLET_COSTS_NOT_FOUND',
            message: `Production costs not found for outlet ${outletId}`,
          },
        },
        { status: 404 }
      );
    }

    // Validate costs are positive
    if (
      data.cost_polos_standar <= 0 ||
      data.cost_polos_mini <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_COSTS',
            message: 'Production costs must be greater than 0',
            details: {
              cost_polos_standar: data.cost_polos_standar,
              cost_polos_mini: data.cost_polos_mini,
            },
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          outlet_id: data.outlet_id,
          cost_polos_standar: data.cost_polos_standar,
          cost_polos_mini: data.cost_polos_mini,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/outlet-production-costs:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch outlet production costs',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
