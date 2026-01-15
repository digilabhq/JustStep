// JustStep Service Worker (safe caching: GET-only)
const CACHE_NAME = 'juststep-cache-v1.8.0';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './icon-192.png',
  './icon-512.png'
].filter(Boolean);

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Cache core assets; ignore individual failures (e.g., missing icons)
        await Promise.allSettled(FILES_TO_CACHE.map((u) => cache.add(u)));
      } catch (e) {
        // Non-fatal: app still works online
        console.warn('Service Worker: Cache addAll failed', e);
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // IMPORTANT: Never try to cache non-GET requests (Firebase uses POST)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only cache same-origin assets. Let everything else pass through.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // Only cache successful, basic responses
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const respClone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          }
          return resp;
        })
        .catch(() => cached); // if offline and nothing cached, will return undefined
    })
  );
});
