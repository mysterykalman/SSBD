// The on-screen keyboard: while typing a word on a phone, the two words in play, the hint or error,
// the input and the Lock button all stay in the part of the screen the keyboard leaves visible.
// Android shrinks the layout viewport (interactive-widget=resizes-content): simulated by resizing.
// iOS only shrinks the visual viewport: simulated with a stand-in window.visualViewport.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, lockIn, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** A stand-in visualViewport whose height the test controls (what iOS does when its keyboard opens). */
const iosViewport = () => {
  const vv = new EventTarget();
  let keyboard = 0; // measured live: before the viewport meta applies, innerHeight is not the phone's yet
  Object.defineProperties(vv, {
    height: {get: () => innerHeight - keyboard}, width: {get: () => innerWidth}, offsetTop: {get: () => 0}, offsetLeft: {get: () => 0},
    pageTop: {get: () => scrollY}, pageLeft: {get: () => 0}, scale: {get: () => 1}
  });
  Object.defineProperty(window, "visualViewport", {value: vv, configurable: true});
  window.__keyboard = px => { keyboard = px; vv.dispatchEvent(new Event("resize")); };
};

/** Solo game on move 2, so there are two words in play. */
async function soloOnMove2(context) {
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "garden" ? "pencil" : "garden");
  await page.waitForSelector("#prompt");
  return page;
}

/** Which of the essentials sit fully inside the visible band [0, visibleHeight]. */
const essentials = page => page.evaluate(() => {
  const visible = window.visualViewport ? window.visualViewport.height : innerHeight;
  const out = {};
  for (const [name, el] of [["words", document.getElementById("prompt")], ["help", document.getElementById("formHelp")], ["input", document.getElementById("word")], ["button", document.getElementById("lockBtn")]]) {
    const r = el.getBoundingClientRect();
    out[name] = r.height > 0 && r.top >= -1 && r.bottom <= visible + 1;
  }
  return {...out, visible, kb: document.documentElement.classList.contains("kb-open"), sideways: document.documentElement.scrollWidth > innerWidth + 1};
});
const allVisible = {words: true, help: true, input: true, button: true};

test("Android-style keyboard (the viewport shrinks): words, hint, input and button stay visible, errors too", async () => {
  for (const [width, height, keyboard] of [[390, 844, 336], [360, 740, 320], [320, 568, 260]]) {
    const context = await browser.newContext({viewport: {width, height}, isMobile: true, hasTouch: true, reducedMotion: "reduce"});
    const page = await soloOnMove2(context);
    await page.focus("#word");
    await page.setViewportSize({width, height: height - keyboard});
    await page.waitForFunction(() => document.documentElement.classList.contains("kb-open"));
    await page.waitForTimeout(150);
    let seen = await essentials(page);
    assert.deepEqual({words: seen.words, help: seen.help, input: seen.input, button: seen.button}, allVisible, `${width}x${height} keyboard ${keyboard}: ${JSON.stringify(seen)}`);
    assert.equal(seen.sideways, false);
    // A rejected word: the error is visible too, and the keyboard stays up (focus kept).
    await page.fill("#word", "");
    await page.click("#lockBtn");
    await page.waitForFunction(() => document.getElementById("formHelp").classList.contains("error"));
    await page.waitForTimeout(150);
    seen = await essentials(page);
    assert.deepEqual({words: seen.words, help: seen.help, input: seen.input, button: seen.button}, allVisible, `error at ${width}: ${JSON.stringify(seen)}`);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "word");
    // Keyboard closes: the full layout comes back.
    await page.setViewportSize({width, height});
    await page.locator("#word").blur();
    await page.waitForFunction(() => !document.documentElement.classList.contains("kb-open"));
    assert.ok(await page.locator(".game-nav").isVisible(), "back button row is back");
    assert.ok(await page.locator(".board .progress").isVisible(), "progress is back");
    await context.close();
  }
});

test("iOS-style keyboard (only the visual viewport shrinks): the play area is scrolled into the visible part", async () => {
  for (const [width, height, keyboard] of [[390, 844, 336], [375, 667, 300], [320, 568, 260]]) {
    const context = await browser.newContext({viewport: {width, height}, isMobile: true, hasTouch: true, reducedMotion: "reduce"});
    await context.addInitScript(iosViewport);
    const page = await soloOnMove2(context);
    await page.focus("#word");
    await page.evaluate(px => window.__keyboard(px), keyboard);
    await page.waitForFunction(() => document.documentElement.classList.contains("kb-open"));
    await page.waitForTimeout(150);
    const seen = await essentials(page);
    assert.equal(seen.visible, height - keyboard);
    assert.deepEqual({words: seen.words, help: seen.help, input: seen.input, button: seen.button}, allVisible, `${width}x${height}: ${JSON.stringify(seen)}`);
    // The decorative parts step aside only while typing.
    assert.equal(await page.locator(".board .progress").isVisible(), false);
    await page.evaluate(() => window.__keyboard(0));
    await page.waitForFunction(() => !document.documentElement.classList.contains("kb-open"));
    assert.ok(await page.locator(".board .progress").isVisible());
    await context.close();
  }
});

test("Together mode: the same keyboard behaviour on the shared play panel", async () => {
  const post = (path, body) => fetch(server.url + path, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(r => r.json());
  const ana = await post("/api/player", {display_name: "Ana"}), ben = await post("/api/player", {display_name: "Ben"});
  const game = await post("/api/games", {player_id: ana.id, solo: false});
  await post("/api/games/join", {player_id: ben.id, join_code: game.join_code});
  await post("/api/submit", {game_id: game.id, player_id: ana.id, word: "ocean", move: 1});
  await post("/api/submit", {game_id: game.id, player_id: ben.id, word: "forest", move: 1});
  const context = await browser.newContext({viewport: {width: 375, height: 667}, isMobile: true, hasTouch: true, reducedMotion: "reduce"});
  await context.addInitScript(p => { try { localStorage.setItem("ssbd_player", JSON.stringify(p)); localStorage.setItem("ssbd.store", JSON.stringify({schema: 99})); } catch {} }, ana);
  await context.addInitScript(iosViewport);
  const page = await context.newPage();
  await page.goto(`${server.url}/games/${game.id}`);
  const cont = page.locator("#revealContinue");
  await cont.waitFor({timeout: 10000}).then(() => cont.click()).catch(() => {});
  await page.waitForSelector("#prompt");
  await page.focus("#word");
  await page.evaluate(() => window.__keyboard(300));
  await page.waitForFunction(() => document.documentElement.classList.contains("kb-open"));
  await page.waitForTimeout(150);
  const seen = await essentials(page);
  assert.deepEqual({words: seen.words, help: seen.help, input: seen.input, button: seen.button}, allVisible, JSON.stringify(seen));
  await context.close();
});

test("desktop: focusing the word box changes nothing (no keyboard mode, no scrolling)", async () => {
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, reducedMotion: "reduce"});
  const page = await soloOnMove2(context);
  const before = await page.evaluate(() => scrollY);
  await page.focus("#word");
  await page.setViewportSize({width: 1280, height: 560}); // a shorter window is not a keyboard
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("kb-open")), false);
  assert.ok(await page.locator(".game-nav").isVisible());
  assert.ok(await page.locator(".board .progress").isVisible());
  assert.ok(Math.abs((await page.evaluate(() => scrollY)) - before) < 2, "no scrolling on desktop");
  await context.close();
});
