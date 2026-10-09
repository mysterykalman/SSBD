// Homepage copy, no inline emoji, Family name entry (incl. production-like databases),
// and inflected matches presented as normal wins in each player's own word.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, joinRoom, launch, startServer, startSolo} from "./helpers.mjs";

// Emoji characters in copy. ★ (U+2605) and ✓ are drawn marks inside designed components (progress stones,
// win badge), not emoji in text, so they are excluded.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{2604}\u{2606}-\u{26FF}\u{2705}\u{270B}]/u;
let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** Visible text of the page, minus Gary's art (aria-hidden SVG has no text anyway). */
const visibleText = page => page.evaluate(() => document.body.innerText);

async function submit(page, word) {
  await page.fill("#word", word);
  await page.click("#lockBtn");
}

test("homepage copy (EN and FR): short premise, one joke per section, empty state", async () => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  const hero = await page.locator(".hero").innerText();
  assert.match(hero, /Try to read each other’s minds\.\s+No pressure\. Just your entire friendship\./);
  assert.equal(await page.locator(".hero .hero-rules").innerText(), "You each secretly pick any word. Match and you win. Miss and your two words become the next clue. Keep connecting the dots until your brains finally cooperate.");
  assert.doesNotMatch(hero, /reveal them at the same time|connects them/, "no mechanical explanation");
  const solo = await page.locator(".solo-card").innerText();
  // The tile, exactly: title (with its small Beta badge), two short paragraphs, the button, and nothing else.
  assert.equal(solo.trim().replace(/\s+/g, " "), "Solo Play BETA Milo finished his homework early, so now he’s free to play. We couldn’t find anyone else, so we got Gary from Accounting. HR said this counts as team building. Choose your player");
  assert.equal((await page.locator(".solo-card h2").innerText()).trim(), "Solo Play BETA");
  assert.equal((await page.locator("#startSolo").innerText()).trim(), "Choose your player");
  assert.doesNotMatch(await page.locator("main").innerText(), /Play Solo|We heard you had no friends|There is no cake|Plays offline too/);
  assert.doesNotMatch(solo, /without internet/i);
  const together = await page.locator(".family-card").innerText();
  assert.equal(together.trim().replace(/\s+/g, " ").replace(/^.*?(?=Play Together)/, ""), "Play Together Challenge a friend, sibling, cousin, or future ex-best friend to prove they can think exactly like you. Do you go together like peanut butter and... uh, peanut butter? Or more like peanut butter and... pickles? Start a game Join a game");
  assert.equal((await page.locator("#createFamily").innerText()).trim(), "Start a game");
  assert.equal((await page.locator("#joinFamily").innerText()).trim(), "Join a game");
  const games = await page.locator(".games").innerText();
  assert.match(games, /Your games\s+Nothing here yet\.\s+Suspiciously peaceful\./);
  assert.doesNotMatch(await visibleText(page), EMOJI);
  await page.click('[data-lang="fr"]');
  assert.match(await page.locator(".hero").innerText(), /Essayez de lire dans les pensées de l’autre\./);
  assert.match(await page.locator(".hero .hero-rules").innerText(), /^Choisissez chacun un mot en secret\. Les mêmes mots[\s\u202f]\? Vous gagnez[\s\u202f]! Sinon, vos deux mots deviennent le prochain indice\. Continuez à faire des liens jusqu’à ce que vos cerveaux coopèrent enfin\.$/);
  assert.match(await page.locator(".solo-card").innerText(), /^Jeu en solo\s+BÊTA\s+Milo a fini ses devoirs en avance, alors maintenant il est libre de jouer\.\s+On n’a trouvé personne d’autre, alors on a fait venir Gary de la comptabilité\. Les RH disent que c’est du team building\.\s+Choisis ton joueur$/);
  assert.match(await page.locator(".family-card").innerText(), /Jouer ensemble/);
  assert.doesNotMatch(await visibleText(page), EMOJI);
  await context.close();
});

test("no inline emoji in game states: Solo start, locked, reveal, win, game over", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1}); // Gary makes remarks
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  assert.doesNotMatch(await visibleText(page), EMOJI, "Solo start");
  const bot = await botWord(page);
  await submit(page, bot.toLowerCase() === "acorn" ? "maple" : "acorn");
  await page.waitForSelector("#revealContinue");
  assert.doesNotMatch(await visibleText(page), EMOJI, "reveal (with a Gary remark)");
  assert.doesNotMatch(await page.locator("#app .notice.pending").innerText(), EMOJI, "locked notice under the modal");
  await page.click("#revealContinue");
  await submit(page, await botWord(page));
  await page.waitForSelector("#revealContinue");
  assert.doesNotMatch(await visibleText(page), EMOJI, "match reveal");
  await page.click("#revealContinue");
  await page.waitForSelector("#app .end.win");
  assert.doesNotMatch(await visibleText(page), EMOJI, "win screen");
  // Error state under the input has no emoji either.
  await page.click("#newGameBtn", {delay: 0});
  await page.waitForSelector("#word");
  await page.click("#lockBtn");
  assert.doesNotMatch(await page.locator("#formHelp").innerText(), EMOJI);
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("formHelp"), "::before").content), "none");
  await context.close();
});

/** Create a host with a name, then a joiner via the invite link. Returns both pages. */
async function familyPair(url, {reducedMotion = "reduce"} = {}) {
  const ctxA = await browser.newContext({reducedMotion}), ctxB = await browser.newContext({reducedMotion});
  const ana = await ctxA.newPage(), ben = await ctxB.newPage();
  for (const page of [ana, ben]) page.on("pageerror", e => { throw e; });
  await ana.goto(url);
  await ana.click("#createFamily");
  await ana.waitForSelector("#nameInput");
  assert.match(await ana.locator("#dialog").innerText(), /What should we call you\?/);
  await ana.fill("#nameInput", "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  assert.equal(await ana.evaluate(() => document.getElementById("dialog").open), false, "the name dialog closed");
  assert.equal(((await ana.locator("#dialogError").textContent().catch(() => "")) || "").trim(), "", "no error after a valid name");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  await ben.goto(url);
  await ben.click("#joinFamily");
  await joinRoom(ben, {name: "Élodie", code});
  assert.equal(((await ben.locator("#dialogError").textContent().catch(() => "")) || "").trim(), "", "no error after a valid name");
  await ben.waitForSelector("#word");
  await ana.waitForSelector("#word", {timeout: 10000});
  return {ana, ben, ctxA, ctxB};
}

test("Family: valid names go straight into create and join (also on a database that already had tables)", async () => {
  // A database whose tables carry extra columns from an earlier release: inserts name their
  // columns, and the migration only adds what is missing, so name entry and play still work.
  const prodLike = await startServer({beforeMigrate: `
    CREATE TABLE players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, avatar TEXT);
    CREATE TABLE games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, colour TEXT, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot));`});
  try {
    for (const url of [server.url, prodLike.url]) {
      const {ana, ben, ctxA, ctxB} = await familyPair(url);
      assert.match(await ben.locator(".mode-chip").innerText(), /Ana/);
      assert.match(await ana.locator(".mode-chip").innerText(), /Élodie/);
      // Returning players see their saved name to confirm (or change); one tap and they're in.
      await ana.goto(url);
      await ana.click("#createFamily");
      await ana.waitForSelector("dialog #nameInput");
      assert.equal(await ana.inputValue("#nameInput"), "Ana");
      await ana.click('dialog button[type="submit"]');
      await ana.waitForSelector("#joinCode");
      await ctxA.close();
      await ctxB.close();
    }
  } finally {
    await prodLike.stop();
  }
});

test("Family name entry: blank names are refused before any request; real server errors stay visible", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const posts = [];
  page.on("request", r => { if (r.url().endsWith("/api/player")) posts.push(r.url()); });
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "   ");
  await page.click('dialog button[type="submit"]');
  await page.waitForFunction(() => /Type your name first!/.test(document.getElementById("dialogError")?.textContent || ""));
  assert.equal(posts.length, 0, "no request for an invalid name");
  // A genuine server failure shows its own friendly message (not swallowed, not generic).
  await page.route("**/api/player", route => route.fulfill({status: 500, contentType: "application/json", body: JSON.stringify({error: "x", code: "PLAYER_CREATE_FAILED"})}));
  await page.fill("#nameInput", "Sam");
  await page.click('dialog button[type="submit"]');
  await page.waitForFunction(() => /save your name/.test(document.getElementById("dialogError")?.textContent || ""));
  assert.doesNotMatch(await page.locator("#dialogError").innerText(), EMOJI);
  await page.unroute("**/api/player");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  await context.close();
});

test("an inflected Family match looks like a normal win, each player seeing their own word", async () => {
  const {ana, ben, ctxA, ctxB} = await familyPair(server.url);
  await submit(ana, "Vegetables");
  await ana.waitForSelector(".notice.pending");
  await submit(ben, "vegetable");
  for (const [page, mine] of [[ana, "VEGETABLES"], [ben, "VEGETABLE"]]) {
    await page.waitForSelector("#revealContinue", {timeout: 10000});
    const words = (await page.locator("#revealModal .rv-word .chip-word").allTextContents()).map(w => w.trim().toUpperCase());
    assert.deepEqual(words, [mine, mine], `${mine}: both sides read as this player's word`);
    const modal = await page.locator("#revealModal").innerText();
    assert.match(modal, new RegExp(`THAT’S A MATCH!\\s+You both said ${mine}\\.`));
    assert.doesNotMatch(modal, /high five|trail continues|Nice connection/i);
    assert.doesNotMatch(modal, /close enough|plural|schmural|tense|variant|same idea/i);
    await page.click("#revealContinue");
    await page.waitForSelector("#app .end.win");
    const end = await page.locator("#app .end").innerText();
    assert.match(end, /YOU DID IT!\s+Matched on move 1(?!\.)/);
    assert.doesNotMatch(end, /close enough|plural|schmural|tense|variant/i);
    assert.doesNotMatch(await visibleText(page), EMOJI);
  }
  await ctxA.close();
  await ctxB.close();
});
