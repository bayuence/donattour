/**
 * PaymentStatus Component
 * 
 * Component untuk display payment status dengan auto-refresh
 */

'use client';

import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useMidtrans, useMidtransStatusPolling } from '../hooks/useMidtrans';
import type { CheckStatusResponse, PaymentStatus } from '../types';
import {
  getPaymentStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusIcon,
  getPaymentTypeLabel,
  getPaymentTypeIcon,
  formatDate,
  formatRupiah,
} from '../utils/formatter';

interface PaymentStatusProps {
  orderId: string;
  onStatusChange?: (status: CheckStatusResponse) => void;
  autoRefresh?: boolean;
  showDetails?: boolean;
}

export function PaymentStatusDisplay({
  orderId,
  onStatusChange,
  autoRefresh = true,
  showDetails = true,
}: PaymentStatusProps) {
  const { checkStatus } = useMidtrans();
  const [statusData, setStatusData] = useState<CheckStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup polling
  const { startPolling, stopPolling, isPolling } = useMidtransStatusPolling(
    orderId,
    (status) => {
      setStatusData(status);
      onStatusChange?.(status);
    }
  );

  // Initial load
  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      const status = await checkStatus(orderId);
      if (status) {
        setStatusData(status);
        onStatusChange?.(status);
      }
      setLoading(false);
    };

    loadStatus();
  }, [orderId, checkStatus, onStatusChange]);

  // Start polling if autoRefresh enabled
  useEffect(() => {
    if (autoRefresh && statusData?.status === 'pending') {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoRefresh, statusData?.status, startPolling, stopPolling]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icons.Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">Tidak dapat memuat status pembayaran</p>
      </div>
    );
  }

  const statusColor = getPaymentStatusColor(statusData.status);
  const statusIcon = getPaymentStatusIcon(statusData.status);
  const statusLabel = getPaymentStatusLabel(statusData.status);

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-center">
        <div
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${statusColor} font-semibold text-lg`}
        >
          <span className="text-2xl">{statusIcon}</span>
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Polling Indicator */}
      {isPolling && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Icons.RefreshCw size={12} className="animate-spin" />
          <span>Memeriksa status pembayaran...</span>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Order ID:</span>
            <span className="font-mono font-semibold text-slate-900">{statusData.orderId}</span>
          </div>

          {statusData.paymentType && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Metode Pembayaran:</span>
              <div className="flex items-center gap-2">
                <span>{getPaymentTypeIcon(statusData.paymentType)}</span>
                <span className="font-semibold text-slate-900">
                  {getPaymentTypeLabel(statusData.paymentType)}
                </span>
              </div>
            </div>
          )}

          {statusData.paymentMethodDetail && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Detail:</span>
              <span className="font-semibold text-slate-900">
                {statusData.paymentMethodDetail}
              </span>
            </div>
          )}

          {statusData.transactionTime && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Waktu Transaksi:</span>
              <span className="font-semibold text-slate-900">
                {formatDate(statusData.transactionTime)}
              </span>
            </div>
          )}

          {statusData.paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Dibayar Pada:</span>
              <span className="font-semibold text-green-600">
                {formatDate(statusData.paidAt)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIMPLE STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusColor = getPaymentStatusColor(status);
  const statusIcon = getPaymentStatusIcon(status);
  const statusLabel = getPaymentStatusLabel(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${statusColor} font-semibold ${sizeClasses[size]}`}
    >
      <span>{statusIcon}</span>
      <span>{statusLabel}</span>
    </span>
  );
}
