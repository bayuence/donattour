'use client';

import { useEffect, useState } from 'react';

/**
 * OfflineDataManager - Manages offline data caching
 * Now replaced by OfflinePreloader which handles comprehensive preloading
 * This component can be removed or kept for backwards compatibility
 */
export function OfflineDataManager() {
  useEffect(() => {
    // Service worker is now managed by OfflinePreloader
    // This component kept for compatibility only
    if (typeof window === 'undefined') return;
    
    console.log('[OfflineDataManager] Deprecated - using OfflinePreloader instead');
  }, []);

  return null;
}