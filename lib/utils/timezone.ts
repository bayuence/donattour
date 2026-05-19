// ============================================================================
// TIMEZONE UTILITIES - INDONESIA (WIB/UTC+7)
// ============================================================================
// File: lib/utils/timezone.ts
// Description: Centralized timezone utilities for consistent date handling
// Timezone: Asia/Jakarta (WIB/UTC+7)
// Date: May 7, 2026
// ============================================================================

/**
 * Get date in Indonesia timezone (WIB/UTC+7)
 * Returns YYYY-MM-DD format
 * 
 * @param date - Optional Date object (default: now)
 * @example
 * getTodayWIB()              => "2026-05-07" (hari ini WIB)
 * getTodayWIB(lastWeekDate)  => "2026-04-30" (tanggal lain dalam WIB)
 */
export function getTodayWIB(date?: Date): string {
  const now = date || new Date();
  const wibDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get current datetime in Indonesia timezone (WIB/UTC+7)
 * Returns ISO 8601 format with timezone offset
 * 
 * @example
 * getNowWIB() => "2026-05-07T20:30:00+07:00"
 */
export function getNowWIB(): string {
  const now = new Date();
  const wibDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  const hours = String(wibDate.getHours()).padStart(2, '0');
  const minutes = String(wibDate.getMinutes()).padStart(2, '0');
  const seconds = String(wibDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
}

/**
 * Convert any date to WIB timezone and return YYYY-MM-DD format
 * 
 * @param date - Date string or Date object
 * @example
 * toWIBDate("2026-05-07T01:00:00Z") => "2026-05-07"
 */
export function toWIBDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const wibDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get WIB timezone offset string
 * @returns "+07:00"
 */
export function getWIBOffset(): string {
  return '+07:00';
}

/**
 * Check if a date is today in WIB timezone
 * 
 * @param date - Date string in YYYY-MM-DD format
 * @example
 * isTodayWIB("2026-05-07") => true
 */
export function isTodayWIB(date: string): boolean {
  return date === getTodayWIB();
}

/**
 * Get yesterday's date in WIB timezone
 * @example
 * getYesterdayWIB() => "2026-05-06"
 */
export function getYesterdayWIB(): string {
  const now = new Date();
  const wibDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  wibDate.setDate(wibDate.getDate() - 1);
  
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display in Indonesian format
 * 
 * @param date - Date string or Date object
 * @example
 * formatDateWIB("2026-05-07") => "7 Mei 2026"
 */
export function formatDateWIB(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const wibDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  
  return wibDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

/**
 * Format datetime for display in Indonesian format
 * 
 * @param date - Date string or Date object
 * @example
 * formatDateTimeWIB("2026-05-07T20:30:00Z") => "7 Mei 2026, 20:30 WIB"
 */
export function formatDateTimeWIB(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TIMEZONE = 'Asia/Jakarta';
export const TIMEZONE_OFFSET = '+07:00';
export const TIMEZONE_NAME = 'WIB';
