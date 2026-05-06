// ============================================================================
// ALERTS HOOKS
// ============================================================================
// File: lib/hooks/useAlerts.ts
// Description: React Query hooks for alerts management (wrapper for AlertContext)
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getCacheConfig, shouldRefetchOnInterval } from '@/lib/query';
import type { AlertFilters } from '@/lib/query';

// Re-export useAlerts from context for convenience
export { useAlerts } from '@/lib/context';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch alerts list with filters
 */
async function fetchAlerts(filters: AlertFilters) {
  const params = new URLSearchParams();
  
  if (filters.outlet_id) params.append('outlet_id', filters.outlet_id);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.is_read !== undefined) params.append('is_read', filters.is_read.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const response = await fetch(`/api/alerts?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch alerts');
  }
  
  return response.json();
}

/**
 * Fetch unread alert count
 */
async function fetchUnreadCount(outlet_id?: string) {
  const params = new URLSearchParams();
  if (outlet_id) params.append('outlet_id', outlet_id);
  
  const response = await fetch(`/api/alerts/unread-count?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }
  
  return response.json();
}

/**
 * Mark alert as read
 */
async function markAlertAsRead(id: string) {
  const response = await fetch(`/api/alerts/${id}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark alert as read');
  }
  
  return response.json();
}

/**
 * Mark all alerts as read
 */
async function markAllAlertsAsRead(outlet_id?: string) {
  const params = new URLSearchParams();
  if (outlet_id) params.append('outlet_id', outlet_id);
  
  const response = await fetch(`/api/alerts/read-all?${params.toString()}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark all alerts as read');
  }
  
  return response.json();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch alerts list with filters
 * 
 * Note: For real-time alerts in header, use useAlerts() from context instead
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useAlertsList({
 *   outlet_id: 'outlet-1',
 *   severity: 'critical',
 *   is_read: false,
 * });
 * ```
 */
export function useAlertsList(filters: AlertFilters) {
  return useQuery({
    queryKey: queryKeys.alerts.list(filters),
    queryFn: () => fetchAlerts(filters),
    ...getCacheConfig('alerts-list'),
    refetchInterval: shouldRefetchOnInterval('alerts-unread-count'),
  });
}

/**
 * Hook to fetch unread alert count
 * 
 * Note: For real-time count in header, use useAlerts() from context instead
 * 
 * @example
 * ```tsx
 * const { data } = useUnreadAlertCount('outlet-1');
 * 
 * return <Badge>{data?.count}</Badge>;
 * ```
 */
export function useUnreadAlertCount(outlet_id?: string) {
  return useQuery({
    queryKey: queryKeys.alerts.unreadCount(outlet_id),
    queryFn: () => fetchUnreadCount(outlet_id),
    ...getCacheConfig('alerts-unread-count'),
    refetchInterval: shouldRefetchOnInterval('alerts-unread-count'),
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to mark alert as read
 * 
 * @example
 * ```tsx
 * const markAsReadMutation = useMarkAlertAsRead();
 * 
 * const handleClick = (alertId: string) => {
 *   markAsReadMutation.mutate(alertId);
 * };
 * ```
 */
export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      // Invalidate all alert queries
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

/**
 * Hook to mark all alerts as read
 * 
 * @example
 * ```tsx
 * const markAllAsReadMutation = useMarkAllAlertsAsRead();
 * 
 * const handleMarkAllAsRead = () => {
 *   markAllAsReadMutation.mutate('outlet-1');
 * };
 * ```
 */
export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markAllAlertsAsRead,
    onSuccess: () => {
      // Invalidate all alert queries
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}
