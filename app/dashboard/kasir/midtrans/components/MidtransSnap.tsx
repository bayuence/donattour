/**
 * MidtransSnap Component
 * 
 * Component untuk handle Midtrans Snap popup
 */

'use client';

import { useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useMidtrans } from '../hooks/useMidtrans';
import type { SnapCallbacks } from '../types';

interface MidtransSnapProps {
  snapToken: string | null;
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
  autoOpen?: boolean;
}

export function MidtransSnap({
  snapToken,
  onSuccess,
  onPending,
  onError,
  onClose,
  autoOpen = true,
}: MidtransSnapProps) {
  const { openSnap, isLoading, error } = useMidtrans();

  useEffect(() => {
    if (snapToken && autoOpen && !isLoading) {
      const callbacks: SnapCallbacks = {
        onSuccess,
        onPending,
        onError,
        onClose,
      };

      // Small delay to ensure Snap is ready
      setTimeout(() => {
        openSnap(snapToken, callbacks);
      }, 300);
    }
  }, [snapToken, autoOpen, isLoading, openSnap, onSuccess, onPending, onError, onClose]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <Icons.Loader2 size={48} className="animate-spin text-blue-500" />
            <p className="text-lg font-semibold text-slate-900">
              Memuat pembayaran...
            </p>
            <p className="text-sm text-slate-500">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Icons.AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Terjadi Kesalahan</h3>
            <p className="text-sm text-slate-600 text-center">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Snap will render in its own popup
  return null;
}

// ============================================================================
// MANUAL TRIGGER COMPONENT
// ============================================================================

interface MidtransSnapButtonProps {
  snapToken: string;
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function MidtransSnapButton({
  snapToken,
  onSuccess,
  onPending,
  onError,
  onClose,
  children,
  className = '',
}: MidtransSnapButtonProps) {
  const { openSnap } = useMidtrans();

  const handleClick = () => {
    const callbacks: SnapCallbacks = {
      onSuccess,
      onPending,
      onError,
      onClose,
    };

    openSnap(snapToken, callbacks);
  };

  return (
    <button onClick={handleClick} className={className}>
      {children || 'Bayar Sekarang'}
    </button>
  );
}
