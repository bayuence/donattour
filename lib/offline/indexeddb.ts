// ============================================================================
// INDEXEDDB UTILITIES
// ============================================================================
// File: lib/offline/indexeddb.ts
// Description: IndexedDB wrapper for offline data storage
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

import { syncLogger } from '@/lib/utils/logger';

/**
 * IndexedDB Database Configuration
 */
const DB_NAME = 'donattour_offline_db';
const DB_VERSION = 1;

/**
 * Store names for different data types
 */
export const STORES = {
  QUERY_CACHE: 'query_cache',           // TanStack Query cache
  OFFLINE_QUEUE: 'offline_queue',       // Pending mutations
  TRANSACTIONS: 'offline_transactions', // Offline transactions
  PRODUCTS: 'offline_products',         // Product cache
  SETTINGS: 'offline_settings',         // App settings
} as const;

/**
 * Initialize IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      syncLogger.error('IndexedDB failed to open', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      syncLogger.success('IndexedDB opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      syncLogger.log('IndexedDB upgrade needed, creating stores...');

      // Create Query Cache store
      if (!db.objectStoreNames.contains(STORES.QUERY_CACHE)) {
        db.createObjectStore(STORES.QUERY_CACHE);
        syncLogger.success('Created store: ' + STORES.QUERY_CACHE);
      }

      // Create Offline Queue store with auto-increment key
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
        syncLogger.success('Created store: ' + STORES.OFFLINE_QUEUE);
      }

      // Create Transactions store
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORES.TRANSACTIONS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        txStore.createIndex('timestamp', 'timestamp', { unique: false });
        txStore.createIndex('synced', 'synced', { unique: false });
        syncLogger.success('Created store: ' + STORES.TRANSACTIONS);
      }

      // Create Products store
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, {
          keyPath: 'id',
        });
        productStore.createIndex('updated_at', 'updated_at', { unique: false });
        syncLogger.success('Created store: ' + STORES.PRODUCTS);
      }

      // Create Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
        syncLogger.success('Created store: ' + STORES.SETTINGS);
      }
    };
  });
}

/**
 * Generic get operation
 */
export async function getFromStore<T>(
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic set operation
 */
export async function setInStore<T>(
  storeName: string,
  key: IDBValidKey,
  value: T
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete operation
 */
export async function deleteFromStore(
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add item to store (for auto-increment stores)
 */
export async function addToStore<T>(
  storeName: string,
  value: T
): Promise<IDBValidKey> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update item in store
 */
export async function updateInStore<T>(
  storeName: string,
  value: T
): Promise<IDBValidKey> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Query items by index
 */
export async function queryByIndex<T>(
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(query);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count items in store
 */
export async function countInStore(storeName: string): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'indexedDB' in window;
}

/**
 * Get database size estimate (if available)
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
} | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      usagePercent,
    };
  } catch (error) {
    console.error('Failed to get storage estimate:', error);
    return null;
  }
}
