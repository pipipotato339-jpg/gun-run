/* GUN RUN: офлайн-кеш застосунку */
const VERSION = 'zaruba-a5211f18db';
const FONTS = 'zaruba-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-64.png', './firebase-config.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('zaruba-') && k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      /* сторінка гри: спершу свіжа з інтернету, збережена лише без мережі */
      if (req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname)) {
        try { const res = await fetch(req, { cache: 'no-store' }); if (res && res.ok) { cache.put('./index.html', res.clone()); return res; } } catch (e) {}
        return (await cache.match('./index.html')) || (await cache.match(req, { ignoreSearch: true })) || Response.error();
      }
      const hit = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { event.waitUntil(fresh); return hit; }
      const res = await fresh;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    })());
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }
      catch (e) { return Response.error(); }
    })());
  }
});
