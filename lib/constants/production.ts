// ============================================================================
// PRODUCTION TRACKING SYSTEM - CONSTANTS
// ============================================================================
// File: lib/constants/production.ts
// Description: Constants and configuration for production tracking system
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

import type { DonutSize, InventoryStatus, FinishedProductStatus } from '../types/production';

// ============================================================================
// DONUT SIZES
// ============================================================================

export const DONUT_SIZES: Record<DonutSize, string> = {
  standar: 'Standar',
  mini: 'Mini',
} as const;

export const DONUT_SIZE_OPTIONS = [
  { value: 'standar' as const, label: 'Standar' },
  { value: 'mini' as const, label: 'Mini' },
] as const;

// ============================================================================
// INVENTORY STATUS
// ============================================================================

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  expired: 'Expired',
} as const;

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  fresh: 'green',
  aging: 'yellow',
  expired: 'red',
} as const;

export const INVENTORY_STATUS_OPTIONS = [
  { value: 'fresh' as const, label: 'Fresh', color: 'green' },
  { value: 'aging' as const, label: 'Aging', color: 'yellow' },
  { value: 'expired' as const, label: 'Expired', color: 'red' },
] as const;

// ============================================================================
// FINISHED PRODUCT STATUS
// ============================================================================

export const FINISHED_PRODUCT_STATUS_LABELS: Record<FinishedProductStatus, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  reject: 'Reject',
} as const;

export const FINISHED_PRODUCT_STATUS_COLORS: Record<FinishedProductStatus, string> = {
  fresh: 'green',
  aging: 'yellow',
  reject: 'red',
} as const;

export const FINISHED_PRODUCT_STATUS_OPTIONS = [
  { value: 'fresh' as const, label: 'Fresh', color: 'green' },
  { value: 'aging' as const, label: 'Aging', color: 'yellow' },
  { value: 'reject' as const, label: 'Reject', color: 'red' },
] as const;

// ============================================================================
// WASTE REASONS
// ============================================================================

export const PRODUCTION_WASTE_REASONS = [
  'Gosong',
  'Bentuk Jelek',
  'Adonan Gagal',
  'Terlalu Kering',
  'Terlalu Lembek',
  'Pecah',
  'Ukuran Tidak Sesuai',
  'Lainnya',
] as const;

export const WASTE_REASONS = [
  { value: 'gosong', label: 'Gosong' },
  { value: 'bentuk_jelek', label: 'Bentuk Jelek' },
  { value: 'adonan_gagal', label: 'Adonan Gagal' },
  { value: 'terlalu_kering', label: 'Terlalu Kering' },
  { value: 'terlalu_lembek', label: 'Terlalu Lembek' },
  { value: 'pecah', label: 'Pecah' },
  { value: 'ukuran_tidak_sesuai', label: 'Ukuran Tidak Sesuai' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const NON_TOPPING_EXPIRED_REASONS = [
  'Terlalu Lama Disimpan',
  'Kering',
  'Keras',
  'Berjamur',
  'Bau Tidak Sedap',
  'Lainnya',
] as const;

export const FINISHED_PRODUCT_REJECT_REASONS = [
  'Topping Meleleh',
  'Topping Kering',
  'Jatuh',
  'Bentuk Rusak',
  'Terlalu Lama',
  'Berjamur',
  'Lainnya',
] as const;

export const TOPPING_ERROR_REASONS = [
  'Salah Dengar Pesanan',
  'Salah Baca Nota',
  'Terburu-buru',
  'Kurang Fokus',
  'Topping Habis',
  'Lainnya',
] as const;

// ============================================================================
// THRESHOLDS & LIMITS
// ============================================================================

/**
 * Waste rate threshold (%)
 * Alert jika waste rate melebihi threshold ini
 */
export const WASTE_RATE_THRESHOLD = 15;

/**
 * Low stock threshold (%)
 * Alert jika stok kurang dari % ini dari produksi hari ini
 */
export const LOW_STOCK_THRESHOLD = 20;

/**
 * Maximum production quantity per batch
 */
export const MAX_PRODUCTION_QTY = 10000;

/**
 * Maximum HPP per piece (Rp)
 */
export const MAX_HPP_PER_PCS = 100000;

/**
 * Default pagination limit
 */
export const DEFAULT_PAGE_LIMIT = 20;

/**
 * Maximum pagination limit
 */
export const MAX_PAGE_LIMIT = 100;

// ============================================================================
// ALERT CONFIGURATIONS
// ============================================================================

export const ALERT_TYPES = {
  STOCK_LOW: 'stock_low',
  WASTE_HIGH: 'waste_high',
  NO_PRODUCTION: 'no_production',
  NO_CLOSING: 'no_closing',
} as const;

export const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export const ALERT_MESSAGES = {
  STOCK_LOW: (size: string, qty: number) => 
    `⚠️ Stok non-topping ${size} tinggal ${qty} pcs!`,
  WASTE_HIGH: (rate: number) => 
    `⚠️ Waste rate hari ini ${rate.toFixed(1)}%! Target: <${WASTE_RATE_THRESHOLD}%`,
  NO_PRODUCTION: () => 
    `⚠️ Belum ada input produksi hari ini!`,
  NO_CLOSING: () => 
    `⚠️ Jangan lupa closing harian!`,
} as const;

// ============================================================================
// TIME CONFIGURATIONS
// ============================================================================

/**
 * Jam reminder untuk input produksi (08:00)
 */
export const PRODUCTION_REMINDER_HOUR = 8;

/**
 * Jam reminder untuk closing (21:00)
 */
export const CLOSING_REMINDER_HOUR = 21;

/**
 * Jam operasional kasir mulai (08:00)
 */
export const KASIR_OPENING_HOUR = 8;

/**
 * Jam operasional kasir selesai (20:00)
 */
export const KASIR_CLOSING_HOUR = 20;

// ============================================================================
// ROLE PERMISSIONS
// ============================================================================

export const PRODUCTION_PERMISSIONS = {
  INPUT_PRODUCTION: ['admin', 'bagian_dapur'],
  VIEW_PRODUCTION: ['admin', 'owner', 'manager', 'bagian_dapur'],
  EDIT_PRODUCTION: ['admin', 'bagian_dapur'],
  DELETE_PRODUCTION: ['admin'],
  
  OPERATE_KASIR: ['admin', 'kasir', 'manager'],
  REPORT_TOPPING_ERROR: ['admin', 'kasir'],
  
  SUBMIT_CLOSING: ['admin', 'closing_staff', 'manager'],
  VIEW_CLOSING: ['admin', 'owner', 'manager', 'closing_staff'],
  
  VIEW_DASHBOARD: ['admin', 'owner', 'manager'],
  EXPORT_REPORTS: ['admin', 'owner', 'manager'],
} as const;

// ============================================================================
// UI CONFIGURATIONS
// ============================================================================

/**
 * Chart colors for loss breakdown
 */
export const LOSS_BREAKDOWN_COLORS = {
  production_waste: '#ef4444',      // red-500
  topping_errors: '#f97316',        // orange-500
  non_topping_expired: '#eab308',   // yellow-500
  finished_product_reject: '#dc2626', // red-600
} as const;

/**
 * Status badge colors
 */
export const STATUS_BADGE_COLORS = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
} as const;

/**
 * Metric card colors
 */
export const METRIC_CARD_COLORS = {
  omzet: 'blue',
  profit: 'green',
  loss: 'red',
  margin: 'purple',
} as const;

// ============================================================================
// FORMAT CONFIGURATIONS
// ============================================================================

/**
 * Date format for display
 */
export const DATE_FORMAT = 'DD/MM/YYYY';

/**
 * Date format for API (ISO)
 */
export const DATE_FORMAT_API = 'YYYY-MM-DD';

/**
 * Datetime format for display
 */
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';

/**
 * Currency format
 */
export const CURRENCY_FORMAT = {
  locale: 'id-ID',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as const;

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

export const VALIDATION_MESSAGES = {
  REQUIRED: 'Field ini wajib diisi',
  INVALID_UUID: 'ID tidak valid',
  INVALID_DATE: 'Format tanggal tidak valid',
  FUTURE_DATE: 'Tanggal tidak boleh di masa depan',
  INVALID_NUMBER: 'Harus berupa angka',
  POSITIVE_NUMBER: 'Harus lebih dari 0',
  NONNEGATIVE_NUMBER: 'Tidak boleh negatif',
  MIN_LENGTH: (min: number) => `Minimal ${min} karakter`,
  MAX_LENGTH: (max: number) => `Maksimal ${max} karakter`,
  TOTAL_MISMATCH: 'Total tidak sesuai',
  REASON_REQUIRED: 'Alasan wajib diisi',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: string,
  permission: keyof typeof PRODUCTION_PERMISSIONS
): boolean {
  const allowedRoles = PRODUCTION_PERMISSIONS[permission];
  return allowedRoles.includes(userRole as any);
}

/**
 * Get status color
 */
export function getInventoryStatusColor(status: InventoryStatus): string {
  return INVENTORY_STATUS_COLORS[status];
}

/**
 * Get finished product status color
 */
export function getFinishedProductStatusColor(status: FinishedProductStatus): string {
  return FINISHED_PRODUCT_STATUS_COLORS[status];
}

/**
 * Check if waste rate is high
 */
export function isWasteRateHigh(wasteRate: number): boolean {
  return wasteRate > WASTE_RATE_THRESHOLD;
}

/**
 * Check if stock is low
 */
export function isStockLow(currentQty: number, productionQty: number): boolean {
  if (productionQty === 0) return false;
  const percentage = (currentQty / productionQty) * 100;
  return percentage < LOW_STOCK_THRESHOLD;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(
    CURRENCY_FORMAT.locale,
    {
      style: 'currency',
      currency: CURRENCY_FORMAT.currency,
      minimumFractionDigits: CURRENCY_FORMAT.minimumFractionDigits,
      maximumFractionDigits: CURRENCY_FORMAT.maximumFractionDigits,
    }
  ).format(amount);
}

/**
 * Calculate waste rate
 */
export function calculateWasteRate(wasteQty: number, targetQty: number): number {
  if (targetQty === 0) return 0;
  return (wasteQty / targetQty) * 100;
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(successQty: number, targetQty: number): number {
  if (targetQty === 0) return 0;
  return (successQty / targetQty) * 100;
}

/**
 * Get stock status
 */
export function getStockStatus(
  currentQty: number,
  productionQty: number
): 'sufficient' | 'low' | 'out_of_stock' {
  if (currentQty === 0) return 'out_of_stock';
  if (isStockLow(currentQty, productionQty)) return 'low';
  return 'sufficient';
}
