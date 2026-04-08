// ══════════════════════════════════════════════════════════════
// Service Worker - Donattour POS System
// Strategi: Network-First + Auto Update
// ══════════════════════════════════════════════════════════════

// VERSI - Ganti setiap deploy untuk trigger update otomatis
// Format: YYYY.MM.DD.patch
const SW_VERSION = '2026.04.08.3';
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
        // Gunakan addAll tapi jangan gagalkan install jika ada URL yang error
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
        // Hapus semua cache dari versi lama
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log(`🗑️ [SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log(`✅ [SW] v${SW_VERSION} now active!`);
        // PENTING: Ambil kontrol semua tab yang sudah terbuka
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
// - Hanya cache file statis (JS, CSS, gambar), BUKAN API calls
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
          // Cache halaman terbaru
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: tampilkan dari cache
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
// Terima pesan dari client (misalnya: "cek update")
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
