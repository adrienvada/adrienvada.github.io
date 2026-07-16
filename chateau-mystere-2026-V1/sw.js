const CACHE_NAME = 'chateau-mystere-v2';
const ASSETS_TO_CACHE = [
  'Index.html',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch so if any single asset fails (or during local testing), installation doesn't abort
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => console.log('Cache add failed for:', url, err)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET, non-http(s), and requests with Range headers (crucial for audio/sounds/video partial loading)
  if (request.method !== 'GET' || !request.url.startsWith('http') || request.headers.has('range')) {
    return;
  }

  // Network-First strategy: Always fetch the latest version from the network.
  // This ensures you never get stuck on an old cached version when updating your code,
  // and falls back to cache only when offline.
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
