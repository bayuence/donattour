/**
 * Midtrans Integration - Main Export
 * 
 * Export semua yang diperlukan untuk integrasi Midtrans
 */

// ============================================================================
// HOOKS
// ============================================================================
export { useMidtrans, useMidtransStatusPolling } from './hooks/useMidtrans';

// ============================================================================
// COMPONENTS
// ============================================================================
export { MidtransSnap, MidtransSnapButton } from './components/MidtransSnap';
export { PaymentStatusDisplay, PaymentStatusBadge } from './components/PaymentStatus';

// ============================================================================
// TYPES
// ============================================================================
export type {
  MidtransTransactionRequest,
  MidtransTransactionResponse,
  MidtransItem,
  PaymentStatus,
  PaymentType,
  CheckStatusResponse,
  SnapCallbacks,
  SnapResult,
  OrderWithMidtrans,
  UseMidtransReturn,
} from './types';

// ============================================================================
// CONFIG
// ============================================================================
export { config, snapConfig, API_ENDPOINTS, PAYMENT_METHODS } from './config';

// ============================================================================
// UTILITIES
// ============================================================================
export {
  // Formatter
  formatRupiah,
  parseRupiah,
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  getPaymentStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusIcon,
  getPaymentTypeLabel,
  getPaymentTypeIcon,
  formatOrderId,
  formatPhoneForMidtrans,
  formatPhoneDisplay,
  formatTransactionSummary,
  isValidPhone,
  isValidAmount,
  isValidOrderId,
} from './utils/formatter';

export {
  // Transaction
  convertCartToMidtransItems,
  calculateTotalAmount,
  calculateBreakdown,
  generateTempOrderId,
  buildTransactionRequest,
  isPaymentCompleted,
  isPaymentPending,
  isPaymentFailed,
  canRetryPayment,
  mapMidtransStatus,
  mapMidtransPaymentType,
  generateSignatureKey,
  verifyWebhookSignature,
  parseMidtransError,
  calculateExpiryTime,
  isTransactionExpired,
  getRemainingMinutes,
} from './utils/transaction';
