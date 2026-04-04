// Service Worker - Donattour System
// File ini diperlukan agar browser tidak menampilkan error 404
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
