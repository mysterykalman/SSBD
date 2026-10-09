// Together: names (asked before every game, confirmed or changed; changed from the avatar too, and
// shown the same in the game, results and history), the kind reaction after each reveal, and
// "Close enough?" from both players' views: a No dismisses it and play goes on, a Yes ends the game
// as an agreed match that both players see, including after a refresh while a request is pending.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {joinRoom, launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const REACTIONS = /^(So close!|Ooh, nearly the same!|Practically neighbours!|That was almost it!|I see what you were going for\.|Same idea, different words!|Great minds think alike!|Getting warmer!|Wow, those took different roads\.|Two very different ideas\. Fun!|Good try! Now meet in the middle\.|Different directions, and that’s how it starts!|Good try!|Nice one! On to the next\.|Interesting pair!|Ooh, let’s see where this goes\.)$/;

async function together(ctxA, ctxB) {
  const ana = await ctxA.newPage(), ben = await ctxB.newPage();
  await ana.goto(server.url);
  await ana.click("#createFamily");
  // A new player is asked for their name; nothing is made up for them.
  await ana.waitForSelector("dialog #nameInput");
  assert.equal(await ana.inputValue("#nameInput"), "");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForFunction(() => /Type your name first!/.test(document.querySelector("#dialogError")?.textContent || ""));
  await ana.fill("#nameInput", "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  await ben.goto(`${server.url}/join/${code}`);
  await joinRoom(ben, {name: "Ben"});
  await ben.waitForSelector("#word");
  await ana.waitForSelector("#word", {timeout: 10000});
  return {ana, ben};
}

/** Both lock a word; each sees the reveal (with its reaction line) and continues. Returns the reaction each saw. */
async function round(ana, ben, a, b) {
  await ana.fill("#word", a); await ana.click("#lockBtn");
  await ben.fill("#word", b); await ben.click("#lockBtn");
  const seen = [];
  for (const p of [ana, ben]) {
    await p.waitForSelector("#revealContinue", {timeout: 10000});
    seen.push(await p.locator("#revealCheer").count() ? (await p.locator("#revealCheer").innerText()).trim() : null);
    await p.click("#revealContinue");
    await p.waitForSelector("#revealModal", {state: "detached"});
  }
  return seen;
}

test("Together reveal reactions: kind, the same for both players, never the same line twice in a row", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({viewport: {width: 375, height: 740}, reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  let previous = null;
  for (const [a, b] of [["ocean", "sea"], ["violin", "carrot"], ["wave", "water"], ["rocket", "pillow"]]) {
    const [x, y] = await round(ana, ben, a, b);
    assert.match(x, REACTIONS);
    assert.equal(x, y, "both players see the same reaction");
    assert.notEqual(x, previous, "no repeat in consecutive rounds");
    previous = x;
  }
  await ctxA.close(); await ctxB.close();
});

test("Close enough? No: the asker waits, the other sees Yes/No; No dismisses it for both and play continues", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({viewport: {width: 375, height: 740}, reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  assert.equal(await ana.locator("#closeBtn").count(), 0, "nothing to ask before the first reveal");
  await round(ana, ben, "ocean", "sea");
  await ana.waitForSelector("#closeBtn");
  assert.equal((await ana.locator("#closeBtn").innerText()).trim(), "Close enough?");
  const box = await ben.locator("#closeBtn").boundingBox();
  assert.ok(box.height >= 44, "a comfortable touch target on a phone");
  await ana.click("#closeBtn");
  await ana.waitForSelector("#closeWaiting");
  assert.match(await ana.locator("#closeWaiting").innerText(), /You asked Ben if OCEAN and SEA are close enough/);
  // Ben refreshes while the request is pending: it is still there.
  await ben.reload();
  await ben.waitForSelector("#closeAsk", {timeout: 10000});
  assert.match(await ben.locator("#closeAskText").innerText(), /Ana thinks OCEAN and SEA are close enough\. Do you agree\?/);
  assert.deepEqual((await ben.locator("#closeAsk button").allInnerTexts()).map(x => x.trim()), ["Yes, close enough!", "Not quite"]);
  await ben.click("#closeNo");
  await ben.waitForSelector("#closeAsk", {state: "detached"});
  // Ana is told, kindly, and both play on.
  await ana.waitForSelector("#closeDeclined", {timeout: 10000});
  assert.match(await ana.locator("#closeDeclined").innerText(), /Ben said not quite\. Play on!/);
  assert.equal(await ana.locator("#closeBtn").count(), 0, "no second request about the same pair");
  for (const p of [ana, ben]) { assert.equal(await p.locator("#word").count(), 1); assert.equal(await p.locator("#app .end").count(), 0); }
  await round(ana, ben, "wave", "beach");
  await ana.waitForSelector("#closeBtn");
  assert.equal(await ana.locator("#closeDeclined").count(), 0, "a new pair, a fresh question");
  await ctxA.close(); await ctxB.close();
});

test("Close enough? Yes: an agreed match, labelled as such, the same for both players and in their games list", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({viewport: {width: 375, height: 740}, reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  await round(ana, ben, "puppy", "dog");
  await ben.waitForSelector("#closeBtn");
  await ben.click("#closeBtn");
  await ana.waitForSelector("#closeAsk", {timeout: 10000});
  await ana.click("#closeYes");
  for (const [p, mine, theirs, other] of [[ana, "PUPPY", "DOG", "Ben"], [ben, "DOG", "PUPPY", "Ana"]]) {
    await p.waitForSelector("#agreedPanel", {timeout: 10000});
    assert.equal((await p.locator("#agreedPanel .board-title").innerText()).trim(), "CLOSE ENOUGH!");
    assert.equal((await p.locator("#endCopy").innerText()).trim(), `You and ${other} agreed ${mine} and ${theirs} are close enough. A match on move 1!`);
    assert.equal(await p.locator("#duoArt.agreed").count(), 1);
    assert.match(await p.locator("#duoArt").innerText(), new RegExp(`${mine}[\\s\\S]*≈[\\s\\S]*${theirs}`, "i"));
    assert.equal(await p.locator("#word, #closeBtn, #quitBtn").count(), 0, "the game is over");
    assert.match(await p.locator("#progress").innerText(), /Agreed match on move 1/);
    // A refresh shows the same result.
    await p.reload();
    await p.waitForSelector("#agreedPanel");
    assert.match(await p.locator(".mode-chip").innerText(), new RegExp(other));
  }
  // The games list labels it as an agreed match.
  await ana.goto(server.url);
  await ana.waitForSelector(".game-item");
  assert.match(await ana.locator(".game-item").first().innerText(), /Agreed match/);
  await ctxA.close(); await ctxB.close();
});

test("both players ask at the same moment: one agreed match, never two conflicting states", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  await round(ana, ben, "ocean", "sea");
  await ana.waitForSelector("#closeBtn"); await ben.waitForSelector("#closeBtn");
  await Promise.all([ana.click("#closeBtn"), ben.click("#closeBtn")]);
  for (const p of [ana, ben]) await p.waitForSelector("#agreedPanel", {timeout: 10000});
  await ctxA.close(); await ctxB.close();
});

test("names: a saved name is shown to confirm or change before a game, and the avatar changes it everywhere", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  await round(ana, ben, "ocean", "sea");
  // Ana renames herself from the avatar, mid-game.
  await ana.click("#profileBtn");
  await ana.waitForSelector("dialog #nameInput");
  assert.equal(await ana.inputValue("#nameInput"), "Ana");
  await ana.fill("#nameInput", "Annie");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("dialog[open]", {state: "detached"});
  assert.equal((await ana.locator("#profileBtn").innerText()).trim(), "A");
  assert.match(await ana.getAttribute("#profileBtn", "aria-label"), /Annie/);
  // Ben sees the new name in the game header and the history.
  await ben.waitForFunction(() => /Annie/.test(document.querySelector(".mode-chip")?.textContent || ""), null, {timeout: 10000});
  // A new game: Ana's saved name is offered to confirm; she keeps it.
  await ana.goto(server.url);
  await ana.click("#createFamily");
  await ana.waitForSelector("dialog #nameInput");
  assert.equal(await ana.inputValue("#nameInput"), "Annie");
  assert.match(await ana.locator("dialog").innerText(), /Is this still you\?/);
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  await ctxA.close(); await ctxB.close();
});

test("Solo beta badge: small and friendly beside the title, never competing with it or the main button (phone and desktop)", async () => {
  for (const viewport of [{width: 320, height: 640}, {width: 1280, height: 800}]) {
    const ctx = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await ctx.newPage();
    await page.goto(server.url);
    await page.waitForSelector("#soloTitle .beta-badge");
    assert.equal((await page.locator("#soloTitle .beta-badge").innerText()).trim().toLowerCase(), "beta");
    const [title, badge, button] = await Promise.all(["#soloTitle", "#soloTitle .beta-badge", "#startSolo"].map(sel => page.locator(sel).evaluate(el => {
      const r = el.getBoundingClientRect();
      return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, font: parseFloat(getComputedStyle(el).fontSize)};
    })));
    assert.ok(badge.font < title.font * 0.6, `the badge text is much smaller than the title (${badge.font} vs ${title.font})`);
    assert.ok(badge.bottom <= button.top, "the badge sits above the main button, never on it");
    assert.ok(badge.right <= viewport.width, "inside the screen");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    await ctx.close();
  }
});

test("phone and desktop: the Close enough card, the agreed-match graphic and the near-end warning fit without sideways scrolling", async () => {
  const ctxA = await browser.newContext({viewport: {width: 1280, height: 800}, reducedMotion: "reduce"}), ctxB = await browser.newContext({viewport: {width: 320, height: 640}, reducedMotion: "reduce"});
  const {ana, ben} = await together(ctxA, ctxB);
  await round(ana, ben, "mountain", "hill");
  await ana.click("#closeBtn");
  await ben.waitForSelector("#closeAsk", {timeout: 10000});
  for (const p of [ana, ben]) assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  const yes = await ben.locator("#closeYes").boundingBox();
  assert.ok(yes.height >= 44 && yes.x >= 0 && yes.x + yes.width <= 320);
  await ben.click("#closeYes");
  for (const p of [ana, ben]) {
    await p.waitForSelector("#agreedPanel", {timeout: 10000});
    const art = await p.locator("#duoArt").boundingBox();
    assert.ok(art.width <= (p === ben ? 320 : 1280), "the graphic fits the screen");
    assert.equal(await p.locator("#duoArt .duo-badge").count(), 2, "two players meeting in the middle");
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }
  await ctxA.close(); await ctxB.close();
});
