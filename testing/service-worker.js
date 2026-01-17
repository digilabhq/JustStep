// service-worker.js

const CACHE_NAME = 'juststep-cache-v2.1.0'; // change this when you want to force a full refresh
const ASSETS_TO_CACHE = [
  './styles.css',
  './script.js',
  './icon.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // Activate the updated SW ASAP
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  // Take control immediately and clean old caches
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
      )
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isHTML =
    req.mode === 'navigate' || accept.includes('text/html');

  // 1) HTML/pages: NETWORK FIRST (prevents "stuck" Home Screen app)
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 2) Static assets: CACHE FIRST (fast/offline)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resp.clone()));
        }
        return resp;
      });
    })
  );
});
