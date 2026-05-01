/**
 * Midtrans API - Create Transaction
 * 
 * Endpoint untuk create Midtrans transaction dan generate snap token
 * TIDAK menyimpan ke database - hanya generate token untuk popup
 */

import { NextRequest, NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { apiError, apiSuccess, logApiRequest } from '@/lib/api-utils';
import { CreateTransactionSchema, validate, formatZodErrors } from '@/lib/validation';

// ============================================================================
// MIDTRANS CLIENT SETUP
// ============================================================================

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
});

// ============================================================================
// POST - CREATE TRANSACTION
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    logApiRequest('POST', '/api/midtrans/create-transaction', body);
    
    // ═══ VALIDATION dengan Zod ═══
    const validation = validate(CreateTransactionSchema, body);
    
    if (!validation.success) {
      const formattedErrors = formatZodErrors(validation.errors);
      console.error('❌ Validation failed:', formattedErrors);
      
      return apiError(
        'Validation failed',
        400,
        formattedErrors
      );
    }
    
    // Use validated data
    const {
      amount,
      customerName,
      customerPhone,
      items,
      outletId,
      cashierId,
      channel,
    } = validation.data;

    console.log('📝 Creating Midtrans transaction:', { amount, customerName });

    // ============================================================================
    // 1. GENERATE MIDTRANS ORDER ID (Optimized)
    // ============================================================================
    
    // Generate order ID di frontend saja untuk lebih cepat
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const midtransOrderId = `ORDER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random}`;
    
    console.log('✅ Generated order ID:', midtransOrderId);

    // ============================================================================
    // 2. PREPARE MIDTRANS TRANSACTION PARAMETERS
    // ============================================================================

    const transactionDetails = {
      order_id: midtransOrderId,
      gross_amount: amount,
    };

    // Validasi dan bersihkan item details
    const itemDetails = items.map((item: any, index: number) => {
      const itemName = item.name && item.name.trim() !== '' 
        ? item.name.trim() 
        : `Item ${index + 1}`;
      
      const itemPrice = typeof item.price === 'number' && item.price >= 0 
        ? item.price 
        : 0;
      
      const itemQty = typeof item.quantity === 'number' && item.quantity > 0 
        ? item.quantity 
        : 1;

      return {
        id: item.id || `item-${index}`,
        name: itemName,
        price: itemPrice,
        quantity: itemQty,
        category: item.category || 'food',
      };
    });

    const customerDetails = {
      first_name: customerName,
      phone: customerPhone || '',
    };

    // Snap transaction parameter
    const parameter = {
      transaction_details: transactionDetails,
      item_details: itemDetails,
      customer_details: customerDetails,
      enabled_payments: [
        'qris',
        'gopay',
        'shopeepay',
        'other_qris',
        'bca_va',
        'bni_va',
        'bri_va',
        'permata_va',
        'echannel', // Mandiri Bill
        'credit_card',
        'cstore', // Alfamart, Indomaret
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/kasir?payment=success`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/kasir?payment=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/kasir?payment=pending`,
      },
      expiry: {
        unit: 'minutes',
        duration: 60, // 1 hour
      },
    };

    // ============================================================================
    // 3. CREATE SNAP TRANSACTION
    // ============================================================================

    const transaction = await snap.createTransaction(parameter);
    
    console.log('✅ Snap transaction created:', {
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });

    // ============================================================================
    // 4. RETURN SNAP TOKEN (Simpan database nanti setelah payment sukses)
    // ============================================================================

    const duration = Date.now() - startTime;
    console.log(`✅ Transaction created in ${duration}ms`);

    return apiSuccess(
      {
        orderId: midtransOrderId,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
      'Transaction created successfully'
    );

  } catch (error: any) {
    console.error('❌ Create transaction error:', error);
    
    return apiError(
      error.message || 'Failed to create transaction',
      500,
      { stack: error.stack }
    );
  }
}
