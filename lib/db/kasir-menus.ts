/**
 * DEPRECATED: Multi-Channel Kasir System Removed
 * 
 * This file is a STUB to prevent import errors during migration.
 * The multi-kasir/multi-channel system has been removed.
 * Now: 1 Outlet = 1 Kasir (single price per product)
 * 
 * TODO: Remove all imports of this file once refactor is complete
 */

import type { KasirMenu } from '../types';

/**
 * @deprecated Returns empty array - kasir menu system removed
 */
export async function getKasirMenus(outletId: string): Promise<KasirMenu[]> {
  console.warn('[DEPRECATED] getKasirMenus called - multi-kasir system has been removed');
  return [];
}

/**
 * @deprecated Returns empty array - kasir menu system removed
 */
export async function getActiveKasirMenus(outletId: string): Promise<KasirMenu[]> {
  console.warn('[DEPRECATED] getActiveKasirMenus called - multi-kasir system has been removed');
  return [];
}
