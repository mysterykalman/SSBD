import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, continueReveal, launch, lockIn, lockInEnter, playDistinct, progressOf, revealShown, soloRecord, startServer, waitForReveal} from "./helpers.mjs";

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
    await lockIn(page, bot.toLowerCase() === w ? `${w}s` : w); // dismisses the reveal modal
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

// ---------- round 2: offline Solo regression ----------

/** A context that has visited once online (SW installed, controlling), then gone offline, with /api/ calls recorded. */
async function offlineContext(options = {}) {
  const context = await browser.newContext(options);
  const page = await visitOnce(context);
  const apiCalls = watchApi(context);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector("#startSolo");
  return {context, page, apiCalls};
}

const lower = s => String(s).toLowerCase();
// The reveal modal (the board keeps the pre-reveal turn until "Keep playing").
const REVEAL = "#revealModal";

/** What the player sees of the game, checked against the stored record. */
async function assertGameShown(page, game, label) {
  const revealed = game.moves.filter(m => m.words);
  const open = game.moves[game.moves.length - 1];
  const finished = game.status !== "ACTIVE";
  const expectedMove = finished ? revealed[revealed.length - 1].number : open.number;
  const progress = await progressOf(page);
  assert.equal(progress.now, expectedMove, `${label}: aria-valuenow`);
  assert.equal(progress.max, 20, `${label}: aria-valuemax`);
  const moveText = game.language === "fr" ? `Coup ${expectedMove} sur 20` : `Move ${expectedMove} of 20`;
  // The visible move count (whatever element carries it) uses the UI language; the game here matches it.
  if (await page.getAttribute("html", "lang") === game.language) {
    assert.ok((await page.locator(".board").innerText()).includes(moveText), `${label}: shows "${moveText}"`);
  }
  // History: one row per revealed move, newest first.
  const rows = (await page.locator(".trail-row").allInnerTexts()).map(lower);
  assert.equal(rows.length, revealed.length, `${label}: history rows`);
  revealed.slice().reverse().forEach((m, i) => {
    assert.ok(rows[i].includes(lower(m.words.a)) && rows[i].includes(lower(m.words.b)), `${label}: history row ${i} is move ${m.number}`);
  });
  if (finished) {
    assert.equal(await page.locator(".end").count(), 1, `${label}: game over panel`);
  } else if (open.prompts) {
    const prompt = lower(await page.locator("#prompt").innerText());
    assert.ok(prompt.includes(lower(open.prompts[0])) && prompt.includes(lower(open.prompts[1])), `${label}: current prompt`);
    assert.equal(await page.getAttribute("#prompt", "lang"), game.language, `${label}: prompt language`);
  }
}

test("offline Solo regression: new game, several moves, reveal, history, progress; refresh and reopen keep it all", async () => {
  const {context, page: first, apiCalls} = await offlineContext({locale: "en-US", reducedMotion: "reduce"});
  let page = first;
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  let game = await soloRecord(page);
  assert.equal(game.mode, "solo");
  assert.equal(game.language, "en");
  assert.equal((await progressOf(page)).now, 1);
  assert.equal(await page.locator(".trail-row").count(), 0, "a new game has no history");

  // Move 1: the bot's locked word is revealed next to ours.
  const bot = await botWord(page);
  const played = await playDistinct(page, 1, undefined, {continueLast: false});
  const reveal = lower(await revealShown(page));
  assert.ok(reveal.includes(played[0]) && reveal.includes(lower(bot)), "reveal shows both words");
  assert.equal((await progressOf(page)).now, 1, "progress stays on move 1 until Keep playing");
  assert.equal(await page.locator(".trail-row").count(), 0, "history waits for Keep playing");
  assert.ok(await continueReveal(page));
  assert.equal((await progressOf(page)).now, 2);
  played.push(...await playDistinct(page, 3));
  game = await soloRecord(page);
  assert.equal(game.moves.filter(m => m.words).length, 4);
  assert.equal(game.status, "ACTIVE");
  await assertGameShown(page, game, "after 4 moves");

  await page.reload();
  await page.waitForSelector("#word");
  await assertGameShown(page, game, "after refresh");
  assert.equal(await page.getAttribute("html", "lang"), "en");

  const url = page.url();
  await page.close();
  page = await context.newPage();
  await page.goto(server.url); // bare URL resumes the active game
  await page.waitForSelector("#word");
  assert.equal(page.url(), url);
  await assertGameShown(page, game, "after close and reopen");
  assert.deepEqual(await soloRecord(page), game, "record unchanged by reloads");

  // Keep playing after reopening.
  await playDistinct(page, 1);
  game = await soloRecord(page);
  assert.equal(game.moves.filter(m => m.words).length, 5);
  await assertGameShown(page, game, "after a move post-reopen");
  assert.deepEqual(apiCalls, [], "no /api/ requests offline");
  await context.close();
});

test("offline Solo: one-letter words submit by Enter and by button; repeating one is a friendly SAME_AS_LAST (EN and FR)", async () => {
  const {context, page, apiCalls} = await offlineContext({locale: "en-US"});
  const cases = [
    {lang: "en", first: lockInEnter, again: lockIn, message: /You just played S\b/},
    {lang: "fr", first: lockIn, again: lockInEnter, message: /Tu viens de jouer S\b/}
  ];
  for (const c of cases) {
    await page.goto(server.url + "/");
    await page.waitForSelector("#startSolo");
    await page.click(`[data-lang=${c.lang}]`);
    await page.click("#startSolo");
    await page.waitForSelector("#word");
    // Make sure "s" can't match the bot (it never would, but keep the test honest).
    assert.notEqual(lower(await botWord(page)), "s");
    await c.first(page, "s");
    await waitForReveal(page, 0);
    await continueReveal(page);
    let game = await soloRecord(page);
    assert.equal(game.language, c.lang);
    assert.equal(game.moves[0].words.a, "s", `${c.lang}: one-letter word accepted`);
    assert.equal((await progressOf(page)).now, 2);

    await c.again(page, "S");
    await page.waitForFunction(() => document.querySelector("#formHelp")?.classList.contains("error"));
    assert.match(await page.locator("#formHelp").innerText(), c.message);
    assert.equal(await page.getAttribute("#word", "aria-invalid"), "true");
    game = await soloRecord(page);
    assert.equal(game.moves.filter(m => m.words).length, 1, `${c.lang}: rejected word did not become a move`);
    assert.equal(await page.inputValue("#word"), "S", "the typed word is kept so the player can fix it");

    // Survives a refresh in that language.
    await page.reload();
    await page.waitForSelector("#word");
    assert.equal(await page.getAttribute("html", "lang"), c.lang);
    await assertGameShown(page, game, `${c.lang} one-letter after refresh`);
  }
  assert.deepEqual(apiCalls, []);
  await context.close();
});

test("offline Solo: play to move 19, then 20, final reveal then game over; no move 21; refresh keeps it; Play again starts clean", async () => {
  const {context, page, apiCalls} = await offlineContext({locale: "en-US", reducedMotion: "reduce"});
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  const id = new URL(page.url()).pathname.split("/").pop();
  assert.equal((await soloRecord(page)).mode, "solo", "mode at creation");

  await playDistinct(page, 18);
  let game = await soloRecord(page);
  assert.equal(game.mode, "solo", "mode mid-game");
  assert.equal(game.moves.length, 19);
  assert.equal(game.status, "ACTIVE");
  assert.equal((await progressOf(page)).now, 19);
  await assertGameShown(page, game, "move 19 open");

  await playDistinct(page, 1);
  game = await soloRecord(page);
  assert.equal(game.moves.length, 20);
  assert.equal(game.status, "ACTIVE", "move 20 is still playable");
  assert.equal((await progressOf(page)).now, 20);
  assert.equal(await page.isEnabled("#word"), true);
  await assertGameShown(page, game, "move 20 open");

  const [last] = await playDistinct(page, 1, undefined, {continueLast: false});
  game = await soloRecord(page);
  assert.equal(game.status, "EXHAUSTED");
  assert.equal(game.mode, "solo", "mode at completion");
  assert.equal(game.moves.length, 20);
  // The final reveal is shown first, then the game-over state.
  const reveal = lower(await revealShown(page));
  assert.ok(reveal.includes(last) && reveal.includes(lower(game.moves[19].words.b)), "final reveal visible");
  assert.equal(await page.locator("#app .end").count(), 0, "game over waits for the final reveal");
  assert.ok(await continueReveal(page));
  await page.waitForSelector(".end");
  assert.equal(await page.isVisible(".end"), true);
  await assertGameShown(page, game, "game over");
  for (const sel of ["#word", "#lockBtn"]) {
    const n = await page.locator(sel).count();
    assert.ok(n === 0 || await page.isDisabled(sel), `${sel} absent or disabled after move 20`);
  }

  // Trying to submit anyway (Enter with no button focused, or a scripted form submit) does nothing harmful.
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Enter");
  await page.evaluate(() => {
    const form = document.querySelector("#wordForm");
    form?.requestSubmit?.();
  });
  await page.waitForTimeout(200);
  assert.deepEqual(await soloRecord(page), game, "no move 21, record untouched");
  assert.equal(await page.isVisible(".end"), true);

  await page.reload();
  await page.waitForSelector(".end");
  assert.deepEqual(await soloRecord(page), game);
  await assertGameShown(page, game, "game over after refresh");
  assert.equal(await page.locator("#word").count(), 0);

  // Play again: a fresh game, nothing carried over.
  await page.click("#newGameBtn");
  await page.waitForSelector("#word");
  const nextId = new URL(page.url()).pathname.split("/").pop();
  assert.notEqual(nextId, id);
  const fresh = await soloRecord(page);
  assert.equal(fresh.mode, "solo");
  assert.equal(fresh.status, "ACTIVE");
  assert.equal(fresh.moves.length, 1);
  assert.equal(fresh.moves[0].words, null);
  assert.equal(fresh.moves[0].prompts, null);
  assert.equal(await page.locator(".trail-row").count(), 0, "no stale history");
  assert.equal(await page.locator(".end").count(), 0);
  assert.equal(await page.locator(REVEAL).count(), 0, "no stale reveal");
  assert.equal(await page.inputValue("#word"), "");
  assert.equal((await progressOf(page)).now, 1, "progress restarts");
  assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem("ssbd.store")).solo[id].status, id), "EXHAUSTED", "old game kept as finished");
  await playDistinct(page, 1);
  assert.equal((await soloRecord(page)).moves.filter(m => m.words).length, 1);
  assert.deepEqual(apiCalls, []);
  await context.close();
});

test("offline: family create/join/invite and notifications are not offered; a friendly note explains", async () => {
  const context = await browser.newContext({locale: "en-US"});
  const page = await visitOnce(context);
  // A device that already has a family player: the riskiest case (no name prompt stands in the way).
  await page.evaluate(() => localStorage.setItem("ssbd_player", JSON.stringify({id: "p_test", display_name: "Kim", recovery_code: "ABCD-EFGH"})));
  const apiCalls = watchApi(context);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector("#startSolo");

  const bell = "#notifBtn, #notificationsBtn, #bellBtn, .bell, [data-notifications]";
  const assertNoFamily = async label => {
    for (const sel of ["#createFamily", "#joinFamily"]) {
      const n = await page.locator(sel).count();
      assert.ok(n === 0 || await page.isDisabled(sel), `${label}: ${sel} not offered`);
    }
    for (const el of await page.locator(bell).all()) {
      assert.ok(!(await el.isVisible()) || await el.isDisabled(), `${label}: notifications bell not offered`);
    }
    assert.equal(await page.locator("#joinCode").count(), 0, `${label}: no invite code`);
    assert.equal(await page.evaluate(() => document.querySelector("#dialog")?.open || false), false, `${label}: no join/name dialog`);
  };
  await assertNoFamily("home");
  assert.match(await page.locator(".family-card").innerText(), /Playing together needs the internet\. Solo doesn’t\./);

  // Clicking the disabled buttons does nothing.
  await page.locator("#joinFamily").click({force: true}).catch(() => {});
  await assertNoFamily("after clicking join");

  // An invite link opened offline lands on home without offering to join.
  await page.goto(server.url + "/join/ABCD");
  await page.waitForSelector("#startSolo");
  await page.waitForTimeout(100);
  await assertNoFamily("invite link");

  // A family game link offline explains instead of breaking.
  await page.goto(server.url + "/games/abc123");
  await page.waitForSelector("#app .notice.error, #startSolo");
  if (await page.locator("#app .notice.error").count()) {
    assert.match(await page.locator("#app .notice.error").innerText(), /internet/i);
  }
  await assertNoFamily("family game link");

  // Solo game screen never shows invite or notifications offline.
  await page.goto(server.url + "/");
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  await assertNoFamily("solo game");
  await playDistinct(page, 1);
  await assertNoFamily("solo game after a move");
  // Only the family game link tried the network; Solo never did.
  assert.ok(apiCalls.every(u => new URL(u).pathname === "/api/game"), `unexpected API calls: ${apiCalls}`);
  await context.close();
});

test("offline Solo: a second Enter right after the final move does not skip the game-over screen", async () => {
  const {context, page, apiCalls} = await offlineContext({locale: "en-US"});
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  await playDistinct(page, 19);
  const game = await soloRecord(page);
  const bot = lower(game.moves[19].hidden.b);
  const word = ["lantern", "trumpet", "walrus"].find(w => w !== bot && !game.moves.some(m => m.words && lower(m.words.a) === w));
  // A child types the last word and presses Enter twice (or holds it a little too long).
  await page.fill("#word", word);
  await page.press("#word", "Enter");
  await waitForReveal(page, 19);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await continueReveal(page);
  const after = await soloRecord(page);
  assert.equal(after.id, game.id, "still on the finished game, not a new one");
  assert.equal(after.status, "EXHAUSTED");
  await page.waitForSelector(".end");
  assert.equal(await page.isVisible(".end"), true, "game-over screen stays up");
  assert.ok(lower(await page.locator("#app").innerText()).includes(word), "final word still shown");
  assert.deepEqual(apiCalls, []);
  await context.close();
});

test("going offline closes an open family join dialog instead of letting it fail", async () => {
  const context = await browser.newContext({locale: "en-US"});
  const page = await visitOnce(context);
  await page.evaluate(() => localStorage.setItem("ssbd_player", JSON.stringify({id: "p_test", display_name: "Kim", recovery_code: "ABCD-EFGH"})));
  await page.goto(server.url + "/join/ABCD");
  await page.waitForSelector("#joinInput");
  await context.setOffline(true);
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  assert.equal(await page.isDisabled("#joinFamily"), true);
  assert.match(await page.locator(".family-card").innerText(), /Playing together needs the internet\. Solo doesn’t\./);
  await context.close();
});
