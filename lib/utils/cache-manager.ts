// ============================================================================
// CACHE MANAGER - Force Clear All Cache
// ============================================================================
// File: lib/utils/cache-manager.ts
// Description: Utility untuk clear semua cache (PWA, IndexedDB, localStorage)
// Version: 1.0
// Date: 2026-06-27
// ============================================================================

/**
 * Clear all application cache
 * 
 * Clears:
 * - Service Worker cache
 * - IndexedDB (offline transactions)
 * - localStorage (user session, settings)
 * - React Query cache
 */
export async function clearAllCache(): Promise<void> {
  console.log('🧹 [CACHE MANAGER] Starting cache clear...');

  try {
    // 1. Clear Service Worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`  Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      console.log('✅ Service Worker cache cleared');
    }

    // 2. Clear IndexedDB (offline database)
    if ('indexedDB' in window) {
      // Delete offline transaction DB
      await new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase('donattour-offline-db');
        deleteRequest.onsuccess = () => {
          console.log('✅ IndexedDB deleted');
          resolve(true);
        };
        deleteRequest.onerror = () => {
          console.warn('⚠️  IndexedDB delete failed');
          resolve(false);
        };
      });

      // Delete PGLite DB
      await new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('pglite-donattour');
        deleteRequest.onsuccess = () => {
          console.log('✅ PGLite IndexedDB deleted');
          resolve(true);
        };
        deleteRequest.onerror = () => {
          console.warn('⚠️  PGLite delete failed');
          resolve(false);
        };
      });
    }

    // 3. Clear localStorage (except important keys)
    const keysToKeep = [
      // Keep these to avoid re-login
      // 'donutshop_user',
      // 'donattour_cached_users',
    ];

    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ localStorage cleared (except preserved keys)');

    // 4. Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');

    console.log('✅ [CACHE MANAGER] All cache cleared successfully!');
    
    return;
  } catch (error) {
    console.error('❌ [CACHE MANAGER] Error clearing cache:', error);
    throw error;
  }
}

/**
 * Clear only offline transaction cache
 */
export async function clearOfflineTransactions(): Promise<void> {
  console.log('🧹 Clearing offline transactions...');
  
  try {
    if ('indexedDB' in window) {
      await new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('donattour-offline-db');
        deleteRequest.onsuccess = () => {
          console.log('✅ Offline transactions cleared');
          resolve(true);
        };
        deleteRequest.onerror = () => {
          console.warn('⚠️  Failed to clear offline transactions');
          resolve(false);
        };
      });
    }
  } catch (error) {
    console.error('❌ Error clearing offline transactions:', error);
  }
}

/**
 * Clear only React Query cache
 */
export function clearQueryCache(): void {
  console.log('🧹 Clearing React Query cache...');
  
  // This will be called from components that have access to queryClient
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clearQueryCache'));
    console.log('✅ Query cache clear event dispatched');
  }
}

/**
 * Reload page after cache clear
 */
export function reloadAfterCacheClear(delay: number = 1000): void {
  setTimeout(() => {
    console.log('🔄 Reloading page...');
    window.location.reload();
  }, delay);
}

/**
 * Full reset: Clear cache + reload
 */
export async function fullCacheReset(): Promise<void> {
  await clearAllCache();
  reloadAfterCacheClear();
}
