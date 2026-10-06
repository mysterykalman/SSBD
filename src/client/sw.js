// App-shell service worker. Every shell file is precached together under one
// version, so the page and its script always match. API calls always go to
// the network and are never cached.
const VERSION = "%VERSION%";
const CACHE = `shell-${VERSION}`;
const PRECACHE = %PRECACHE%;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, {cache: "reload"})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith("shell-") && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    // Any in-app page (/, /solo/…, /games/…, /join/…) is the same shell.
    event.respondWith(caches.match("/", {cacheName: CACHE}).then(cached => cached || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request, {cacheName: CACHE}).then(cached => cached || fetch(request)));
});
