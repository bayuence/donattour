import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, items, total_quantity, replace_existing } = body;

    if (!outlet_id || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const today = getTodayWIB(); // ✅ Use WIB timezone

    // If replace_existing flag is true, restore old inventory first
    if (replace_existing) {
      // Get old quantities to restore inventory
      const { data: oldRecap } = await supabase
        .from('finished_products_recap')
        .select('product_id, quantity')
        .eq('outlet_id', outlet_id)
        .eq('recap_date', today);

      // Restore inventory for old recap (add back to inventory_non_topping)
      if (oldRecap && oldRecap.length > 0) {
        for (const oldItem of oldRecap) {
          // Get product info to know the size
          const { data: product } = await supabase
            .from('products')
            .select('ukuran')
            .eq('id', oldItem.product_id)
            .single();

          if (product) {
            // Add back to inventory_non_topping (restore)
            await supabase.rpc('adjust_inventory_non_topping', {
              p_outlet_id: outlet_id,
              p_ukuran: product.ukuran,
              p_production_date: today,
              p_qty_change: oldItem.quantity, // Positive to add back
            });
          }
        }
      }

      // Delete old recap entries
      await supabase
        .from('finished_products_recap')
        .delete()
        .eq('outlet_id', outlet_id)
        .eq('recap_date', today);
    }

    // Insert new recap data
    const recapData = items.map((item: any) => ({
      outlet_id,
      product_id: item.product_id,
      product_name: item.product_name,
      ukuran: item.ukuran, // ← ADD THIS: ukuran from frontend
      quantity: item.quantity,
      recap_date: today,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('finished_products_recap')
      .insert(recapData)
      .select();

    if (error) {
      console.error('Error inserting recap:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Deduct inventory_non_topping for each finished product
    for (const item of items) {
      console.log(`Deducting inventory for ${item.product_name} (${item.ukuran}): -${item.quantity} pcs`);

      // Deduct from inventory_non_topping using ukuran from item
      const { data: rpcData, error: rpcError } = await supabase.rpc('adjust_inventory_non_topping', {
        p_outlet_id: outlet_id,
        p_ukuran: item.ukuran, // ← Use ukuran from item directly
        p_production_date: today,
        p_qty_change: -item.quantity, // Negative to deduct
      });

      if (rpcError) {
        console.error('Error adjusting inventory:', rpcError);
        console.error('Parameters:', { outlet_id, ukuran: item.ukuran, date: today, qty: -item.quantity });
      } else {
        console.log(`✅ Inventory adjusted for ${item.product_name} (${item.ukuran})`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      data,
      inventory_adjusted: true,
      message: 'Rekap berhasil disimpan dan inventory telah dikurangi'
    });
  } catch (error: any) {
    console.error('POST /api/finished-products-recap error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const date = searchParams.get('date') || getTodayWIB(); // ✅ Use WIB timezone

    if (!outletId) {
      return NextResponse.json(
        { success: false, error: 'outlet_id is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('finished_products_recap')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('recap_date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recap:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Calculate summary
    const summary = {
      total_quantity: data?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      total_products: data?.length || 0,
      items: data || [],
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('GET /api/finished-products-recap error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
