/**
 * Midtrans Utility - Transaction Functions
 * 
 * Helper functions untuk transaksi Midtrans
 */

import type { 
  MidtransItem, 
  MidtransTransactionRequest,
  PaymentStatus,
  PaymentType 
} from '../types';
import type { CartItem } from '../../hooks/useKasir';

// ============================================================================
// CART TO MIDTRANS ITEMS CONVERTER
// ============================================================================

/**
 * Convert cart items ke format Midtrans items
 */
export function convertCartToMidtransItems(cart: CartItem[]): MidtransItem[] {
  const items: MidtransItem[] = [];
  
  cart.forEach((item) => {
    if (item.type === 'satuan') {
      items.push({
        id: item.id,
        name: item.nama,
        price: item.harga,
        quantity: item.qty,
        category: item.jenis || 'donat',
      });
    } else if (item.type === 'paket') {
      items.push({
        id: item.id,
        name: item.namaPaket,
        price: item.hargaPaket,
        quantity: 1,
        category: 'paket',
      });
    } else if (item.type === 'custom') {
      items.push({
        id: item.id,
        name: `${item.namaPaket} - ${item.modeLabel || item.jenisMode}`,
        price: item.totalHarga,
        quantity: 1,
        category: 'custom',
      });
    } else if (item.type === 'bundling') {
      items.push({
        id: item.id,
        name: item.nama,
        price: item.harga,
        quantity: 1,
        category: 'bundling',
      });
    } else if (item.type === 'box') {
      items.push({
        id: item.id,
        name: item.nama,
        price: item.harga,
        quantity: item.qty,
        category: 'box',
      });
    }
  });
  
  return items;
}

// ============================================================================
// TRANSACTION AMOUNT CALCULATOR
// ============================================================================

/**
 * Calculate total amount dari cart
 */
export function calculateTotalAmount(
  cart: CartItem[],
  biayaKemasan: number = 0,
  biayaTambahan: number = 0,
  diskon: number = 0
): number {
  let subtotal = 0;
  
  cart.forEach((item) => {
    if (item.type === 'satuan' || item.type === 'box') {
      subtotal += item.harga * item.qty;
    } else if (item.type === 'paket') {
      subtotal += item.hargaPaket;
    } else if (item.type === 'custom') {
      subtotal += item.totalHarga;
    } else if (item.type === 'bundling') {
      subtotal += item.harga;
    }
  });
  
  const total = subtotal + biayaKemasan + biayaTambahan - diskon;
  return Math.max(0, total); // Ensure non-negative
}

/**
 * Calculate breakdown amounts
 */
export function calculateBreakdown(
  cart: CartItem[],
  biayaKemasan: number = 0,
  biayaTambahan: number = 0,
  diskon: number = 0
) {
  const subtotal = calculateTotalAmount(cart, 0, 0, 0);
  const total = subtotal + biayaKemasan + biayaTambahan - diskon;
  
  return {
    subtotal,
    biaya_kemasan: biayaKemasan,
    biaya_tambahan: biayaTambahan,
    diskon,
    total: Math.max(0, total),
  };
}

// ============================================================================
// ORDER ID GENERATOR
// ============================================================================

/**
 * Generate order ID format: TRX-YYYYMMDD-XXXX
 * Note: Server akan generate yang final, ini hanya untuk temporary
 */
export function generateTempOrderId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TRX-${dateStr}-${random}`;
}

// ============================================================================
// TRANSACTION REQUEST BUILDER
// ============================================================================

/**
 * Build Midtrans transaction request dari cart data
 */
export function buildTransactionRequest(params: {
  cart: CartItem[];
  customerName: string;
  customerPhone?: string;
  outletId: string;
  cashierId: string;
  channel?: string;
  biayaKemasan?: number;
  biayaTambahan?: number;
  diskon?: number;
}): MidtransTransactionRequest {
  const {
    cart,
    customerName,
    customerPhone,
    outletId,
    cashierId,
    channel = 'toko',
    biayaKemasan = 0,
    biayaTambahan = 0,
    diskon = 0,
  } = params;
  
  const items = convertCartToMidtransItems(cart);
  const amount = calculateTotalAmount(cart, biayaKemasan, biayaTambahan, diskon);
  const orderId = generateTempOrderId();
  
  return {
    orderId,
    amount,
    customerName: customerName || 'Customer',
    customerPhone,
    items,
    outletId,
    cashierId,
    channel,
  };
}

// ============================================================================
// PAYMENT STATUS CHECKER
// ============================================================================

/**
 * Check if payment is completed
 */
export function isPaymentCompleted(status: PaymentStatus): boolean {
  return status === 'paid';
}

/**
 * Check if payment is pending
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return status === 'pending';
}

/**
 * Check if payment is failed
 */
export function isPaymentFailed(status: PaymentStatus): boolean {
  return status === 'failed' || status === 'expired' || status === 'cancelled';
}

/**
 * Check if payment can be retried
 */
export function canRetryPayment(status: PaymentStatus): boolean {
  return status === 'failed' || status === 'expired';
}

// ============================================================================
// MIDTRANS STATUS MAPPER
// ============================================================================

/**
 * Map Midtrans transaction_status ke internal PaymentStatus
 */
export function mapMidtransStatus(transactionStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
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

/**
 * Map Midtrans payment_type ke internal PaymentType
 */
export function mapMidtransPaymentType(paymentType: string): PaymentType {
  const typeMap: Record<string, PaymentType> = {
    'qris': 'qris',
    'gopay': 'gopay',
    'shopeepay': 'shopeepay',
    'bank_transfer': 'bank_transfer',
    'echannel': 'echannel',
    'credit_card': 'credit_card',
    'cstore': 'cstore',
    'akulaku': 'akulaku',
  };
  
  return typeMap[paymentType] || 'bank_transfer';
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Generate signature key untuk verify webhook
 * Formula: SHA512(order_id + status_code + gross_amount + server_key)
 */
export async function generateSignatureKey(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): Promise<string> {
  const string = orderId + statusCode + grossAmount + serverKey;
  
  // Use Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string
): Promise<boolean> {
  const expectedSignature = await generateSignatureKey(
    orderId,
    statusCode,
    grossAmount,
    serverKey
  );
  
  return expectedSignature === signatureKey;
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Parse Midtrans error response
 */
export function parseMidtransError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error_messages && Array.isArray(error.error_messages)) {
    return error.error_messages.join(', ');
  }
  
  return 'Terjadi kesalahan pada sistem pembayaran';
}

// ============================================================================
// EXPIRY TIME CALCULATOR
// ============================================================================

/**
 * Calculate expiry time (default 1 hour from now)
 */
export function calculateExpiryTime(minutes: number = 60): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}

/**
 * Check if transaction is expired
 */
export function isTransactionExpired(expiryTime: string | null): boolean {
  if (!expiryTime) return false;
  
  const expiry = new Date(expiryTime);
  const now = new Date();
  
  return now > expiry;
}

/**
 * Get remaining time in minutes
 */
export function getRemainingMinutes(expiryTime: string | null): number {
  if (!expiryTime) return 0;
  
  const expiry = new Date(expiryTime);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  
  return Math.max(0, Math.floor(diff / 1000 / 60));
}
