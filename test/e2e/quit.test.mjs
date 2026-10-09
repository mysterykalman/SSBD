// Quit (Solo) and Leave (Together): a quiet header action with a confirmation; "Keep playing" changes
// nothing; confirming ends the game cleanly (never a win or a loss) and goes home. In Together the
// other player is told right away. And the internal move cap is never shown anywhere in active play.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, continueReveal, joinRoom, launch, lockIn, playDistinct, soloRecord, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const HIDDEN_CAP = /of 20|sur 20|\b20 moves\b|\b20 coups\b|moves? (left|to go)|last chance|dernière chance|move twenty|out of moves|you lost|tu as perdu/i;

async function quitSolo(page) {
  await page.click("#quitBtn");
  await page.waitForSelector("#quitDialog[open]");
}

test("Solo Quit: low-emphasis header action, confirmation, Keep playing changes nothing, Quit game ends it and goes home", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "gary");
  await page.waitForSelector("#word");
  // Before the first round: the action is there, quiet (a text link, not a main button).
  const quit = page.locator("#quitBtn");
  assert.equal((await quit.innerText()).trim(), "Quit");
  assert.ok(!(await quit.getAttribute("class")).split(" ").includes("btn"), "not a primary or secondary button");
  assert.doesNotMatch(await page.locator("main").innerText(), HIDDEN_CAP);
  await quitSolo(page);
  assert.equal((await page.locator("#quitTitle").innerText()).trim(), "Quit this game?");
  assert.equal((await page.locator("#quitBody").innerText()).trim(), "Your current game will end.");
  assert.deepEqual((await page.locator("#quitDialog .quit-actions button").allInnerTexts()).map(x => x.trim()), ["Keep playing", "Quit game"]);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "quitKeep", "the safe choice has focus");
  // Keep playing: nothing changes.
  const before = await soloRecord(page);
  await page.click("#quitKeep");
  await page.waitForSelector("#quitDialog", {state: "detached"});
  assert.deepEqual(await soloRecord(page), before);
  // Escape also keeps playing.
  await quitSolo(page);
  await page.keyboard.press("Escape");
  await page.waitForSelector("#quitDialog", {state: "detached"});
  assert.equal((await soloRecord(page)).status, "ACTIVE");
  // After a reveal (and a reload), then quit for real.
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "garden" ? "pencil" : "garden");
  await page.reload();
  await page.waitForSelector("#word");
  const id = (await soloRecord(page)).id;
  await quitSolo(page);
  await page.click("#quitConfirm");
  await page.waitForFunction(() => location.pathname === "/");
  await page.waitForSelector("#startSolo");
  const game = await page.evaluate(gameId => JSON.parse(localStorage.getItem("ssbd.store")).solo[gameId], id);
  assert.equal(game.status, "ENDED", "kept on the device as ended");
  assert.equal(game.moves.filter(m => m.words).length, 1, "its history is preserved");
  // Logged as "ended": never matched or exhausted (not a win or a loss).
  const logged = await page.evaluate(gameId => JSON.parse(localStorage.getItem("ssbd.gamelog") || "{}").games?.[gameId]?.status, id);
  assert.equal(logged, "ended");
  // The game list says it ended; opening it shows a calm ended state, no input, no win or loss.
  const row = page.locator(`#gameList li[data-key="solo:${id}"]`);
  assert.match(await row.innerText(), /Ended/);
  await row.locator("button").click();
  await page.waitForSelector("#endedPanel");
  assert.equal(await page.locator("#word, #quitBtn").count(), 0);
  assert.doesNotMatch(await page.locator("main").innerText(), /YOU DID IT|got away|lost|game over/i);
  assert.ok(await page.isVisible("#newGameBtn") && await page.isVisible("#homeBtn"));
  await context.close();
});

test("Solo Quit during a long game and in French", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click('[data-lang="fr"]');
  await startSolo(page, "milo");
  await page.waitForSelector("#word");
  await playDistinct(page, 8, ["jardin", "violon", "fusée", "crayon", "tortue", "oreiller", "lanterne", "ancre", "girafe", "nuage", "piano", "bateau"]);
  await continueReveal(page);
  if ((await soloRecord(page)).status !== "ACTIVE") return context.close(); // matched along the way: nothing to quit
  assert.doesNotMatch(await page.locator("main").innerText(), HIDDEN_CAP);
  assert.equal((await page.locator("#quitBtn").innerText()).trim(), "Quitter");
  await page.click("#quitBtn");
  await page.waitForSelector("#quitDialog[open]");
  assert.equal((await page.locator("#quitTitle").innerText()).trim(), "Quitter cette partie ?".replace(" ?", " ?"));
  await page.click("#quitConfirm");
  await page.waitForFunction(() => location.pathname === "/");
  await context.close();
});

test("the 20-move end: no countdown before move 18, a friendly heads-up on moves 18-20, then a clear end ('That’s all 20 moves!')", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "milo");
  await page.waitForSelector("#word");
  for (let n = 0; n < 20; n++) {
    const move = n + 1;
    if (move < 18) {
      assert.doesNotMatch(await page.locator("main").innerText(), HIDDEN_CAP, `move ${move}: no countdown yet`);
      assert.equal(await page.locator("#movesWarning").count(), 0, `move ${move}`);
    } else {
      const warning = (await page.locator("#movesWarning").innerText()).trim();
      assert.equal(warning, move === 20 ? "Last move! One more try to find a match." : `Heads up: only ${21 - move} moves left to find a match!`, `move ${move}`);
      assert.equal(await page.getAttribute("#movesWarning", "role"), "status");
    }
    await playDistinct(page, 1);
    if ((await soloRecord(page)).status === "MATCHED") return context.close(); // a real match: no cap to reach
    const modal = await page.locator("#revealModal").count() ? await page.locator("#revealModal").innerText() : "";
    assert.doesNotMatch(modal, HIDDEN_CAP, `reveal ${move}`);
    await continueReveal(page);
  }
  await page.waitForSelector(".end.over");
  assert.equal((await page.locator(".end .board-title").innerText()).trim(), "That’s all 20 moves!");
  assert.equal((await page.locator("#endCopy").innerText()).trim(), "No match this time, but what a word trail. Ready for another round?");
  assert.doesNotMatch(await page.locator("main").innerText(), /game over|you lost|tu as perdu/i);
  assert.equal(await page.locator(".zzz, .sleepy").count(), 0, "no sleeping animation");
  assert.ok(await page.isVisible("#newGameBtn") && await page.isVisible("#homeBtn"));
  assert.equal(await page.locator("#quitBtn").count(), 0, "nothing to quit once it has ended");
  await context.close();
});

async function together(ctxA, ctxB) {
  const ana = await ctxA.newPage(), ben = await ctxB.newPage();
  await ana.goto(server.url);
  await ana.click("#createFamily");
  await ana.fill("#nameInput", "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  await ben.goto(`${server.url}/join/${code}`);
  await joinRoom(ben, {name: "Ben"});
  await ben.waitForSelector("#word");
  await ana.waitForSelector("#word", {timeout: 10000});
  return {ana, ben, code};
}

test("Together Leave: confirmation, the other player is told who left and can go home or start a new game; never a win or a loss", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({viewport: {width: 375, height: 740}, reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  assert.equal((await ben.locator("#quitBtn").innerText()).trim(), "Leave");
  assert.doesNotMatch(await ana.locator("main").innerText(), HIDDEN_CAP);
  // During a round: Ana has locked in, Ben leaves after a reload.
  await ana.fill("#word", "Rocket");
  await ana.click("#lockBtn");
  await ana.waitForSelector(".notice.pending");
  await ben.reload();
  await ben.waitForSelector("#word");
  await ben.click("#quitBtn");
  await ben.waitForSelector("#quitDialog[open]");
  assert.equal((await ben.locator("#quitTitle").innerText()).trim(), "Leave this game?");
  assert.equal((await ben.locator("#quitBody").innerText()).trim(), "The other player will be told that you left.");
  assert.deepEqual((await ben.locator("#quitDialog .quit-actions button").allInnerTexts()).map(x => x.trim()), ["Keep playing", "Leave game"]);
  await ben.click("#quitKeep");
  await ben.waitForSelector("#quitDialog", {state: "detached"});
  assert.equal(await ben.locator("#word").count(), 1, "Keep playing changes nothing");
  await ben.click("#quitBtn");
  await ben.click("#quitConfirm");
  await ben.waitForFunction(() => location.pathname === "/");
  // Ana is not left waiting: she sees who left, with a way home and a fresh start.
  await ana.waitForSelector("#endedPanel", {timeout: 10000});
  assert.equal((await ana.locator("#endedPanel .board-title").innerText()).trim(), "Ben left the game.");
  assert.deepEqual((await ana.locator("#endedPanel button").allInnerTexts()).map(x => x.trim()), ["Return home", "Start a new game"]);
  assert.equal(await ana.locator("#word, #quitBtn").count(), 0);
  assert.doesNotMatch(await ana.locator("main").innerText(), /YOU DID IT|THAT’S A MATCH|got away|you lost|won/i);
  // Ben opening the game again sees that he left (not a loss).
  await ben.goBack();
  await ben.waitForSelector("#endedPanel");
  assert.match(await ben.locator("#endedPanel").innerText(), /You left this game\./);
  // "Start a new game" opens a fresh invite for Ana.
  await ana.click("#endedPanel #newGameBtn");
  // Her saved name is shown to confirm (or change) first.
  await ana.waitForSelector("dialog #nameInput");
  assert.equal(await ana.inputValue("#nameInput"), "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  await ctxA.close(); await ctxB.close();
});

test("Together Leave before anyone joined, and after a reveal", async () => {
  const ctx = await browser.newContext({reducedMotion: "reduce"});
  const page = await ctx.newPage();
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "Cleo");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  await page.click("#quitBtn");
  await page.click("#quitConfirm");
  await page.waitForFunction(() => location.pathname === "/");
  await ctx.close();
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  await ana.fill("#word", "Rocket"); await ana.click("#lockBtn");
  await ben.fill("#word", "Planet"); await ben.click("#lockBtn");
  for (const p of [ana, ben]) {
    await p.waitForSelector("#revealContinue", {timeout: 10000});
    await p.click("#revealContinue");
    await p.waitForSelector("#revealModal", {state: "detached"});
  }
  await ana.waitForSelector("#word");
  await ana.click("#quitBtn");
  await ana.click("#quitConfirm");
  await ana.waitForFunction(() => location.pathname === "/");
  await ben.waitForSelector("#endedPanel", {timeout: 10000});
  assert.match(await ben.locator("#endedPanel").innerText(), /Ana left the game\./);
  await ctxA.close(); await ctxB.close();
});
