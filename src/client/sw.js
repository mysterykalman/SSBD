// App-shell service worker. Every shell file is precached together under one
// version, so the page and its script always match. API calls always go to
// the network and are never cached.
//
// Updates: the first install takes control right away (there is no older
// page to confuse). A later version waits until the page asks it to take
// over (the "new version" toast's Reload button) or until every tab is
// closed. Activating immediately would delete the old cache while an old
// page may still need files from it, so a page could end up half old, half
// new, or broken offline.
const VERSION = "%VERSION%";
const CACHE = `shell-${VERSION}`;
const PRECACHE = %PRECACHE%;
// In-app pages that are all the same shell (kept in step with src/server/worker.js).
const SHELL_ROUTES = /^\/(?:$|index\.html$|games\/|join\/|solo\/?)/;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map(url => new Request(url, {cache: "reload"})));
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("shell-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function fromCache(request) {
  const cache = await caches.open(CACHE);
  return cache.match(request);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    if (!SHELL_ROUTES.test(url.pathname)) return;
    // Any in-app page (/, /solo/…, /games/…, /join/…) is the same shell.
    event.respondWith(fromCache("/").then(cached => cached || fetch(request)));
    return;
  }
  event.respondWith(fromCache(request).then(cached => cached || fetch(request)));
});
