// ============================================================================
// REALTIME PRODUCTION HOOK
// ============================================================================
// File: lib/hooks/useRealtimeProduction.ts
// Description: Realtime subscriptions for production updates using Supabase
// Version: 1.0
// Date: May 7, 2026
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/query-keys';
import { realtimeLogger } from '@/lib/utils/logger';

/**
 * Subscribe to realtime production updates
 * 
 * Features:
 * - Auto-refresh production list when new records inserted
 * - Auto-refresh when records updated or deleted
 * - Invalidate React Query cache for instant UI update
 * - Works across all outlets (scalable to 1000+ outlets)
 * 
 * @param outlet_id - Optional outlet filter
 * 
 * @example
 * ```tsx
 * function ProductionPage() {
 *   useRealtimeProduction(); // Subscribe to all outlets
 *   // or
 *   useRealtimeProduction('outlet-123'); // Subscribe to specific outlet
 * }
 * ```
 */
export function useRealtimeProduction(outlet_id?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    realtimeLogger.log('Subscribing to production_daily changes...');

    // Subscribe to production_daily table changes
    const channel = supabase
      .channel('production-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'production_daily',
          filter: outlet_id ? `outlet_id=eq.${outlet_id}` : undefined,
        },
        (payload) => {
          realtimeLogger.log('Production change detected', payload.new?.id);

          // Invalidate all production queries to trigger refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.production.all,
          });

          // Also invalidate inventory queries (since production affects inventory)
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory.all,
          });

          realtimeLogger.log('Cache invalidated, UI will update automatically');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeLogger.success('Subscribed to production updates');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      realtimeLogger.log('Unsubscribing from production_daily changes...');
      supabase.removeChannel(channel);
    };
  }, [outlet_id, queryClient]);
}

/**
 * Subscribe to realtime inventory updates
 * 
 * @param outlet_id - Optional outlet filter
 */
export function useRealtimeInventory(outlet_id?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    realtimeLogger.log('Subscribing to inventory_non_topping changes...');

    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_non_topping',
          filter: outlet_id ? `outlet_id=eq.${outlet_id}` : undefined,
        },
        (payload) => {
          realtimeLogger.log('Inventory change detected', payload.new?.id);

          // Invalidate inventory queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory.all,
          });

          realtimeLogger.log('Inventory cache invalidated');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeLogger.success('Subscribed to inventory updates');
        }
      });

    return () => {
      realtimeLogger.log('Unsubscribing from inventory_non_topping changes...');
      supabase.removeChannel(channel);
    };
  }, [outlet_id, queryClient]);
}

/**
 * Subscribe to both production and inventory updates
 * 
 * Convenience hook that combines both subscriptions
 * 
 * @param outlet_id - Optional outlet filter
 */
export function useRealtimeProductionAndInventory(outlet_id?: string) {
  useRealtimeProduction(outlet_id);
  useRealtimeInventory(outlet_id);
}
