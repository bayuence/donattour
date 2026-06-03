// ============================================================================
// SUPABASE REALTIME INVENTORY HOOK
// ============================================================================
// File: lib/hooks/use-realtime-inventory.ts
// Description: Real-time inventory updates across all POS terminals
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query/query-keys';
import { realtimeLogger } from '@/lib/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime inventory update payload
 */
interface InventoryUpdate {
  product_id: string;
  location_id: string;
  old_quantity: number;
  new_quantity: number;
  changed_by: string;
  timestamp: string;
}

/**
 * Hook options
 */
interface UseRealtimeInventoryOptions {
  outletId?: string;
  enabled?: boolean;
  onUpdate?: (update: InventoryUpdate) => void;
}

/**
 * Subscribe to real-time inventory updates
 * 
 * This hook listens to Supabase Realtime changes on the `stocks` table
 * and automatically invalidates relevant queries to trigger refetch.
 * 
 * @example
 * ```tsx
 * function POSInterface() {
 *   const { isConnected, lastUpdate } = useRealtimeInventory({
 *     outletId: user.outlet_id,
 *     onUpdate: (update) => {
 *       toast.info(`Stock updated: ${update.product_id}`);
 *     }
 *   });
 * 
 *   return (
 *     <div>
 *       {isConnected ? '🟢 Live' : '🔴 Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeInventory(options: UseRealtimeInventoryOptions = {}) {
  const { outletId, enabled = true, onUpdate } = options;
  const queryClient = useQueryClient();

  const handleInventoryUpdate = useCallback(
    (payload: any) => {
      realtimeLogger.log('Inventory update received', payload.new?.product_id);

      const update: InventoryUpdate = {
        product_id: payload.new?.product_id || payload.old?.product_id,
        location_id: payload.new?.location_id || payload.old?.location_id,
        old_quantity: payload.old?.quantity || 0,
        new_quantity: payload.new?.quantity || 0,
        changed_by: payload.new?.updated_by || 'system',
        timestamp: new Date().toISOString(),
      };

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-status'] });

      // Call custom handler
      if (onUpdate) {
        onUpdate(update);
      }
    },
    [queryClient, onUpdate]
  );

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      try {
        // Subscribe to stocks table changes
        const channelName = `inventory-changes-${outletId || 'all'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'inventory_non_topping',
              filter: outletId ? `outlet_id=eq.${outletId}` : undefined,
            },
            handleInventoryUpdate
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              realtimeLogger.success('Subscribed to inventory updates');
            } else if (status === 'CHANNEL_ERROR') {
              realtimeLogger.error('Failed to subscribe to inventory updates');
            }
          });
      } catch (error) {
        realtimeLogger.error('Realtime subscription error', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        realtimeLogger.log('Unsubscribed from inventory updates');
      }
    };
  }, [enabled, outletId, handleInventoryUpdate]);

  return {
    isConnected: true, // TODO: Track actual connection status
    lastUpdate: null, // TODO: Track last update timestamp
  };
}

/**
 * Hook for real-time order updates
 */
export function useRealtimeOrders(options: UseRealtimeInventoryOptions = {}) {
  const { outletId, enabled = true, onUpdate } = options;
  const queryClient = useQueryClient();

  const handleOrderUpdate = useCallback(
    (payload: any) => {
      realtimeLogger.log('Order update received', payload.new?.id);

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-report'] });

      if (onUpdate) {
        onUpdate(payload);
      }
    },
    [queryClient, onUpdate]
  );

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      try {
        const channelName = `order-changes-${outletId || 'all'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all order changes
              schema: 'public',
              table: 'orders',
              filter: outletId ? `outlet_id=eq.${outletId}` : undefined,
            },
            handleOrderUpdate
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              realtimeLogger.success('Subscribed to order updates');
            }
          });
      } catch (error) {
        realtimeLogger.error('Realtime subscription error', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        realtimeLogger.log('Unsubscribed from order updates');
      }
    };
  }, [enabled, outletId, handleOrderUpdate]);

  return {
    isConnected: true,
    lastUpdate: null,
  };
}
