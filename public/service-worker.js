// ══════════════════════════════════════════════════════════════
// Service Worker - Donattour POS System
// Strategi: Network-First + Auto Update + Offline Support
// ══════════════════════════════════════════════════════════════

const SW_VERSION = '2026.05.16.0323';
const CACHE_NAME = `donattour-v${SW_VERSION}`;
const RUNTIME_CACHE = `donattour-runtime-${SW_VERSION}`;

// File yang di-cache untuk offline support dasar
const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/kasir',
  '/manifest.json',
  '/logo-donattour.png',
  '/logo.png',
];

// ─── INSTALL ─────────────────────────────────────────────────
// Langsung skip waiting agar SW baru segera aktif
self.addEventListener('install', (event) => {
  console.log(`🔧 [SW] Installing v${SW_VERSION}...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`📦 [SW] Pre-caching ${PRECACHE_URLS.length} files...`);
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`⚠️ [SW] Gagal cache: ${url}`, err);
            })
          )
        );
      })
      .then(() => {
        console.log(`✅ [SW] v${SW_VERSION} installed!`);
        // PENTING: Langsung aktifkan tanpa tunggu SW lama selesai
        return self.skipWaiting();
      })
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────
// Hapus cache lama dan ambil alih semua tab
self.addEventListener('activate', (event) => {
  console.log(`🚀 [SW] Activating v${SW_VERSION}...`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log(`🗑️ [SW] Menghapus cache lama: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log(`✅ [SW] v${SW_VERSION} aktif!`);
        // Ambil kontrol semua tab yang sudah terbuka
        return self.clients.claim();
      })
      .then(() => {
        // Beritahu semua tab bahwa SW baru sudah aktif
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: SW_VERSION,
          });
        });
      })
  );
});

// ─── FETCH ───────────────────────────────────────────────────
// Strategi: Network-First
// - Selalu coba ambil dari network dulu (agar selalu fresh/terbaru)
// - Jika offline, gunakan cache sebagai fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip: non-GET requests, browser extensions, Supabase API, Vercel analytics
  if (
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('vercel') ||
    url.hostname.includes('vitals') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Untuk navigasi (HTML pages): Network-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cached => cached || caches.match('/dashboard/kasir'));
        })
    );
    return;
  }

  // Untuk assets statis (JS, CSS, images): Cache-First untuk performa
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|webp|avif)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) {
            // Update cache di background
            fetch(event.request).then((response) => {
              if (response && response.status === 200) {
                caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, response));
              }
            }).catch(() => {});
            return cached;
          }
          
          // Jika tidak ada di cache, fetch dan simpan
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, clone));
            }
            return response;
          });
        })
    );
    return;
  }

  // Untuk Next.js dynamic routes: Network-First
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});

// ─── MESSAGE HANDLER ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }

  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
