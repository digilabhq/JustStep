// JustStep Service Worker v2.2.2
// Strategy:
//   - Navigations (HTML): network-first, so deploys reach users on the next
//     load, with cached index.html as the offline fallback.
//   - Other same-origin GETs: cache-first with background fill.
//   - Non-GET and cross-origin requests (Firebase etc.) pass through untouched.
const CACHE_NAME = 'juststep-cache-v2.2.2';
const OFFLINE_FALLBACK = './index.html';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v2.2.2');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache core assets; ignore individual failures (e.g., missing icons)
      Promise.allSettled(FILES_TO_CACHE.map((u) => cache.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v2.2.2');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never touch non-GET requests (Firebase uses POST)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin assets; let everything else pass through
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so updates land immediately, cache as offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match(OFFLINE_FALLBACK)
          ).then(
            (fallback) => fallback || Response.error()
          )
        )
    );
    return;
  }

  // Static assets: cache-first, fill cache from network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => Response.error()); // explicit failure, never undefined
    })
  );
});
