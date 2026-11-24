const CACHE = 'sgm-inspect-v16';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css?v=16',
  './js/jspdf.min.js',
  './js/config.js?v=16',
  './js/db.js?v=16',
  './js/app.js?v=16',
  './js/pdf-gen.js?v=16',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return response; }).catch(() => caches.match(e.request))
  );
});
