// EVENT INSTALL: Langsung aktifkan tanpa menunggu
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// EVENT ACTIVATE: Langsung ambil alih halaman
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// EVENT FETCH: KUNCI UTAMA (BYPASS)
// Biarkan kosong seperti ini.
// Artinya: "Jangan cegat apapun, biarkan aplikasi mengambil data langsung dari internet!"
self.addEventListener('fetch', (event) => {
  return; 
});
