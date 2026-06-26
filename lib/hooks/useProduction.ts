// ============================================================================
// PRODUCTION HOOKS
// ============================================================================
// File: lib/hooks/useProduction.ts
// Description: React Query hooks for production data management
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineMutation } from './use-offline-mutation';
import { queryKeys, getCacheConfig, getProductionInvalidationKeys } from '@/lib/query';
import type { ProductionFilters } from '@/lib/query';
import type {
  ProductionDaily,
  CreateProductionDaily,
  UpdateProductionDaily,
  ProductionDailyWithDetails,
} from '@/lib/types/production';
import { supabase } from '@/lib/supabase/client';

// ============================================================================
// API FUNCTIONS
// ============================================================================

function getAuthHeader(): Record<string, string> {
  // Try reading from localStorage first (for offline support)
  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.id && user?.role) {
          return {
            'x-user-id': String(user.id),
            'x-user-role': String(user.role)
          };
        }
      }
    } catch (e) {
      console.warn('[getAuthHeader] Failed to read from localStorage:', e);
    }
  }
  return {};
}

/**
 * Fetch production list with filters
 */
async function fetchProductions(filters: ProductionFilters) {
  const params = new URLSearchParams();

  if (filters.outlet_id) params.append('outlet_id', filters.outlet_id);
  if (filters.tanggal) params.append('tanggal', filters.tanggal);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.ukuran) params.append('ukuran', filters.ukuran);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const headers = getAuthHeader();
  const response = await fetch(`/api/production/daily?${params.toString()}`, { headers });

  if (!response.ok) {
    let errMsg = 'Failed to fetch productions';
    try {
      const errData = await response.json();
      if (errData.error || errData.message) errMsg = errData.error || errData.message;
    } catch (e) { }
    throw new Error(errMsg);
  }

  const result = await response.json();
  return result.data; // Return the 'data' field directly
}

/**
 * Fetch single production by ID
 */
async function fetchProductionById(id: string) {
  const headers = getAuthHeader();
  const response = await fetch(`/api/production/daily/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch production');
  }

  return response.json();
}

/**
 * Create new production
 */
async function createProduction(data: CreateProductionDaily) {
  const headers = getAuthHeader();
  const response = await fetch('/api/production/daily', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to create production');
  }

  return response.json();
}

/**
 * Update production
 */
async function updateProduction(id: string, data: UpdateProductionDaily) {
  const headers = getAuthHeader();
  const response = await fetch(`/api/production/daily/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to update production');
  }

  return response.json();
}

/**
 * Delete production
 */
async function deleteProduction(id: string) {
  const headers = getAuthHeader();
  const response = await fetch(`/api/production/daily/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to delete production');
  }

  return response.json();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch production list with filters
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useProductionList({
 *   outlet_id: 'outlet-1',
 *   tanggal: '2026-05-02',
 * }, true); // Enable fetch
 * ```
 */
export function useProductionList(filters: ProductionFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.productions.list(filters),
    queryFn: () => fetchProductions(filters),
    ...getCacheConfig('productions-list'),
    enabled: enabled, // Only fetch if enabled
  });
}

/**
 * Hook to fetch single production by ID
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useProductionDetail('prod-123');
 * ```
 */
export function useProductionDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.productions.detail(id),
    queryFn: () => fetchProductionById(id),
    ...getCacheConfig('productions-detail'),
    enabled: !!id, // Only fetch if id is provided
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create new production
 * 
 * Features:
 * - Optimistic updates
 * - Cache invalidation
 * - Error handling
 * 
 * @example
 * ```tsx
 * const createMutation = useCreateProduction();
 * 
 * const handleSubmit = async (data) => {
 *   try {
 *     await createMutation.mutateAsync(data);
 *     toast.success('Production created!');
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 * ```
 */
export function useCreateProduction() {
  const queryClient = useQueryClient();

  return useOfflineMutation<any, Error, CreateProductionDaily>({
    mutationFn: createProduction,
    queueType: 'production',
    queueAction: 'create_production',
    offlineMessage: '📡 Data produksi disimpan offline. Akan dikirim saat koneksi kembali.',
    metadata: {
      userId: typeof window !== 'undefined' ? (() => {
        try {
          const stored = localStorage.getItem('donutshop_user');
          if (stored) return JSON.parse(stored)?.id;
        } catch {}
        return undefined;
      })() : undefined,
      userRole: typeof window !== 'undefined' ? (() => {
        try {
          const stored = localStorage.getItem('donutshop_user');
          if (stored) return JSON.parse(stored)?.role;
        } catch {}
        return undefined;
      })() : undefined,
      timestamp: Date.now(),
    },
    onSuccess: (response) => {
      // Invalidate related queries
      const outlet_id = response.data?.outlet_id;
      if (outlet_id) {
        const keys = getProductionInvalidationKeys(outlet_id);
        keys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      } else {
        // Fallback: invalidate all production queries
        queryClient.invalidateQueries({ queryKey: queryKeys.productions.all });
      }
      const { toast } = require('sonner');
      toast.success('✅ Data produksi berhasil disimpan!');
    },
    onError: (error, variables) => {
      const errorMessage = error.message;
      const { toast } = require('sonner');

      // Check if it's an offline error (not a real error)
      if (
        errorMessage.includes('offline') || 
        errorMessage.includes('📡') || 
        errorMessage.includes('Disimpan offline') ||
        errorMessage.includes('disimpan offline')
      ) {
        try {
          const { createOfflineProduction } = require('@/lib/offline/offline-dal');
          createOfflineProduction(variables).catch(console.error);
        } catch (e) {
          console.error('[OFFLINE PRODUCTION] Error saving offline production:', e);
        }

        toast.info('📡 Mode Offline', {
          description: errorMessage,
          duration: 5000,
        });
      } else {
        toast.error('❌ Gagal menyimpan data produksi', {
          description: errorMessage,
        });
      }
    },
  });
}

/**
 * Hook to update production
 * 
 * @example
 * ```tsx
 * const updateMutation = useUpdateProduction();
 * 
 * const handleUpdate = async (id, data) => {
 *   await updateMutation.mutateAsync({ id, data });
 * };
 * ```
 */
export function useUpdateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductionDaily }) =>
      updateProduction(id, data),
    onSuccess: (data, variables) => {
      // Invalidate specific production detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.productions.detail(variables.id)
      });

      // Invalidate production lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.productions.lists()
      });

      // Invalidate related queries
      const keys = getProductionInvalidationKeys(data.data.outlet_id);
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

/**
 * Hook to delete production
 * 
 * @example
 * ```tsx
 * const deleteMutation = useDeleteProduction();
 * 
 * const handleDelete = async (id) => {
 *   if (confirm('Are you sure?')) {
 *     await deleteMutation.mutateAsync(id);
 *   }
 * };
 * ```
 */
export function useDeleteProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduction,
    onSuccess: (_, id) => {
      // Invalidate production lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.productions.lists()
      });

      // Remove specific production from cache
      queryClient.removeQueries({
        queryKey: queryKeys.productions.detail(id)
      });
    },
  });
}
