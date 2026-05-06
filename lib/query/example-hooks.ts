// ============================================================================
// EXAMPLE REACT QUERY HOOKS
// ============================================================================
// File: lib/query/example-hooks.ts
// Description: Example hooks demonstrating React Query usage patterns
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

/**
 * This file contains example hooks to demonstrate how to use React Query
 * with the configured query client and query keys.
 * 
 * These are templates - actual implementation will be in separate hook files
 * like lib/hooks/useProduction.ts, lib/hooks/useInventory.ts, etc.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  queryKeys, 
  getCacheConfig, 
  shouldRefetchOnInterval,
  getProductionInvalidationKeys,
  type ProductionFilters,
  type StockFilters,
} from './index';

// ============================================================================
// EXAMPLE: PRODUCTION HOOKS
// ============================================================================

/**
 * Example: Fetch production list with filters
 */
export function useProductionList(filters: ProductionFilters) {
  return useQuery({
    queryKey: queryKeys.productions.list(filters),
    queryFn: async () => {
      const response = await fetch('/api/production/daily?' + new URLSearchParams(filters as any));
      if (!response.ok) throw new Error('Failed to fetch productions');
      return response.json();
    },
    ...getCacheConfig('productions-list'),
  });
}

/**
 * Example: Fetch single production detail
 */
export function useProductionDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.productions.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/production/daily/${id}`);
      if (!response.ok) throw new Error('Failed to fetch production');
      return response.json();
    },
    ...getCacheConfig('productions-detail'),
    enabled: !!id, // Only fetch if id is provided
  });
}

/**
 * Example: Create production mutation
 */
export function useCreateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/production/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create production');
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      const keys = getProductionInvalidationKeys(data.outlet_id);
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

// ============================================================================
// EXAMPLE: INVENTORY HOOKS
// ============================================================================

/**
 * Example: Real-time stock validation
 */
export function useStockValidation(outlet_id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.validation(outlet_id),
    queryFn: async () => {
      const response = await fetch(`/api/inventory/validate?outlet_id=${outlet_id}`);
      if (!response.ok) throw new Error('Failed to validate stock');
      return response.json();
    },
    ...getCacheConfig('inventory-validation'),
    refetchInterval: shouldRefetchOnInterval('inventory-validation'), // 30s
    refetchOnWindowFocus: true,
    enabled: !!outlet_id,
  });
}

/**
 * Example: Fetch inventory stock
 */
export function useInventoryStock(outlet_id: string, filters?: StockFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.stock({ outlet_id, ...filters }),
    queryFn: async () => {
      const params = new URLSearchParams({ outlet_id, ...filters } as any);
      const response = await fetch(`/api/inventory/stock?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stock');
      return response.json();
    },
    ...getCacheConfig('inventory-stock'),
    refetchInterval: shouldRefetchOnInterval('inventory-stock'), // 30s
    enabled: !!outlet_id,
  });
}

// ============================================================================
// EXAMPLE: OPTIMISTIC UPDATE
// ============================================================================

/**
 * Example: Update production with optimistic update
 */
export function useUpdateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/production/daily/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update production');
      return response.json();
    },
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.productions.detail(id) });

      // Snapshot previous value
      const previousProduction = queryClient.getQueryData(queryKeys.productions.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.productions.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));

      // Return context with snapshot
      return { previousProduction };
    },
    // Rollback on error
    onError: (err, { id }, context) => {
      if (context?.previousProduction) {
        queryClient.setQueryData(queryKeys.productions.detail(id), context.previousProduction);
      }
    },
    // Refetch on success or error
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.productions.lists() });
    },
  });
}

// ============================================================================
// EXAMPLE: DEPENDENT QUERIES
// ============================================================================

/**
 * Example: Fetch production and its waste details (dependent queries)
 */
export function useProductionWithWasteDetails(productionId: string) {
  // First query: Get production
  const productionQuery = useQuery({
    queryKey: queryKeys.productions.detail(productionId),
    queryFn: async () => {
      const response = await fetch(`/api/production/daily/${productionId}`);
      if (!response.ok) throw new Error('Failed to fetch production');
      return response.json();
    },
    enabled: !!productionId,
  });

  // Second query: Get waste details (depends on production)
  const wasteDetailsQuery = useQuery({
    queryKey: ['waste-details', productionId],
    queryFn: async () => {
      const response = await fetch(`/api/production/waste-details?production_id=${productionId}`);
      if (!response.ok) throw new Error('Failed to fetch waste details');
      return response.json();
    },
    enabled: !!productionQuery.data, // Only fetch if production exists
  });

  return {
    production: productionQuery.data,
    wasteDetails: wasteDetailsQuery.data,
    isLoading: productionQuery.isLoading || wasteDetailsQuery.isLoading,
    error: productionQuery.error || wasteDetailsQuery.error,
  };
}

// ============================================================================
// EXAMPLE: PREFETCHING
// ============================================================================

/**
 * Example: Prefetch production detail on hover
 */
export function usePrefetchProduction() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.productions.detail(id),
      queryFn: async () => {
        const response = await fetch(`/api/production/daily/${id}`);
        if (!response.ok) throw new Error('Failed to fetch production');
        return response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
}

// ============================================================================
// EXAMPLE: INFINITE QUERY (PAGINATION)
// ============================================================================

/**
 * Example: Infinite scroll for production list
 */
export function useInfiniteProductions(filters: ProductionFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.productions.list(filters),
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const page = pageParam ?? 1;
      const params = new URLSearchParams({ 
        ...filters, 
        page: page.toString() 
      } as any);
      const response = await fetch(`/api/production/daily?${params}`);
      if (!response.ok) throw new Error('Failed to fetch productions');
      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}
