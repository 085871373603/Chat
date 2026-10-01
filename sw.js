// Service Worker Arinex: network-first (selalu ambil versi terbaru), cache hanya sebagai cadangan offline.
const V = 'arinex-v6.1';
const SHELL = ['./', 'index.html', 'css/style.css', 'css/extra.css', 'js/app.js', 'js/gh-config.js', 'manifest.webmanifest', 'img/icon-192.png', 'img/icon-512.png', 'img/badge-192.png', 'audio/notifikasi.mp3'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;              // Firebase/GitHub tidak disentuh
  if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() =>
      caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const uid = e.notification.data && e.notification.data.uid;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const c = list[0];
      if (c) { c.focus(); c.postMessage({ openUid: uid }); return; }
      return clients.openWindow('./');
    })
  );
});
