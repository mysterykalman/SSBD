import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {botWord, launch, lockIn, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** One online visit: the service worker installs, precaches the shell and controls the page. */
async function visitOnce(context, url = server.url) {
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector("#startSolo");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  return page;
}

/** Count /api/ requests from every page in the context (including ones a service worker would make). */
function watchApi(context) {
  const calls = [];
  context.on("request", r => { if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url()); });
  return calls;
}

/** Play moves that never match the bot, so the game keeps going. */
async function playMoves(page, words) {
  for (const w of words) {
    if (await page.locator(".end").count()) break;
    const before = await page.locator(".trail-row").count();
    const bot = await botWord(page);
    await lockIn(page, bot.toLowerCase() === w ? `${w}s` : w);
    await page.waitForFunction(n => document.querySelectorAll(".trail-row").length > n || document.querySelector(".end"), before);
  }
}

const trailText = page => page.locator(".trail-row").allInnerTexts();

test("offline Solo: start, play, refresh, reopen and finish with no network", async () => {
  const context = await browser.newContext();
  let page = await visitOnce(context);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const apiCalls = watchApi(context);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector("#startSolo");
  assert.equal(await page.isVisible("#offlinePill"), true);
  assert.match(await page.locator("#offlinePill").innerText(), /Solo still works/);
  assert.doesNotMatch(await page.locator("#offlinePill").innerText(), /error|fail|lost|broken/i);
  assert.equal(await page.isDisabled("#createFamily"), true);

  await page.click("#startSolo");
  await playMoves(page, ["whale", "ocean", "bubble", "coral"]);
  const trail = await trailText(page);
  assert.ok(trail.length >= 1);
  await page.reload();
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await trailText(page), trail);

  const url = page.url();
  await page.close();
  page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await trailText(page), trail);

  if (!(await page.locator(".end").count())) {
    await lockIn(page, await botWord(page));
    await page.waitForSelector(".end.win");
  }
  await page.reload();
  await page.waitForSelector(".end");
  assert.deepEqual(apiCalls, [], "Solo never called the API while offline");
  await context.close();
});

test("offline: reopening the bare URL resumes the unfinished Solo game; deep links serve the shell", async () => {
  const context = await browser.newContext();
  let page = await visitOnce(context);
  const apiCalls = watchApi(context);
  await context.setOffline(true);

  await page.click("#startSolo");
  await playMoves(page, ["apple", "garden"]);
  const soloUrl = page.url();
  assert.match(new URL(soloUrl).pathname, /^\/solo\/[\w-]+$/);
  const trail = await trailText(page);
  await page.close();

  // Close and reopen at the bare URL: the active game comes back.
  page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector(".trail-row");
  assert.equal(page.url(), soloUrl);
  assert.deepEqual(await trailText(page), trail);
  await page.close();

  // Typing a deep link straight into a new tab, offline.
  page = await context.newPage();
  await page.goto(soloUrl);
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await trailText(page), trail);
  assert.equal(await page.isVisible("#offlinePill"), true);

  // Family links still open the app shell offline (and fall back gracefully, no browser error page).
  for (const path of ["/games/abc123", "/join/ABCD"]) {
    const response = await page.goto(server.url + path);
    assert.equal(response.status(), 200, path);
    // No player on this device yet, so both land on the home screen (with Solo available).
    await page.waitForSelector("#startSolo", {timeout: 5000});
    assert.equal(await page.isVisible("#offlinePill"), true, path);
  }
  assert.deepEqual(apiCalls, []);
  await context.close();
});

test("offline: a finished Solo game reloads to its end state and is not auto-resumed", async () => {
  const context = await browser.newContext();
  let page = await visitOnce(context);
  await context.setOffline(true);
  await page.click("#startSolo");
  await lockIn(page, await botWord(page)); // match the bot on move 1
  await page.waitForSelector(".end.win");
  const soloUrl = page.url();
  await page.reload();
  await page.waitForSelector(".end.win");
  await page.close();

  page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  assert.equal(new URL(page.url()).pathname, "/", "finished game is not resumed");
  await page.goto(soloUrl);
  await page.waitForSelector(".end.win");
  assert.equal(await page.locator("#word").count(), 0, "no input on a finished game");
  await context.close();
});

test("offline: language choice persists across refresh and reopen", async () => {
  const context = await browser.newContext({locale: "en-US"});
  let page = await visitOnce(context);
  await context.setOffline(true);
  await page.click("[data-lang=fr]");
  assert.equal(await page.getAttribute("html", "lang"), "fr");
  await page.reload();
  await page.waitForSelector("#startSolo");
  assert.equal(await page.getAttribute("html", "lang"), "fr");
  assert.equal(await page.getAttribute("[data-lang=fr]", "aria-pressed"), "true");
  assert.match(await page.locator("#offlinePill").innerText(), /Hors ligne/);
  await page.click("#startSolo");
  await playMoves(page, ["pomme"]);
  const id = new URL(page.url()).pathname.split("/").pop();
  assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem("ssbd.store")).solo[id].language, id), "fr");
  await page.close();
  page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector(".trail-row");
  assert.equal(await page.getAttribute("html", "lang"), "fr");
  await context.close();
});

test("service worker: one versioned cache, no API responses cached, and going back online re-enables family games", async () => {
  const context = await browser.newContext();
  const page = await visitOnce(context);
  await page.evaluate(() => fetch("/api/health").catch(() => {}));
  const caches = await page.evaluate(async () => {
    const out = {};
    for (const key of await caches.keys()) out[key] = (await (await caches.open(key)).keys()).map(r => new URL(r.url).pathname);
    return out;
  });
  const keys = Object.keys(caches);
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^shell-[0-9a-f]{10}$/);
  const paths = caches[keys[0]];
  assert.ok(paths.includes("/"));
  assert.ok(paths.some(p => /^\/assets\/app\.[0-9a-f]+\.js$/.test(p)));
  assert.ok(paths.some(p => /^\/assets\/styles\.[0-9a-f]+\.css$/.test(p)));
  assert.ok(!paths.some(p => p.startsWith("/api/")));

  await context.setOffline(true);
  await page.waitForSelector("#offlinePill:not([hidden])");
  assert.equal(await page.isDisabled("#createFamily"), true);
  await context.setOffline(false);
  await page.waitForSelector("#offlinePill", {state: "hidden"});
  assert.equal(await page.isDisabled("#createFamily"), false);
  await context.close();
});

test("service worker update: new version waits for Reload, then switches over completely", async () => {
  // A second "release": the same build with a different cache version, served on the same origin.
  const dir = await mkdtemp(join(tmpdir(), "ssbd-sw-"));
  const context = await browser.newContext();
  let local = await startServer();
  let next;
  try {
    const page = await visitOnce(context, local.url);
    await page.click("#startSolo");
    await playMoves(page, ["kite"]);
    const trail = await trailText(page);
    const [oldCache] = await page.evaluate(() => caches.keys());
    const oldVersion = oldCache.slice("shell-".length);
    const newVersion = "0123456789".slice(0, oldVersion.length);
    const built = await readFile("dist/server/index.js", "utf8");
    assert.ok(built.includes(oldVersion));
    const workerFile = join(dir, "index.js");
    await writeFile(workerFile, built.split(oldVersion).join(newVersion));
    await local.stop();
    local = null;
    next = await startServer({port: Number(new URL(page.url()).port), workerFile});

    await page.reload();
    await page.waitForSelector(".toast-action", {timeout: 10000});
    // Still the old version in control until the player chooses to reload.
    assert.deepEqual((await page.evaluate(() => caches.keys())).sort(), [`shell-${newVersion}`, oldCache].sort());
    const scriptBefore = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
    assert.ok(scriptBefore.endsWith("/sw.js"));

    await Promise.all([page.waitForEvent("load"), page.click(".toast-action")]);
    await page.waitForFunction(async v => {
      const keys = await caches.keys();
      return keys.length === 1 && keys[0] === `shell-${v}`;
    }, newVersion, {timeout: 10000});
    await page.waitForSelector(".trail-row");
    assert.deepEqual(await trailText(page), trail, "game survives the update");

    // The new version works offline too.
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector(".trail-row");
    assert.deepEqual(await trailText(page), trail);
  } finally {
    await context.close();
    await local?.stop();
    await next?.stop();
    await rm(dir, {recursive: true, force: true});
  }
});
