/**
 * Midtrans Utility - Formatter Functions
 * 
 * Helper functions untuk format data
 */

import type { PaymentStatus, PaymentType } from '../types';

// ============================================================================
// CURRENCY FORMATTER
// ============================================================================

/**
 * Format number ke format Rupiah
 * @example formatRupiah(50000) => "Rp 50.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/**
 * Parse Rupiah string ke number
 * @example parseRupiah("Rp 50.000") => 50000
 */
export function parseRupiah(rupiahString: string): number {
  const cleaned = rupiahString.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
}

// ============================================================================
// DATE/TIME FORMATTER
// ============================================================================

/**
 * Format ISO date ke format Indonesia
 * @example formatDate("2026-04-29T14:30:00Z") => "29 Apr 2026, 14:30"
 */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '-';
  
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return date.toLocaleDateString('id-ID', options);
}

/**
 * Format ISO date ke format tanggal saja
 * @example formatDateOnly("2026-04-29T14:30:00Z") => "29 Apr 2026"
 */
export function formatDateOnly(isoDate: string | null): string {
  if (!isoDate) return '-';
  
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  
  return date.toLocaleDateString('id-ID', options);
}

/**
 * Format ISO date ke format waktu saja
 * @example formatTimeOnly("2026-04-29T14:30:00Z") => "14:30"
 */
export function formatTimeOnly(isoDate: string | null): string {
  if (!isoDate) return '-';
  
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return date.toLocaleTimeString('id-ID', options);
}

// ============================================================================
// PAYMENT STATUS FORMATTER
// ============================================================================

/**
 * Get payment status label dalam Bahasa Indonesia
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pending: 'Menunggu Pembayaran',
    paid: 'Sudah Dibayar',
    failed: 'Pembayaran Gagal',
    expired: 'Waktu Habis',
    cancelled: 'Dibatalkan',
    refunded: 'Sudah Di-refund',
  };
  
  return labels[status] || status;
}

/**
 * Get payment status color untuk UI
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    paid: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    expired: 'text-gray-600 bg-gray-50',
    cancelled: 'text-gray-600 bg-gray-50',
    refunded: 'text-blue-600 bg-blue-50',
  };
  
  return colors[status] || 'text-gray-600 bg-gray-50';
}

/**
 * Get payment status icon
 */
export function getPaymentStatusIcon(status: PaymentStatus): string {
  const icons: Record<PaymentStatus, string> = {
    pending: '⏳',
    paid: '✅',
    failed: '❌',
    expired: '⏰',
    cancelled: '🚫',
    refunded: '↩️',
  };
  
  return icons[status] || '❓';
}

// ============================================================================
// PAYMENT TYPE FORMATTER
// ============================================================================

/**
 * Get payment type label dalam Bahasa Indonesia
 */
export function getPaymentTypeLabel(type: PaymentType | null): string {
  if (!type) return '-';
  
  const labels: Record<PaymentType, string> = {
    qris: 'QRIS',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    bank_transfer: 'Transfer Bank',
    echannel: 'Mandiri Bill',
    credit_card: 'Kartu Kredit/Debit',
    cstore: 'Convenience Store',
    akulaku: 'Akulaku',
  };
  
  return labels[type] || type;
}

/**
 * Get payment type icon
 */
export function getPaymentTypeIcon(type: PaymentType | null): string {
  if (!type) return '💳';
  
  const icons: Record<PaymentType, string> = {
    qris: '📲',
    gopay: '📱',
    shopeepay: '🛍️',
    bank_transfer: '🏦',
    echannel: '🏦',
    credit_card: '💳',
    cstore: '🏪',
    akulaku: '💰',
  };
  
  return icons[type] || '💳';
}

// ============================================================================
// ORDER ID FORMATTER
// ============================================================================

/**
 * Format order ID untuk display
 * @example formatOrderId("TRX-20260429-0001") => "TRX-...0001"
 */
export function formatOrderId(orderId: string, short: boolean = false): string {
  if (!orderId) return '-';
  
  if (short && orderId.length > 12) {
    const parts = orderId.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-...${parts[2]}`;
    }
  }
  
  return orderId;
}

// ============================================================================
// PHONE NUMBER FORMATTER
// ============================================================================

/**
 * Format phone number untuk Midtrans (harus +62)
 * @example formatPhoneForMidtrans("081234567890") => "+6281234567890"
 */
export function formatPhoneForMidtrans(phone: string | null): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 0 if exists
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add +62 prefix
  return '+62' + cleaned;
}

/**
 * Format phone number untuk display
 * @example formatPhoneDisplay("+6281234567890") => "0812-3456-7890"
 */
export function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return '-';
  
  // Remove +62 prefix
  let cleaned = phone.replace(/^\+62/, '0');
  cleaned = cleaned.replace(/\D/g, '');
  
  // Format: 0812-3456-7890
  if (cleaned.length >= 10) {
    return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  
  return cleaned;
}

// ============================================================================
// TRANSACTION SUMMARY FORMATTER
// ============================================================================

/**
 * Format transaction summary untuk receipt
 */
export function formatTransactionSummary(data: {
  orderId: string;
  amount: number;
  status: PaymentStatus;
  paymentType: PaymentType | null;
  customerName: string;
  timestamp: string | null;
}): string {
  const lines = [
    `Order ID: ${data.orderId}`,
    `Customer: ${data.customerName}`,
    `Amount: ${formatRupiah(data.amount)}`,
    `Payment: ${getPaymentTypeLabel(data.paymentType)}`,
    `Status: ${getPaymentStatusLabel(data.status)}`,
    `Time: ${formatDate(data.timestamp)}`,
  ];
  
  return lines.join('\n');
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

/**
 * Validate amount (must be positive)
 */
export function isValidAmount(amount: number): boolean {
  return amount > 0 && !isNaN(amount);
}

/**
 * Validate order ID format
 */
export function isValidOrderId(orderId: string): boolean {
  // Format: TRX-YYYYMMDD-XXXX
  const pattern = /^TRX-\d{8}-\d{4}$/;
  return pattern.test(orderId);
}
