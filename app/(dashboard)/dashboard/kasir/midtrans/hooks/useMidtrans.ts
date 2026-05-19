/**
 * useMidtrans Hook
 * 
 * Custom React hook untuk Midtrans operations
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type {
  MidtransTransactionRequest,
  MidtransTransactionResponse,
  CheckStatusResponse,
  SnapCallbacks,
  UseMidtransReturn,
} from '../types';
import { snapConfig, API_ENDPOINTS, TRANSACTION_SETTINGS } from '../config';
import { parseMidtransError } from '../utils/transaction';

// ============================================================================
// DECLARE SNAP GLOBAL TYPE
// ============================================================================

declare global {
  interface Window {
    snap?: {
      pay: (snapToken: string, options?: SnapCallbacks) => void;
      hide: () => void;
    };
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useMidtrans(): UseMidtransReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapLoaded, setSnapLoaded] = useState(false);

  // ============================================================================
  // LOAD SNAP SCRIPT
  // ============================================================================

  useEffect(() => {
    // Check if snap script already loaded
    if (window.snap) {
      setSnapLoaded(true);
      return;
    }

    // Load Snap script
    const script = document.createElement('script');
    script.src = snapConfig.snapUrl;
    script.setAttribute('data-client-key', snapConfig.clientKey);
    script.async = true;

    script.onload = () => {
      console.log('✅ Midtrans Snap script loaded');
      setSnapLoaded(true);
    };

    script.onerror = () => {
      console.error('❌ Failed to load Midtrans Snap script');
      setError('Gagal memuat Midtrans. Periksa koneksi internet.');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        `script[src="${snapConfig.snapUrl}"]`
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // ============================================================================
  // CREATE TRANSACTION
  // ============================================================================

  const createTransaction = useCallback(
    async (
      request: MidtransTransactionRequest
    ): Promise<MidtransTransactionResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Creating Midtrans transaction...', request);

        const response = await fetch(API_ENDPOINTS.createTransaction, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Gagal membuat transaksi');
        }

        if (!data.success) {
          throw new Error(data.error || 'Gagal membuat transaksi');
        }

        console.log('✅ Transaction created:', data);

        return {
          success: true,
          snapToken: data.data.snapToken,
          redirectUrl: data.data.redirectUrl,
          orderId: data.data.orderId,
        };
      } catch (err: any) {
        const errorMessage = parseMidtransError(err);
        console.error('❌ Create transaction error:', errorMessage);
        setError(errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // CHECK STATUS
  // ============================================================================

  const checkStatus = useCallback(
    async (orderId: string): Promise<CheckStatusResponse | null> => {
      try {
        console.log('🔄 Checking payment status for:', orderId);

        const response = await fetch(
          `${API_ENDPOINTS.checkStatus}?orderId=${orderId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Gagal cek status');
        }

        if (!data.success) {
          throw new Error(data.error || 'Gagal cek status');
        }

        console.log('✅ Status checked:', data.data);

        return data.data;
      } catch (err: any) {
        const errorMessage = parseMidtransError(err);
        console.error('❌ Check status error:', errorMessage);
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  // ============================================================================
  // OPEN SNAP POPUP
  // ============================================================================

  const openSnap = useCallback(
    (snapToken: string, callbacks?: SnapCallbacks) => {
      if (!snapLoaded) {
        toast.error('Midtrans belum siap. Tunggu sebentar...');
        return;
      }

      if (!window.snap) {
        toast.error('Midtrans Snap tidak tersedia');
        return;
      }

      console.log('🚀 Opening Midtrans Snap with token:', snapToken);

      // Default callbacks
      const defaultCallbacks: SnapCallbacks = {
        onSuccess: (result) => {
          console.log('✅ Payment success:', result);
          toast.success('Pembayaran berhasil!');
          callbacks?.onSuccess?.(result);
        },
        onPending: (result) => {
          console.log('⏳ Payment pending:', result);
          toast.info('Menunggu pembayaran...');
          callbacks?.onPending?.(result);
        },
        onError: (result) => {
          console.error('❌ Payment error:', result);
          toast.error('Pembayaran gagal. Silakan coba lagi.');
          callbacks?.onError?.(result);
        },
        onClose: () => {
          console.log('🚪 Snap popup closed');
          callbacks?.onClose?.();
        },
      };

      // Open Snap popup
      window.snap.pay(snapToken, defaultCallbacks);
    },
    [snapLoaded]
  );

  // ============================================================================
  // CLEAR ERROR
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    isLoading,
    error,
    createTransaction,
    checkStatus,
    openSnap,
    clearError,
  };
}

// ============================================================================
// POLLING HOOK (untuk auto-check status)
// ============================================================================

export function useMidtransStatusPolling(
  orderId: string | null,
  onStatusChange?: (status: CheckStatusResponse) => void
) {
  const { checkStatus } = useMidtrans();
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!orderId || !polling) return;

    let retryCount = 0;
    const maxRetries = TRANSACTION_SETTINGS.maxStatusCheckRetry;
    const interval = TRANSACTION_SETTINGS.statusCheckInterval;

    console.log(`🔄 Starting status polling for ${orderId}`);

    const pollInterval = setInterval(async () => {
      retryCount++;

      const status = await checkStatus(orderId);

      if (status) {
        console.log(`📊 Poll #${retryCount}:`, status.status);

        // Call callback
        onStatusChange?.(status);

        // Stop polling if payment completed or failed
        if (
          status.status === 'paid' ||
          status.status === 'failed' ||
          status.status === 'expired' ||
          status.status === 'cancelled'
        ) {
          console.log('✅ Polling stopped - Final status:', status.status);
          setPolling(false);
          clearInterval(pollInterval);
        }
      }

      // Stop after max retries
      if (retryCount >= maxRetries) {
        console.log('⏰ Polling stopped - Max retries reached');
        setPolling(false);
        clearInterval(pollInterval);
      }
    }, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [orderId, polling, checkStatus, onStatusChange]);

  return {
    startPolling: () => setPolling(true),
    stopPolling: () => setPolling(false),
    isPolling: polling,
  };
}
