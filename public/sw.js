
const CACHE_NAME = 'yadarm-cache-v1';
const APP_SHELL = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const isHTML = request.headers.get('accept')?.includes('text/html');
  event.respondWith((async () => {
    try {
      const network = await fetch(request);
      // Cache a copy (best-effort)
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, network.clone());
      return network;
    } catch (e) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      if (isHTML) return cache.match('/offline');
      throw e;
    }
  })());
});
