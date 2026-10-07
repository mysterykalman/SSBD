// The reveal is one state transition: SUBMIT → COUNTDOWN → REVEAL → CONTINUE → NEXT TURN.
// While the modal is open the board keeps the pre-reveal turn; the new pair only becomes the
// active turn after "Keep playing", and there is never a frame showing it in both places.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/**
 * Install a monitor that checks, on every DOM mutation while the reveal modal is open, that the
 * board stays frozen on the pre-reveal turn: the pending pair is not on the board or in the trail,
 * the move counter and progress stones don't move, no trail row is added, and countdown content is
 * gone once the result is showing. Violations are collected in window.__violations.
 */
async function watchForDuplicates(page, words) {
  await page.evaluate(([a, b]) => {
    // One observer at a time, always watching the current pending pair (older pairs are
    // legitimately on the board as completed rounds).
    window.__dupObserver?.disconnect();
    window.__dupFrames = 0;
    window.__violations = [];
    window.__phases = [];
    const norm = s => s.toLowerCase();
    const moveNow = () => (document.getElementById("moveLabel")?.textContent.match(/\d+/) || [""])[0];
    const frozen = {move: moveNow(), stones: document.querySelector("#app .stones")?.getAttribute("aria-valuenow"), rows: document.querySelectorAll("#app .trail-row").length};
    const fail = what => { if (!window.__violations.includes(what)) window.__violations.push(what); };
    const check = () => {
      const phase = document.getElementById("app")?.dataset.phase;
      if (phase && window.__phases.at(-1) !== phase) window.__phases.push(phase);
      const modal = document.getElementById("revealModal");
      if (!modal?.open) return;
      const tiles = [...document.querySelectorAll("#app #prompt .tile")].map(x => norm(x.textContent));
      const trail = [...document.querySelectorAll("#app .trail-row .chip-word")].map(x => norm(x.textContent));
      const board = tiles.concat(trail);
      if (board.includes(norm(a)) && board.includes(norm(b))) { window.__dupFrames++; fail("pending pair on the board"); }
      if (moveNow() !== frozen.move) fail("move counter advanced");
      if (document.querySelector("#app .stones")?.getAttribute("aria-valuenow") !== frozen.stones) fail("progress trail advanced");
      if (document.querySelectorAll("#app .trail-row").length !== frozen.rows) fail("trail row added");
      const result = document.getElementById("revealResult"), count = document.getElementById("revealCount");
      if (result && !result.hidden && count && (!count.hidden || count.offsetParent !== null)) fail("countdown visible during reveal");
    };
    window.__dupObserver = new MutationObserver(check);
    window.__dupObserver.observe(document.body, {subtree: true, childList: true, attributes: true, characterData: true});
  }, words);
}

const violations = page => page.evaluate(() => window.__violations);

async function submit(page, word) {
  await page.fill("#word", word);
  await page.click("#lockBtn");
}

test("When the reveal modal is open, the pending next pair is not rendered in the active game card", async () => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  const bot = await botWord(page);
  const mine = bot.toLowerCase() === "night" ? "story" : "night";
  await watchForDuplicates(page, [mine, bot]);
  await submit(page, mine);

  // Countdown: the modal is the only reveal surface; the board is still move 1 with no prompt.
  await page.waitForSelector("#revealModal[open]");
  await page.waitForFunction(() => document.getElementById("app").dataset.phase === "countdown");
  assert.match(await page.locator("#revealCount").innerText(), /^(3|2|1|SAME TIME!)$/i);
  assert.equal(await page.locator("#app #prompt").count(), 0, "board must not show the new pair during the countdown");
  assert.match(await page.locator("#moveLabel").innerText(), /Move 1 of 20/);
  assert.equal(await page.locator("#app .trail-row").count(), 0, "trail stays pre-reveal");
  assert.match(await page.locator("#app .notice.pending").innerText(), new RegExp(`locked in ${mine}`, "i"));
  assert.doesNotMatch(await page.locator("#app").innerText(), /waiting/i, "Solo never waits for anyone");

  // Reveal, in the same modal.
  await page.waitForSelector("#revealContinue");
  const modal = await page.locator("#revealModal").innerText();
  assert.match(modal, /YOUR WORD[\s\S]*GARY.S WORD/i);
  assert.match(modal, new RegExp(`${mine}[\\s\\S]*${bot}`, "i"));
  assert.match(modal, new RegExp(`Next move starts with ${mine} \\+ ${bot}`, "i"));
  assert.match(await page.locator("#revealContinue").innerText(), /Keep playing/);
  assert.equal(await page.locator("#app #prompt").count(), 0, "board still pre-reveal while the reveal is shown");
  assert.equal(await page.locator("dialog[open]").count(), 1, "exactly one modal");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "revealContinue");
  assert.deepEqual(await page.evaluate(() => window.__phases.filter(p => p !== "playing")), ["countdown", "revealing", "ready"]);
  assert.equal(await page.evaluate(() => window.__dupFrames), 0);
  assert.deepEqual(await violations(page), []);
  await context.close();
});

test("After Keep playing is pressed, the modal disappears and the pending pair becomes the active pair exactly once", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  for (let move = 1; move <= 3; move++) {
    const bot = await botWord(page);
    // A different word every move (the player may not repeat their own words), never the bot's.
    const mine = [["lantern", "lighthouse"], ["meadow", "prairie"], ["pebble", "boulder"]][move - 1].find(w => w !== bot.toLowerCase());
    const before = await page.locator("#app #prompt .tile").allTextContents();
    await watchForDuplicates(page, [mine, bot]);
    await submit(page, mine);
    await page.waitForSelector("#revealContinue");
    // Still the previous turn underneath.
    assert.deepEqual(await page.locator("#app #prompt .tile").allTextContents(), before);
    assert.match(await page.locator("#moveLabel").innerText(), new RegExp(`Move ${move} of 20`));
    await page.click("#revealContinue");
    await page.waitForSelector("#revealModal", {state: "detached"});
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.deepEqual((await page.locator("#app #prompt .tile").allTextContents()).map(s => s.toLowerCase()), [mine, bot.toLowerCase()]);
    assert.equal(await page.locator("#app #prompt").count(), 1, "one active pair");
    assert.match(await page.locator("#moveLabel").innerText(), new RegExp(`Move ${move + 1} of 20`));
    assert.equal(await page.locator("#app .trail-row").count(), move, "one trail row per revealed move, newest first");
    assert.equal(await page.getAttribute(".trail-row >> nth=0", "data-move"), String(move));
    assert.equal(await page.inputValue("#word"), "");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "word");
    assert.equal(await page.evaluate(() => window.__dupFrames), 0, "no frame with the pair in the modal and on the board");
    assert.deepEqual(await violations(page), [], "board, trail and progress stayed frozen until Keep playing");
    // A re-render (language switch) must not replay the reveal or advance again.
    await page.click('[data-lang="fr"]');
    await page.click('[data-lang="en"]');
    assert.equal(await page.locator("#revealModal").count(), 0);
    assert.match(await page.locator("#moveLabel").innerText(), new RegExp(`Move ${move + 1} of 20`));
  }
  await context.close();
});

test("one-letter word, refresh during the reveal, Escape and FR copy", async () => {
  const context = await browser.newContext({locale: "fr-CA"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  const bot = await botWord(page);
  const mine = bot.toLowerCase() === "s" ? "t" : "s";
  await submit(page, mine);
  await page.waitForSelector("#revealModal[open]");
  // Refresh mid-reveal: the move is saved, the reveal plays again, the board is still pre-reveal.
  await page.reload();
  await page.waitForSelector("#revealModal[open]");
  assert.equal(await page.locator("#app #prompt").count(), 0);
  assert.match(await page.locator("#moveLabel").innerText(), /Coup 1 sur 20/);
  await page.keyboard.press("Escape"); // ignored until the reveal is ready
  await page.waitForSelector("#revealContinue");
  assert.equal(await page.locator("#revealModal[open]").count(), 1);
  assert.match(await page.locator("#revealModal").innerText(), /TON MOT[\s\S]*MOT DE GARY/i);
  assert.match(await page.locator("#revealModal").innerText(), /Le prochain coup commence avec/);
  assert.match(await page.locator("#revealContinue").innerText(), /On continue/);
  await page.keyboard.press("Escape"); // when ready, Escape continues like the button
  await page.waitForSelector("#revealModal", {state: "detached"});
  assert.deepEqual((await page.locator("#app #prompt .tile").allTextContents()).map(s => s.toLowerCase()), [mine, bot.toLowerCase()]);
  await page.reload();
  await page.waitForSelector("#prompt");
  assert.equal(await page.locator("#revealModal").count(), 0, "a seen reveal does not replay after refresh");
  await context.close();
});

test("reduced motion: no countdown, the reveal is shown straight away", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  const bot = await botWord(page);
  await submit(page, bot.toLowerCase() === "acorn" ? "maple" : "acorn");
  const started = Date.now();
  await page.waitForSelector("#revealContinue");
  assert.ok(Date.now() - started < 1000, "no countdown under reduced motion");
  assert.equal(await page.locator("#revealCount").isVisible(), false);
  await context.close();
});

test("a match: the modal reveals it, then Continue shows the celebration", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  await submit(page, await botWord(page));
  await page.waitForSelector("#revealContinue");
  assert.match(await page.locator("#revealModal").innerText(), /SAME WORD/);
  assert.equal(await page.locator("#app .end").count(), 0, "game over waits for the reveal to be dismissed");
  assert.match(await page.locator("#revealContinue").innerText(), /Continue/);
  await page.click("#revealContinue");
  await page.waitForSelector("#app .end.win");
  assert.equal(await page.locator("#word").count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("board-title")), true, "focus lands on the ending, not on Play again");
  await context.close();
});

test("family game: both players get one reveal each, and the board waits for Keep playing", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({reducedMotion: "reduce"});
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
  await submit(ana, "Comet");
  await ana.waitForSelector(".notice.pending");
  await watchForDuplicates(ana, ["comet", "orbit"]);
  await submit(ben, "Orbit");
  for (const [page, them] of [[ben, "Ana"], [ana, "Ben"]]) {
    await page.waitForSelector("#revealContinue", {timeout: 10000});
    assert.match(await page.locator("#revealModal").innerText(), new RegExp(`YOUR WORD[\\s\\S]*${them}'S WORD`, "i"));
    assert.match(await page.locator("#revealModal").innerText(), /Next move starts with COMET \+ ORBIT/);
    assert.equal(await page.locator("#app #prompt").count(), 0, "board still on move 1 under the modal");
    await page.click("#revealContinue");
    await page.waitForSelector("#revealModal", {state: "detached"});
    assert.deepEqual(await page.locator("#app #prompt .tile").allTextContents(), ["Comet", "Orbit"]);
  }
  assert.equal(await ana.evaluate(() => window.__dupFrames), 0);
  // Polling keeps running; the seen reveal never comes back.
  await ana.waitForTimeout(4000);
  assert.equal(await ana.locator("#revealModal").count(), 0);
  await ctxA.close();
  await ctxB.close();
});

/** Distinct, unrelated words so a long game never matches the bot by accident. */
const LONG_GAME = ["whale", "garden", "pencil", "rocket", "banana", "violin", "jungle", "candle", "turtle", "pillow",
  "comet", "meadow", "pebble", "lantern", "bubble", "castle", "forest", "kitten", "carrot", "dragon", "puzzle", "sandal"];

for (const [name, viewport] of [["phone 390x844", {width: 390, height: 844}], ["desktop 1280x860", {width: 1280, height: 860}]]) {
  test(`full 20-move Solo game at ${name}: every reveal frozen, advances once, ends in game over`, async () => {
    const context = await browser.newContext({viewport});
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(server.url);
    await page.click("#startSolo");
    await page.waitForSelector("#word");
    let used = 0;
    for (let move = 1; move <= 20; move++) {
      const bot = (await botWord(page)).toLowerCase();
      let mine;
      do { mine = LONG_GAME[used++]; } while (mine === bot);
      await watchForDuplicates(page, [mine, bot]);
      await submit(page, mine);
      await page.waitForSelector("#revealContinue");
      // Modal layout: inside the viewport, words/op/next/button don't overlap, the pair stays together.
      const layout = await page.evaluate(() => {
        const box = el => el && el.getBoundingClientRect();
        const dlg = box(document.getElementById("revealModal"));
        const parts = [...document.querySelectorAll("#revealModal .rv-word, #revealModal .rv-words .op, #revealModal .rv-next, #revealContinue")].map(box);
        let overlap = false;
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
          const p = parts[i], q = parts[j];
          if (p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1) overlap = true;
        }
        const pair = document.querySelector("#revealModal .rv-pair");
        const line = pair ? parseFloat(getComputedStyle(pair).lineHeight) || 24 : 0;
        return {inside: dlg.left >= 0 && dlg.top >= 0 && dlg.right <= innerWidth && dlg.bottom <= innerHeight, overlap, pairOneLine: !pair || box(pair).height < line * 1.6,
          countGone: document.getElementById("revealCount").hidden, scroll: document.documentElement.scrollWidth <= innerWidth + 1};
      });
      assert.ok(layout.inside, `modal inside the viewport (move ${move})`);
      assert.ok(!layout.overlap, `modal parts overlap (move ${move})`);
      assert.ok(layout.pairOneLine, `"A + B" split across lines (move ${move})`);
      assert.ok(layout.countGone, "countdown removed before the reveal");
      assert.ok(layout.scroll, "no horizontal overflow");
      if (move === 20) {
        assert.match(await page.locator("#revealModal").innerText(), /no match this time/i, "final reveal is shown before game over");
        assert.equal(await page.locator("#app .end").count(), 0, "game over waits for the final reveal");
      }
      await page.click("#revealContinue");
      await page.waitForSelector("#revealModal", {state: "detached"});
      assert.deepEqual(await violations(page), [], `frozen until Keep playing (move ${move})`);
      if (move < 20) {
        assert.match(await page.locator("#moveLabel").innerText(), new RegExp(`Move ${move + 1} of 20`));
        assert.equal(await page.getAttribute("#app .stones", "aria-valuenow"), String(move + 1));
        assert.deepEqual((await page.locator("#app #prompt .tile").allTextContents()).map(x => x.toLowerCase()), [mine, bot]);
      }
      assert.equal(await page.locator("#app .trail-row").count(), move);
    }
    await page.waitForSelector("#app .end.over");
    assert.match(await page.locator("#app .end").innerText(), /Game over!/);
    assert.equal(await page.locator("#word").count(), 0, "no input after game over");
    assert.equal(await page.locator("#lockBtn").count(), 0);
    assert.equal(await page.getAttribute("#app .stones", "aria-valuenow"), "20");
    assert.equal(await page.getAttribute(".trail-row >> nth=0", "data-move"), "20", "newest first");
    for (const id of ["#newGameBtn", "#homeBtn", "#historyBtn"]) assert.ok(await page.isVisible(id), id);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    // Refresh keeps the finished game; no reveal replays.
    await page.reload();
    await page.waitForSelector("#app .end.over");
    assert.equal(await page.locator("#revealModal").count(), 0);
    // Play again: a fresh blank game.
    await page.click("#newGameBtn");
    await page.waitForSelector("#word");
    assert.equal(await page.locator("#app #prompt").count(), 0);
    assert.equal(await page.locator("#app .trail-row").count(), 0);
    assert.match(await page.locator("#moveLabel").innerText(), /Move 1 of 20/);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test("long words: the revealed pair stays together and the modal never overflows", async () => {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 860}]) {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await page.click("#startSolo");
    await page.waitForSelector("#word");
    const bot = (await botWord(page)).toLowerCase();
    await submit(page, bot === "supercalifragilistic" ? "abracadabra" : "Supercalifragilistic");
    await page.waitForSelector("#revealContinue");
    const ok = await page.evaluate(() => {
      const pair = document.querySelector("#revealModal .rv-pair").getBoundingClientRect();
      const dlg = document.getElementById("revealModal").getBoundingClientRect();
      return {inside: pair.left >= dlg.left && pair.right <= dlg.right, noScroll: document.documentElement.scrollWidth <= innerWidth + 1};
    });
    assert.ok(ok.inside && ok.noScroll, `pair contained at ${viewport.width}px`);
    await context.close();
  }
});

test("an inflected match (Gary's word, pluralised) wins: original words shown, playful copy, no next round", async () => {
  const {sameUnderlyingWord, matchKind} = await import("../../src/shared/morph.js");
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  // Start games until Gary's opening word takes a plain plural s (most do).
  let bot, plural;
  for (let tries = 0; tries < 15 && !plural; tries++) {
    await page.goto(server.url);
    await page.click("#startSolo");
    await page.waitForSelector("#word");
    bot = await botWord(page);
    const candidate = `${bot}s`;
    if (!/[sxy]$/.test(bot) && !bot.includes(" ") && sameUnderlyingWord(candidate, bot) && matchKind(candidate, bot) === "plural") plural = candidate;
  }
  assert.ok(plural, "found an opening word with a plain plural");
  await submit(page, plural.toUpperCase());
  await page.waitForSelector("#revealContinue");
  const modal = await page.locator("#revealModal").innerText();
  assert.match(modal, new RegExp(plural, "i"), "the player's word is shown as typed");
  assert.match(modal, new RegExp(`GARY.S WORD\\s+${bot}`, "i"), "Gary's word as he typed it");
  assert.match(modal, /Plural schmural\. Same same!/);
  assert.equal(await page.locator("#revealNext").count(), 0, "no 'next move starts with' for a match");
  await page.click("#revealContinue");
  await page.waitForSelector("#app .end.win");
  assert.match(await page.locator("#app .end").innerText(), /close enough! Same same on move 1/i);
  assert.equal(await page.locator("#app #prompt, #word").count(), 0, "no new playable pair");
  // The game on screen (earlier tries may have left other games in storage).
  const game = await page.evaluate(() => JSON.parse(localStorage.getItem("ssbd.store")).solo[location.pathname.split("/").pop()]);
  assert.equal(game.status, "MATCHED");
  assert.equal(game.moves.length, 1, "the trail did not advance");
  assert.deepEqual(game.moves[0].words, {a: plural.toUpperCase(), b: bot});
  await context.close();
});
