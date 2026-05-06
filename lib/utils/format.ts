/**
 * Utility functions for Indonesian localization
 * Format tanggal, uang, dan angka sesuai standar Indonesia
 */

/**
 * Format angka ke format Indonesia dengan pemisah ribuan
 * @example formatNumber(1000000) => "1.000.000"
 * @example formatNumber(1500.50) => "1.500,50"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format ke Rupiah Indonesia
 * @example formatRupiah(1000000) => "Rp 1.000.000"
 * @example formatRupiah(1500.50) => "Rp 1.500,50"
 */
export function formatRupiah(value: number, showDecimals: boolean = false): string {
  const decimals = showDecimals ? 2 : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format tanggal ke format Indonesia (DD/MM/YYYY)
 * @example formatDate('2026-05-06') => "06/05/2026"
 * @example formatDate(new Date()) => "06/05/2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format tanggal lengkap dengan nama bulan
 * @example formatDateLong('2026-05-06') => "6 Mei 2026"
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format tanggal dan waktu lengkap
 * @example formatDateTime('2026-05-06T14:30:00') => "06/05/2026 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format persentase
 * @example formatPercent(25.5) => "25,5%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Parse tanggal Indonesia (DD/MM/YYYY) ke ISO (YYYY-MM-DD)
 * @example parseIndonesianDate('06/05/2026') => "2026-05-06"
 */
export function parseIndonesianDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Convert ISO date (YYYY-MM-DD) ke format input date HTML5
 * @example toInputDate('2026-05-06') => "2026-05-06"
 */
export function toInputDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Get hari ini dalam format ISO (YYYY-MM-DD)
 * @example getTodayISO() => "2026-05-06"
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format compact untuk angka besar
 * @example formatCompact(1500000) => "1,5 Jt"
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${formatNumber(value / 1_000_000_000, 1)} M`;
  }
  if (value >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)} Jt`;
  }
  if (value >= 1_000) {
    return `${formatNumber(value / 1_000, 1)} Rb`;
  }
  return formatNumber(value);
}
