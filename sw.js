// Memaksa Service Worker baru langsung aktif tanpa menunggu
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Menghancurkan SEMUA cache lama yang pernah tersimpan di HP
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Menghapus cache bandel:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// Bypass total: Jangan pernah simpan apapun ke cache lagi!
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
