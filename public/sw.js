// mora - service worker (pattern from hodi/fina public/sw.js).
//
// The app shell works offline; heavy media does not go through the cache.
//   HTML                 stale-while-revalidate: opens at once, new build next time.
//   /assets/*, /icons/*  cache-first forever (Vite hashes file names).
//   /scenes/*.jpg        cache on first view (small, makes offline scenes look right).
//   *.mp4, *.mp3         not touched: big files and Range requests (iOS Safari)
//                        are safer straight from the network.

const CACHE = 'mora-v3';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function precache() {
  const cache = await caches.open(CACHE);
  const urls = new Set(SHELL);
  try {
    const res = await fetch('/', { cache: 'no-cache' });
    if (res.ok) {
      const html = await res.clone().text();
      await cache.put('/', res);
      for (const m of html.matchAll(/["'](\/assets\/[^"']+)/g)) urls.add(m[1]);
    }
  } catch {
    // Offline during install: try again next time.
  }
  await Promise.all(
    [...urls].map((url) =>
      cache.match(url, { ignoreVary: true }).then((hit) => hit || fetch(url).then((r) => r.ok && cache.put(url, r)).catch(() => {})),
    ),
  );
}

// ignoreVary: some servers send `Vary: Origin`, and module scripts carry an
// Origin header that the precache request did not, so a strict match misses.
const cacheFirst = (req) =>
  caches.match(req, { ignoreVary: true }).then(
    (hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
  );

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Firebase sign-in pages (proxied to firebaseapp.com) must never get the cached shell.
  if (url.pathname.startsWith('/__/')) return;
  if (/\.(mp4|mp3|m4a|wav|ogg)$/i.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    // One page app: every navigation is the shell.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match('/');
        const fresh = fetch('/', { cache: 'no-cache' })
          .then((res) => {
            if (res.ok) cache.put('/', res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/scenes/')) {
    event.respondWith(cacheFirst(req));
  }
});
