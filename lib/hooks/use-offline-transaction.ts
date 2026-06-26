// ============================================================================
// OFFLINE TRANSACTION HOOK
// ============================================================================
// File: lib/hooks/use-offline-transaction.ts
// Description: Hook for creating transactions with offline support
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

'use client';

import { useOfflineMutation } from './use-offline-mutation';
import { createOrder } from '@/lib/db';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Transaction data interface
 */
export interface TransactionData {
  orderData: {
    outlet_id: string;
    customer_name: string;
    total_amount: number;
    payment_method: string;
    channel: string;
    paid_amount: number;
    change_amount: number;
    kasir_name?: string;
    kasir_id?: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  outletId: string;
}

/**
 * Hook for creating offline-first transactions
 * 
 * This hook handles POS transactions with offline support:
 * - When online: creates order immediately
 * - When offline: queues order and syncs when back online
 * - Automatically invalidates relevant queries
 * - Shows appropriate toast messages
 * 
 * @example
 * ```tsx
 * function POSInterface() {
 *   const createTransaction = useOfflineTransaction();
 * 
 *   const handleCheckout = async () => {
 *     await createTransaction.mutateAsync({
 *       orderData: {
 *         outlet_id: user.outlet_id,
 *         customer_name: 'Walk-in Customer',
 *         total_amount: 50000,
 *         payment_method: 'cash',
 *         channel: 'toko',
 *         paid_amount: 50000,
 *         change_amount: 0,
 *       },
 *       items: cartItems,
 *       outletId: user.outlet_id,
 *     });
 *   };
 * 
 *   return (
 *     <button onClick={handleCheckout}>
 *       Checkout {createTransaction.isPending && '...'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useOfflineTransaction() {
  const queryClient = useQueryClient();
  const { queryKeys } = require('@/lib/query/query-keys');

  return useOfflineMutation<any, Error, TransactionData>({
    mutationFn: async (data) => {
      const result = await createOrder(
        data.orderData,
        data.items,
        data.outletId
      );

      if (!result.success) {
        throw new Error(result.error || 'Gagal membuat transaksi');
      }

      return result.data;
    },
    queueType: 'transaction',
    queueAction: 'create_order',
    offlineMessage: '📡 Transaksi disimpan offline. Akan dikirim saat koneksi kembali.',
    metadata: {
      timestamp: Date.now(),
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: ['daily-report'] });

      // Tampilkan nomor order yang bisa dibaca (6 karakter terakhir dari UUID)
      const orderId = data?.id || '';
      const shortId = orderId ? `TRX-${orderId.replace(/-/g, '').toUpperCase().slice(-6)}` : '-';

      // Show success message
      toast.success('✅ Transaksi berhasil!!', {
        description: `No. Order: ${shortId}`,
      });
    },
    onError: (error, variables) => {
      const errorMessage = error.message;

      // Check if it's an offline error (not a real error)
      if (errorMessage.includes('offline') || errorMessage.includes('📡')) {
        // Save to local PGLite database for offline queries and receipts
        try {
          const { createOfflineOrder } = require('@/lib/offline/offline-dal');
          createOfflineOrder(variables.orderData, variables.items).catch(console.error);
        } catch (e) {
          console.error('[OFFLINE TRX] Error saving offline order:', e);
        }

        toast.info('📡 Mode Offline', {
          description: errorMessage,
          duration: 5000,
        });
      } else {
        // Real error
        toast.error('❌ Transaksi gagal', {
          description: errorMessage,
        });
      }
    },
  });
}

/**
 * Hook for getting offline transaction statistics
 */
export function useOfflineTransactionStats() {
  const [stats, setStats] = React.useState({
    pendingCount: 0,
    failedCount: 0,
    totalAmount: 0,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // TODO: Implement stats calculation from IndexedDB
    // This would query the offline queue and calculate statistics

    const updateStats = async () => {
      // Placeholder implementation
      setStats({
        pendingCount: 0,
        failedCount: 0,
        totalAmount: 0,
      });
    };

    updateStats();
  }, []);

  return stats;
}

// Add React import
import React from 'react';
