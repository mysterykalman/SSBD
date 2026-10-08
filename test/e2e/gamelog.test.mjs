// Persistent Solo game logs in the browser, and the private review screen:
// * each revealed round is written to the device immediately and queued for upload;
// * the queue survives a failed upload and a page reload, and syncs once the server answers again;
// * re-sending (a lost acknowledgement) never duplicates a round on the server;
// * /review shows nothing from the server without the review token, and with it lists the game,
//   expands the rounds with the bot's diagnostics, saves human flags and exports CSV.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {launch, playDistinct, startServer, startSolo} from "./helpers.mjs";

const TOKEN = "e2e-review-token-not-a-secret";
let server, browser, sql;
before(async () => {
  server = await startServer({env: {REVIEW_TOKEN: TOKEN}});
  browser = await launch();
  sql = new pg.Client({connectionString: server.databaseUrl});
  await sql.connect();
});
after(async () => { await sql?.end(); await browser?.close(); await server?.stop(); });

const gameLog = page => page.evaluate(() => JSON.parse(localStorage.getItem("ssbd.gamelog") || "null"));
const serverRounds = async id => (await sql.query("SELECT round FROM bot_rounds WHERE game_id = $1 ORDER BY round", [id])).rows.map(r => r.round);

test("rounds are kept on the device while uploads fail, survive a reload, then sync once, without duplicates", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  let attempts = 0;
  // The log endpoint is unreachable at first.
  await context.route("**/api/log/batch", route => { attempts++; return route.abort("failed"); });
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  await playDistinct(page, 2);
  const id = new URL(page.url()).pathname.split("/").pop();
  let log = await gameLog(page);
  assert.deepEqual(Object.keys(log.rounds).sort(), [`${id}#1`, `${id}#2`], "both revealed rounds are on the device");
  assert.deepEqual(log.pending.rounds.sort(), [`${id}#1`, `${id}#2`], "and still waiting to upload");
  assert.equal(log.games[id].status, "in_progress");
  assert.equal(log.games[id].rounds, 2);
  await page.waitForTimeout(800);
  assert.ok(attempts >= 1, "an upload was attempted");
  assert.deepEqual(await serverRounds(id), [], "nothing reached the server");
  // No identifying data in the log.
  const text = JSON.stringify(log);
  for (const key of ["name", "player", "email", "ip"]) assert.ok(!new RegExp(`"${key}"`, "i").test(text), `no ${key} field`);

  // Reload: the queue is still there.
  await page.reload();
  await page.waitForSelector("#word");
  log = await gameLog(page);
  assert.equal(log.pending.rounds.length, 2, "the queue survived the reload");

  // The server is reachable again: the app uploads when the browser reports it is back online.
  await context.unroute("**/api/log/batch");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(() => {
    const d = JSON.parse(localStorage.getItem("ssbd.gamelog"));
    return d.pending.rounds.length === 0 && d.pending.games.length === 0;
  }, null, {timeout: 10000});
  assert.deepEqual(await serverRounds(id), [1, 2]);

  // A lost acknowledgement: the same rounds are queued and sent again. The server keeps one copy.
  await page.evaluate(id => {
    const d = JSON.parse(localStorage.getItem("ssbd.gamelog"));
    d.pending.rounds = [`${id}#1`, `${id}#2`];
    d.pending.games = [id];
    localStorage.setItem("ssbd.gamelog", JSON.stringify(d));
    window.dispatchEvent(new Event("online"));
  }, id);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("ssbd.gamelog")).pending.rounds.length === 0, null, {timeout: 10000});
  assert.deepEqual(await serverRounds(id), [1, 2], "no duplicate rounds");
  const {rows: [game]} = await sql.query("SELECT * FROM bot_games WHERE game_id = $1", [id]);
  assert.equal(game.rounds, 2);
  assert.equal(game.status, "in_progress");
  assert.match(game.engine_version, /^engine-2\.\d+$/);
  const {rows: [round]} = await sql.query("SELECT * FROM bot_rounds WHERE game_id = $1 AND round = 2", [id]);
  assert.ok(round.decision && round.decision.stage, "the bot's decision is stored with the round");
  assert.equal(round.pair_a !== null && round.pair_b !== null, true, "round 2 records the pair the bot answered");
  await context.close();
});

test("starting another game marks the unfinished one as ended by the player", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  await playDistinct(page, 1);
  const first = new URL(page.url()).pathname.split("/").pop();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  await page.waitForFunction(first => JSON.parse(localStorage.getItem("ssbd.gamelog")).games[first].status === "ended", first);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("ssbd.gamelog")).pending.games.length === 0, null, {timeout: 10000});
  const {rows: [game]} = await sql.query("SELECT status, ended_at FROM bot_games WHERE game_id = $1", [first]);
  assert.equal(game.status, "ended");
  assert.ok(game.ended_at);
  await context.close();
});

test("review screen: token gate, game list, round diagnostics, human flags and CSV export", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", acceptDownloads: true});
  const page = await context.newPage();
  // A game to review.
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  await playDistinct(page, 2);
  const id = new URL(page.url()).pathname.split("/").pop();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("ssbd.gamelog")).pending.rounds.length === 0, null, {timeout: 10000});

  // The endpoints refuse requests without the token.
  const status = await page.evaluate(async () => (await fetch("/api/review/games")).status);
  assert.equal(status, 401);

  await page.goto(`${server.url}/review`);
  await page.waitForSelector("#reviewToken");
  assert.equal(await page.locator(".rv-games").count(), 0, "no server data before the token");
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
  // The device section works without a token.
  assert.match(await page.locator("section[aria-labelledby=rvDevice]").innerText(), /Solo games logged in this browser: [1-9]/);

  await page.fill("#reviewToken", "wrong-token");
  await page.click(".rv-token button[type=submit]");
  await page.waitForFunction(() => document.querySelector("#reviewTokenError")?.textContent.includes("not accepted"));
  assert.equal(await page.locator(".rv-games").count(), 0);

  await page.fill("#reviewToken", TOKEN);
  await page.click(".rv-token button[type=submit]");
  await page.waitForSelector(".rv-games");
  await page.waitForSelector(".rv-metrics");
  assert.match(await page.locator(".rv-metrics-wrap").innerText(), /Match within 5 moves/);

  // Open the game's rounds (the newest game is first).
  await page.locator(".rv-games tbody tr").first().locator("button", {hasText: "Rounds"}).click();
  await page.waitForSelector(".rv-rounds");
  const headers = await page.locator(".rv-game-detail:not([hidden]) .rv-rounds > thead th").allInnerTexts();
  assert.deepEqual(headers.map(h => h.trim()), ["Round", "Previous pair", "User", "Gary", "Match", "Automated", "Human flags"]);
  const roundTwo = page.locator(".rv-game-detail:not([hidden]) .rv-expand", {hasText: "Round 2"});
  await roundTwo.click();
  assert.equal(await roundTwo.getAttribute("aria-expanded"), "true");
  const detail = page.locator(".rv-game-detail:not([hidden]) .rv-detail:not([hidden])");
  const detailText = await detail.innerText();
  for (const label of ["Automated indicator", "Stage", "Candidate words", "Selected word"]) assert.ok(detailText.includes(label), `diagnostics show ${label}`);

  // Human flags, kept apart from the automated indicator.
  await detail.locator('input[value="weak"]').check();
  await detail.locator('input[value="one-sided"]').check();
  await detail.locator(".rv-note-input").fill('Too far from both, "=cmd" style note');
  await detail.locator("button", {hasText: "Save review"}).click();
  await page.waitForFunction(() => [...document.querySelectorAll(".rv-saved")].some(s => s.textContent === "Saved."));
  const {rows: [review]} = await sql.query("SELECT flags, note FROM bot_reviews WHERE game_id = $1 AND round = 2", [id]);
  assert.deepEqual(review.flags, ["weak", "one-sided"]);
  assert.equal(review.note, 'Too far from both, "=cmd" style note');

  // CSV export: a download, one row per round, the note escaped.
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('Export CSV')")]);
  assert.match(download.suggestedFilename(), /^ssbd-bot-rounds-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString("utf8"));
  const lines = csv.trim().split(/\r?\n/);
  assert.ok(lines[0].startsWith("game_id,"), lines[0]);
  const ours = lines.filter(l => l.startsWith(`${id},`));
  assert.equal(ours.length, 2, "both rounds exported");
  assert.ok(csv.includes('"Too far from both, ""=cmd"" style note"'), "quotes and commas are escaped");

  // Forget the token: back to the gate.
  await page.click("button:has-text('Forget token')");
  await page.waitForSelector("#reviewToken");
  await context.close();
});

test("review screen with nothing yet: no stray \"null\", no empty red error bar; errors still show when they happen", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(`${server.url}/review`);
  await page.waitForSelector("#reviewToken");
  const device = await page.locator("section[aria-labelledby=rvDevice]").innerText();
  assert.match(device, /Solo games logged in this browser: 0/);
  assert.doesNotMatch(device, /\bnull\b|\bundefined\b/, "zero device games: nothing printed after the controls");
  assert.equal(await page.locator("section[aria-labelledby=rvDevice] .rv-metrics").count(), 0);
  assert.doesNotMatch(await page.locator(".review").innerText(), /\bnull\b|\bundefined\b/);
  // The token form starts without any error UI (no blank red pill, no gap).
  assert.equal(await page.locator("#reviewTokenError").isVisible(), false);
  assert.equal(await page.locator("#reviewTokenError").evaluate(el => el.getBoundingClientRect().height), 0);
  // A wrong token: the error appears, as an alert.
  await page.fill("#reviewToken", "wrong-token");
  await page.click(".rv-token button[type=submit]");
  await page.waitForSelector("#reviewTokenError:not([hidden])");
  assert.equal(await page.locator("#reviewTokenError").getAttribute("role"), "alert");
  assert.match(await page.locator("#reviewTokenError").innerText(), /not accepted/);
  // The right token: review loads, and no error styling is left behind.
  await page.fill("#reviewToken", TOKEN);
  await page.click(".rv-token button[type=submit]");
  await page.waitForSelector(".rv-status");
  assert.equal(await page.locator("#reviewTokenError").count(), 0);
  await context.close();
});

test("review screen without REVIEW_TOKEN on the server: the missing setup is explained", async () => {
  const bare = await startServer();
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  try {
    await page.goto(`${bare.url}/review`);
    await page.fill("#reviewToken", "anything");
    await page.click(".rv-token button[type=submit]");
    await page.waitForSelector("#reviewTokenError:not([hidden])");
    assert.match(await page.locator("#reviewTokenError").innerText(), /not enabled on this server/);
  } finally {
    await context.close();
    await bare.stop();
  }
});

test("device metrics render once this browser has logged games", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  await playDistinct(page, 1);
  await page.goto(`${server.url}/review`);
  await page.waitForSelector("section[aria-labelledby=rvDevice] .rv-metrics");
  assert.match(await page.locator("section[aria-labelledby=rvDevice] .rv-metrics").innerText(), /Match within 5 moves/);
  assert.doesNotMatch(await page.locator("section[aria-labelledby=rvDevice]").innerText(), /\bnull\b/);
  await context.close();
});
