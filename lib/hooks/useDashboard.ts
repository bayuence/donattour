// ============================================================================
// DASHBOARD HOOKS
// ============================================================================
// File: lib/hooks/useDashboard.ts
// Description: React Query hooks for dashboard data and analytics
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getCacheConfig } from '@/lib/query';
import type { DashboardFilters } from '@/lib/query';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch daily dashboard data
 */
async function fetchDailyDashboard(outlet_id: string, tanggal: string) {
  const params = new URLSearchParams({
    outlet_id,
    tanggal,
  });
  
  const response = await fetch(`/api/dashboard/daily?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  return response.json();
}

/**
 * Fetch weekly dashboard data
 */
async function fetchWeeklyDashboard(outlet_id: string, start_date: string) {
  const params = new URLSearchParams({
    outlet_id,
    start_date,
  });
  
  const response = await fetch(`/api/dashboard/weekly?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weekly dashboard data');
  }
  
  return response.json();
}

/**
 * Fetch monthly dashboard data
 */
async function fetchMonthlyDashboard(outlet_id: string, year: number, month: number) {
  const params = new URLSearchParams({
    outlet_id,
    year: year.toString(),
    month: month.toString(),
  });
  
  const response = await fetch(`/api/dashboard/monthly?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch monthly dashboard data');
  }
  
  return response.json();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch daily dashboard data
 * 
 * Features:
 * - Financial summary (omzet, profit, loss, margin)
 * - Production & sales overview
 * - Loss breakdown by category
 * - Sales by flavor ranking
 * - Recommendations
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useDashboardData({
 *   outlet_id: 'outlet-1',
 *   tanggal: '2026-05-02',
 * });
 * 
 * return (
 *   <div>
 *     <h2>Omzet: Rp {data?.financial.omzet.toLocaleString()}</h2>
 *     <p>Profit: Rp {data?.financial.profit.toLocaleString()}</p>
 *     <p>Waste Rate: {data?.production.waste_rate}%</p>
 *   </div>
 * );
 * ```
 */
export function useDashboardData(filters: DashboardFilters) {
  return useQuery({
    queryKey: queryKeys.dashboard.daily(filters.outlet_id, filters.tanggal),
    queryFn: () => fetchDailyDashboard(filters.outlet_id, filters.tanggal),
    ...getCacheConfig('dashboard-daily'),
    enabled: !!filters.outlet_id && !!filters.tanggal,
  });
}

/**
 * Hook to fetch weekly dashboard data
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useWeeklyDashboard('outlet-1', '2026-05-01');
 * ```
 */
export function useWeeklyDashboard(outlet_id: string, start_date: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.weekly(outlet_id, start_date),
    queryFn: () => fetchWeeklyDashboard(outlet_id, start_date),
    ...getCacheConfig('dashboard-weekly'),
    enabled: !!outlet_id && !!start_date,
  });
}

/**
 * Hook to fetch monthly dashboard data
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useMonthlyDashboard('outlet-1', 2026, 5);
 * ```
 */
export function useMonthlyDashboard(outlet_id: string, year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.dashboard.monthly(outlet_id, year, month),
    queryFn: () => fetchMonthlyDashboard(outlet_id, year, month),
    ...getCacheConfig('dashboard-monthly'),
    enabled: !!outlet_id && !!year && !!month,
  });
}

/**
 * Hook to prefetch dashboard data
 * 
 * Useful for preloading data before navigation
 * 
 * @example
 * ```tsx
 * const prefetchDashboard = usePrefetchDashboard();
 * 
 * const handleOutletChange = (outlet_id: string) => {
 *   prefetchDashboard(outlet_id, today);
 *   router.push(`/dashboard?outlet=${outlet_id}`);
 * };
 * ```
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();
  
  return (outlet_id: string, tanggal: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.daily(outlet_id, tanggal),
      queryFn: () => fetchDailyDashboard(outlet_id, tanggal),
    });
  };
}
