// ============================================================================
// TANSTACK QUERY PERSISTER
// ============================================================================
// File: lib/offline/persister.ts
// Description: IndexedDB persister for TanStack Query cache
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { getFromStore, setInStore, deleteFromStore, STORES } from './indexeddb';
import { syncLogger } from '@/lib/utils/logger';

/**
 * Create IndexedDB persister for TanStack Query
 * 
 * This persister stores the entire query cache in IndexedDB,
 * allowing the app to work offline and restore state on reload.
 */
export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await setInStore(STORES.QUERY_CACHE, idbValidKey, client);
        syncLogger.success('Query cache persisted to IndexedDB');
      } catch (error) {
        syncLogger.error('Failed to persist query cache', error);
      }
    },
    restoreClient: async () => {
      try {
        const client = await getFromStore<PersistedClient>(
          STORES.QUERY_CACHE,
          idbValidKey
        );
        if (client) {
          syncLogger.success('Query cache restored from IndexedDB');
        }
        return client;
      } catch (error) {
        syncLogger.error('Failed to restore query cache', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await deleteFromStore(STORES.QUERY_CACHE, idbValidKey);
        syncLogger.success('Query cache removed from IndexedDB');
      } catch (error) {
        syncLogger.error('Failed to remove query cache', error);
      }
    },
  };
}

/**
 * Throttle function to limit how often cache is persisted
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeout = null;
      }, wait);
    }
  };
}
