// The Solo win card (one design, the character's tone in the details) and the inline 1–5 star rating:
// saved at once on the game and in its log record, uploaded whenever the server can take it, never
// asked twice for the same game, never in the way of the buttons.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {botWord, launch, lockIn, noHorizontalScroll, playDistinct, startServer, startSolo} from "./helpers.mjs";

const TOKEN = "e2e-review-token-not-a-secret";
let server, browser, sql;
before(async () => {
  server = await startServer({env: {REVIEW_TOKEN: TOKEN}});
  browser = await launch();
  sql = new pg.Client({connectionString: server.databaseUrl});
  await sql.connect();
});
after(async () => { await sql?.end(); await browser?.close(); await server?.stop(); });

const gameId = page => new URL(page.url()).pathname.split("/").pop();
const gameLog = page => page.evaluate(() => JSON.parse(localStorage.getItem("ssbd.gamelog") || "null"));
const stored = page => page.evaluate(id => JSON.parse(localStorage.getItem("ssbd.store")).solo[id], gameId(page));
const lit = page => page.locator("#winRating .wc-star").evaluateAll(stars => stars.map(s => s.classList.contains("lit")));
const serverRating = async id => (await sql.query("SELECT player_rating FROM bot_games WHERE game_id = $1", [id])).rows[0]?.player_rating ?? null;

/** Start a Solo game with `who` and win it on move `misses + 1` (by typing the committed word). */
async function win(page, who, misses = 0) {
  await page.goto(server.url);
  await startSolo(page, who);
  await page.waitForSelector("#word");
  if (misses) await playDistinct(page, misses);
  await lockIn(page, await botWord(page));
  await page.waitForSelector(".win-card");
}

test("Gary's and Milo's win cards: their own avatar and win line, the progress rail, one clear primary button", async () => {
  for (const [who, name] of [["gary", "Gary"], ["milo", "Milo"]]) {
    const context = await browser.newContext({reducedMotion: "reduce"});
    const page = await context.newPage();
    await win(page, who, 1);
    const card = page.locator(".win-card");
    assert.equal(await card.getAttribute("data-character"), who);
    assert.equal(await page.locator(`.win-card .wc-avatar img.art-${who}`).count(), 1, `${name}'s avatar`);
    assert.equal(await page.locator(".win-card .board-title").innerText(), "YOU DID IT!");
    assert.equal((await page.locator("#winMove").innerText()).trim(), "Matched on move 2");
    // The win line is the character's own (Milo: his fixed fast-win line; Gary: one of his early-match lines).
    const said = (await page.locator("#winReaction .wc-bubble").first().innerText()).replace(/^\w+:\s*/, "").trim();
    if (who === "milo") {
      assert.equal(said, "Already?! Okay, we’re good at this.");
      assert.equal((await page.locator("#postWinLine").innerText()).replace(/^Milo:\s*/, "").trim(), "That was fun. Again?");
    } else {
      assert.equal(said, "already? huh");
      assert.equal(await page.locator("#postWinLine").count(), 0);
    }
    // Progress rail unchanged: matched on move 2, two stones reached.
    assert.match(await page.locator(".progress").innerText(), /Matched on move 2!/);
    // Button hierarchy: primary coral, secondary cream, history quiet.
    assert.equal((await page.locator("#newGameBtn").innerText()).trim(), `Play again with ${name}`);
    const look = await page.evaluate(() => {
      const css = id => getComputedStyle(document.getElementById(id));
      return {primary: css("newGameBtn").backgroundColor, secondary: css("homeBtn").backgroundColor, tertiary: css("historyBtn").borderTopWidth, tertiaryBg: css("historyBtn").backgroundColor};
    });
    assert.notEqual(look.primary, look.secondary);
    assert.equal(look.tertiary, "0px", "View history is text-style");
    assert.equal(look.tertiaryBg, "rgba(0, 0, 0, 0)");
    assert.equal(await page.locator(".win-card.animate").count(), 0, "reduced motion: no entrance animation");
    assert.equal(await page.locator(".wc-piece").count(), who === "milo" ? 7 : 5, "a few decorations, fewer for Gary");
    await context.close();
  }
});

test("rating: exact copy per character, five labelled stars, saved at once with no submit, then thanks", async () => {
  const copy = {gary: ["Gary’s boss wants feedback.", "Apparently “showed up” isn’t enough anymore."], milo: ["Okay, important question.", "How much fun was that?"]};
  for (const who of ["gary", "milo"]) {
    const context = await browser.newContext({reducedMotion: "reduce"});
    const page = await context.newPage();
    await win(page, who);
    assert.equal(await page.locator("#rateTitle").innerText(), copy[who][0]);
    assert.equal(await page.locator("#rateSub").innerText(), copy[who][1]);
    const stars = page.locator("#winRating .wc-star");
    assert.equal(await stars.count(), 5);
    for (let n = 1; n <= 5; n++) assert.equal(await stars.nth(n - 1).getAttribute("aria-label"), `Rate ${n} out of 5`);
    assert.equal(await page.locator("#winRating button[type=submit], #winRating textarea, #winRating input").count(), 0, "no submit button, no comment box");
    // Star targets are comfortably tappable.
    const box = await stars.first().boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, JSON.stringify(box));
    // Hover previews that star and every star before it (filled vs outlined shape, not just colour).
    await stars.nth(2).hover();
    assert.deepEqual(await lit(page), [true, true, true, false, false]);
    const [on, off] = await page.evaluate(() => [...document.querySelectorAll("#winRating .wc-star > span")].filter((_, i) => i === 0 || i === 4).map(el => getComputedStyle(el).color));
    assert.notEqual(on, off);
    assert.equal(off, "rgba(0, 0, 0, 0)", "an unlit star is an outline (transparent fill)");
    await stars.nth(3).click();
    await page.waitForSelector("#rateThanks");
    assert.equal(await page.locator("#rateThanks").innerText(), "Thanks!");
    assert.equal(await page.locator("#winRating .wc-stars-static").getAttribute("aria-label"), "You rated it 4 out of 5.");
    assert.equal((await stored(page)).playerRating, 4, "saved on the game");
    const log = await gameLog(page);
    assert.equal(log.games[gameId(page)].player_rating, 4, "and on the game's log record");
    // Nothing blocks the buttons.
    for (const id of ["#newGameBtn", "#homeBtn", "#historyBtn"]) assert.ok(await page.isEnabled(id), id);
    await context.close();
  }
});

test("rating with the keyboard: Tab to a star, Enter saves it", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await win(page, "milo");
  await page.focus("#winRating .wc-star >> nth=0");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Rate 3 out of 5");
  assert.deepEqual(await lit(page), [true, true, true, false, false], "focus previews too");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#rateThanks");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "rateThanks", "focus moves to the thanks message");
  assert.equal((await stored(page)).playerRating, 3);
  await context.close();
});

test("a rated game is never asked again (reload); Play again gets its own question; Home and History still work", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await win(page, "gary");
  const first = gameId(page);
  await page.click("#winRating .wc-star >> nth=4");
  await page.waitForSelector("#rateThanks");
  await page.reload();
  await page.waitForSelector(".win-card");
  assert.equal(await page.locator("#winRating .wc-star").count(), 0, "not asked again");
  assert.equal(await page.locator("#winRating .wc-stars-static").getAttribute("aria-label"), "You rated it 5 out of 5.");
  // View history focuses the trail.
  await page.click("#historyBtn");
  await page.waitForFunction(() => document.activeElement?.id === "trailTitle");
  // Play again: a new game, with Gary again, and a fresh rating opportunity once it is won.
  await page.click("#newGameBtn");
  await page.waitForSelector("#word");
  assert.notEqual(gameId(page), first);
  await lockIn(page, await botWord(page));
  await page.waitForSelector(".win-card");
  assert.equal(await page.locator("#winRating .wc-star").count(), 5);
  assert.equal(await page.locator(".win-card").getAttribute("data-character"), "gary");
  // Return home.
  await page.click("#homeBtn");
  await page.waitForFunction(() => location.pathname === "/");
  await page.waitForSelector("#startSolo");
  await context.close();
});

test("rating upload: pending with the game, or updating an already-uploaded game, without duplicates; failures keep the log", async () => {
  // Case A: the game has not uploaded yet (uploads failing) when the player rates.
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await context.route("**/api/log/batch", route => route.abort("failed"));
  await win(page, "milo", 1);
  const a = gameId(page);
  await page.click("#winRating .wc-star >> nth=1");
  await page.waitForSelector("#rateThanks");
  let log = await gameLog(page);
  assert.deepEqual(log.pending.ratings, [a], "the rating waits with the game");
  assert.deepEqual(Object.keys(log.rounds).filter(k => k.startsWith(a)).sort(), [`${a}#1`, `${a}#2`], "a failed upload never touches the rounds");
  assert.equal(await serverRating(a), null);
  await context.unroute("**/api/log/batch");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("ssbd.gamelog")); return !d.pending.ratings.length && !d.pending.rounds.length; }, null, {timeout: 10000});
  assert.equal(await serverRating(a), 2);

  // Case B: the game is already uploaded when the player rates.
  await win(page, "gary");
  const b = gameId(page);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(id => { const d = JSON.parse(localStorage.getItem("ssbd.gamelog")); return !d.pending.games.length && !d.pending.rounds.length && d.games[id]; }, b, {timeout: 10000});
  assert.equal((await sql.query("SELECT COUNT(*)::int AS n FROM bot_games WHERE game_id = $1", [b])).rows[0].n, 1);
  assert.equal(await serverRating(b), null);
  await page.click("#winRating .wc-star >> nth=3");
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem("ssbd.gamelog")).pending.ratings.length, null, {timeout: 10000});
  assert.equal(await serverRating(b), 4);
  assert.equal((await sql.query("SELECT COUNT(*)::int AS n FROM bot_games WHERE game_id = $1", [b])).rows[0].n, 1, "updated, not duplicated");
  assert.equal((await sql.query("SELECT COUNT(*)::int AS n FROM bot_rounds WHERE game_id = $1", [b])).rows[0].n, 1);
  log = await gameLog(page);
  assert.equal(log.games[a].player_rating, 2, "each rating stays with its own game");
  assert.equal(log.games[b].player_rating, 4);

  // /review shows the rating on the game.
  await page.goto(`${server.url}/review`);
  await page.fill("#reviewToken", TOKEN);
  await page.click(".rv-token button[type=submit]");
  await page.waitForSelector(".rv-games");
  const ratings = await page.locator(".rv-games td.rv-rating").allInnerTexts();
  assert.ok(ratings.includes("★★★★☆") && ratings.includes("★★☆☆☆"), ratings.join(" | "));
  assert.match(await page.locator(".rv-metrics-wrap").innerText(), /Player rating \(wins\)/);
  await context.close();
});

test("the win card on a phone: compact, no sideways scroll, full-width primary button, tappable stars", async () => {
  const context = await browser.newContext({viewport: {width: 360, height: 740}, reducedMotion: "reduce", isMobile: true, hasTouch: true});
  const page = await context.newPage();
  await win(page, "milo");
  assert.ok(await noHorizontalScroll(page));
  const [cardBox, primary, avatar] = await Promise.all([page.locator(".win-card").boundingBox(), page.locator("#newGameBtn").boundingBox(), page.locator(".wc-avatar").boundingBox()]);
  assert.ok(primary.width >= cardBox.width - 40, `primary ${primary.width} of ${cardBox.width}`);
  assert.ok(avatar.width <= 80, "compact avatar");
  for (const star of await page.locator(".wc-star").all()) {
    const box = await star.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44);
  }
  await page.tap("#winRating .wc-star >> nth=4");
  await page.waitForSelector("#rateThanks");
  await context.close();
});

test("animations play once when motion is allowed (and the card still settles fully)", async () => {
  const context = await browser.newContext({reducedMotion: "no-preference"});
  const page = await context.newPage();
  await win(page, "milo");
  assert.equal(await page.locator(".win-card.animate").count(), 1);
  const iterations = await page.evaluate(() => getComputedStyle(document.querySelector(".win-card .wc-avatar")).animationIterationCount);
  assert.equal(iterations, "1", "no looping celebration");
  await context.close();
});
