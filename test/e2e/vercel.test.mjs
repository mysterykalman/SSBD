// The app served the way Vercel serves it (static dist/, the rewrites and headers in
// vercel.json, /api/* answered by api/index.js) with Family mode on PostgreSQL.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {botWord, launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const post = (path, body, base = server.url) => fetch(base + path, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(r => r.json());
/** A browser context that already knows this player (as if they named themselves earlier). */
async function contextAs(player, options = {}) {
  const context = await browser.newContext({reducedMotion: "reduce", ...options});
  await context.addInitScript(p => localStorage.setItem("ssbd_player", JSON.stringify(p)), player);
  return context;
}

test("routing: deep links serve the app, /api/* always answers JSON, assets and the service worker get the right headers", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.equal(config.outputDirectory, "dist");
  for (const path of ["/", "/games/some-id", "/join/ABCD-12", "/solo", "/solo/some-id", "/index.html"]) {
    const res = await fetch(server.url + path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get("content-type"), /text\/html/, path);
    assert.match(await res.text(), /<main id="app"/, path);
  }
  for (const path of ["/api/nope", "/api/games/nope", "/api"]) {
    const res = await fetch(server.url + path);
    assert.equal(res.status, 404, path);
    assert.match(res.headers.get("content-type"), /application\/json/, path);
    assert.equal((await res.json()).code, "NOT_FOUND");
  }
  const health = await fetch(server.url + "/api/health");
  assert.deepEqual(await health.json(), {ok: true, db: true});
  assert.equal(health.headers.get("cache-control"), "no-store");
  const sw = await fetch(server.url + "/sw.js");
  assert.equal(sw.headers.get("cache-control"), "no-store");
  assert.equal(sw.headers.get("service-worker-allowed"), "/");
  const html = await (await fetch(server.url + "/")).text();
  const asset = html.match(/\/assets\/app\.[0-9a-f]+\.js/)[0];
  assert.match((await fetch(server.url + asset)).headers.get("cache-control"), /immutable/);
  assert.equal((await fetch(server.url + "/games/x")).headers.get("cache-control"), "no-cache");
  assert.equal((await fetch(server.url + "/assets/missing.js")).status, 404, "a missing asset is a 404, not the app page");
});

test("deep links on a cold first visit: an invite link joins the game, a game link opens it", async () => {
  const ana = await post("/api/player", {display_name: "Ana"});
  const ben = await post("/api/player", {display_name: "Ben"});
  const game = await post("/api/games", {player_id: ana.id, solo: false});
  // Ben opens the invite link in a brand-new browser.
  const ctxB = await contextAs(ben);
  const pageB = await ctxB.newPage();
  await pageB.goto(`${server.url}/join/${game.join_code}`);
  await pageB.waitForSelector("dialog #joinInput");
  assert.equal(await pageB.inputValue("#joinInput"), game.join_code);
  await pageB.click('dialog button[type="submit"]');
  await pageB.waitForSelector("#word");
  assert.match(pageB.url(), new RegExp(`/games/${game.id}$`));
  // Ana opens the game link directly.
  const ctxA = await contextAs(ana);
  const pageA = await ctxA.newPage();
  await pageA.goto(`${server.url}/games/${game.id}`);
  await pageA.waitForSelector("#word");
  assert.match(await pageA.locator(".mode-chip").innerText(), /Ben/);
  // Reload on the deep link keeps working.
  await pageA.reload();
  await pageA.waitForSelector("#word");
  await ctxA.close();
  await ctxB.close();
});

test("recovery: a recovery code brings a player and their games back on a new device", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "Rosa");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  const code = (await page.locator("#joinCode").innerText()).trim();
  const player = await page.evaluate(() => JSON.parse(localStorage.getItem("ssbd_player")));
  assert.match(player.recovery_code, /^ROSA-\d{4}$/);
  await context.close();

  const fresh = await browser.newContext({reducedMotion: "reduce"});
  const other = await fresh.newPage();
  await other.goto(server.url);
  await other.click("#profileBtn");
  await other.getByRole("button", {name: "I have a recovery code"}).click();
  await other.fill("#recoveryInput", player.recovery_code.toLowerCase());
  await other.click('dialog button[type="submit"]');
  await other.waitForFunction(() => JSON.parse(localStorage.getItem("ssbd_player") || "null")?.display_name === "Rosa");
  assert.equal(await other.evaluate(() => JSON.parse(localStorage.getItem("ssbd_player")).id), player.id);
  // Their waiting game is listed again (the dashboard is read for the recovered player).
  await other.waitForFunction(() => document.querySelectorAll("#gameList .game-item").length === 1);
  const dashboard = await (await fetch(`${server.url}/api/dashboard?player_id=${player.id}`)).json();
  assert.equal(dashboard.games[0].join_code, code);
  await other.click("#profileBtn");
  assert.match(await other.locator("#dialog").innerText(), /ROSA-\d{4}/);
  await fresh.close();
});

test("Family mode unavailable: no database (JSON 503) and a host answering HTML both show a calm note; Solo still plays", async () => {
  const noDb = await startServer({database: false});
  try {
    const context = await browser.newContext({reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(noDb.url);
    await page.waitForSelector("#familyUnavailable");
    assert.match(await page.locator(".family-card").innerText(), /Playing together is taking a break right now\. Solo still works\./);
    assert.equal(await page.isDisabled("#createFamily"), true);
    assert.equal(await page.isDisabled("#joinFamily"), true);
    // Solo is untouched.
    await page.click("#startSolo");
    await page.waitForSelector("#word");
    const bot = await botWord(page);
    await page.fill("#word", bot.toLowerCase() === "acorn" ? "maple" : "acorn");
    await page.click("#lockBtn");
    await page.waitForSelector("#revealContinue");
    await context.close();
  } finally {
    await noDb.stop();
  }

  // The original preview bug: /api/* answered by a static host's HTML 404 page.
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.route("**/api/**", route => route.fulfill({status: 404, contentType: "text/html", body: "<!doctype html><title>404</title>"}));
  await page.goto(server.url);
  await page.waitForSelector("#familyUnavailable");
  assert.equal(await page.isDisabled("#createFamily"), true);
  await page.click('[data-lang="fr"]');
  assert.match(await page.locator(".family-card").innerText(), /Le jeu à deux fait une pause pour l’instant\. Le solo marche toujours\./);
  await page.click('[data-lang="en"]');
  // When the API comes back, "Try again" re-enables Family mode, and creating a game works.
  await page.unroute("**/api/**");
  await page.click("#retryFamily");
  await page.waitForSelector("#createFamily:not([disabled])");
  await page.click("#createFamily");
  await page.fill("#nameInput", "Kai");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  await context.close();
});

test("a request that gets HTML back mid-flow says Family mode is unavailable, not a generic error", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#createFamily:not([disabled])");
  await page.click("#createFamily");
  await page.route("**/api/player", route => route.fulfill({status: 502, contentType: "text/html", body: "<html>Bad gateway</html>"}));
  await page.fill("#nameInput", "Lu");
  await page.click('dialog button[type="submit"]');
  await page.waitForFunction(() => /taking a break/.test(document.getElementById("dialogError")?.textContent || ""));
  assert.doesNotMatch(await page.locator("#dialogError").innerText(), /got lost/);
  await context.close();
});
