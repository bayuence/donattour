'use client';

import { useEffect, useRef } from 'react';

/**
 * OfflinePreloader - Simplified to prevent reload loops
 * Now just registers SW silently without auto-dialog or reloads
 */
export function OfflinePreloader() {
  const setupDoneRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate setup
    if (setupDoneRef.current) {
      console.log('[OfflinePreloader] Already setup, skipping');
      return;
    }
    setupDoneRef.current = true;

    async function setupSW() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('[OfflinePreloader] Service Worker not supported');
        return;
      }

      try {
        // Register service worker silently (no reload on update!)
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          updateViaCache: 'none',
          // Do NOT trigger skipWaiting or reload
        });

        console.log('[OfflinePreloader] ✅ Service Worker registered silently');

        // Just log messages, don't do anything that causes reload
        if (navigator.serviceWorker) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'PRELOAD_PAGES_COMPLETE') {
              console.log('[OfflinePreloader] Pages cached:', event.data.successCount);
            } else if (event.data.type === 'PRELOAD_APIS_COMPLETE') {
              console.log('[OfflinePreloader] APIs cached:', event.data.successCount);
            }
          });
        }

        // NO auto-preload dialog
        // NO automatic reload
        // User initiates preload manually from Settings → Offline Management
        
      } catch (error) {
        console.error('[OfflinePreloader] Setup failed:', error);
      }
    }

    setupSW();
  }, []);

  // Return null - no UI, no reload triggers
  return null;
}