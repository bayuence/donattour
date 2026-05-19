import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateAndDeductStock } from '@/lib/db/production-tracking';
import { syncTransactionToSheets } from '@/lib/integrations/google-sheets';
import { apiLogger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || 'no-id'
  const startTime = Date.now()
  const userId = request.headers.get('x-user-id') || 'system'

  try {
    apiLogger.info({
      correlationId,
      event: 'order_create_start',
      userId,
      timestamp: new Date().toISOString(),
    })

    const body = await request.json();
    const { orderData, items, outletId } = body;

    if (!orderData || !outletId) {
      apiLogger.warn({
        correlationId,
        event: 'order_create_validation_error',
        error: 'Missing required fields',
        provided: Object.keys(body),
      })
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();
    // ✅ WIB timestamp (UTC+7) agar jam transaksi sesuai waktu Indonesia
    const nowUTC = new Date();
    const nowWIB = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const year  = nowWIB.getFullYear();
    const month = String(nowWIB.getMonth() + 1).padStart(2, '0');
    const day   = String(nowWIB.getDate()).padStart(2, '0');
    const hh    = String(nowWIB.getHours()).padStart(2, '0');
    const mm    = String(nowWIB.getMinutes()).padStart(2, '0');
    const ss    = String(nowWIB.getSeconds()).padStart(2, '0');
    const now   = `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;

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
      apiLogger.error({
        correlationId,
        event: 'order_create_db_error',
        error: orderError.message,
        code: orderError.code,
      })
      return NextResponse.json({ success: false, error: orderError.message }, { status: 500 });
    }

    apiLogger.info({
      correlationId,
      event: 'order_created',
      orderId: order.id,
      outletId: order.outlet_id,
      totalAmount: order.total_amount,
      itemsCount: items?.length || 0,
    })

    // 2. Insert order items
    // ✅ Dideklarasikan di sini agar blok stock deduction bisa mengaksesnya
    const orderItems: any[] = [];

    if (items && items.length > 0) {
      for (const item of items) {
        let productName = item.product_name || item.nama || '';
        
        // If product_name is empty but product_id exists, fetch from database
        if (!productName && item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('nama')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            productName = product.nama;
          }
        }
        
        orderItems.push({
          order_id: order.id,
          product_id: item.product_id || null,
          product_name: productName,
          quantity: item.quantity || item.qty || 1,
          unit_price: item.unit_price || item.harga || 0,
          subtotal: item.subtotal || 0,
        });
      }

      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error saving order items:', itemsError);
      }
    }

    // 3. Deduct inventory stock (FALLBACK/MANUAL)
    // Karena banyak kasus trigger database tidak berjalan, kita lakukan pemotongan dari sisi API
    try {
      const { deductStockOnSale } = await import('@/lib/db/production-tracking');
      const qtyNeeded = { standar: 0, mini: 0 };

      // Hitung kebutuhan donat dari setiap item
      for (const oi of orderItems) {
        if (oi.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('ukuran, tipe_produk')
            .eq('id', oi.product_id)
            .single();

          // Jika ini produk donat_varian atau memiliki ukuran
          if (prod && (prod.tipe_produk === 'donat_varian' || prod.ukuran)) {
            const ukuran = prod.ukuran === 'mini' ? 'mini' : 'standar';
            qtyNeeded[ukuran] += (oi.quantity || 1);
          }
        }
      }

      // Potong stok untuk setiap ukuran yang dibutuhkan
      for (const ukuran of ['standar', 'mini'] as const) {
        if (qtyNeeded[ukuran] > 0) {
          apiLogger.info({
            correlationId,
            event: 'stock_deduction_attempt',
            outletId: orderData.outlet_id,
            size: ukuran,
            quantity: qtyNeeded[ukuran],
          })

          const res = await deductStockOnSale(orderData.outlet_id, ukuran, qtyNeeded[ukuran], supabase);
          if (!res.success) {
            apiLogger.warn({
              correlationId,
              event: 'stock_deduction_failed',
              outletId: orderData.outlet_id,
              size: ukuran,
              error: res.error,
            })
          } else {
            apiLogger.info({
              correlationId,
              event: 'stock_deduction_success',
              outletId: orderData.outlet_id,
              size: ukuran,
              deducted: res.deducted,
            })
          }
        }
      }
    } catch (stockErr: any) {
      apiLogger.error({
        correlationId,
        event: 'stock_deduction_error',
        error: stockErr.message,
        orderId: order.id,
      })
    }

    // 4. Sync to Google Sheets (REALTIME)
    // ✅ Sync immediately after order creation for realtime updates
    try {
      // Get outlet name
      const { data: outlet } = await supabase
        .from('outlets')
        .select('nama')
        .eq('id', orderData.outlet_id)
        .single();

      // Get kasir name if kasir_id exists
      let kasirName = orderData.kasir_name || '';
      if (!kasirName && orderData.kasir_id) {
        const { data: kasir } = await supabase
          .from('users')
          .select('name')
          .eq('id', orderData.kasir_id)
          .single();
        
        if (kasir) {
          kasirName = kasir.name;
        }
      }

      // Prepare transaction data for Google Sheets
      const transactionData = {
        order_id: order.id,
        outlet_id: order.outlet_id,
        outlet_name: outlet?.nama || 'Unknown',
        kasir_id: order.kasir_id || '',
        kasir_name: kasirName,
        customer_name: order.customer_name || '-',
        customer_phone: orderData.customer_phone || '-',
        channel: order.channel,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        status: order.status,
        items: orderItems.map((item: any) => ({
          product_name: item.product_name || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          subtotal: item.subtotal || 0,
        })),
        created_at: order.created_at,
      };

      // Sync to Google Sheets (non-blocking)
      apiLogger.info({
        correlationId,
        event: 'sheets_sync_start',
        orderId: transactionData.order_id,
        outletName: transactionData.outlet_name,
        kasirName: transactionData.kasir_name,
        itemsCount: transactionData.items.length,
      })

      syncTransactionToSheets(transactionData)
        .then((success) => {
          if (success) {
            apiLogger.info({
              correlationId,
              event: 'sheets_sync_success',
              orderId: transactionData.order_id,
            })
          } else {
            apiLogger.warn({
              correlationId,
              event: 'sheets_sync_failed',
              orderId: transactionData.order_id,
            })
          }
        })
        .catch((err: any) => {
          apiLogger.error({
            correlationId,
            event: 'sheets_sync_error',
            orderId: transactionData.order_id,
            error: err.message,
          })
        });
    } catch (syncErr: any) {
      apiLogger.error({
        correlationId,
        event: 'sheets_sync_exception',
        error: syncErr.message,
        orderId: order.id,
      })
    }

    const duration = Date.now() - startTime
    apiLogger.info({
      correlationId,
      event: 'order_create_success',
      orderId: order.id,
      duration,
      totalAmount: order.total_amount,
    })

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    const duration = Date.now() - startTime
    apiLogger.error({
      correlationId,
      event: 'order_create_error',
      error: error.message,
      stack: error.stack,
      duration,
    })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
