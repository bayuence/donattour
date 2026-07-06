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
      .select('id, nama, ukuran, harga_pokok_penjualan, harga_jual, tipe_produk, is_active')
      .eq('is_active', true)
      .order('nama', { ascending: true });

    // Filter by category if provided
    if (category === 'finished') {
      // Finished products = donat_varian (products with topping)
      query = query.eq('tipe_produk', 'donat_varian');
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

    return NextResponse.json(
      {
        success: true,
        data: data.map((product) => ({
          id: product.id,
          nama: product.nama,
          ukuran: product.ukuran,
          tipe_produk: product.tipe_produk,
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
