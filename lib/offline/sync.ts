// ============================================================================
// OFFLINE SYNC MANAGER
// ============================================================================
// File: lib/offline/sync.ts
// Description: Syncs offline queue with Supabase when online
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

import {
  getPendingQueueItems,
  updateQueueItem,
  markAsSynced,
  markAsFailed,
  type OfflineQueueItem,
} from './queue';
import { createOrder } from '@/lib/db';
import { syncLogger } from '@/lib/utils/logger';

/**
 * Sync status
 */
export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  failedCount: number;
}

/**
 * Sync manager class
 */
class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Start auto-sync (runs every 30 seconds when online)
   */
  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      syncLogger.info('Auto-sync already running');
      return;
    }

    syncLogger.info('Starting auto-sync...');
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncQueue();
      }
    }, intervalMs);

    // Also sync immediately
    if (navigator.onLine) {
      this.syncQueue();
    }
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      syncLogger.info('Auto-sync stopped');
    }
  }

  /**
   * Sync offline queue with server
   */
  async syncQueue(): Promise<void> {
    if (this.isSyncing) {
      syncLogger.info('Sync already in progress, skipping...');
      return;
    }

    if (!navigator.onLine) {
      syncLogger.info('Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const pendingItems = await getPendingQueueItems();

      if (pendingItems.length === 0) {
        syncLogger.info('No pending items to sync');
        return;
      }

      syncLogger.info(`Syncing ${pendingItems.length} pending items...`);

      for (const item of pendingItems) {
        try {
          // Mark as syncing
          item.status = 'syncing';
          await updateQueueItem(item);

          // Process based on action type
          await this.processQueueItem(item);

          // Mark as synced and remove
          if (item.id) {
            await markAsSynced(item.id);
          }
        } catch (error: any) {
          syncLogger.error(`Failed to sync item ${item.id}`, error);
          await markAsFailed(item, error.message || 'Unknown error');
        }
      }

      syncLogger.info('Sync completed');
    } catch (error) {
      syncLogger.error('Sync failed', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.action) {
      case 'create_order':
        await this.syncCreateOrder(item);
        break;

      case 'update_stock':
        await this.syncUpdateStock(item);
        break;

      case 'create_production':
        await this.syncCreateProduction(item);
        break;

      default:
        syncLogger.info(`Unknown action: ${item.action}`);
    }
  }

  /**
   * Sync create order
   */
  private async syncCreateOrder(item: OfflineQueueItem): Promise<void> {
    const { orderData, items, outletId } = item.data;

    const result = await createOrder(orderData, items, outletId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create order');
    }

    syncLogger.info(`Order synced: ${result.data?.order_number}`);
  }

  /**
   * Sync update stock
   */
  private async syncUpdateStock(item: OfflineQueueItem): Promise<void> {
    const { productId, quantity, locationId } = item.data;

    const response = await fetch('/api/inventory/update-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, locationId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update stock');
    }

    syncLogger.info(`Stock updated: ${productId}`);
  }

  /**
   * Sync create production
   */
  private async syncCreateProduction(item: OfflineQueueItem): Promise<void> {
    const productionData = item.data;

    const response = await fetch('/api/production/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create production');
    }

    syncLogger.info('Production synced');
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const pendingItems = await getPendingQueueItems();
    const failedItems = pendingItems.filter((i) => i.status === 'failed');

    return {
      isSyncing: this.isSyncing,
      lastSyncTime: null, // TODO: Store last sync time
      pendingCount: pendingItems.length,
      failedCount: failedItems.length,
    };
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private async notifyListeners() {
    const status = await this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

/**
 * Initialize sync manager (call this in app startup)
 */
export function initSyncManager() {
  if (typeof window === 'undefined') return;

  // Start auto-sync
  syncManager.startAutoSync();

  // Listen for online/offline events
  window.addEventListener('online', () => {
    syncLogger.info('Back online, syncing...');
    syncManager.syncQueue();
  });

  window.addEventListener('offline', () => {
    syncLogger.info('Offline mode activated');
  });

  // Sync on page visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) {
      syncManager.syncQueue();
    }
  });

  syncLogger.info('Sync manager initialized');
}
