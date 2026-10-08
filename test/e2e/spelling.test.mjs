// "Did you mean?": a likely typo of a known word asks once before it is locked in (Use … is the main
// choice, Keep … is always there); a looser match is a quiet hint; unclear input is left alone.
// What happened is recorded with the round for /review.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {launch, startServer, startSolo, soloRecord, waitForReveal, continueReveal} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

async function soloPage(options = {}) {
  const context = await browser.newContext({reducedMotion: "reduce", ...options});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  return {context, page};
}
const revealedCount = async page => ((await soloRecord(page))?.moves || []).filter(m => m.words).length;
const lastRound = page => page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("ssbd.gamelog"));
  const rounds = Object.values(d.rounds).sort((a, b) => b.revealed_at.localeCompare(a.revealed_at));
  return rounds[0];
});

test("a high-confidence typo asks once before locking in; Use locks in the corrected word", async () => {
  const {context, page} = await soloPage();
  await page.fill("#word", "battelship");
  await page.waitForSelector("#suggestion.strong");
  const box = await page.locator("#suggestion").innerText();
  assert.match(box, /You typed: battelship/);
  assert.match(box, /Did you mean BATTLESHIP\?/);
  assert.equal((await page.locator("#useSuggestion").innerText()).trim(), "Use battleship");
  assert.equal((await page.locator("#keepTyped").innerText()).trim(), "Keep battelship");
  assert.equal(await page.inputValue("#word"), "battelship", "never changed without the player's say-so");
  // Lock in: nothing is played yet; the box asks, with Use focused.
  await page.press("#word", "Enter");
  await page.waitForSelector("#suggestion.strong.confirming");
  assert.equal(await revealedCount(page), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "useSuggestion");
  await page.click("#useSuggestion");
  await waitForReveal(page, 0);
  assert.equal((await soloRecord(page)).moves[0].words.a, "battleship");
  const round = await lastRound(page);
  assert.deepEqual({original: round.player_input.original, submitted: round.player_input.submitted, suggestion: round.player_input.suggestion,
    accepted: round.player_input.suggestion_accepted, confidence: round.player_input.suggestion_confidence},
  {original: "battelship", submitted: "battleship", suggestion: "battleship", accepted: true, confidence: "high"});
  await context.close();
});

test("the player can keep what they typed; the game still understands what they meant", async () => {
  const {context, page} = await soloPage();
  await page.fill("#word", "chikcen");
  await page.click("#lockBtn");
  await page.waitForSelector("#suggestion.confirming");
  await page.click("#keepTyped");
  await waitForReveal(page, 0);
  const game = await soloRecord(page);
  assert.equal(game.moves[0].words.a, "chikcen", "kept exactly as typed");
  const round = await lastRound(page);
  assert.equal(round.player_input.suggestion_accepted, false);
  assert.equal(round.player_input.method, "fuzzy");
  assert.equal(round.player_input.understood_as, "chicken");
  // The bot's next word was chosen with CHIKCEN understood as CHICKEN (committed before this round).
  const next = game.moves[game.moves.length - 1];
  if (next.hidden?.decision) assert.deepEqual(next.hidden.decision.inputs[0].ids, ["chicken"]);
  await context.close();
});

test("keyboard: Enter asks, Enter on the focused 'Use' locks in; Tab reaches 'Keep'", async () => {
  const {context, page} = await soloPage();
  await page.fill("#word", "aqurium");
  await page.press("#word", "Enter");
  await page.waitForSelector("#suggestion.confirming");
  await page.keyboard.press("Enter");
  await waitForReveal(page, 0);
  assert.equal((await soloRecord(page)).moves[0].words.a, "aquarium");
  await continueReveal(page);
  // Keep via the keyboard.
  await page.waitForSelector("#word");
  await page.fill("#word", "elefant");
  await page.press("#word", "Enter");
  await page.waitForSelector("#suggestion.confirming");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "keepTyped");
  await page.keyboard.press("Enter");
  await waitForReveal(page, 1);
  assert.equal((await soloRecord(page)).moves[1].words.a, "elefant");
  await context.close();
});

test("low confidence is never guessed; a looser match is only a quiet hint that never blocks", async () => {
  const {context, page} = await soloPage();
  // Unclear: no box at all, played as typed.
  await page.fill("#word", "zorblax");
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#suggestion").innerText(), "");
  await page.press("#word", "Enter");
  await waitForReveal(page, 0);
  assert.equal((await soloRecord(page)).moves[0].words.a, "zorblax");
  await continueReveal(page);
  // A real word is never "corrected" (draft is not raft).
  await page.waitForSelector("#word");
  await page.fill("#word", "draft");
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#suggestion").innerText(), "");
  // Medium: a quiet hint; Enter plays the word as typed straight away.
  await page.fill("#word", "penguine");
  await page.waitForSelector("#suggestion button");
  assert.equal(await page.locator("#suggestion.strong").count(), 0, "not emphasised");
  assert.match(await page.locator("#suggestion").innerText(), /PENGUIN/);
  await page.press("#word", "Enter");
  await waitForReveal(page, 1);
  assert.equal((await soloRecord(page)).moves[1].words.a, "penguine");
  await context.close();
});

test("on a phone: the question is readable, the buttons are big enough, and tapping Use works", async () => {
  const {context, page} = await soloPage({viewport: {width: 360, height: 740}, isMobile: true, hasTouch: true});
  await page.fill("#word", "chocolat");
  await page.click("#lockBtn");
  await page.waitForSelector("#suggestion.confirming");
  for (const id of ["#useSuggestion", "#keepTyped"]) {
    const box = await page.locator(id).boundingBox();
    assert.ok(box.height >= 44 && box.width >= 120, `${id} ${JSON.stringify(box)}`);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
  await page.tap("#useSuggestion");
  await waitForReveal(page, 0);
  assert.equal((await soloRecord(page)).moves[0].words.a, "chocolate");
  await context.close();
});
