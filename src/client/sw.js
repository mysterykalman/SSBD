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
const AUDIO_CACHE = "audio-%AUDIO_VERSION%";
const AUDIO_FILES = new Set(["/audio/intro.mp3", "/audio/game-music.mp3"]);

// Music is cached only after the installed app plays it; an ordinary site visit
// never downloads megabytes of audio just to enable offline Solo.
async function cacheAudioFile(path) {
  if (!AUDIO_FILES.has(path)) return;
  const cache = await caches.open(AUDIO_CACHE);
  if (await cache.match(path)) return;
  try {
    const response = await fetch(new Request(path, {cache: "reload"}));
    if (response.ok && response.status === 200) await cache.put(path, response);
  } catch { /* Audio is optional; denied storage or network must never break play. */ }
}

// HTMLMediaElement usually sends Range requests. A full cached MP3 must respond
// with the requested bytes or Safari/Chromium can refuse to play offline.
async function serveAudio(request, path) {
  const cached = await (await caches.open(AUDIO_CACHE)).match(path);
  if (!cached) return fetch(request);
  const header = request.headers.get("range");
  if (!header) return cached;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return cached;
  const buffer = await cached.arrayBuffer();
  const size = buffer.byteLength;
  const suffix = !match[1];
  const start = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = suffix ? size - 1 : match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, {status: 416, headers: {"Content-Range": `bytes */${size}`}});
  }
  const body = buffer.slice(start, end + 1);
  const headers = new Headers(cached.headers);
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(body.byteLength));
  return new Response(body, {status: 206, headers});
}

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
  if (event.data?.type === "CACHE_AUDIO" && AUDIO_FILES.has(event.data.path)) {
    event.waitUntil(cacheAudioFile(event.data.path));
  }
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith("shell-") && key !== CACHE) || (key.startsWith("audio-") && key !== AUDIO_CACHE)).map(key => caches.delete(key)));
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
  if (AUDIO_FILES.has(url.pathname)) {
    event.respondWith(serveAudio(request, url.pathname));
    return;
  }
  if (request.mode === "navigate") {
    if (SHELL_ROUTES.test(url.pathname)) event.respondWith(navigate(request, "/"));
    else if (MOM_ROUTES.test(url.pathname)) event.respondWith(navigate(request, "/mom/"));
    return;
  }
  // Content-hashed assets, icons and manifests: from this version's cache, else the network.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || fetch(request)));
});
