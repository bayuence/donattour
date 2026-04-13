// ══════════════════════════════════════════════════════════════
// Service Worker - Donattour POS System
// Strategi: Network-First + Auto Update
// ⚠️  SW_VERSION di-update OTOMATIS oleh scripts/update-sw-version.js
//     setiap kali `npm run build` dijalankan. JANGAN ubah manual!
// ══════════════════════════════════════════════════════════════

const SW_VERSION = '2026.04.13.1805';
const CACHE_NAME = `donattour-v${SW_VERSION}`;

// File yang di-cache untuk offline support dasar
const PRECACHE_URLS = [
  '/',
  '/dashboard/kasir',
  '/manifest.json',
  '/logo-donattour.png',
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
            .filter(name => name !== CACHE_NAME)
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

  // Untuk assets statis (JS, CSS, images): Network-First dengan cache fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
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
