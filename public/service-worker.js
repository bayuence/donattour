// ============================================================================
// DONATTOUR - COMPREHENSIVE OFFLINE SERVICE WORKER
// ============================================================================
// File: public/service-worker.js
// Description: Service Worker lengkap untuk offline functionality semua menu
// Version: 2.0 - Full App Offline Support
// ============================================================================

const SW_VERSION = '2026.06.27.0232';
const CACHE_VERSION = 'donattour-v2';
const CACHE_NAMES = {
  APP: `${CACHE_VERSION}-app`,
  API: `${CACHE_VERSION}-api`,
  ASSETS: `${CACHE_VERSION}-assets`,
  PAGES: `${CACHE_VERSION}-pages`,
};

// Semua route yang perlu di-cache
const CRITICAL_PAGES = [
  '/',
  '/dashboard',
  '/dashboard/kasir',
  '/dashboard/inventory-status',
  '/dashboard/laporan',
  '/dashboard/laporan-harian-outlet',
  '/dashboard/input-produksi',
  '/dashboard/input-pengeluaran',
  '/dashboard/transaksi',
  '/dashboard/transaksi-editor',
  '/dashboard/kelola-produk',
  '/dashboard/kelola-outlet',
  '/dashboard/kelola-karyawan',
  '/dashboard/otr',
  '/dashboard/kelola-otr',
  '/dashboard/online',
  '/dashboard/analytics',
  '/dashboard/expense-analytics',
  '/dashboard/presensi-manajemen',
  '/dashboard/riwayat-produksi',
  '/dashboard/closing',
  '/dashboard/reports',
  '/dashboard/pengeluaran-outlet',
  '/dashboard/pengaturan',
];

// Semua API endpoints yang perlu di-cache
const CRITICAL_APIS = [
  '/api/products?all=true',
  '/api/outlets?all=true',
  '/api/payment-methods',
  '/api/receipt-settings',
  '/api/menu-categories',
  '/api/donat-variants',
  '/api/employees?limit=1000',
  '/api/employees/active',
  '/api/transaction-types',
  '/api/expense-categories',
  '/api/cost-types',
  '/api/otr-types',
  '/api/roles',
  '/api/permissions',
  '/api/shifts',
  '/api/production-status',
];

// Assets penting untuk offline
const CRITICAL_ASSETS = [
  '/manifest.json',
  '/logo-donattour.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ============================================================================
// INSTALL EVENT - Cache critical resources
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW v' + SW_VERSION + '] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache critical pages
        const appCache = await caches.open(CACHE_NAMES.APP);
        console.log('[SW] Caching critical pages...');
        
        // Cache halaman utama terlebih dahulu
        const pagesToCache = ['/'];
        
        for (const page of pagesToCache) {
          try {
            const response = await fetch(page);
            if (response.ok) {
              await appCache.put(page, response.clone());
              console.log(`[SW] ✅ Cached page: ${page}`);
            }
          } catch (error) {
            console.log(`[SW] ⚠️ Failed to cache page: ${page}`);
          }
        }
        
        // Cache static assets
        const assetCache = await caches.open(CACHE_NAMES.ASSETS);
        for (const asset of CRITICAL_ASSETS) {
          try {
            const response = await fetch(asset);
            if (response.ok) {
              await assetCache.put(asset, response.clone());
              console.log(`[SW] ✅ Cached asset: ${asset}`);
            }
          } catch (error) {
            console.log(`[SW] ⚠️ Failed to cache asset: ${asset}`);
          }
        }
        
        console.log('[SW] Install complete');
      } catch (error) {
        console.error('[SW] Install failed:', error);
      }
    })()
  );
  
  // Do NOT call skipWaiting() to prevent reload loops
  // self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          // Delete old versions
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
      
      console.log('[SW] Activation complete');
    })()
  );
  
  // Do NOT claim clients immediately to prevent reload loops
  // self.clients.claim();
});

// ============================================================================
// FETCH EVENT - Network first with offline fallback
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle HTML pages (navigation)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handlePageRequest(request));
    return;
  }
  
  // Handle assets
  event.respondWith(handleAssetRequest(request));
});

// ============================================================================
// Handle API Requests - Network first, then cache
// ============================================================================
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.API);
      cache.put(request, networkResponse.clone());
      console.log(`[SW] 🌐 API from network (cached): ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] ❌ Network failed for ${request.url}, trying cache...`);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log(`[SW] 📦 API from cache: ${request.url}`);
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Data tidak tersedia. Pastikan Anda pernah membuka halaman ini saat online.',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ============================================================================
// Handle Page Requests - Cache first for offline navigation
// ============================================================================
async function handlePageRequest(request) {
  try {
    // Check cache first for faster offline navigation
    let cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Return from cache but fetch fresh version in background
      if (navigator.onLine) {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const pageCache = await caches.open(CACHE_NAMES.PAGES);
            pageCache.put(request, networkResponse.clone());
            console.log(`[SW] 🔄 Updated cached page: ${request.url}`);
          }
        } catch (error) {
          // Silently fail - cache is good enough
        }
      }
      
      return cachedResponse;
    }
    
    // Not in cache, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache new pages
      const pageCache = await caches.open(CACHE_NAMES.PAGES);
      pageCache.put(request, networkResponse.clone());
      console.log(`[SW] 🌐 Page from network (cached): ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] ❌ Failed to load page: ${request.url}`);
    
    // Try to return a cached page
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mode Offline - Donattour</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #333;
            }
            
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              padding: 40px;
              max-width: 500px;
              text-align: center;
            }
            
            .icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              font-size: 40px;
            }
            
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 10px;
            }
            
            p {
              color: #6b7280;
              font-size: 14px;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            
            .tips {
              background: #fef3c7;
              border-left: 4px solid #f97316;
              padding: 15px;
              border-radius: 8px;
              text-align: left;
              font-size: 13px;
              color: #92400e;
            }
            
            .tips h3 {
              margin-bottom: 8px;
              font-size: 14px;
            }
            
            .tips ul {
              list-style: none;
              padding-left: 0;
            }
            
            .tips li {
              margin-bottom: 5px;
            }
            
            .tips li:before {
              content: "✓ ";
              color: #f97316;
              font-weight: bold;
            }
            
            button {
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              margin-top: 20px;
              transition: transform 0.2s;
            }
            
            button:hover {
              transform: scale(1.05);
            }
            
            button:active {
              transform: scale(0.95);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>Halaman Tidak Tersedia</h1>
            <p>
              Halaman yang Anda cari belum di-cache untuk mode offline. 
              Silakan buka halaman ini saat online terlebih dahulu.
            </p>
            <div class="tips">
              <h3>💡 Cara membuat menu tersedia offline:</h3>
              <ul>
                <li>Buka halaman saat terhubung internet</li>
                <li>Biarkan halaman loading sempurna</li>
                <li>Aplikasi akan otomatis cache-nya</li>
                <li>Sekarang halaman bisa diakses offline</li>
              </ul>
            </div>
            <button onclick="window.history.back()">← Kembali</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

// ============================================================================
// Handle Asset Requests - Cache first
// ============================================================================
async function handleAssetRequest(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const assetCache = await caches.open(CACHE_NAMES.ASSETS);
      assetCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] ❌ Failed to load asset: ${request.url}`);
    
    // Return transparent pixel for images
    if (request.destination === 'image') {
      return new Response(
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
          0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
          0x54, 0x08, 0x5b, 0x63, 0xf8, 0xff, 0xff, 0x3f,
          0x03, 0x03, 0x03, 0x00, 0x00, 0x04, 0x00, 0x01,
          0x8d, 0xb6, 0xee, 0x56, 0x00, 0x00, 0x00, 0x00,
          0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
        ]),
        {
          headers: { 'Content-Type': 'image/png' },
        }
      );
    }
    
    return new Response('Asset not available', { status: 404 });
  }
}

// ============================================================================
// MESSAGE HANDLING - Commands from client
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received, activating new SW');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'PRELOAD_ALL_PAGES') {
    console.log('[SW] PRELOAD_ALL_PAGES requested');
    event.waitUntil(preloadAllPages());
  }
  
  if (event.data && event.data.type === 'PRELOAD_ALL_APIS') {
    console.log('[SW] PRELOAD_ALL_APIS requested');
    event.waitUntil(preloadAllAPIs());
  }
  
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    console.log('[SW] CLEAR_ALL_CACHES requested');
    event.waitUntil(clearAllCaches());
  }
});

// ============================================================================
// PRELOAD FUNCTIONS - Background data fetching
// ============================================================================
async function preloadAllPages() {
  console.log('[SW] Starting page preload...');
  
  const pageCache = await caches.open(CACHE_NAMES.PAGES);
  let successCount = 0;
  
  for (const page of CRITICAL_PAGES) {
    try {
      const response = await fetch(page);
      if (response.ok) {
        await pageCache.put(page, response.clone());
        console.log(`[SW] ✅ Preloaded page: ${page}`);
        successCount++;
      }
    } catch (error) {
      console.log(`[SW] ⚠️ Failed to preload page: ${page}`);
    }
  }
  
  console.log(`[SW] Page preload complete: ${successCount}/${CRITICAL_PAGES.length}`);
  
  // Notify client
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PRELOAD_PAGES_COMPLETE',
        successCount,
        totalPages: CRITICAL_PAGES.length,
      });
    });
  });
}

async function preloadAllAPIs() {
  console.log('[SW] Starting API preload...');
  
  const apiCache = await caches.open(CACHE_NAMES.API);
  let successCount = 0;
  
  for (const api of CRITICAL_APIS) {
    try {
      const response = await fetch(api);
      if (response.ok) {
        await apiCache.put(api, response.clone());
        console.log(`[SW] ✅ Preloaded API: ${api}`);
        successCount++;
      }
    } catch (error) {
      console.log(`[SW] ⚠️ Failed to preload API: ${api}`);
    }
  }
  
  console.log(`[SW] API preload complete: ${successCount}/${CRITICAL_APIS.length}`);
  
  // Notify client
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PRELOAD_APIS_COMPLETE',
        successCount,
        totalAPIs: CRITICAL_APIS.length,
      });
    });
  });
}

async function clearAllCaches() {
  console.log('[SW] Clearing all caches...');
  
  const cacheNames = await caches.keys();
  
  await Promise.all(
    cacheNames.map(cacheName => {
      console.log(`[SW] Deleting cache: ${cacheName}`);
      return caches.delete(cacheName);
    })
  );
  
  console.log('[SW] All caches cleared');
  
  // Notify client
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CLEAR_CACHES_COMPLETE',
      });
    });
  });
}

// ============================================================================
// BACKGROUND SYNC - Sync data when back online
// ============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'donattour-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncAllData());
  }
});

async function syncAllData() {
  console.log('[SW] Starting background sync...');
  
  try {
    // Refresh all critical APIs
    const results = await Promise.allSettled(
      CRITICAL_APIS.map(async (api) => {
        try {
          const response = await fetch(api);
          if (response.ok) {
            const apiCache = await caches.open(CACHE_NAMES.API);
            await apiCache.put(api, response.clone());
            return { api, success: true };
          }
        } catch (error) {
          return { api, success: false, error };
        }
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log(`[SW] Sync complete: ${successful}/${CRITICAL_APIS.length} APIs updated`);
    
    // Notify client
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          successful,
          total: CRITICAL_APIS.length,
          timestamp: new Date().toISOString(),
        });
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

console.log('[SW v' + SW_VERSION + '] Service Worker loaded successfully')