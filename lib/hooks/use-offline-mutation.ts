// ============================================================================
// OFFLINE-FIRST MUTATION HOOK
// ============================================================================
// File: lib/hooks/use-offline-mutation.ts
// Description: TanStack Query mutation with offline queue support
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { addToQueue, type QueueItemType } from '@/lib/offline/queue';
import { syncManager } from '@/lib/offline/sync';

/**
 * Offline mutation options
 */
interface UseOfflineMutationOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queueType: QueueItemType;
  queueAction: string;
  offlineMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Offline-first mutation hook
 * 
 * This hook wraps TanStack Query's useMutation with offline support:
 * - When online: executes mutation normally
 * - When offline: adds mutation to queue and syncs when back online
 * 
 * @example
 * ```tsx
 * const createOrderMutation = useOfflineMutation({
 *   mutationFn: async (data) => {
 *     return await createOrder(data.orderData, data.items, data.outletId);
 *   },
 *   queueType: 'transaction',
 *   queueAction: 'create_order',
 *   offlineMessage: 'Transaksi disimpan offline, akan dikirim saat online',
 *   onSuccess: () => {
 *     toast.success('Transaksi berhasil!');
 *   },
 * });
 * 
 * // Usage
 * createOrderMutation.mutate({
 *   orderData: { ... },
 *   items: [ ... ],
 *   outletId: '...'
 * });
 * ```
 */
export function useOfflineMutation<TData = unknown, TError = Error, TVariables = void>(
  options: UseOfflineMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();
  const {
    mutationFn,
    queueType,
    queueAction,
    offlineMessage,
    metadata,
    onSuccess,
    onError,
    ...restOptions
  } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      // Check if online
      if (navigator.onLine) {
        // Online: execute mutation normally
        try {
          return await mutationFn(variables);
        } catch (error: any) {
          // If network error, add to queue
          if (error.message?.includes('fetch') || error.message?.includes('network')) {
            console.warn('⚠️ Network error, adding to offline queue');
            await addToQueue(queueType, queueAction, variables, metadata);
            throw new Error(offlineMessage || 'Disimpan offline, akan dikirim saat online');
          }
          throw error;
        }
      } else {
        // Offline: add to queue
        console.log('📡 Offline, adding to queue');
        await addToQueue(queueType, queueAction, variables, metadata);
        
        // Return a placeholder response
        throw new Error(offlineMessage || 'Disimpan offline, akan dikirim saat online');
      }
    },
    onSuccess: (data, variables, context) => {
      // Call original onSuccess
      if (onSuccess) {
        (onSuccess as any)(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Check if it's an offline error (not a real error)
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('offline') || errorMessage.includes('Disimpan offline')) {
        console.log('✅ Mutation queued for offline sync');
        // Don't treat as error, it's expected behavior
        return;
      }

      // Call original onError for real errors
      if (onError) {
        (onError as any)(error, variables, context);
      }
    },
    ...restOptions,
  });
}

/**
 * Hook to get offline sync status
 */
export function useOfflineStatus() {
  const [status, setStatus] = React.useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update online status
    const handleOnline = () => setStatus((s) => ({ ...s, isOnline: true }));
    const handleOffline = () => setStatus((s) => ({ ...s, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync status
    const unsubscribe = syncManager.subscribe((syncStatus) => {
      setStatus((s) => ({
        ...s,
        isSyncing: syncStatus.isSyncing,
        pendingCount: syncStatus.pendingCount,
        failedCount: syncStatus.failedCount,
      }));
    });

    // Initial sync status
    syncManager.getStatus().then((syncStatus) => {
      setStatus((s) => ({
        ...s,
        isSyncing: syncStatus.isSyncing,
        pendingCount: syncStatus.pendingCount,
        failedCount: syncStatus.failedCount,
      }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  return status;
}

// Add React import
import React from 'react';
