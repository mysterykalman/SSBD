// Service-worker updates: a deployed frontend must never stay stuck on (or reload into) an older
// app shell. Each test serves one deployment, then another on the same origin (same worker scope).
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {botWord, launch, lockIn, startServer} from "./helpers.mjs";

// The release before this fix: cache-first navigations and a worker that waits for the page.
const PREVIOUS_RELEASE = "d2838d0";

let browser, dirs = [];
before(async () => { browser = await launch(); });
after(async () => {
  await browser?.close();
  for (const dir of dirs) await rm(dir, {recursive: true, force: true});
});

const tempDir = async () => { const dir = await mkdtemp(join(tmpdir(), "ssbd-deploy-")); dirs.push(dir); return dir; };

/** The previous release's dist/, straight from git. */
async function previousRelease() {
  const dir = await tempDir();
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", PREVIOUS_RELEASE, "dist"], {encoding: "utf8"}).trim().split("\n");
  for (const file of files) {
    const out = join(dir, file.slice("dist/".length));
    await mkdir(dirname(out), {recursive: true});
    await writeFile(out, execFileSync("git", ["show", `${PREVIOUS_RELEASE}:${file}`]));
  }
  return dir;
}

/** A newer deployment: this build with a different version and a visible marker in the page. */
async function newerRelease(version = "abcdef0123") {
  const dir = await tempDir();
  await cp("dist", dir, {recursive: true});
  const current = (await readFile("dist/index.html", "utf8")).match(/name="app-version" content="([0-9a-f]+)"/)[1];
  const html = (await readFile(join(dir, "index.html"), "utf8")).split(current).join(version).replace("<head>", '<head>\n<meta name="build-marker" content="newer">');
  await writeFile(join(dir, "index.html"), html);
  await writeFile(join(dir, "sw.js"), (await readFile(join(dir, "sw.js"), "utf8")).split(current).join(version));
  return {dir, version};
}

const frontend = page => page.evaluate(() => ({
  script: document.querySelector('script[src*="/assets/app."]')?.getAttribute("src"),
  version: document.querySelector('meta[name="app-version"]')?.getAttribute("content") || null,
  marker: document.querySelector('meta[name="build-marker"]')?.getAttribute("content") || null
}));
const shellCaches = page => page.evaluate(async () => (await caches.keys()).filter(k => k.startsWith("shell-")).sort());
/** Poll the page's shell caches until `ok(keys)` holds (Playwright's waitForFunction does not await promises). */
async function waitForCaches(page, ok, timeout = 15000) {
  const end = Date.now() + timeout;
  for (;;) {
    const keys = await shellCaches(page);
    if (ok(keys)) return keys;
    if (Date.now() > end) throw new Error(`caches never settled: ${keys.join(",")}`);
    await page.waitForTimeout(100);
  }
}
const controlled = page => page.waitForFunction(() => navigator.serviceWorker.controller !== null);
async function scriptOf(dir) {
  return (await readFile(join(dir, "index.html"), "utf8")).match(/\/assets\/app\.[0-9a-f]+\.js/)[0];
}
async function playOneMove(page) {
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "garden" ? "pencil" : "garden");
  await page.waitForSelector(".trail-row");
}

test("old worker and cache from the previous release, then this deployment: the update action lands on the new frontend; Solo survives, offline too", async () => {
  const old = await previousRelease();
  const port = 9000 + Math.floor(Math.random() * 900);
  const context = await browser.newContext({reducedMotion: "reduce"});
  let server = await startServer({port, staticDir: old});
  try {
    const page = await context.newPage();
    await page.goto(server.url);
    await page.waitForSelector("#startSolo");
    await controlled(page);
    assert.equal((await frontend(page)).script, await scriptOf(old), "running the previous release");
    await page.click("#startSolo"); // the previous release starts Solo directly (no character picker yet)
    await page.waitForSelector("#word");
    await playOneMove(page);
    const trail = await page.locator(".trail-row").allInnerTexts();
    const oldCaches = await shellCaches(page);
    assert.equal(oldCaches.length, 1);

    // This deployment goes live.
    await server.stop();
    server = await startServer({port});
    await page.goto(server.url);
    // The previous release's worker still answers that one visit from its cache (its own flaw,
    // which this fix removes). Meanwhile the new worker installs and takes over at once, and the
    // old cache is deleted, so the old worker can never answer again.
    await waitForCaches(page, keys => keys.length === 1 && keys[0] !== oldCaches[0]);
    assert.equal((await frontend(page)).script, await scriptOf(old), "that visit was still the old page");
    // The update action: the old page's own "A new version is ready" Reload when it noticed in
    // time, otherwise the reload that button performs. Either way: the new frontend.
    if (await page.locator(".toast-action").count()) await Promise.all([page.waitForEvent("load"), page.click(".toast-action")]);
    else await page.reload();
    await page.waitForSelector("#startSolo");
    const now = await frontend(page);
    assert.equal(now.script, await scriptOf("dist"), "the new app shell after the update action");
    const version = now.version;
    assert.match(version, /^[0-9a-f]{10}$/);
    await waitForCaches(page, keys => keys.join() === `shell-${version}`);
    assert.ok(!(await shellCaches(page)).includes(oldCaches[0]), "the old cache is gone");

    // From now on every fresh visit is current, the Solo game is still there, and offline works.
    const fresh = await context.newPage();
    await fresh.goto(server.url);
    await fresh.waitForSelector("#startSolo, #word"); // a fresh tab resumes the unfinished Solo game
    assert.equal((await frontend(fresh)).version, version);
    await fresh.close();
    await page.goto(`${server.url}/`);
    await page.waitForSelector("#gameList");
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector("#startSolo");
    assert.equal((await frontend(page)).version, version, "offline reload: the new cached shell");
    await page.locator("#gameList a, #gameList button").first().click();
    await page.waitForSelector(".trail-row");
    assert.deepEqual(await page.locator(".trail-row").allInnerTexts(), trail, "the Solo game survived the update");
    await context.setOffline(false);
  } finally {
    await context.close();
    await server.stop();
  }
});

test("a newer deployment: a fresh visit shows it at once, and an open older tab's Reload lands on it", async () => {
  const port = 9000 + Math.floor(Math.random() * 900);
  const context = await browser.newContext({reducedMotion: "reduce"});
  let server = await startServer({port});
  try {
    const page = await context.newPage();
    await page.goto(server.url);
    await page.waitForSelector("#startSolo");
    await controlled(page);
    const current = await frontend(page);
    assert.deepEqual(await shellCaches(page), [`shell-${current.version}`]);

    const newer = await newerRelease();
    await server.stop();
    server = await startServer({port, staticDir: newer.dir});

    // A fresh visit (new tab, old worker still in control) gets the newer frontend straight away.
    const fresh = await context.newPage();
    await fresh.goto(`${server.url}/solo`);
    await fresh.waitForSelector("#startSolo");
    assert.deepEqual(await frontend(fresh), {...current, version: newer.version, marker: "newer"});
    await fresh.close();

    // The open older tab learns about it (as it does when it regains focus) and offers Reload.
    assert.equal((await frontend(page)).marker, null);
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await page.waitForSelector(".toast-action", {timeout: 15000});
    assert.match(await page.locator(".toast").innerText(), /A new version is ready/);
    await Promise.all([page.waitForEvent("load"), page.click(".toast-action")]);
    await page.waitForSelector("#startSolo");
    assert.equal((await frontend(page)).marker, "newer", "Reload landed on the newer frontend");
    await waitForCaches(page, keys => keys.join() === `shell-${newer.version}`);
    // And the newer tab does not offer an update it already has.
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".toast-action").count(), 0);
  } finally {
    await context.close();
    await server.stop();
  }
});

test("the service worker is never cached, never caches /api/*, and Family mode keeps using the live API", async () => {
  const server = await startServer();
  const context = await browser.newContext({reducedMotion: "reduce"});
  try {
    const sw = await fetch(`${server.url}/sw.js`);
    assert.equal(sw.headers.get("cache-control"), "no-store");
    const page = await context.newPage();
    await page.goto(server.url);
    await page.waitForSelector("#startSolo");
    await controlled(page);
    // Family: create a player and a game through the real API, twice, with the worker in control.
    const results = await page.evaluate(async () => {
      const post = (path, body) => fetch(path, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(r => r.json());
      const a = await post("/api/player", {display_name: "Ana"});
      const b = await post("/api/player", {display_name: "Ana"});
      const health = await fetch("/api/health").then(r => r.json());
      return {a: a.id, b: b.id, health};
    });
    assert.notEqual(results.a, results.b, "each API call reached the server");
    assert.deepEqual(results.health, {ok: true, db: true});
    const cached = await page.evaluate(async () => {
      const out = [];
      for (const key of await caches.keys()) for (const r of await (await caches.open(key)).keys()) out.push(new URL(r.url).pathname);
      return out;
    });
    assert.ok(!cached.some(p => p.startsWith("/api")), cached.join(","));
    // Offline, the API fails as it should instead of answering from a cache.
    await context.setOffline(true);
    const offline = await page.evaluate(() => fetch("/api/health").then(() => "answered", () => "failed"));
    assert.equal(offline, "failed");
  } finally {
    await context.close();
    await server.stop();
  }
});
