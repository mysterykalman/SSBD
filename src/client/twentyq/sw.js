// Independent /20Q offline worker; never controls the main game.
const CACHE = "twentyq-%VERSION%";
const PRECACHE = %PRECACHE%;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
