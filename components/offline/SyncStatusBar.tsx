'use client';

// ============================================================================
// OFFLINE SYNC STATUS BAR COMPONENT
// ============================================================================
// File: components/offline/SyncStatusBar.tsx
// Description: Floating panel displaying storage status, pending sync queue 
//              counts, and triggering manual sync operations.
// Version: 1.0
// Date: 2026-06-26
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useOfflineStatus } from '@/lib/hooks/use-offline-mutation';
import { syncManager } from '@/lib/offline/sync';
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { getStorageEstimate } from '@/lib/offline/indexeddb';

export function SyncStatusBar() {
  const { isOnline, isSyncing, pendingCount, failedCount } = useOfflineStatus();
  const [storage, setStorage] = useState<{ usagePercent: number; usageMb: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      getStorageEstimate().then((est) => {
        if (est) {
          setStorage({
            usagePercent: Math.round(est.usagePercent),
            usageMb: Math.round(est.usage / (1024 * 1024)),
          });
        }
      });
    }
  }, [pendingCount, isSyncing]);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    await syncManager.syncQueue();
  };

  // If online, no pending queue, and not syncing, keep it hidden
  if (isOnline && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md border border-orange-200 shadow-xl rounded-2xl overflow-hidden p-4 select-none animate-in slide-in-from-bottom-5 duration-300 font-sans">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <Wifi className="h-3.5 w-3.5" />
              Online
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              Offline
            </div>
          )}
          
          {isSyncing && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse border border-blue-100">
              Syncing...
            </span>
          )}
        </div>

        {storage && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Database className="h-3 w-3" />
            <span>Storage: {storage.usageMb}MB</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Sync Info */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              {failedCount > 0 ? (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {failedCount} Gagal Kirim
                </span>
              ) : pendingCount > 0 ? (
                <span className="text-orange-600 flex items-center gap-1">
                  <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                  {pendingCount} Transaksi Tertunda
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Semua Data Tersinkronisasi
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500">
              {failedCount > 0
                ? 'Beberapa transaksi gagal terkirim. Tekan sinkronisasi manual.'
                : pendingCount > 0
                ? 'Transaksi disimpan aman di komputer ini.'
                : 'Data lokal Anda sinkron dengan server.'}
            </p>
          </div>

          {isOnline && pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center justify-center p-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md disabled:opacity-50 transition-all active:scale-95"
              title="Sinkronisasi Sekarang"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Progress Bar (Visual only when syncing or pending) */}
        {pendingCount > 0 && (
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(10, (1 - pendingCount / (pendingCount + 5)) * 100))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
