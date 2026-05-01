/**
 * Midtrans Configuration
 * 
 * Konfigurasi untuk Midtrans Snap integration
 */

import type { SnapConfig } from './types';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================================================
// SNAP CONFIGURATION
// ============================================================================

export const snapConfig: SnapConfig = {
  clientKey: MIDTRANS_CLIENT_KEY,
  snapUrl: IS_PRODUCTION
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js',
  isProduction: IS_PRODUCTION,
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  createTransaction: '/api/midtrans/create-transaction',
  webhook: '/api/midtrans/webhook',
  checkStatus: '/api/midtrans/check-status',
};

// ============================================================================
// MIDTRANS URLS
// ============================================================================

export const MIDTRANS_URLS = {
  api: IS_PRODUCTION
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com',
  snap: IS_PRODUCTION
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1',
};

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

export const WEBHOOK_CONFIG = {
  url: `${APP_URL}/api/midtrans/webhook`,
  serverKey: MIDTRANS_SERVER_KEY,
};

// ============================================================================
// PAYMENT METHODS INFO
// ============================================================================

export const PAYMENT_METHODS = {
  qris: {
    name: 'QRIS',
    description: 'Scan QR dengan aplikasi e-wallet apapun',
    icon: '📲',
  },
  gopay: {
    name: 'GoPay',
    description: 'Bayar dengan GoPay',
    icon: '📱',
  },
  shopeepay: {
    name: 'ShopeePay',
    description: 'Bayar dengan ShopeePay',
    icon: '🛍️',
  },
  bank_transfer: {
    name: 'Bank Transfer',
    description: 'Transfer via Virtual Account',
    icon: '🏦',
  },
  credit_card: {
    name: 'Kartu Kredit/Debit',
    description: 'Visa, Mastercard, JCB',
    icon: '💳',
  },
  cstore: {
    name: 'Convenience Store',
    description: 'Alfamart, Indomaret',
    icon: '🏪',
  },
} as const;

// ============================================================================
// TRANSACTION SETTINGS
// ============================================================================

export const TRANSACTION_SETTINGS = {
  // Expiry time in minutes
  expiryDuration: 60, // 1 hour
  
  // Auto check status interval (ms)
  statusCheckInterval: 5000, // 5 seconds
  
  // Max retry for status check
  maxStatusCheckRetry: 12, // 12 x 5s = 1 minute
  
  // Currency
  currency: 'IDR',
};

// ============================================================================
// VALIDATION
// ============================================================================

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!MIDTRANS_CLIENT_KEY) {
    errors.push('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY is not set');
  }
  
  if (!MIDTRANS_SERVER_KEY) {
    errors.push('MIDTRANS_SERVER_KEY is not set');
  }
  
  if (!APP_URL) {
    errors.push('NEXT_PUBLIC_APP_URL is not set');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const config = {
  snap: snapConfig,
  api: API_ENDPOINTS,
  urls: MIDTRANS_URLS,
  webhook: WEBHOOK_CONFIG,
  transaction: TRANSACTION_SETTINGS,
  paymentMethods: PAYMENT_METHODS,
  validate: validateConfig,
};

export default config;
