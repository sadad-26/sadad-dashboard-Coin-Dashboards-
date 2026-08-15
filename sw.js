const CACHE_NAME = 'sadad-dashboard-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Only handle same-origin GET requests for the app shell.
// Everything else (Firestore, Firebase Auth, CDN scripts, fonts) goes straight
// to the network untouched so live data is never served stale.
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for the HTML shell so updates show up immediately when online.
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Cache-first for static assets (icons, manifest).
  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        return res;
      });
    }).catch(function () {
      return caches.match('./index.html');
    })
  );
});
