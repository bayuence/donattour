import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateAndDeductStock } from '@/lib/db/production-tracking';
import { syncTransactionToSheets } from '@/lib/integrations/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderData, items, outletId } = body;

    if (!orderData || !outletId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 1. Insert order
    const orderInsert: any = {
      outlet_id: orderData.outlet_id,
      customer_name: orderData.customer_name || 'Umum',
      total_amount: orderData.total_amount,
      payment_method: orderData.payment_method,
      payment_method_detail: orderData.payment_method === 'cash' ? 'Tunai' : orderData.payment_method,
      channel: orderData.channel || 'toko',
      paid_amount: orderData.paid_amount,
      change_amount: orderData.change_amount,
      status: 'completed',
      payment_status: 'paid',
      created_at: now,
    };

    if (orderData.kasir_id) orderInsert.kasir_id = orderData.kasir_id;

    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ success: false, error: orderError.message }, { status: 500 });
    }

    // 2. Insert order items
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name || item.nama || '',
        quantity: item.quantity || item.qty || 1,
        unit_price: item.unit_price || item.harga || 0,
        subtotal: item.subtotal || 0,
      }));

      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error saving order items:', itemsError);
      }
    }

    // 3. Deduct inventory stock
    // ✅ DISABLED: Database trigger handles this automatically
    // Trigger: deduct_inventory_on_sale() runs AFTER INSERT on orders
    // This prevents double deduction
    /*
    try {
      await validateAndDeductStock(outletId, order.id, items);
    } catch (stockErr) {
      console.error('Stock deduction error (non-blocking):', stockErr);
    }
    */
    console.log('[Order Create] Stock deduction handled by database trigger');

    // 4. Sync to Google Sheets (REALTIME)
    // ✅ Sync immediately after order creation for realtime updates
    try {
      // Get outlet name
      const { data: outlet } = await supabase
        .from('outlets')
        .select('nama')
        .eq('id', orderData.outlet_id)
        .single();

      // Prepare transaction data for Google Sheets
      const transactionData = {
        order_id: order.id,
        outlet_id: order.outlet_id,
        outlet_name: outlet?.nama || 'Unknown',
        kasir_id: order.kasir_id || '',
        kasir_name: orderData.kasir_name || '',
        customer_name: order.customer_name || '-',
        customer_phone: orderData.customer_phone || '-',
        channel: order.channel,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        status: order.status,
        items: items.map((item: any) => ({
          product_name: item.product_name || item.nama || '',
          quantity: item.quantity || item.qty || 1,
          unit_price: item.unit_price || item.harga || 0,
          subtotal: item.subtotal || 0,
        })),
        created_at: order.created_at,
      };

      // Sync to Google Sheets (non-blocking)
      syncTransactionToSheets(transactionData).catch((err) => {
        console.error('[Order Create] Google Sheets sync error (non-blocking):', err);
      });

      console.log('[Order Create] Google Sheets sync triggered (realtime)');
    } catch (syncErr) {
      console.error('[Order Create] Google Sheets sync error (non-blocking):', syncErr);
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('POST /api/orders/create error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
