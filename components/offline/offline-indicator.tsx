// ============================================================================
// OFFLINE INDICATOR COMPONENT
// ============================================================================
// File: components/offline/offline-indicator.tsx
// Description: Shows online/offline status and pending sync count
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

'use client';

import React from 'react';
import { useOfflineStatus } from '@/lib/hooks/use-offline-mutation';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Offline indicator component
 * 
 * Shows:
 * - Online/offline status
 * - Pending sync count
 * - Sync in progress indicator
 * - Failed sync count
 */
export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, failedCount } = useOfflineStatus();

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    // Everything is good, show minimal indicator (icon only)
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <Wifi className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Online/Offline Status */}
      <div
        className={cn(
          'flex items-center gap-2 text-xs font-medium',
          isOnline ? 'text-green-600' : 'text-orange-600'
        )}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
      </div>

      {/* Syncing Indicator */}
      {isSyncing && (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </div>
      )}

      {/* Pending Count */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-orange-600">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
            <span className="text-[10px] font-bold">{pendingCount}</span>
          </div>
          <span className="hidden sm:inline">pending</span>
        </div>
      )}

      {/* Failed Count */}
      {failedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{failedCount} failed</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline badge (for mobile)
 */
export function OfflineBadge() {
  const { isOnline, pendingCount } = useOfflineStatus();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-lg',
        isOnline
          ? 'bg-orange-100 text-orange-700'
          : 'bg-red-100 text-red-700'
      )}
    >
      {isOnline ? (
        <RefreshCw className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>
        {isOnline ? `${pendingCount} pending` : 'Offline mode'}
      </span>
    </div>
  );
}
