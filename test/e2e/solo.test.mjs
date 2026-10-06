import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, lockIn, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

const MULTIPLAYER_TEXT = /waiting for|family game|join|your friend|other player|player presence/i;

test("fresh Solo: blank start, one input, simultaneous reveal, next prompt equals reveal", async () => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(server.url);
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  assert.equal(await page.inputValue("#word"), "");
  assert.equal(await page.locator("#prompt").count(), 0, "no prompt words on move 1");
  assert.equal(await page.locator(".trail-row").count(), 0, "no fabricated history");
  assert.equal(await page.locator(".reveal").count(), 0);
  const board = await page.locator(".board").innerText();
  assert.doesNotMatch(board, MULTIPLAYER_TEXT);
  assert.match(await page.locator("#moveLabel").innerText(), /Move 1 of 20/);

  const bot = await botWord(page);
  const mine = bot.toLowerCase() === "giraffe" ? "penguin" : "giraffe";
  await lockIn(page, mine);
  await page.waitForSelector(".reveal");
  const reveal = await page.locator(".reveal").innerText();
  assert.match(reveal, new RegExp(mine, "i"));
  assert.match(reveal, new RegExp(bot, "i"));
  assert.match(reveal, /YOU/i);
  assert.match(reveal, /BOT/i);
  const tiles = await page.locator("#prompt .tile").allInnerTexts();
  assert.deepEqual(tiles.map(s => s.toLowerCase()), [mine, bot.toLowerCase()]);
  assert.equal(await page.inputValue("#word"), "", "input is reset for the new move");
  assert.match(await page.locator("#moveLabel").innerText(), /Move 2 of 20/);
  assert.equal(await page.locator(".trail-row").count(), 1);
  assert.doesNotMatch(await page.locator("main").innerText(), MULTIPLAYER_TEXT);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Solo duplicate and invalid input get friendly messages", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  for (const [input, pattern] of [["", /type a word/i], ["   ", /type a word/i], ["!!!", /type a word/i], ["abc123", /letters only/i], ["x".repeat(30), /24 letters/i]]) {
    await page.fill("#word", input);
    await page.click("#lockBtn");
    assert.match(await page.locator("#formHelp").innerText(), pattern, `input ${JSON.stringify(input)}`);
    assert.match(await page.locator("#moveLabel").innerText(), /Move 1/);
  }
  const bot = await botWord(page);
  const mine = bot.toLowerCase() === "turtle" ? "rabbit" : "turtle";
  await lockIn(page, mine);
  await page.waitForSelector("#prompt");
  if ((await page.locator(".end").count()) === 0) {
    await lockIn(page, mine.toUpperCase());
    assert.match(await page.locator("#formHelp").innerText(), /just played/i);
    assert.match(await page.locator("#moveLabel").innerText(), /Move 2/);
  }
  // High-confidence spelling suggestion; never auto-replaced.
  await page.fill("#word", "freind");
  await page.waitForSelector(".suggestion button");
  assert.match(await page.locator(".suggestion").innerText(), /FRIEND/);
  assert.equal(await page.inputValue("#word"), "freind");
  await context.close();
});

test("Solo survives refresh and reopening, and a match ends the game", async () => {
  const context = await browser.newContext();
  let page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  const played = [];
  for (const w of ["apple", "orchard", "basket"]) {
    if (await page.locator(".end").count()) break;
    const bot = await botWord(page);
    const mine = bot.toLowerCase() === w ? `${w}y` : w;
    await lockIn(page, mine);
    await page.waitForSelector(".trail-row");
    played.push(mine);
  }
  const before = await page.locator(".trail-row").allInnerTexts();
  const promptsBefore = await page.locator("#prompt .tile").allInnerTexts();
  const url = page.url();
  await page.reload();
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await page.locator(".trail-row").allInnerTexts(), before);
  assert.deepEqual(await page.locator("#prompt .tile").allInnerTexts(), promptsBefore);
  assert.equal(page.url(), url);

  // Close and reopen at the bare address: the active game comes back.
  await page.close();
  page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector(".trail-row");
  assert.equal(page.url(), url);
  assert.deepEqual(await page.locator(".trail-row").allInnerTexts(), before);

  const bot = await botWord(page);
  await lockIn(page, bot);
  await page.waitForSelector(".end.win");
  assert.match(await page.locator(".board").innerText(), /Same same/i);
  assert.equal(await page.locator("#word").count(), 0);
  await page.click("#newGameBtn");
  await page.waitForSelector("#word");
  assert.equal(await page.locator(".trail-row").count(), 0, "new game starts with an empty trail");
  await context.close();
});

test("language switch persists and does not corrupt an active Solo game", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#startSolo");
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "piano" ? "violin" : "piano");
  await page.waitForSelector("#prompt");
  const prompts = await page.locator("#prompt .tile").allInnerTexts();
  const hidden = await botWord(page);
  await page.click('[data-lang="fr"]');
  assert.equal(await page.getAttribute('[data-lang="fr"]', "aria-pressed"), "true");
  assert.match(await page.locator("#lockBtn").innerText(), /verrouille/i);
  assert.match(await page.locator(".lang-note").innerText(), /anglais/i);
  assert.deepEqual(await page.locator("#prompt .tile").allInnerTexts(), prompts);
  assert.equal(await botWord(page), hidden, "switching language did not re-roll the bot");
  await page.reload();
  await page.waitForSelector("#lockBtn");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "fr");
  assert.match(await page.locator("#lockBtn").innerText(), /verrouille/i);
  await page.click(".lang-note button");
  await page.waitForSelector("#word");
  assert.equal(await page.locator(".lang-note").count(), 0, "new game is in French");
  const frBot = await botWord(page);
  assert.ok(frBot);
  await context.close();
});
