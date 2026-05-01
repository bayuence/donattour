/**
 * Midtrans API - Webhook Handler
 * 
 * Endpoint untuk menerima notification dari Midtrans
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// VERIFY SIGNATURE
// ============================================================================

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string
): boolean {
  const string = orderId + statusCode + grossAmount + serverKey;
  const hash = crypto.createHash('sha512').update(string).digest('hex');
  return hash === signatureKey;
}

// ============================================================================
// MAP STATUS
// ============================================================================

function mapTransactionStatus(transactionStatus: string): string {
  const statusMap: Record<string, string> = {
    'capture': 'paid',
    'settlement': 'paid',
    'pending': 'pending',
    'deny': 'failed',
    'cancel': 'cancelled',
    'expire': 'expired',
    'refund': 'refunded',
    'partial_refund': 'refunded',
  };
  
  return statusMap[transactionStatus] || 'pending';
}

// ============================================================================
// POST - WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 Webhook received:', JSON.stringify(body, null, 2));

    const {
      order_id,
      transaction_status,
      transaction_id,
      status_code,
      gross_amount,
      payment_type,
      signature_key,
      transaction_time,
      settlement_time,
      fraud_status,
    } = body;

    // ============================================================================
    // 1. VERIFY SIGNATURE
    // ============================================================================

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const isValid = verifySignature(
      order_id,
      status_code,
      gross_amount,
      serverKey,
      signature_key
    );

    if (!isValid) {
      console.error('❌ Invalid signature!');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ Signature verified');

    // ============================================================================
    // 2. SAVE WEBHOOK LOG
    // ============================================================================

    const supabase = createClient();

    const { data: webhookLog, error: webhookError } = await supabase
      .from('midtrans_webhooks')
      .insert({
        midtrans_order_id: order_id,
        transaction_status,
        payment_type,
        gross_amount: parseFloat(gross_amount),
        signature_key,
        raw_payload: body,
        processed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (webhookError) {
      console.error('❌ Error saving webhook log:', webhookError);
    } else {
      console.log('✅ Webhook log saved:', webhookLog.id);
    }

    // ============================================================================
    // 3. GET ORDER FROM DATABASE
    // ============================================================================

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('midtrans_order_id', order_id)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', order_id);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('✅ Order found:', order.id);

    // ============================================================================
    // 4. UPDATE ORDER STATUS
    // ============================================================================

    const paymentStatus = mapTransactionStatus(transaction_status);
    const now = new Date().toISOString();

    const updateData: any = {
      midtrans_transaction_id: transaction_id,
      payment_status: paymentStatus,
      payment_type,
      transaction_time: transaction_time || now,
      updated_at: now,
    };

    // Add payment method detail
    if (payment_type === 'bank_transfer' && body.va_numbers) {
      const vaNumber = body.va_numbers[0];
      updateData.payment_method_detail = `${vaNumber.bank.toUpperCase()} Virtual Account - ${vaNumber.va_number}`;
    } else if (payment_type === 'echannel') {
      updateData.payment_method_detail = `Mandiri Bill Payment - ${body.bill_key}`;
    } else if (payment_type === 'cstore') {
      updateData.payment_method_detail = `${body.store} - ${body.payment_code}`;
    } else {
      updateData.payment_method_detail = payment_type.toUpperCase();
    }

    // Set paid_at if payment completed
    if (paymentStatus === 'paid') {
      updateData.paid_at = settlement_time || now;
      updateData.settlement_time = settlement_time || now;
      updateData.status = 'completed'; // Update order status
    }

    // Set cancelled_at if cancelled/expired
    if (paymentStatus === 'cancelled' || paymentStatus === 'expired') {
      updateData.cancelled_at = now;
      updateData.status = 'cancelled';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      throw new Error('Failed to update order');
    }

    console.log('✅ Order updated:', {
      orderId: order.id,
      status: paymentStatus,
      paymentType: payment_type,
    });

    // ============================================================================
    // 5. MARK WEBHOOK AS PROCESSED
    // ============================================================================

    if (webhookLog) {
      await supabase
        .from('midtrans_webhooks')
        .update({
          processed: true,
          processed_at: now,
          order_id: order.id,
        })
        .eq('id', webhookLog.id);
    }

    // ============================================================================
    // 6. RETURN SUCCESS
    // ============================================================================

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}
