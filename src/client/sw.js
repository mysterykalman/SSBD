// App-shell service worker. Every shell file is precached together under one
// version, so a page loaded from the cache always gets a matching script and
// stylesheet. API calls (/api/*) always go to the network and are never cached.
//
// Freshness rules (a deployed frontend must never stay stuck on an old shell):
// * Navigations are network-first. Online, every page load gets the deployed
//   index.html (it is served with no-cache), so a fresh visit always shows the
//   newest frontend. Only when the network fails (offline) or hangs does the
//   cached shell answer, which keeps offline Solo working.
// * A new worker takes over as soon as it is installed (skipWaiting + claim)
//   and deletes every older shell cache. That is safe because the app is one
//   script and one stylesheet loaded at start-up: an already-open old page
//   never needs another file from the old cache.
// * An open tab that is older than the worker now in control is told so by the
//   page itself ("A new version is ready" + Reload; see registerServiceWorker in
//   app.js). It never needs this worker to wait.
// * This file is never cached: the host sends it with no-store and the page
//   registers it with updateViaCache: "none".
const VERSION = "%VERSION%";
const CACHE = `shell-${VERSION}`;
const PRECACHE = %PRECACHE%;
// In-app pages that are all the same shell (kept in step with vercel.json's rewrites).
const SHELL_ROUTES = /^\/(?:$|index\.html$|games(?:\/|$)|join(?:\/|$)|solo(?:\/|$))/;
// A navigation that gets no answer in this long falls back to the cached shell.
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

async function cachedShell() {
  const cache = await caches.open(CACHE);
  return cache.match("/");
}

/** Network first; the cached shell if the network fails, errors or hangs. */
async function navigate(request) {
  const network = fetch(request);
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS); });
  try {
    const response = await Promise.race([network, timeout]);
    if (response && response.ok) return response;
    return (await cachedShell()) || response || network;
  } catch {
    // Offline: the cached shell, or (nothing cached yet) the browser's own network error.
    return (await cachedShell()) || network;
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
    if (SHELL_ROUTES.test(url.pathname)) event.respondWith(navigate(request));
    return;
  }
  // Hashed assets, the icon and the manifest: from this version's cache, else the network.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || fetch(request)));
});
