/**
 * Midtrans API - Save Order After Payment Success
 * 
 * Endpoint untuk simpan order ke database setelah pembayaran sukses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, logApiRequest } from '@/lib/api-utils';
import { SaveOrderSchema, validate, formatZodErrors } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    logApiRequest('POST', '/api/midtrans/save-order', body);
    
    // ═══ VALIDATION dengan Zod ═══
    const validation = validate(SaveOrderSchema, body);
    
    if (!validation.success) {
      const formattedErrors = formatZodErrors(validation.errors);
      console.error('❌ Validation failed:', formattedErrors);
      
      return apiError(
        'Validation failed',
        400,
        formattedErrors
      );
    }
    
    const {
      midtransOrderId,
      midtransTransactionId,
      paymentType,
      outletId,
      cashierId,
      customerName,
      customerPhone,
      channel,
      amount,
      items,
      vaNumbers,
      billKey,
      store,
      paymentCode,
      acquirer,
      issuer,
    } = validation.data;

    console.log('💾 Menyimpan order ke database:', midtransOrderId);
    console.log('📋 Payment details:', { paymentType, vaNumbers, billKey, store, acquirer, issuer });

    const supabase = createClient();
    const now = new Date().toISOString();

    // Build payment_method_detail berdasarkan payment_type
    let paymentMethodDetail = paymentType?.toUpperCase() || 'DIGITAL';
    
    if (paymentType === 'bank_transfer' && vaNumbers && vaNumbers.length > 0) {
      const va = vaNumbers[0];
      paymentMethodDetail = `${va.bank.toUpperCase()} Virtual Account`;
    } else if (paymentType === 'echannel' && billKey) {
      paymentMethodDetail = `Mandiri Bill Payment`;
    } else if (paymentType === 'cstore' && store) {
      paymentMethodDetail = `${store} - ${paymentCode || ''}`;
    } else if (paymentType === 'qris' && acquirer) {
      paymentMethodDetail = `QRIS (${acquirer})`;
    } else if (paymentType === 'gopay') {
      paymentMethodDetail = `GoPay`;
    } else if (paymentType === 'shopeepay') {
      paymentMethodDetail = `ShopeePay`;
    } else if (paymentType === 'credit_card' && issuer) {
      paymentMethodDetail = `Credit Card (${issuer})`;
    }

    // Prepare order data - hanya field yang ada di tabel orders
    const orderInsert: any = {
      outlet_id: outletId,
      customer_name: customerName || 'Umum',
      total_amount: amount,
      payment_method: paymentType || 'qris', // qris, gopay, shopeepay, dll
      payment_method_detail: paymentMethodDetail, // Detail lengkap
      channel: channel || 'toko',
      paid_amount: amount,
      change_amount: 0,
      status: 'completed', // Midtrans success = completed
      payment_status: 'paid', // Midtrans payment status
      created_at: now,
    };

    // Tambahkan field Midtrans jika ada di tabel
    if (midtransOrderId) orderInsert.midtrans_order_id = midtransOrderId;
    if (midtransTransactionId) orderInsert.midtrans_transaction_id = midtransTransactionId;
    if (paymentType) orderInsert.payment_type = paymentType;
    
    // Tambahkan kasir_id jika ada (kasir_name akan diambil dari join)
    if (cashierId) {
      orderInsert.kasir_id = cashierId;
    }
    
    // Tambahkan customer_phone jika ada
    if (customerPhone) orderInsert.customer_phone = customerPhone;
    
    // Simpan items detail sebagai JSON untuk reference
    if (items && items.length > 0) {
      orderInsert.items_detail = items;
    }

    console.log('📋 Data yang akan disimpan:', JSON.stringify(orderInsert, null, 2));

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error saving order:', orderError);
      console.error('❌ Error details:', JSON.stringify(orderError, null, 2));
      
      return apiError(
        'Failed to save order to database',
        500,
        orderError
      );
    }

    console.log('✅ Order saved to database:', orderData.id);

    // Simpan order items jika ada
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => {
        let productId = null;
        let productName = '';
        let quantity = 1;
        let unitPrice = 0;
        let subtotal = 0;

        if (item.type === 'satuan') {
          productId = item.varianId;
          productName = item.nama;
          quantity = item.qty;
          unitPrice = item.harga;
          subtotal = item.harga * item.qty;
        } else if (item.type === 'paket') {
          productId = null; // Paket tidak punya product_id
          productName = item.namaPaket;
          quantity = 1;
          unitPrice = item.hargaPaket;
          subtotal = item.hargaPaket;
        } else if (item.type === 'bundling') {
          productId = null;
          productName = item.nama;
          quantity = 1;
          unitPrice = item.harga;
          subtotal = item.harga;
        } else if (item.type === 'custom') {
          productId = null;
          productName = `${item.namaPaket} - ${item.modeLabel || item.jenisMode}`;
          quantity = 1;
          unitPrice = item.totalHarga;
          subtotal = item.totalHarga;
        } else if (item.type === 'box') {
          productId = null;
          productName = item.nama;
          quantity = item.qty;
          unitPrice = item.harga;
          subtotal = item.harga * item.qty;
        }

        return {
          order_id: orderData.id,
          product_id: productId,
          product_name: productName, // Simpan nama produk untuk fallback
          quantity: quantity,
          unit_price: unitPrice,
          subtotal: subtotal,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('⚠️ Error saving order items:', itemsError);
        // Tidak return error, karena order sudah tersimpan
      } else {
        console.log('✅ Order items saved:', orderItems.length);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Order saved successfully in ${duration}ms`);

    return apiSuccess(
      { orderId: orderData.id },
      'Order saved successfully'
    );

  } catch (error: any) {
    console.error('❌ Save order error:', error);
    
    return apiError(
      error.message || 'Failed to save order',
      500,
      { stack: error.stack }
    );
  }
}
