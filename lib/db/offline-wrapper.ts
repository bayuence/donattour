// ============================================================================
// OFFLINE WRAPPER - Universal Database Fallback
// ============================================================================
// File: lib/db/offline-wrapper.ts
// Description: Wrapper untuk auto-fallback ke offline cache saat network error
// Version: 1.0
// Date: 2026-06-27
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Wrapper untuk query database dengan auto-fallback ke offline
 * 
 * @example
 * const products = await withOfflineFallback(
 *   async () => {
 *     const { data } = await supabase.from('products').select('*');
 *     return data;
 *   },
 *   async () => {
 *     const { getOfflineProducts } = await import('@/lib/offline/offline-dal');
 *     return await getOfflineProducts();
 *   }
 * );
 */
export async function withOfflineFallback<T>(
  onlineQuery: () => Promise<T>,
  offlineFallback: () => Promise<T>,
  fallbackName: string = 'query'
): Promise<T> {
  try {
    // Try online query first
    const result = await onlineQuery();
    return result;
  } catch (error: any) {
    console.error(`❌ [${fallbackName}] Online query failed:`, error);
    
    // Check if offline
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    
    if (isOffline) {
      console.log(`📡 [${fallbackName}] Offline detected, trying fallback...`);
      try {
        const offlineResult = await offlineFallback();
        console.log(`✅ [${fallbackName}] Loaded from offline cache`);
        return offlineResult;
      } catch (offlineErr) {
        console.error(`❌ [${fallbackName}] Offline fallback failed:`, offlineErr);
        throw offlineErr;
      }
    }
    
    // If online but failed, throw error
    throw error;
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return typeof window !== 'undefined' ? navigator.onLine : true;
}

/**
 * Check if device is offline
 */
export function isOffline(): boolean {
  return !isOnline();
}

/**
 * Execute query with retry on network error
 */
export async function withRetry<T>(
  query: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await query();
    } catch (error) {
      lastError = error;
      console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}
