// The reveal is one state transition: SUBMIT → COUNTDOWN → REVEAL → CONTINUE → NEXT TURN.
// While the modal is open the board keeps the pre-reveal turn; the new pair only becomes the
// active turn after "Keep playing", and there is never a frame showing it in both places.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** Record, on every DOM mutation, whether the open modal and the board both show the pending pair. */
async function watchForDuplicates(page, words) {
  await page.evaluate(([a, b]) => {
    window.__dupFrames = 0;
    window.__phases = [];
    const norm = s => s.toLowerCase();
    const check = () => {
      const phase = document.getElementById("app")?.dataset.phase;
      if (phase && window.__phases.at(-1) !== phase) window.__phases.push(phase);
      const modal = document.getElementById("revealModal");
      if (!modal?.open) return;
      const tiles = [...document.querySelectorAll("#app #prompt .tile")].map(x => norm(x.textContent));
      const trail = [...document.querySelectorAll("#app .trail-row .chip-word")].map(x => norm(x.textContent));
      const board = tiles.concat(trail);
      if (board.includes(norm(a)) && board.includes(norm(b))) window.__dupFrames++;
    };
    new MutationObserver(check).observe(document.body, {subtree: true, childList: true, attributes: true, characterData: true});
  }, words);
}

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
  assert.match(modal, /YOUR WORD[\s\S]*BOT WORD/i);
  assert.match(modal, new RegExp(`${mine}[\\s\\S]*${bot}`, "i"));
  assert.match(modal, new RegExp(`Next move starts with ${mine} \\+ ${bot}`, "i"));
  assert.match(await page.locator("#revealContinue").innerText(), /Keep playing/);
  assert.equal(await page.locator("#app #prompt").count(), 0, "board still pre-reveal while the reveal is shown");
  assert.equal(await page.locator("dialog[open]").count(), 1, "exactly one modal");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "revealContinue");
  assert.deepEqual(await page.evaluate(() => window.__phases.filter(p => p !== "playing")), ["countdown", "revealing", "ready"]);
  assert.equal(await page.evaluate(() => window.__dupFrames), 0);
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
    const mine = ["lantern", "meadow", "pebble"].find(w => w !== bot.toLowerCase());
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
  assert.match(await page.locator("#revealModal").innerText(), /TON MOT[\s\S]*MOT DU ROBOT/i);
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
