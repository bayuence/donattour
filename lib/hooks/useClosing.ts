// ============================================================================
// CLOSING HOOKS
// ============================================================================
// File: lib/hooks/useClosing.ts
// Description: React Query hooks for daily closing management
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getCacheConfig, getClosingInvalidationKeys } from '@/lib/query';
import type { ClosingFilters } from '@/lib/query';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Check if outlet has closed today
 */
async function checkClosing(outlet_id: string, tanggal: string) {
  const params = new URLSearchParams({ outlet_id, tanggal });
  
  const response = await fetch(`/api/closing/check?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to check closing status');
  }
  
  return response.json();
}

/**
 * Fetch closing list with filters
 */
async function fetchClosingList(filters: ClosingFilters) {
  const params = new URLSearchParams();
  
  if (filters.outlet_id) params.append('outlet_id', filters.outlet_id);
  if (filters.tanggal) params.append('tanggal', filters.tanggal);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const response = await fetch(`/api/closing/daily?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch closing list');
  }
  
  return response.json();
}

/**
 * Fetch single closing by ID
 */
async function fetchClosingById(id: string) {
  const response = await fetch(`/api/closing/daily/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch closing');
  }
  
  return response.json();
}

/**
 * Create daily closing
 */
async function createClosing(data: any) {
  const response = await fetch('/api/closing/daily', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create closing');
  }
  
  return response.json();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to check if outlet has closed today
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useClosingCheck('outlet-1', '2026-05-02');
 * 
 * if (data?.has_closed) {
 *   return <div>Already closed today</div>;
 * }
 * ```
 */
export function useClosingCheck(outlet_id: string, tanggal: string) {
  return useQuery({
    queryKey: queryKeys.closing.check(outlet_id, tanggal),
    queryFn: () => checkClosing(outlet_id, tanggal),
    ...getCacheConfig('closing-list'),
    enabled: !!outlet_id && !!tanggal,
  });
}

/**
 * Hook to fetch closing list with filters
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useClosingList({
 *   outlet_id: 'outlet-1',
 *   start_date: '2026-05-01',
 *   end_date: '2026-05-31',
 * });
 * ```
 */
export function useClosingList(filters: ClosingFilters) {
  return useQuery({
    queryKey: queryKeys.closing.list(filters),
    queryFn: () => fetchClosingList(filters),
    ...getCacheConfig('closing-list'),
  });
}

/**
 * Hook to fetch single closing by ID
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useClosingDetail('closing-123');
 * ```
 */
export function useClosingDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.closing.detail(id),
    queryFn: () => fetchClosingById(id),
    ...getCacheConfig('closing-detail'),
    enabled: !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create daily closing
 * 
 * Features:
 * - Cache invalidation for related queries
 * - Error handling
 * - Success callback
 * 
 * @example
 * ```tsx
 * const createMutation = useCreateClosing();
 * 
 * const handleSubmit = async (data) => {
 *   try {
 *     await createMutation.mutateAsync(data);
 *     toast.success('Closing berhasil disimpan!');
 *     router.push('/dashboard');
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 * ```
 */
export function useCreateClosing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createClosing,
    onSuccess: (data) => {
      // Invalidate related queries
      const keys = getClosingInvalidationKeys(
        data.data.outlet_id,
        data.data.tanggal
      );
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
