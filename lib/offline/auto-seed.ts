// ============================================================================
// AUTO SEED OFFLINE DATABASE
// ============================================================================
// File: lib/offline/auto-seed.ts
// Description: Automatically download and cache critical data when online
// Version: 1.0
// Date: 2026-06-27
// ============================================================================

import { 
  cacheProductsOffline, 
  cachePaymentMethodsOffline,
  cacheOutletsOffline,
  cacheReceiptSettingsOffline 
} from './offline-dal';

/**
 * Check if offline database has been seeded
 */
export async function isOfflineSeeded(): Promise<boolean> {
  try {
    const { getPGLite } = await import('@/lib/db/pglite-client');
    const db = await getPGLite();
    if (!db) return false;
    
    // Check if products table has data
    const result = await db.query('SELECT COUNT(*) as count FROM products');
    const count = parseInt(result.rows[0]?.count || '0');
    
    return count > 0;
  } catch (error) {
    console.error('[AUTO-SEED] Error checking seed status:', error);
    return false;
  }
}

/**
 * Auto-seed offline database with critical data
 */
export async function autoSeedOfflineDatabase(): Promise<void> {
  // Only run if online
  if (typeof window === 'undefined' || !navigator.onLine) {
    console.log('[AUTO-SEED] Skipped - device is offline');
    return;
  }

  // Check if already seeded
  const seeded = await isOfflineSeeded();
  if (seeded) {
    console.log('[AUTO-SEED] ✅ Database already seeded');
    return;
  }

  console.log('[AUTO-SEED] 🌱 Starting auto-seed...');

  try {
    // Fetch critical data from API
    const [productsRes, outletsRes] = await Promise.all([
      fetch('/api/products?all=true'),
      fetch('/api/outlets?all=true'),
    ]);

    if (!productsRes.ok || !outletsRes.ok) {
      throw new Error('Failed to fetch seed data');
    }

    const productsData = await productsRes.json();
    const outletsData = await outletsRes.json();

    const products = productsData.data || productsData.products || [];
    const outlets = outletsData.data || outletsData.outlets || [];

    // Cache to PGLite
    await Promise.all([
      cacheProductsOffline(products),
      cacheOutletsOffline(outlets),
    ]);

    console.log('[AUTO-SEED] ✅ Successfully seeded offline database');
    console.log(`  - ${products.length} products`);
    console.log(`  - ${outlets.length} outlets`);

    // Mark as seeded in localStorage
    localStorage.setItem('offline_seeded', 'true');
    localStorage.setItem('offline_seeded_at', new Date().toISOString());

  } catch (error) {
    console.error('[AUTO-SEED] ❌ Failed to seed database:', error);
  }
}

/**
 * Force re-seed (clear and re-download all data)
 */
export async function forceReseedOfflineDatabase(): Promise<void> {
  console.log('[AUTO-SEED] 🔄 Force re-seed...');
  
  // Clear seeded flag
  localStorage.removeItem('offline_seeded');
  
  // Clear PGLite tables
  try {
    const { getPGLite } = await import('@/lib/db/pglite-client');
    const db = await getPGLite();
    if (db) {
      await db.query('DELETE FROM products');
      await db.query('DELETE FROM outlets');
      await db.query('DELETE FROM payment_methods');
      console.log('[AUTO-SEED] ✅ Cleared existing data');
    }
  } catch (error) {
    console.error('[AUTO-SEED] Error clearing data:', error);
  }
  
  // Re-seed
  await autoSeedOfflineDatabase();
}

/**
 * Get seed status info
 */
export async function getSeedStatus(): Promise<{
  seeded: boolean;
  seededAt?: string;
  productsCount: number;
  outletsCount: number;
}> {
  const seeded = await isOfflineSeeded();
  const seededAt = localStorage.getItem('offline_seeded_at') || undefined;
  
  let productsCount = 0;
  let outletsCount = 0;
  
  try {
    const { getPGLite } = await import('@/lib/db/pglite-client');
    const db = await getPGLite();
    if (db) {
      const productsResult = await db.query('SELECT COUNT(*) as count FROM products');
      const outletsResult = await db.query('SELECT COUNT(*) as count FROM outlets');
      
      productsCount = parseInt(productsResult.rows[0]?.count || '0');
      outletsCount = parseInt(outletsResult.rows[0]?.count || '0');
    }
  } catch (error) {
    console.error('[AUTO-SEED] Error getting counts:', error);
  }
  
  return {
    seeded,
    seededAt,
    productsCount,
    outletsCount,
  };
}


/**
 * Preload all critical data for offline usage
 * This can be called without authentication for public data
 */
export async function preloadPublicData(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    console.log('[PRELOAD] Skipped - device is offline');
    return;
  }

  console.log('[PRELOAD] 🌱 Starting public data preload...');

  try {
    // Fetch public data endpoints
    const endpoints = [
      { url: '/api/products?all=true', key: 'products', public: true },
      { url: '/api/outlets?all=true', key: 'outlets', public: true },
      { url: '/api/payment-methods', key: 'payment_methods', public: true },
      { url: '/api/receipt-settings', key: 'receipt_settings', public: true },
      { url: '/api/menu-categories', key: 'menu_categories', public: true },
      { url: '/api/donat-variants', key: 'donat_variants', public: true },
    ];

    const results = await Promise.allSettled(
      endpoints.map(async ({ url, key, public: isPublic }) => {
        try {
          // Skip if not public and user not authenticated
          if (!isPublic && typeof window !== 'undefined') {
            const token = localStorage.getItem('supabase.auth.token');
            if (!token) {
              console.log(`[PRELOAD] Skipping ${key} - not authenticated`);
              return { key, success: false, reason: 'not_authenticated' };
            }
          }

          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          const items = data.data || data[key] || [];

          console.log(`[PRELOAD] ✅ ${key}: ${items.length} items`);
          return { key, success: true, count: items.length };
        } catch (error) {
          console.error(`[PRELOAD] ❌ Failed ${key}:`, error);
          return { key, success: false, error: error.message };
        }
      })
    );

    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    );
    
    console.log(`[PRELOAD] Completed: ${successful.length}/${endpoints.length} successful`);
    
    // Store in cache for service worker
    if (typeof caches !== 'undefined') {
      const cache = await caches.open('donattour-public-data');
      
      await Promise.all(
        endpoints.map(async ({ url }) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
            }
          } catch (error) {
            // Silently fail for cache
          }
        })
      );
    }

    return;
  } catch (error) {
    console.error('[PRELOAD] Preload failed:', error);
  }
}

/**
 * Check if public data is available offline
 */
export async function isPublicDataAvailable(): Promise<boolean> {
  try {
    // Check if we have basic data cached
    const cache = await caches.open('donattour-public-data');
    const urls = [
      '/api/products?all=true',
      '/api/outlets?all=true',
    ];

    const responses = await Promise.all(
      urls.map(url => cache.match(url))
    );

    const allAvailable = responses.every(response => response !== undefined);
    return allAvailable;
  } catch (error) {
    console.error('[PRELOAD] Error checking cache:', error);
    return false;
  }
}

/**
 * Get cached public data
 */
export async function getCachedPublicData<T>(endpoint: string): Promise<T | null> {
  try {
    const cache = await caches.open('donattour-public-data');
    const response = await cache.match(endpoint);
    
    if (response) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error(`[PRELOAD] Error getting cached data for ${endpoint}:`, error);
  }
  
  return null;
}