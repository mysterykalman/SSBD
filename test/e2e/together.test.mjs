// Together mode with two separate browser sessions: the friend gives their own name after the room
// code, a word either player used is used up for both, and a match reaches both players as the same
// win (reveal, confetti, end screen), however the two submissions and the network line up.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, joinRoom, launch, lockIn, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

// Normal motion: confetti is (rightly) skipped for players who ask for reduced motion.
const PHONE = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true};

/** Count confetti layers ever added to the page. */
const countConfetti = page => page.addInitScript(() => {
  window.__confetti = 0;
  new MutationObserver(records => {
    for (const r of records) for (const n of r.addedNodes) if (n.classList?.contains("confetti")) window.__confetti++;
  }).observe(document, {subtree: true, childList: true});
});

/** Host creates through the UI; the friend joins through the UI ("Join a game": code, then name). */
async function together({hostName = "Ana", friendName = "Ben", options = PHONE} = {}) {
  const host = await (await browser.newContext(options)).newPage();
  const friend = await (await browser.newContext(options)).newPage();
  for (const page of [host, friend]) await countConfetti(page);
  await host.goto(server.url);
  await host.click("#createFamily");
  await host.fill("#nameInput", hostName);
  await host.click('dialog button[type="submit"]');
  await host.waitForSelector("#joinCode");
  const code = (await host.locator("#joinCode").innerText()).trim();
  await friend.goto(server.url);
  await friend.click("#joinFamily");
  await joinRoom(friend, {name: friendName, code});
  await friend.waitForSelector("#word");
  await host.waitForSelector("#word", {timeout: 10000});
  return {host, friend, code, close: () => Promise.all([host.context().close(), friend.context().close()])};
}

const say = async (page, word) => { await page.fill("#word", word); await page.click("#lockBtn"); };
async function continueBoth(...pages) {
  for (const page of pages) {
    await page.waitForSelector("#revealContinue", {timeout: 10000});
    await page.click("#revealContinue");
    await page.waitForSelector("#revealModal", {state: "detached"});
  }
}

test("joining: the room code first, then the friend's own name; both players see the right names, never the code", async () => {
  const host = await (await browser.newContext(PHONE)).newPage();
  const friend = await (await browser.newContext(PHONE)).newPage();
  await host.goto(server.url);
  await host.click("#createFamily");
  await host.fill("#nameInput", "Ana");
  await host.click('dialog button[type="submit"]');
  await host.waitForSelector("#joinCode");
  const code = (await host.locator("#joinCode").innerText()).trim();

  await friend.goto(server.url);
  await friend.click("#joinFamily");
  // Step 1 is the code (not the name).
  await friend.waitForSelector("dialog #joinInput");
  assert.match(await friend.locator("#dialogTitle").innerText(), /Join a family game/);
  assert.equal(await friend.locator("dialog #nameInput").count(), 0);
  // An unknown code is caught before the name step.
  await friend.fill("#joinInput", code === "ZZ00" ? "ZZ01" : "ZZ00");
  await friend.click('dialog button[type="submit"]');
  await friend.waitForFunction(() => /couldn't find that game/i.test(document.getElementById("dialogError")?.textContent || ""));
  assert.equal(await friend.locator("dialog #nameInput").count(), 0);
  await friend.fill("#joinInput", code);
  await friend.click('dialog button[type="submit"]');
  // Step 2: their own name, always asked, empty to start with.
  await friend.waitForSelector("dialog #nameInput");
  assert.match(await friend.locator("#dialogTitle").innerText(), /What should we call you\?/);
  assert.equal(await friend.inputValue("#nameInput"), "");
  // The room code (or the old ABCD-12 style) is never taken as a name.
  for (const bad of [code, code.toLowerCase(), "ZLED-31"]) {
    await friend.fill("#nameInput", bad);
    await friend.click('dialog button[type="submit"]');
    await friend.waitForFunction(() => /looks like a game code/i.test(document.getElementById("dialogError")?.textContent || ""));
    assert.equal(await friend.evaluate(() => localStorage.getItem("ssbd_player")), null, "no player was created");
  }
  await friend.fill("#nameInput", "Ben");
  await friend.click('dialog button[type="submit"]');
  await friend.waitForSelector("#word");
  await host.waitForSelector("#word", {timeout: 10000});

  // Both clients show the names the players typed, and initials from those names.
  assert.match(await friend.locator(".mode-chip").innerText(), /You vs Ana/);
  assert.match(await host.locator(".mode-chip").innerText(), /You vs Ben/);
  assert.equal((await host.locator(".mode-chip .badge").innerText()).trim(), "B");
  assert.equal((await friend.locator(".mode-chip .badge").innerText()).trim(), "A");
  assert.equal((await friend.locator("#profileBtn").innerText()).trim(), "B");
  for (const page of [host, friend]) assert.doesNotMatch(await page.locator("#app").innerText(), new RegExp(`\\b${code}\\b`), "the code is not shown in the game");
  assert.equal(JSON.parse(await friend.evaluate(() => localStorage.getItem("ssbd_player"))).display_name, "Ben");
  await host.context().close();
  await friend.context().close();
});

test("a returning player is still asked for their name (prefilled), and a new name reaches both players", async () => {
  const {host, friend, close} = await together({friendName: "Ben"});
  // Ben finishes, then joins a new room from home with the name prefilled, and changes it.
  await host.goto(server.url);
  await host.click("#createFamily");
  await host.waitForSelector("#joinCode");
  const code = (await host.locator("#joinCode").innerText()).trim();
  await friend.goto(`${server.url}/join/${code}`);
  await friend.waitForSelector("dialog #joinInput");
  assert.equal(await friend.inputValue("#joinInput"), code, "the invite link fills in the code");
  await friend.click('dialog button[type="submit"]');
  await friend.waitForSelector("dialog #nameInput");
  assert.equal(await friend.inputValue("#nameInput"), "Ben", "their name is prefilled");
  await friend.fill("#nameInput", "Benji");
  await friend.click('dialog button[type="submit"]');
  await friend.waitForSelector("#word");
  await host.waitForSelector("#word", {timeout: 10000});
  assert.match(await host.locator(".mode-chip").innerText(), /You vs Benji/);
  assert.equal((await friend.locator("#profileBtn").innerText()).trim(), "B");
  await close();
});

test("a word Player A played is rejected when Player B tries it (and the other way round), with the Together message", async () => {
  const {host, friend, close} = await together();
  await say(host, "ocean");
  await say(friend, "forest");
  await continueBoth(host, friend);
  // Move 2: each tries the other's word.
  for (const [page, word] of [[friend, "Ocean"], [host, "forests"]]) {
    await say(page, word);
    await page.waitForFunction(() => document.getElementById("formHelp")?.classList.contains("error"));
    assert.equal((await page.locator("#formHelp").textContent()).trim(), "That word has already been played.");
    assert.equal(await page.inputValue("#word"), word, "the word is kept so it can be changed");
  }
  // Nothing was locked for move 2: both can still play a fresh word.
  assert.equal(await host.locator(".notice.pending").count(), 0);
  await say(host, "boat");
  await host.waitForSelector(".notice.pending");
  await close();
});

for (const order of ["host first", "friend first"]) {
  test(`win (${order}): both players get the match reveal, confetti once, the same end screen and the same actions`, async () => {
    const {host, friend, close} = await together();
    await say(host, "ocean");
    await say(friend, "forest");
    await continueBoth(host, friend);
    const [first, second] = order === "host first" ? [host, friend] : [friend, host];
    await say(first, "tree");
    await first.waitForSelector(".notice.pending");
    await say(second, "Tree");
    for (const page of [host, friend]) {
      // The waiting player hears about it quickly (it is waiting, so it checks often).
      await page.waitForSelector("#revealContinue", {timeout: 5000});
      const modal = await page.locator("#revealModal").innerText();
      assert.match(modal, /THAT’S A MATCH!/);
      assert.ok(modal.includes("You both said TREE."), modal);
    }
    await continueBoth(host, friend);
    for (const page of [host, friend]) {
      await page.waitForSelector("#app .end.win");
      assert.match(await page.locator("#app .end").innerText(), /YOU DID IT!\s+Matched on move 2(?!\.)/);
      assert.equal((await page.locator("#newGameBtn").innerText()).trim(), "Rematch");
      assert.ok(await page.locator("#homeBtn").isVisible());
      assert.equal(await page.evaluate(() => window.__confetti), 1, "confetti exactly once");
      const trail = await page.locator(".trail-row").first().innerText();
      assert.match(trail, /TREE/i);
    }
    // Staying on the end screen never replays the win.
    await host.waitForTimeout(2500);
    for (const page of [host, friend]) {
      assert.equal(await page.evaluate(() => window.__confetti), 1);
      assert.equal(await page.locator("#revealModal").count(), 0);
    }
    await close();
  });
}

test("simultaneous matching submissions: both players win, once", async () => {
  const {host, friend, close} = await together();
  await Promise.all([host.fill("#word", "rocket"), friend.fill("#word", "rocket")]);
  await Promise.all([host.click("#lockBtn"), friend.click("#lockBtn")]);
  await continueBoth(host, friend);
  for (const page of [host, friend]) {
    await page.waitForSelector("#app .end.win");
    assert.equal(await page.evaluate(() => window.__confetti), 1);
  }
  await close();
});

test("out-of-order answers on a slow network never undo a locked word or the win", async () => {
  const {host, friend, close} = await together();
  // Every one of the host's game checks is answered 1.5 s late, so older answers keep arriving after newer state.
  await host.route("**/api/game?*", async route => {
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.fulfill({response});
  });
  // Lock the word right after a check has gone out: that check's (older) answer lands after the lock.
  await host.waitForRequest(request => request.url().includes("/api/game?"), {timeout: 10000});
  await say(host, "tree");
  await host.waitForSelector(".notice.pending");
  // While waiting, the host's locked word never flips back to an empty input.
  for (let i = 0; i < 30; i++) {
    await host.waitForTimeout(100);
    assert.equal(await host.locator("#word").count(), 0, `still locked (${i * 100} ms)`);
  }
  await say(friend, "tree");
  await continueBoth(friend, host);
  for (const page of [host, friend]) await page.waitForSelector("#app .end.win");
  // Late, older answers keep arriving for a while: the host stays on the win.
  await host.waitForTimeout(3500);
  assert.equal(await host.locator("#app .end.win").count(), 1);
  assert.equal(await host.evaluate(() => window.__confetti), 1);
  await close();
});

test("reconnect: a player who reloads after the match still gets the reveal and the win", async () => {
  const {host, friend, close} = await together();
  await say(host, "tree");
  await host.waitForSelector(".notice.pending");
  await host.reload();
  await host.waitForSelector(".notice.pending");
  await say(friend, "tree");
  await friend.waitForSelector("#revealContinue");
  // The host was away when it happened (e.g. the phone was locked), then comes back.
  await host.reload();
  await continueBoth(host);
  await host.waitForSelector("#app .end.win");
  assert.equal(await host.evaluate(() => window.__confetti), 1);
  await close();
});

for (const character of ["gary", "milo"]) {
  test(`Solo with ${character}: their earlier word is used up for the player too, with ${character === "gary" ? "Gary's" : "Milo's"} own line`, async () => {
    const context = await browser.newContext({reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await startSolo(page, character);
    await page.waitForSelector("#word");
    const first = await botWord(page);
    await lockIn(page, first.toLowerCase() === "garden" ? "pencil" : "garden");
    await page.waitForSelector("#trailNow #nowHint");
    // Their move-1 word is now one of the two words in play, and used up.
    await page.fill("#word", first.toUpperCase());
    await page.click("#lockBtn");
    await page.waitForFunction(() => document.getElementById("formHelp")?.classList.contains("error"));
    const line = (await page.locator("#formHelp").textContent()).trim();
    if (character === "gary") assert.ok(["We already used that one. I checked.", "That word’s already been played. Unfortunately, I remember.", "We used that already. Try another one.", "Already played. I have notes."].includes(line), line);
    else assert.ok(["We used that one already! Pick another.", "Already played. My memory works sometimes.", "That one’s taken. Try another."].includes(line), line);
    const game = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("ssbd.store")).solo)[0]);
    assert.equal(game.moves.filter(m => m.words).length, 1, "nothing was played");
    await context.close();
  });
}

test("French: the Together duplicate message and the name step", async () => {
  const {host, friend, close} = await together({options: {...PHONE, locale: "fr-FR"}});
  await say(host, "océan");
  await say(friend, "forêt");
  await continueBoth(host, friend);
  await say(friend, "Océan");
  await friend.waitForFunction(() => document.getElementById("formHelp")?.classList.contains("error"));
  assert.equal((await friend.locator("#formHelp").textContent()).trim(), "Ce mot a déjà été joué.");
  await close();
});
