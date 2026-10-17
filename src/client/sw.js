// App-shell service worker. Every shell file is precached together under one
// version, so a page loaded from the cache always gets a matching script and
// stylesheet. API calls (/api/*) always go to the network and are never cached.
//
// Freshness rules (a deployed frontend must never stay stuck on an old shell):
// * Navigations are network-first. Online, every page load gets the deployed
//   index.html (it is served with no-cache), so a fresh visit always shows the
//   newest frontend. Only when the network fails (offline) or hangs does the
//   cached shell answer, which keeps offline Solo and canonical Mom Mode working.
// * A new worker takes over as soon as it is installed (skipWaiting + claim)
//   and deletes every older shell cache. Content-hashed runtime assets make that
//   safe for both the main app and Mom Mode.
// * An open tab that is older than the worker now in control is told so by the
//   page itself ("A new version is ready" + Reload; see registerServiceWorker in
//   app.js). It never needs this worker to wait.
// * This file is never cached: the host sends it with no-store and the page
//   registers it with updateViaCache: "none".
const VERSION = "%VERSION%";
const CACHE = `shell-${VERSION}`;
const PRECACHE = %PRECACHE%;
// In-app pages that are all the same shell (kept in step with vercel.json's rewrites).
const SHELL_ROUTES = /^\/(?:$|index\.html$|games(?:\/|$)|join(?:\/|$)|solo(?:\/|$)|review$)/;
const MOM_ROUTES = /^\/(?:mom|mom-mode)(?:\/|$)/;
// A navigation that gets no answer in this long falls back to the matching cached page.
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: "reload" bypasses the HTTP cache, so the precache is always this deployment's files.
    await cache.addAll(PRECACHE.map(url => new Request(url, {cache: "reload"})));
    await self.skipWaiting();
  })());
});

// Older pages ask a waiting worker to take over; this one never waits, but still answers.
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

async function cachedPage(path) {
  const cache = await caches.open(CACHE);
  return cache.match(path);
}

/** Network first; the matching cached page if the network fails, errors or hangs. */
async function navigate(request, fallbackPath) {
  const network = fetch(request);
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS); });
  try {
    const response = await Promise.race([network, timeout]);
    if (response && response.ok) return response;
    return (await cachedPage(fallbackPath)) || response || network;
  } catch {
    // Offline: the cached page, or (nothing cached yet) the browser's own network error.
    return (await cachedPage(fallbackPath)) || network;
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // API calls and other origins are never touched (and so never cached).
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === "/api") return;
  if (request.mode === "navigate") {
    if (SHELL_ROUTES.test(url.pathname)) event.respondWith(navigate(request, "/"));
    else if (MOM_ROUTES.test(url.pathname)) event.respondWith(navigate(request, "/mom/"));
    return;
  }
  // Content-hashed assets, icons and manifests: from this version's cache, else the network.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || fetch(request)));
});
