/**
 * Midtrans Integration - TypeScript Types
 * 
 * Semua type definitions untuk integrasi Midtrans
 */

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface MidtransTransactionRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone?: string;
  items: MidtransItem[];
  outletId: string;
  cashierId: string;
  channel?: string;
}

export interface MidtransItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface MidtransTransactionResponse {
  success: boolean;
  snapToken?: string;
  redirectUrl?: string;
  orderId?: string;
  error?: string;
}

// ============================================================================
// PAYMENT STATUS TYPES
// ============================================================================

export type PaymentStatus = 
  | 'pending'      // Menunggu pembayaran
  | 'paid'         // Sudah dibayar (settlement)
  | 'failed'       // Pembayaran gagal
  | 'expired'      // Waktu pembayaran habis
  | 'cancelled'    // Dibatalkan
  | 'refunded';    // Sudah di-refund

export type PaymentType = 
  | 'qris'
  | 'gopay'
  | 'shopeepay'
  | 'bank_transfer'
  | 'echannel'
  | 'credit_card'
  | 'cstore'
  | 'akulaku';

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface MidtransWebhookPayload {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency?: string;
  
  // Payment method specific
  va_numbers?: Array<{
    va_number: string;
    bank: string;
  }>;
  payment_amounts?: Array<{
    paid_at: string;
    amount: string;
  }>;
  biller_code?: string;
  bill_key?: string;
}

// ============================================================================
// SNAP CONFIGURATION TYPES
// ============================================================================

export interface SnapConfig {
  clientKey: string;
  snapUrl: string;
  isProduction: boolean;
}

export interface SnapCallbacks {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
}

export interface SnapResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
}

// ============================================================================
// DATABASE TYPES (sesuai dengan schema)
// ============================================================================

export interface OrderWithMidtrans {
  id: string;
  order_number: string;
  
  // Midtrans fields
  midtrans_order_id: string | null;
  midtrans_transaction_id: string | null;
  snap_token: string | null;
  snap_redirect_url: string | null;
  
  // Payment info
  payment_status: PaymentStatus;
  payment_type: PaymentType | null;
  payment_method_detail: string | null;
  
  // Amounts
  total_amount: number;
  subtotal: number | null;
  biaya_kemasan: number | null;
  biaya_tambahan: number | null;
  diskon: number | null;
  
  // Items
  items_detail: any; // JSONB
  
  // Timestamps
  transaction_time: string | null;
  settlement_time: string | null;
  paid_at: string | null;
  expired_at: string | null;
  
  // Customer
  customer_name: string;
  customer_phone: string | null;
  
  // Outlet & Kasir
  outlet_id: string;
  kasir_id: string | null;
  channel: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateTransactionResponse {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
}

export interface CheckStatusResponse {
  orderId: string;
  status: PaymentStatus;
  paymentType: PaymentType | null;
  paymentMethodDetail: string | null;
  transactionTime: string | null;
  paidAt: string | null;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseMidtransReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Functions
  createTransaction: (request: MidtransTransactionRequest) => Promise<MidtransTransactionResponse>;
  checkStatus: (orderId: string) => Promise<CheckStatusResponse | null>;
  openSnap: (snapToken: string, callbacks?: SnapCallbacks) => void;
  
  // Utils
  clearError: () => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaymentMethodInfo {
  type: PaymentType;
  name: string;
  icon: string;
  description: string;
}

export interface TransactionSummary {
  orderId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: string;
  customerName: string;
  timestamp: string;
}
