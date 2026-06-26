import { useEffect, useState, useCallback } from 'react';

interface SyncResult {
  key: string;
  success: boolean;
  count?: number;
  error?: string;
}

interface PreloadResults {
  public: { success: number; total: number };
  private: { success: number; total: number };
  assets: { success: number; total: number };
}

interface ServiceWorkerState {
  isSupported: boolean;
  isActive: boolean;
  isInstalled: boolean;
  lastSync?: string;
  syncResults?: SyncResult[];
  preloadResults?: PreloadResults;
  canSync: boolean;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isActive: false,
    isInstalled: false,
    canSync: false,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check service worker support and status
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    setState(prev => ({ ...prev, isSupported }));

    if (!isSupported) return;

    async function checkSW() {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        
        if (reg) {
          setRegistration(reg);
          setState(prev => ({
            ...prev,
            isInstalled: true,
            isActive: !!reg.active,
            canSync: 'sync' in reg,
          }));

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[useServiceWorker] Message from SW:', event.data);
            
            switch (event.data.type) {
              case 'SYNC_COMPLETED':
                setState(prev => ({
                  ...prev,
                  lastSync: event.data.timestamp,
                  syncResults: event.data.results,
                }));
                break;
              
              case 'PRELOAD_COMPLETED':
                setState(prev => ({
                  ...prev,
                  preloadResults: event.data.results,
                }));
                break;
            }
          });
        }
      } catch (error) {
        console.error('[useServiceWorker] Error checking service worker:', error);
      }
    }

    checkSW();

    // Listen for controller changes
    const handleControllerChange = () => {
      checkSW();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Register background sync
  const registerSync = useCallback(async (tag: string = 'donattour-sync') => {
    if (!registration || !('sync' in registration)) {
      console.error('[useServiceWorker] Sync not supported');
      return false;
    }

    try {
      await registration.sync.register(tag);
      console.log('[useServiceWorker] Sync registered:', tag);
      return true;
    } catch (error) {
      console.error('[useServiceWorker] Failed to register sync:', error);
      return false;
    }
  }, [registration]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!state.canSync) {
      console.error('[useServiceWorker] Background sync not available');
      return false;
    }

    try {
      await registerSync();
      return true;
    } catch (error) {
      console.error('[useServiceWorker] Failed to trigger sync:', error);
      return false;
    }
  }, [state.canSync, registerSync]);

  // Trigger preload
  const triggerPreload = useCallback(async () => {
    if (!registration || !registration.active) {
      console.error('[useServiceWorker] No active service worker');
      return false;
    }

    try {
      registration.active.postMessage({
        type: 'PRELOAD_OFFLINE_DATA',
      });
      return true;
    } catch (error) {
      console.error('[useServiceWorker] Failed to trigger preload:', error);
      return false;
    }
  }, [registration]);

  // Get cached data
  const getCachedData = useCallback(async <T,>(url: string): Promise<T | null> => {
    try {
      const cache = await caches.open('donattour-v1');
      const response = await cache.match(url);
      
      if (response) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('[useServiceWorker] Error getting cached data:', error);
    }
    
    return null;
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      
      // Clear service worker registration
      if (registration) {
        await registration.unregister();
      }
      
      // Clear localStorage cache flags
      localStorage.removeItem('offline_seeded');
      localStorage.removeItem('offline_seeded_at');
      
      setState(prev => ({
        ...prev,
        isInstalled: false,
        isActive: false,
      }));
      
      return true;
    } catch (error) {
      console.error('[useServiceWorker] Error clearing cache:', error);
      return false;
    }
  }, [registration]);

  // Check if specific URL is cached
  const isCached = useCallback(async (url: string): Promise<boolean> => {
    try {
      const cache = await caches.open('donattour-v1');
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      console.error('[useServiceWorker] Error checking cache:', error);
      return false;
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    try {
      const cache = await caches.open('donattour-v1');
      const keys = await cache.keys();
      
      const stats = {
        totalEntries: keys.length,
        apiEndpoints: keys.filter(key => key.url.includes('/api/')).length,
        assets: keys.filter(key => !key.url.includes('/api/')).length,
        totalSize: 0, // Would need Response body to calculate
      };
      
      return stats;
    } catch (error) {
      console.error('[useServiceWorker] Error getting cache stats:', error);
      return null;
    }
  }, []);

  return {
    ...state,
    registration,
    registerSync,
    triggerSync,
    triggerPreload,
    getCachedData,
    clearCache,
    isCached,
    getCacheStats,
  };
}