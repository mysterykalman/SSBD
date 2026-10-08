// The Word Trail teaches the rule from the screen alone: only the NOW PLAYING row matters ("Match
// these two words!"), and finished rows are quiet history that never reads as something to play.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, lockIn, playDistinct, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** Each finished row's own words (instructions/labels), without the word chips themselves. */
const historyText = page => page.$$eval("#app .trail-list .trail-row", rows => rows.map(row => {
  const copy = row.cloneNode(true);
  for (const el of copy.querySelectorAll(".chip, .start-label, .sr-only")) el.remove();
  return copy.textContent.replace(/\s+/g, " ").trim();
}));
const fontSize = (page, selector) => page.$eval(selector, el => parseFloat(getComputedStyle(el).fontSize));

test("the NOW PLAYING row says to match its two words; finished rows are history only", async () => {
  for (const viewport of [{width: 390, height: 900}, {width: 1280, height: 900}]) {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await startSolo(page);
    await page.waitForSelector("#trailNow");
    // Move 1 has no two words yet, so no instruction about them.
    assert.equal(await page.locator("#trailNow #nowHint").count(), 0);
    // Three moves without a match (skipping any word already played by either side).
    await playDistinct(page, 3);
    await page.waitForSelector("#trailNow #nowHint");
    const now = await page.locator("#trailNow").innerText();
    assert.match(now, /NOW PLAYING/i);
    assert.match(now, /Match these two words!\s+Old rows are just your history\./);
    // The two words to match are the current prompts, and the biggest words in the trail.
    const prompts = await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("ssbd.store"));
      const game = data.solo[location.pathname.split("/").pop()];
      return game.moves[game.moves.length - 1].prompts.map(w => w.toUpperCase());
    });
    assert.deepEqual((await page.locator("#trailNow .trail-in .chip").allInnerTexts()).map(w => w.trim().toUpperCase()), prompts);
    assert.ok(await fontSize(page, "#trailNow .trail-in .chip") > await fontSize(page, "#app .trail-list .chip"), "current words are bigger than history");
    // History: labelled as earlier moves, and nothing in a finished row suggests it is still in play.
    assert.match(await page.locator("#app .history-label").innerText(), /Earlier moves/i);
    const rows = await historyText(page);
    assert.equal(rows.length, 3);
    for (const text of rows) assert.doesNotMatch(text, /match these|now playing|your turn|type|guess|choose|pick|play|solve|use these/i, text);
    // Only the newest finished row points up at the words in play; older rows say nothing at all.
    assert.equal(await page.locator("#app .trail-list .trail-row .trail-next").count(), 1);
    assert.equal(await page.locator("#app .trail-list .trail-row").first().locator(".trail-next").count(), 1);
    // Finished rows are not interactive.
    assert.equal(await page.locator("#app .trail-list .trail-row :is(button, a, input, [tabindex])").count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
    await context.close();
  }
});

test("French, and the end of a game: the same rule, and no instruction once nothing is in play", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click('[data-lang="fr"]');
  await startSolo(page);
  await page.waitForSelector("#trailNow");
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "jardin" ? "fusée" : "jardin");
  await page.waitForSelector("#trailNow #nowHint");
  assert.match(await page.locator("#trailNow #nowHint").innerText(), /Trouve un mot pour ces deux-là\s?!\s+Les lignes du dessous, c’est juste ton histoire\./);
  assert.match(await page.locator("#app .history-label").innerText(), /Coups d’avant/i);
  // Win: the game is over, so there is no current row and no instruction.
  await lockIn(page, await botWord(page));
  await page.waitForSelector("#app .end.win");
  assert.equal(await page.locator("#trailNow, #nowHint, #app .history-label").count(), 0);
  await context.close();
});
