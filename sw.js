const CACHE_NAME = 'arinex-chat-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './img/logo_chat.png',
  './manifest.webmanifest'
];

// Event Install: Menyimpan aset statis ke dalam cache browser
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Event Activate: Membersihkan cache lama jika versi CACHE_NAME diubah
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Event Fetch: Mengontrol bagaimana aplikasi mengambil data jaringan vs cache
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // PENGECUALIAN KRITIS: 
  // Abaikan request ke Firebase (Database, Auth) dan API eksternal lainnya.
  // Ini mencegah Service Worker memutus koneksi WebSocket Realtime Database.
  if (
    url.includes('firebasedatabase.app') ||
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('identitytoolkit')
  ) {
    // Biarkan request berjalan normal ke internet (tanpa diintervensi cache)
    return;
  }

  // Strategi "Cache First, fall back to Network" untuk aset web lainnya
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Jika file ada di cache, kembalikan file tersebut
        if (response) {
          return response;
        }
        
        // Jika tidak ada di cache, ambil dari internet
        return fetch(event.request).then((networkResponse) => {
          // Opsional: Simpan file baru ke cache agar kunjungan berikutnya lebih cepat
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Fallback jika sedang offline dan file tidak ada di cache (bisa diarahkan ke halaman offline khusus jika ada)
          console.log('Aplikasi offline dan resource tidak ditemukan di cache:', url);
        });
      })
  );
});
