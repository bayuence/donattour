// ============================================================================
// GET HPP FOR PRODUCTION INPUT
// ============================================================================
// File: app/api/products/hpp/route.ts
// Description: API untuk mendapatkan HPP donat polos berdasarkan outlet + ukuran
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const ukuran = searchParams.get('ukuran'); // 'standar' atau 'mini'

    if (!outlet_id || !ukuran) {
      return NextResponse.json(
        { success: false, message: 'Parameter outlet_id dan ukuran required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Query HPP dari outlet_production_costs
    const { data, error } = await supabase
      .from('outlet_production_costs')
      .select('cost_polos_standar, cost_polos_mini, harga_jual_polos_standar, harga_jual_polos_mini')
      .eq('outlet_id', outlet_id)
      .single();

    if (error) {
      console.error('Error fetching HPP:', error);
      
      // Jika tidak ada data, return default HPP
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: {
            hpp: ukuran === 'standar' ? 2000 : 1000, // Default fallback
            ukuran,
            is_default: true,
          },
        });
      }

      throw error;
    }

    const hpp = ukuran === 'standar' 
      ? (data.cost_polos_standar || 2000)
      : (data.cost_polos_mini || 1000);

    return NextResponse.json({
      success: true,
      data: {
        hpp,
        ukuran,
        outlet_id,
        is_default: false,
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/products/hpp:', error);
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
