// ============================================================================
// STOCK VALIDATION HOOKS
// ============================================================================
// File: lib/hooks/useStockValidation.ts
// Description: Custom hooks untuk stock validation dan inventory management
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-keys';

// ============================================================================
// TYPES
// ============================================================================

interface StockValidationResponse {
  can_operate: boolean;
  has_production: boolean;
  stock_summary: {
    standar: {
      qty_available: number;
      status: 'sufficient' | 'low' | 'out_of_stock';
      percentage: number;
    };
    mini: {
      qty_available: number;
      status: 'sufficient' | 'low' | 'out_of_stock';
      percentage: number;
    };
  };
  production_data: {
    standar?: {
      target_qty: number;
      success_qty: number;
    };
    mini?: {
      target_qty: number;
      success_qty: number;
    };
  };
}

interface InventoryStockResponse {
  outlet_id: string;
  stocks: Array<{
    id: string;
    outlet_id: string;
    ukuran: 'standar' | 'mini';
    status: 'fresh' | 'aging' | 'expired';
    qty_available: number;
    production_date: string;
    last_updated: string;
  }>;
  total_by_size: {
    standar: number;
    mini: number;
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook untuk validasi stok POS
 * 
 * Digunakan untuk:
 * - Cek apakah kasir bisa operasi (ada produksi hari ini)
 * - Get stock levels untuk semua ukuran
 * - Auto-refresh setiap 30 detik
 * 
 * @param outlet_id - ID outlet
 * @param tanggal - Tanggal (optional, default: today)
 * @param enabled - Enable/disable query (default: true)
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useStockValidation('outlet-123');
 * 
 * if (!data?.can_operate) {
 *   return <BlockedModal />;
 * }
 * ```
 */
export function useStockValidation(
  outlet_id: string,
  tanggal?: string,
  enabled: boolean = true
) {
  return useQuery<StockValidationResponse>({
    queryKey: queryKeys.inventory.validation(outlet_id, tanggal),
    queryFn: async () => {
      const params = new URLSearchParams({ outlet_id });
      if (tanggal) params.append('tanggal', tanggal);

      // Build auth headers from localStorage
      const headers: Record<string, string> = {};
      try {
        const storedUser = localStorage.getItem('donutshop_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user?.id) headers['x-user-id'] = user.id;
          if (user?.role) headers['x-user-role'] = user.role;
        }
      } catch (e) {}

      const response = await fetch(`/api/inventory/validate?${params}`, { headers });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to validate stock');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: enabled && !!outlet_id,
    staleTime: 10 * 1000, // 10 seconds - data dianggap fresh selama 10 detik
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // ✅ DISABLED polling - kita pakai Supabase Realtime untuk instant update
    refetchOnWindowFocus: true, // Refetch saat user kembali ke tab (untuk sinkronisasi lintas device)
  });
}

/**
 * Hook untuk get inventory stock
 * 
 * Digunakan untuk:
 * - Get real-time stock non-topping
 * - Filter by ukuran, status, production_date
 * - Display stock summary
 * 
 * @param filters - Filter parameters
 * @param enabled - Enable/disable query (default: true)
 * 
 * @example
 * ```tsx
 * const { data } = useInventoryStock({
 *   outlet_id: 'outlet-123',
 *   status: 'fresh'
 * });
 * 
 * console.log(data?.total_by_size.standar); // Total standar stock
 * ```
 */
export function useInventoryStock(
  filters: {
    outlet_id: string;
    ukuran?: 'standar' | 'mini';
    status?: 'fresh' | 'aging' | 'expired';
    production_date?: string;
  },
  enabled: boolean = true
) {
  return useQuery<InventoryStockResponse>({
    queryKey: queryKeys.inventory.stock(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('outlet_id', filters.outlet_id);
      if (filters.ukuran) params.append('ukuran', filters.ukuran);
      if (filters.status) params.append('status', filters.status);
      if (filters.production_date) params.append('production_date', filters.production_date);

      const response = await fetch(`/api/inventory/stock?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch inventory stock');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: enabled && !!filters.outlet_id,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // ✅ DISABLED polling - kita pakai Supabase Realtime untuk instant update
  });
}

/**
 * Hook untuk prefetch stock validation
 * 
 * Digunakan untuk:
 * - Prefetch validation data sebelum navigate ke POS
 * - Improve perceived performance
 * 
 * @example
 * ```tsx
 * const prefetchValidation = usePrefetchStockValidation();
 * 
 * <Button onClick={() => {
 *   prefetchValidation('outlet-123');
 *   router.push('/dashboard/kasir');
 * }}>
 *   Buka Kasir
 * </Button>
 * ```
 */
export function usePrefetchStockValidation() {
  const queryClient = useQueryClient();

  return async (outlet_id: string, tanggal?: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.inventory.validation(outlet_id, tanggal),
      queryFn: async () => {
        const params = new URLSearchParams({ outlet_id });
        if (tanggal) params.append('tanggal', tanggal);

        const headers: Record<string, string> = {};
        try {
          const storedUser = localStorage.getItem('donutshop_user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user?.id) headers['x-user-id'] = user.id;
            if (user?.role) headers['x-user-role'] = user.role;
          }
        } catch (e) {}

        const response = await fetch(`/api/inventory/validate?${params}`, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to validate stock');
        }

        const result = await response.json();
        return result.data;
      },
    });
  };
}
