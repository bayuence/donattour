// ============================================================================
// AUTO SEED OFFLINE DATABASE
// ============================================================================
// File: lib/offline/auto-seed.ts
// Description: Automatically download and cache critical data when online
// Version: 1.1 - Added refreshCatalogCache for real-time product updates
// Date: 2026-06-27
// ============================================================================

import { 
  cacheProductsOffline, 
  cachePaymentMethodsOffline,
  cacheOutletsOffline,
  cacheReceiptSettingsOffline 
} from './offline-dal';

// Durasi sebelum catalog dianggap stale (10 menit)
const CATALOG_STALE_MS = 10 * 60 * 1000;

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
    const row = result.rows[0] as { count: string } | undefined;
    const count = parseInt(row?.count || '0');
    
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

  // Check if already seeded AND data masih fresh
  const seeded = await isOfflineSeeded();
  if (seeded) {
    const seededAt = localStorage.getItem('offline_seeded_at');
    const seededTime = seededAt ? new Date(seededAt).getTime() : 0;
    const ageMs = Date.now() - seededTime;
    if (ageMs < CATALOG_STALE_MS) {
      console.log(`[AUTO-SEED] ✅ Database seeded & fresh (${Math.round(ageMs / 1000)}s ago)`);
      return;
    }
    console.log(`[AUTO-SEED] ⏰ Data stale (${Math.round(ageMs / 60000)}min), refreshing...`);
  }

  console.log('[AUTO-SEED] 🌱 Starting auto-seed...');

  try {
    // Fetch critical data from API — bypass cache with timestamp
    const ts = Date.now();
    const [productsRes, outletsRes] = await Promise.all([
      fetch(`/api/products?all=true&_t=${ts}`, { cache: 'no-store' }),
      fetch(`/api/outlets?all=true&_t=${ts}`, { cache: 'no-store' }),
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
 * Refresh catalog cache (products + outlets) dari server.
 * Dipanggil setelah admin update/tambah produk atau kategori
 * agar kasir PWA langsung mendapat data terbaru.
 */
export async function refreshCatalogCache(): Promise<{ success: boolean; productsCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, productsCount: 0 };
  }

  try {
    const ts = Date.now();
    const [productsRes, outletsRes] = await Promise.all([
      fetch(`/api/products?all=true&_t=${ts}`, { cache: 'no-store' }),
      fetch(`/api/outlets?all=true&_t=${ts}`, { cache: 'no-store' }),
    ]);

    const productsData = productsRes.ok ? await productsRes.json() : { data: [] };
    const outletsData = outletsRes.ok ? await outletsRes.json() : { data: [] };

    const products = productsData.data || productsData.products || [];
    const outlets = outletsData.data || outletsData.outlets || [];

    await Promise.all([
      cacheProductsOffline(products),
      cacheOutletsOffline(outlets),
    ]);

    // Update timestamp agar auto-seed tahu data baru
    localStorage.setItem('offline_seeded', 'true');
    localStorage.setItem('offline_seeded_at', new Date().toISOString());

    // Invalidasi Browser Cache API untuk endpoint produk
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('donattour-public-data');
        await Promise.all([
          cache.delete('/api/products?all=true'),
          cache.delete('/api/outlets?all=true'),
        ]);
      } catch (_) { /* ignore */ }
    }

    // ✅ Broadcast ke semua tab (kasir di hosted domain) agar reload data
    const updateKey = `catalog_updated_at`;
    localStorage.setItem(updateKey, new Date().toISOString());
    try {
      const bc = new BroadcastChannel('donattour_catalog');
      bc.postMessage({ type: 'CATALOG_UPDATED', ts: Date.now() });
      bc.close();
    } catch (_) { /* browser lama tidak support BroadcastChannel */ }

    console.log(`[CATALOG-REFRESH] ✅ Refreshed ${products.length} products, ${outlets.length} outlets`);
    return { success: true, productsCount: products.length };
  } catch (error) {
    console.error('[CATALOG-REFRESH] ❌ Failed:', error);
    return { success: false, productsCount: 0 };
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
      
      productsCount = parseInt((productsResult.rows[0] as { count: string } | undefined)?.count || '0');
      outletsCount = parseInt((outletsResult.rows[0] as { count: string } | undefined)?.count || '0');
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
          const msg = error instanceof Error ? error.message : String(error);
          return { key, success: false, error: msg };
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