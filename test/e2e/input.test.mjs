// Word input: one-letter words, case/whitespace/accents, duplicates, Enter vs button,
// visible feedback next to the input, and the opt-in submit trace (window.__submitTrace,
// on automatically under webdriver). Offline Solo one-letter cases live in offline.test.mjs.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {continueReveal, launch, soloRecord, startServer, startSolo, waitForReveal} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

async function soloPage({lang = "en", viewport = {width: 390, height: 844}} = {}) {
  const context = await browser.newContext({viewport, hasTouch: true});
  await context.addInitScript(l => { try { localStorage.setItem("ssbd_language", l); } catch {} }, lang);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  return {context, page, errors};
}

const revealed = async page => ((await soloRecord(page))?.moves || []).filter(m => m.words);
const traceOf = page => page.evaluate(() => window.__submitTrace || []);
const lastTrace = async (page, event) => (await traceOf(page)).filter(e => e.event === event).at(-1);

/** Submit `word` by Enter or button; returns after the reveal (accepted) or the feedback (rejected). */
async function submit(page, word, how = "enter") {
  const before = (await revealed(page)).length;
  await page.evaluate(() => { window.__submitTrace = []; });
  await page.fill("#word", word);
  if (how === "enter") await page.press("#word", "Enter");
  else await page.click("#lockBtn");
  const accepted = await page.waitForFunction(n => {
    const t = window.__submitTrace || [];
    const last = t.at(-1);
    if (last?.event === "rejected") return "rejected";
    const id = location.pathname.split("/").pop();
    const game = JSON.parse(localStorage.getItem("ssbd.store") || "null")?.solo?.[id];
    return game && game.moves.filter(m => m.words).length > n ? "accepted" : false;
  }, before).then(h => h.jsonValue());
  if (accepted === "accepted") {
    await waitForReveal(page, before);
    await continueReveal(page);
    await page.waitForSelector("#word");
  }
  return accepted;
}

/** The feedback line is shown as an error, tied to the input, and on screen next to it. */
async function assertVisibleFeedback(page, pattern) {
  await page.waitForFunction(() => document.getElementById("formHelp")?.classList.contains("error") && document.getElementById("formHelp").textContent.trim());
  await page.waitForTimeout(400); // let the (smooth) scroll settle
  const info = await page.evaluate(() => {
    const help = document.getElementById("formHelp"), input = document.getElementById("word");
    const r = help.getBoundingClientRect(), i = input.getBoundingClientRect();
    const vv = window.visualViewport;
    const top = vv ? vv.offsetTop : 0, bottom = top + (vv ? vv.height : innerHeight);
    return {
      text: help.textContent, invalid: input.getAttribute("aria-invalid"), describedBy: input.getAttribute("aria-describedby") || "",
      inView: r.top >= top && r.bottom <= bottom && i.top >= top && i.bottom <= bottom,
      gap: Math.min(Math.abs(i.top - r.bottom), Math.abs(r.top - i.bottom)), focused: document.activeElement === input
    };
  });
  assert.match(info.text, pattern);
  assert.equal(info.invalid, "true", "input is marked aria-invalid");
  assert.ok(info.describedBy.split(/\s+/).includes("formHelp"), "message describes the input");
  assert.ok(info.inView, `message and input are both on screen: ${JSON.stringify(info)}`);
  assert.ok(info.gap < 40, `message sits right next to the input (gap ${info.gap}px)`);
  assert.ok(info.focused, "input keeps focus so the keyboard stays up");
}

test("EN: one-letter words s, a and I are accepted by Enter and by the button, with a full trace", async () => {
  const {context, page, errors} = await soloPage();
  assert.equal(await submit(page, "s", "enter"), "accepted");
  const checked = await lastTrace(page, "checked");
  assert.equal(checked.source, "enter");
  assert.equal(checked.raw, "s");
  assert.equal(checked.trimmed, "s");
  assert.equal(checked.key, "s");
  assert.equal(checked.keyLength, 1);
  assert.equal(checked.minLengthOk, true);
  assert.equal(checked.validation, "ok");
  assert.equal(checked.duplicate, false);
  assert.equal(checked.buttonDisabled, false);
  const result = await lastTrace(page, "result");
  assert.equal(result.path, "local");
  assert.equal(result.ok, true);

  assert.equal(await submit(page, "a", "button"), "accepted");
  assert.equal((await lastTrace(page, "submit")).source, "button");
  assert.equal(await submit(page, "I", "enter"), "accepted");
  assert.deepEqual((await revealed(page)).map(m => m.words.a), ["s", "a", "I"]);
  assert.equal(await page.inputValue("#word"), "", "input is cleared for the next move");
  assert.deepEqual(errors, []);
  await context.close();
});

test("EN: whitespace and case variants; one-letter duplicates get a visible, friendly message", async () => {
  const {context, page} = await soloPage({viewport: {width: 320, height: 640}});
  assert.equal(await submit(page, " s ", "enter"), "accepted");
  const checked = await lastTrace(page, "checked");
  assert.equal(checked.raw, " s ");
  assert.equal(checked.trimmed, "s");
  assert.equal((await revealed(page))[0].words.a, "s", "stored without the spaces");

  // Same as last move, whatever the case.
  assert.equal(await submit(page, "S", "button"), "rejected");
  await assertVisibleFeedback(page, /just played S/i);
  let rejected = await lastTrace(page, "rejected");
  assert.equal(rejected.code, "SAME_AS_LAST");
  assert.equal(rejected.duplicate, "SAME_AS_LAST");
  assert.equal(rejected.source, "button");
  assert.ok(rejected.reason);
  assert.equal(await page.inputValue("#word"), "S", "the player's word is kept so they can change it");

  // Typing clears the message.
  await page.type("#word", "x");
  assert.equal(await page.getAttribute("#word", "aria-invalid"), "false");

  // Already used earlier in the game.
  assert.equal(await submit(page, "b", "enter"), "accepted");
  assert.equal(await submit(page, "s", "enter"), "rejected");
  await assertVisibleFeedback(page, /already used S/i);
  rejected = await lastTrace(page, "rejected");
  assert.equal(rejected.code, "ALREADY_USED");
  assert.equal(rejected.source, "enter");
  // The same rejection again is still shown (and re-announced), never silently ignored.
  assert.equal(await submit(page, " S ", "enter"), "rejected");
  await assertVisibleFeedback(page, /already used S/i);
  assert.equal((await revealed(page)).length, 2);
  await context.close();
});

test("an empty submission is never silent, even with the keyboard up on a small phone", async () => {
  // 320x352 stands in for a 320x640 phone with the on-screen keyboard open.
  const {context, page} = await soloPage({viewport: {width: 320, height: 352}});
  assert.equal(await submit(page, "giraffe", "button"), "accepted");
  for (const value of ["", "   "]) {
    assert.equal(await submit(page, value, "enter"), "rejected");
    await assertVisibleFeedback(page, /type a word/i);
    assert.equal((await lastTrace(page, "rejected")).code, "EMPTY");
  }
  await context.close();
});

test("FR: é and É are one-letter words, accents and case count as the same word", async () => {
  const {context, page} = await soloPage({lang: "fr"});
  assert.equal(await page.getAttribute("#word", "lang"), "fr");
  assert.equal(await submit(page, "é", "enter"), "accepted");
  assert.equal((await lastTrace(page, "checked")).language, "fr");
  assert.equal(await submit(page, "É", "button"), "rejected");
  await assertVisibleFeedback(page, /Tu viens de jouer É/);
  assert.equal(await submit(page, "e", "enter"), "rejected");
  assert.equal((await lastTrace(page, "rejected")).code, "SAME_AS_LAST");
  assert.equal(await submit(page, "a", "button"), "accepted");
  assert.equal(await submit(page, "É", "enter"), "rejected");
  await assertVisibleFeedback(page, /déjà utilisé É/);
  assert.deepEqual((await revealed(page)).map(m => m.words.a), ["é", "a"]);
  await context.close();
});

test("the 'Did you mean?' hint never blocks the player's own word", async () => {
  const {context, page} = await soloPage();
  await page.fill("#word", "elephnt");
  await page.waitForSelector("#suggestion button");
  assert.match(await page.locator("#suggestion").innerText(), /ELEPHANT/);
  // The hint is in view next to the input, not hidden below the button.
  const gap = await page.evaluate(() => document.getElementById("word").getBoundingClientRect().top - document.getElementById("suggestion").getBoundingClientRect().bottom);
  assert.ok(gap >= 0 && gap < 40, `suggestion sits just above the input (gap ${gap}px)`);
  const before = (await revealed(page)).length;
  await page.press("#word", "Enter");
  await waitForReveal(page, before);
  assert.equal((await revealed(page))[0].words.a, "elephnt", "submitted exactly as typed");
  await context.close();
});

test("family game: a one-letter word goes through the API and a double submit shows it is in progress", async () => {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  const ana = await ctxA.newPage(), ben = await ctxB.newPage();
  await ana.goto(server.url);
  await ana.click("#createFamily");
  await ana.fill("#nameInput", "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  await ben.goto(`${server.url}/join/${code}`);
  await ben.fill("#nameInput", "Ben");
  await ben.click('dialog button[type="submit"]');
  await ben.waitForSelector("dialog #joinInput");
  await ben.click('dialog button[type="submit"]');
  await ben.waitForSelector("#word");
  await ana.waitForSelector("#word", {timeout: 10000});

  // Hold the request so the in-flight state can be checked.
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await ana.route("**/api/submit", async route => { await held; await route.continue(); });
  await ana.evaluate(() => { window.__submitTrace = []; });
  await ana.fill("#word", "s");
  await ana.press("#word", "Enter");
  await ana.waitForFunction(() => document.getElementById("lockBtn")?.disabled);
  assert.match(await ana.locator("#lockBtn").innerText(), /Locking/i, "the button shows the word is on its way");
  await ana.evaluate(() => document.getElementById("wordForm").requestSubmit());
  const ignored = (await traceOf(ana)).find(e => e.event === "ignored");
  assert.equal(ignored?.reason, "in-flight");
  release();
  await ana.waitForSelector(".notice.pending");
  assert.match(await ana.locator(".notice.pending").innerText(), /\bS\b/);
  const result = (await traceOf(ana)).filter(e => e.event === "result").at(-1);
  assert.equal(result.path, "api");
  assert.equal(result.ok, true);
  assert.equal(result.keyLength, 1);
  assert.equal((await traceOf(ana)).filter(e => e.event === "result").length, 1, "submitted once");
  await ctxA.close();
  await ctxB.close();
});

test("no trace outside automation unless asked for", async () => {
  const context = await browser.newContext();
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", {get: () => false}));
  const page = await context.newPage();
  const logs = [];
  page.on("console", m => logs.push(m.text()));
  await page.goto(server.url);
  await startSolo(page);
  await page.fill("#word", "s");
  await page.press("#word", "Enter");
  await waitForReveal(page, 0);
  assert.equal(await page.evaluate(() => window.__submitTrace), undefined);
  assert.equal(logs.filter(l => l.includes("[submit]")).length, 0);
  // ?debug=1 turns it on.
  await page.goto(`${server.url}/?debug=1`);
  await startSolo(page);
  await page.fill("#word", "s");
  await page.press("#word", "Enter");
  await waitForReveal(page, 0);
  assert.ok((await page.evaluate(() => window.__submitTrace || [])).some(e => e.event === "result"));
  await context.close();
});
