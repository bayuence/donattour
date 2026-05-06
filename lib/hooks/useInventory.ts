// ============================================================================
// INVENTORY HOOKS
// ============================================================================
// File: lib/hooks/useInventory.ts
// Description: React Query hooks for inventory and stock management
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getCacheConfig, shouldRefetchOnInterval, getSaleInvalidationKeys } from '@/lib/query';
import type { StockFilters } from '@/lib/query';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch inventory stock levels
 */
async function fetchInventoryStock(outlet_id: string, filters?: StockFilters) {
  const params = new URLSearchParams({ outlet_id });
  
  if (filters?.ukuran) params.append('ukuran', filters.ukuran);
  if (filters?.status) params.append('status', filters.status);
  
  const response = await fetch(`/api/inventory/stock?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch inventory stock');
  }
  
  return response.json();
}

/**
 * Deduct stock on sale (called by POS)
 */
async function deductStock(data: {
  outlet_id: string;
  ukuran: string;
  qty: number;
}) {
  const response = await fetch('/api/inventory/deduct', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to deduct stock');
  }
  
  return response.json();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch inventory stock levels
 * 
 * Features:
 * - Real-time stock tracking
 * - Filter by size and status
 * - Auto-refetch every 30 seconds
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useInventoryStock('outlet-1', {
 *   ukuran: 'standar',
 *   status: 'fresh',
 * });
 * 
 * return (
 *   <div>
 *     <p>Available: {data?.total_by_size.standar} pcs</p>
 *   </div>
 * );
 * ```
 */
export function useInventoryStock(outlet_id: string, filters?: StockFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.stock({ outlet_id, ...filters }),
    queryFn: () => fetchInventoryStock(outlet_id, filters),
    ...getCacheConfig('inventory-stock'),
    refetchInterval: shouldRefetchOnInterval('inventory-stock'),
    enabled: !!outlet_id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to deduct stock on sale
 * 
 * Features:
 * - Optimistic updates
 * - Cache invalidation
 * - Error handling with rollback
 * 
 * @example
 * ```tsx
 * const deductMutation = useDeductStock();
 * 
 * const handleSale = async () => {
 *   try {
 *     await deductMutation.mutateAsync({
 *       outlet_id: 'outlet-1',
 *       ukuran: 'standar',
 *       qty: 5,
 *     });
 *     toast.success('Stock deducted!');
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 * ```
 */
export function useDeductStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deductStock,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.inventory.stock({ outlet_id: variables.outlet_id }) 
      });
      
      // Snapshot previous value
      const previousStock = queryClient.getQueryData(
        queryKeys.inventory.stock({ outlet_id: variables.outlet_id })
      );
      
      // Optimistically update stock
      queryClient.setQueryData(
        queryKeys.inventory.stock({ outlet_id: variables.outlet_id }),
        (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              stocks: old.data.stocks.map((stock: any) => {
                if (stock.ukuran === variables.ukuran) {
                  return {
                    ...stock,
                    qty_available: stock.qty_available - variables.qty,
                  };
                }
                return stock;
              }),
              total_by_size: {
                ...old.data.total_by_size,
                [variables.ukuran]: 
                  old.data.total_by_size[variables.ukuran] - variables.qty,
              },
            },
          };
        }
      );
      
      return { previousStock };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousStock) {
        queryClient.setQueryData(
          queryKeys.inventory.stock({ outlet_id: variables.outlet_id }),
          context.previousStock
        );
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      const keys = getSaleInvalidationKeys(variables.outlet_id);
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
