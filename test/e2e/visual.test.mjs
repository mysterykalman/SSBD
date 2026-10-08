// Visual overlap checks: connectors (→ + =), chips, tiles, badges, stickers and buttons never
// sit on top of each other or past the screen edge, at four viewports, in EN and FR, with short,
// long, accented and one-letter words, and again with the text size doubled.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, continueReveal, launch, lockIn, noHorizontalScroll, playDistinct, revealShown, SHOTS, soloRecord, startServer, startSolo, usedWords} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const VIEWPORTS = {
  "320x640": {width: 320, height: 640},
  "667x375": {width: 667, height: 375},
  "768x1024": {width: 768, height: 1024},
  "1280x800": {width: 1280, height: 800}
};
const WORDS = {
  en: ["Supercalifragilistic", "crème brûlée", "s", "cat"],
  fr: ["arc-en-ciel magique", "crème brûlée", "s", "chat"]
};

/** Pairwise overlaps inside each row/box, and anything past the left/right edge of the viewport. */
async function layoutProblems(page) {
  return page.evaluate(() => {
    const ITEMS = ".chip, .tile, .arrow, .op, .move-badge, .match-badge, .start-label, .trail-next, .now-label, .stone, .rv-kicker, .rv-word, .rv-outcome, .rv-next, .badge, .btn, button, .move-count, .progress-sub, .code";
    const GROUPS = ".trail-row, .trail-now, #prompt, .progress, .end, .game-nav, .topbar, .word-form, .game-item, .notif-row, dialog[open]";
    const problems = [];
    const shown = el => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !el.closest("[hidden], .sr-only");
    };
    const label = el => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}"${(el.textContent || "").trim().slice(0, 24)}"`;
    const vw = document.documentElement.clientWidth;
    for (const el of document.querySelectorAll(ITEMS)) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > vw + 1) problems.push(`past the screen edge: ${label(el)} [${Math.round(r.left)}..${Math.round(r.right)}] / ${vw}`);
    }
    for (const group of document.querySelectorAll(GROUPS)) {
      if (!shown(group)) continue;
      // Only compare items whose nearest group is this one (nested groups are checked on their own).
      const items = [...group.querySelectorAll(ITEMS)].filter(el => shown(el) && el.parentElement.closest(GROUPS) === group);
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          if (a.contains(b) || b.contains(a)) continue;
          const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
          const x = Math.min(p.right, q.right) - Math.max(p.left, q.left);
          const y = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
          if (x > 1.5 && y > 1.5) problems.push(`overlap in ${group.className || group.id || group.tagName}: ${label(a)} × ${label(b)} (${x.toFixed(1)}×${y.toFixed(1)})`);
        }
      }
    }
    return problems;
  });
}

/** What sticks out sideways (for a readable failure message). */
async function wideItems(page) {
  return page.evaluate(() => [...document.querySelectorAll("body *")]
    .filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 || (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === "visible"))
    .map(e => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${e.scrollWidth}/${e.clientWidth}`).slice(0, 12));
}

async function check(page, where) {
  assert.ok(await noHorizontalScroll(page), `${where}: page scrolls sideways`);
  assert.deepEqual(await layoutProblems(page), [], `${where}: overlapping or clipped items`);
}

/** The open reveal modal: its words, connector, next-move line, kicker and button fit the screen and don't overlap. */
async function checkReveal(page, where, word) {
  const text = await revealShown(page);
  assert.ok(text.toLowerCase().includes(word.toLowerCase()), `${where}: the modal shows the word played`);
  const box = await page.evaluate(() => {
    const dlg = document.querySelector("dialog#revealModal[open]");
    const r = dlg && dlg.getBoundingClientRect();
    // The result: the outcome line, or Gary's AFTER line in his speech bubble (his narrative replaces it).
    const parts = ["rv-kicker", "rv-word", "op", "rv-outcome", "rv-continue"].filter(c => !dlg?.querySelector(c === "rv-outcome" ? ".rv-outcome, #garyLine" : `.${c}`));
    return r && {left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: document.documentElement.clientWidth, vh: innerHeight, missing: parts};
  });
  assert.ok(box, `${where}: reveal modal open`);
  assert.deepEqual(box.missing, [], `${where}: reveal modal parts`);
  assert.ok(box.left >= -1 && box.right <= box.vw + 1 && box.top >= -1 && box.bottom <= box.vh + 1, `${where}: reveal modal inside the viewport ${JSON.stringify(box)}`);
  await check(page, `${where} (reveal modal)`);
}

/**
 * Play `words` in order (skipping any the bot has locked, so the game never ends by a match).
 * With `where`, each reveal modal is checked for overlaps before "Keep playing", and the board after it.
 */
async function playWords(page, words, where = null) {
  for (const word of words) {
    if (await page.locator(".end").count()) break;
    const bot = (await botWord(page) || "").toLowerCase();
    // Skip the bot's locked word (no match) and any word either side already played (used up).
    if (bot === word.toLowerCase() || usedWords(await soloRecord(page)).has(word.toLowerCase())) continue;
    const before = await page.locator(".trail-row").count();
    await lockIn(page, word, {reveal: false});
    if (where) await checkReveal(page, `${where} "${word}"`, word);
    assert.ok(await continueReveal(page), `reveal modal for "${word}" dismissed`);
    await page.waitForFunction(n => document.querySelectorAll(".trail-row").length > n || document.querySelector(".end"), before);
    if (where) await check(page, `${where} board after "${word}"`);
  }
}

async function soloGame(context, lang) {
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  if (lang === "fr") await page.click('[data-lang="fr"]');
  await startSolo(page);
  await page.waitForSelector("#word");
  return page;
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`visual ${name}: nothing overlaps in prompts, reveal, trail and header (EN + FR)`, async () => {
    for (const lang of ["en", "fr"]) {
      const context = await browser.newContext({viewport, locale: lang === "fr" ? "fr-CA" : "en-US", reducedMotion: "reduce"});
      const page = await soloGame(context, lang);
      await check(page, `${name} ${lang} move 1`);
      await playWords(page, WORDS[lang], `${name} ${lang}`);
      await page.waitForSelector(".trail-now, .end");
      await check(page, `${name} ${lang} after long/accented/one-letter words`);
      if (SHOTS) await page.screenshot({path: `${SHOTS}/visual-${name}-${lang}.png`, fullPage: true});
      await page.click("#backBtn");
      await page.waitForSelector("#gameList");
      await check(page, `${name} ${lang} home`);
      await context.close();
    }
  });
}

test("visual: the game-over screen (20 moves) is tidy, lit up and offers the three actions", async () => {
  for (const viewport of [VIEWPORTS["320x640"], VIEWPORTS["1280x800"]]) {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await soloGame(context, "en");
    await playDistinct(page, 20);
    await continueReveal(page);
    await page.waitForSelector(".end.over");
    assert.match(await page.locator(".end").innerText(), /Game over!/);
    assert.doesNotMatch(await page.locator("main").innerText(), /no moves left/i);
    for (const id of ["#newGameBtn", "#homeBtn", "#historyBtn"]) assert.equal(await page.isVisible(id), true, `${id} visible`);
    assert.equal(await page.locator("#word, #lockBtn").count(), 0, "no input once the game is over");
    // Finale: every stone lit, never an empty bar.
    assert.equal(await page.locator(".stone.lit").count(), 20);
    assert.equal(await page.getAttribute("[role=progressbar]", "aria-valuenow"), "20");
    assert.match(await page.locator(".progress").innerText(), /All 20 moves played!/);
    assert.equal(await page.locator(".gary-end").count(), 1, "sleepy Gary rests on the Solo game-over screen");
    // Gary's FOLLOW-UP from his 20-move beat (one of three exact lines).
    assert.match(await page.locator("#garyBye").innerText(), /two people can think near each other|suspiciously close to teamwork|formally conclude whatever this was/);
    await check(page, `game over ${viewport.width}`);
    if (SHOTS) await page.screenshot({path: `${SHOTS}/visual-gameover-${viewport.width}.png`, fullPage: true});
    // View history scrolls to and focuses the trail.
    await page.click("#historyBtn");
    await page.waitForFunction(() => document.activeElement?.id === "trailTitle");
    assert.equal(await page.locator(".trail-row").count(), 20);
    assert.equal(await page.locator(".trail-now").count(), 0, "no 'now playing' row once the game is over");
    // Play again starts a fresh Solo game.
    await page.click("#newGameBtn");
    await page.waitForSelector("#word");
    assert.equal(await page.locator(".trail-row").count(), 0);
    await context.close();
  }
});

test("visual: doubled text size still fits, nothing scrolls sideways and controls stay reachable", async () => {
  for (const viewport of [VIEWPORTS["320x640"], VIEWPORTS["667x375"], VIEWPORTS["768x1024"]]) {
    for (const lang of ["en", "fr"]) {
      const context = await browser.newContext({viewport, locale: lang === "fr" ? "fr-CA" : "en-US", reducedMotion: "reduce"});
      const page = await soloGame(context, lang);
      await page.addStyleTag({content: "html { font-size: 200% !important; } body { font-size: 36px !important; }"});
      await playWords(page, WORDS[lang].slice(0, 2));
      await page.waitForSelector("#word");
      const wide = await wideItems(page);
      assert.ok(await noHorizontalScroll(page), `${viewport.width} ${lang}: sideways scroll at 200% text: ${wide.join(", ")}`);
      for (const sel of ["#word", "#lockBtn", "#backBtn", "#profileBtn"]) {
        const el = page.locator(sel);
        await el.scrollIntoViewIfNeeded();
        const box = await el.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 1, `${sel} off screen at 200% text`);
        assert.ok(box.height >= 44, `${sel} too small at 200% text`);
      }
      // Still playable: type into the box and the button takes the click.
      await page.fill("#word", "zebra");
      await page.locator("#lockBtn").click({trial: true});
      assert.deepEqual(await layoutProblems(page), [], `${viewport.width} ${lang}: overlaps at 200% text`);
      if (SHOTS) await page.screenshot({path: `${SHOTS}/visual-bigtext-${viewport.width}-${lang}.png`, fullPage: true});
      await context.close();
    }
  }
});
