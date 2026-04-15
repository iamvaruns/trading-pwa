const CACHE = 'marketiq-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;

  if (url.hostname.includes('yahoo') ||
      url.hostname.includes('stlouisfed') ||
      url.hostname.includes('anthropic') ||
      url.hostname.includes('finnhub') ||
      url.hostname.includes('corsproxy') ||
      url.hostname.includes('allorigins') ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/.netlify/')) {
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
