import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/products
 * Fetch products list with optional filters
 * 
 * Query params:
 * - category: string (optional) - 'finished' for finished products only
 * - outlet_id: UUID (optional) - filter by outlet
 * 
 * Response:
 * {
 *   success: true,
 *   data: Array<{
 *     id: string,
 *     nama: string,
 *     ukuran: 'standar' | 'mini',
 *     harga_pokok_penjualan: number,
 *     harga_jual: number
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const outletId = searchParams.get('outlet_id');

    // Build query
    let query = supabase
      .from('products')
      .select('id, nama, ukuran, harga_pokok_penjualan, harga_jual, kategori')
      .order('nama', { ascending: true });

    // Filter by category if provided
    if (category === 'finished') {
      // Finished products are products with topping (not 'Donat Polos')
      query = query.neq('kategori', 'Donat Polos');
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    // Validate data
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_PRODUCTS_FOUND',
            message: 'No products found',
          },
        },
        { status: 404 }
      );
    }

    // Filter out products with invalid HPP
    const validProducts = data.filter(
      (product) => product.harga_pokok_penjualan > 0
    );

    return NextResponse.json(
      {
        success: true,
        data: validProducts.map((product) => ({
          id: product.id,
          nama: product.nama,
          ukuran: product.ukuran,
          harga_pokok_penjualan: product.harga_pokok_penjualan,
          harga_jual: product.harga_jual,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/products:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch products',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
