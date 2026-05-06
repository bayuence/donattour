// ============================================================================
// QUERY KEY FACTORY
// ============================================================================
// File: lib/query/query-keys.ts
// Description: Centralized query key factory for React Query cache management
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

import type { DonutSize, InventoryStatus } from '@/lib/types/production';

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface ProductionFilters {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  ukuran?: DonutSize;
  page?: number;
  limit?: number;
}

export interface StockFilters {
  ukuran?: DonutSize;
  status?: InventoryStatus;
}

export interface ClosingFilters {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface ToppingErrorFilters {
  outlet_id?: string;
  kasir_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AlertFilters {
  outlet_id?: string;
  severity?: 'info' | 'warning' | 'critical';
  is_read?: boolean;
  page?: number;
  limit?: number;
}

export interface DashboardFilters {
  outlet_id: string;
  tanggal: string;
}

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

/**
 * Centralized query key factory for consistent cache management
 * 
 * Usage:
 * - Use queryKeys.productions.all to invalidate all production queries
 * - Use queryKeys.productions.list(filters) for specific filtered list
 * - Use queryKeys.productions.detail(id) for specific production detail
 */
export const queryKeys = {
  // Production queries
  productions: {
    all: ['productions'] as const,
    lists: () => [...queryKeys.productions.all, 'list'] as const,
    list: (filters: ProductionFilters) => 
      [...queryKeys.productions.lists(), filters] as const,
    details: () => [...queryKeys.productions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.productions.details(), id] as const,
  },

  // Inventory queries
  inventory: {
    all: ['inventory'] as const,
    validation: (outlet_id: string, tanggal?: string) => 
      [...queryKeys.inventory.all, 'validation', outlet_id, tanggal] as const,
    stock: (filters: { outlet_id: string; ukuran?: DonutSize; status?: InventoryStatus; production_date?: string }) => 
      [...queryKeys.inventory.all, 'stock', filters] as const,
  },

  // Closing queries
  closing: {
    all: ['closing'] as const,
    lists: () => [...queryKeys.closing.all, 'list'] as const,
    list: (filters: ClosingFilters) => 
      [...queryKeys.closing.lists(), filters] as const,
    check: (outlet_id: string, tanggal: string) => 
      [...queryKeys.closing.all, 'check', outlet_id, tanggal] as const,
    details: () => [...queryKeys.closing.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.closing.details(), id] as const,
  },

  // Topping error queries
  toppingErrors: {
    all: ['topping-errors'] as const,
    lists: () => [...queryKeys.toppingErrors.all, 'list'] as const,
    list: (filters: ToppingErrorFilters) => 
      [...queryKeys.toppingErrors.lists(), filters] as const,
    summary: (outlet_id: string, start_date: string, end_date: string) => 
      [...queryKeys.toppingErrors.all, 'summary', outlet_id, start_date, end_date] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    daily: (outlet_id: string, tanggal: string) => 
      [...queryKeys.dashboard.all, 'daily', outlet_id, tanggal] as const,
    weekly: (outlet_id: string, start_date: string) => 
      [...queryKeys.dashboard.all, 'weekly', outlet_id, start_date] as const,
    monthly: (outlet_id: string, year: number, month: number) => 
      [...queryKeys.dashboard.all, 'monthly', outlet_id, year, month] as const,
  },

  // Alert queries
  alerts: {
    all: ['alerts'] as const,
    lists: () => [...queryKeys.alerts.all, 'list'] as const,
    list: (filters: AlertFilters) => 
      [...queryKeys.alerts.lists(), filters] as const,
    unreadCount: (outlet_id?: string) => 
      [...queryKeys.alerts.all, 'unread-count', outlet_id] as const,
  },

  // Loss summary queries
  lossSummary: {
    all: ['loss-summary'] as const,
    daily: (outlet_id: string, tanggal: string) => 
      [...queryKeys.lossSummary.all, 'daily', outlet_id, tanggal] as const,
    range: (outlet_id: string, start_date: string, end_date: string) => 
      [...queryKeys.lossSummary.all, 'range', outlet_id, start_date, end_date] as const,
  },

  // Outlet queries (existing data)
  outlets: {
    all: ['outlets'] as const,
    lists: () => [...queryKeys.outlets.all, 'list'] as const,
    list: () => [...queryKeys.outlets.lists()] as const,
    details: () => [...queryKeys.outlets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.outlets.details(), id] as const,
  },

  // Product queries (existing data)
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (outlet_id?: string) => 
      [...queryKeys.products.lists(), outlet_id] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all query keys that should be invalidated after production input
 */
export function getProductionInvalidationKeys(outlet_id: string) {
  return [
    queryKeys.productions.all,
    queryKeys.inventory.all,
    queryKeys.dashboard.all,
  ];
}

/**
 * Get all query keys that should be invalidated after closing
 */
export function getClosingInvalidationKeys(outlet_id: string, tanggal: string) {
  return [
    queryKeys.closing.all,
    queryKeys.inventory.all,
    queryKeys.dashboard.all,
    queryKeys.lossSummary.all,
  ];
}

/**
 * Get all query keys that should be invalidated after topping error
 */
export function getToppingErrorInvalidationKeys(outlet_id: string) {
  return [
    queryKeys.toppingErrors.all,
    queryKeys.dashboard.all,
    queryKeys.lossSummary.all,
  ];
}

/**
 * Get all query keys that should be invalidated after sale
 */
export function getSaleInvalidationKeys(outlet_id: string) {
  return [
    queryKeys.inventory.all,
    queryKeys.dashboard.all,
  ];
}
