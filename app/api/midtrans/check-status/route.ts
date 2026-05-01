/**
 * Midtrans API - Check Transaction Status
 * 
 * Endpoint untuk check status transaksi Midtrans
 */

import { NextRequest, NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// MIDTRANS CLIENT SETUP
// ============================================================================

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
});

// ============================================================================
// GET - CHECK TRANSACTION STATUS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking transaction status for:', orderId);

    // ============================================================================
    // 1. GET STATUS FROM MIDTRANS
    // ============================================================================

    const statusResponse = await snap.transaction.status(orderId);
    
    console.log('📊 Midtrans status response:', statusResponse);

    // ============================================================================
    // 2. UPDATE DATABASE
    // ============================================================================

    const supabase = createClient();

    // Map Midtrans status to our payment status
    let paymentStatus = 'pending';
    
    if (statusResponse.transaction_status === 'capture' || 
        statusResponse.transaction_status === 'settlement') {
      paymentStatus = 'paid';
    } else if (statusResponse.transaction_status === 'deny' || 
               statusResponse.transaction_status === 'cancel' || 
               statusResponse.transaction_status === 'expire') {
      paymentStatus = 'failed';
    } else if (statusResponse.transaction_status === 'pending') {
      paymentStatus = 'pending';
    }

    // Update order in database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_type: statusResponse.payment_type,
        transaction_status: statusResponse.transaction_status,
        fraud_status: statusResponse.fraud_status,
        settlement_time: statusResponse.settlement_time || null,
        updated_at: new Date().toISOString(),
      })
      .eq('midtrans_order_id', orderId)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error updating order:', orderError);
    } else {
      console.log('✅ Order updated:', orderData.id);
    }

    // ============================================================================
    // 3. RETURN RESPONSE
    // ============================================================================

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        transactionStatus: statusResponse.transaction_status,
        paymentType: statusResponse.payment_type,
        paymentStatus,
        grossAmount: statusResponse.gross_amount,
        transactionTime: statusResponse.transaction_time,
        settlementTime: statusResponse.settlement_time,
        fraudStatus: statusResponse.fraud_status,
      },
    });

  } catch (error: any) {
    console.error('❌ Check status error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check transaction status',
      },
      { status: 500 }
    );
  }
}
