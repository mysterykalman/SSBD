import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {continueReveal, launch, revealShown, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

async function named(context, name) {
  const page = await context.newPage();
  await page.goto(server.url);
  return page;
}

test("family game: create, join, private words, simultaneous reveal, next prompt", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({viewport: {width: 375, height: 740}, reducedMotion: "reduce"});
  const ana = await named(ctxA, "Ana"), ben = await named(ctxB, "Ben");

  await ana.click("#createFamily");
  await ana.fill("#nameInput", "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  assert.match(code, /^[A-Z]{4}-\d{2}$/);
  assert.equal(await ana.locator("#word").count(), 0, "can't play before a friend joins");

  await ben.goto(`${server.url}/join/${code}`);
  await ben.fill("#nameInput", "Ben");
  await ben.click('dialog button[type="submit"]');
  await ben.waitForSelector("dialog #joinInput");
  assert.equal(await ben.inputValue("#joinInput"), code);
  await ben.click('dialog button[type="submit"]');
  await ben.waitForSelector("#word");
  assert.match(await ben.locator(".mode-chip").innerText(), /Ana/);

  await ana.waitForSelector("#word", {timeout: 10000});
  assert.match(await ana.locator(".mode-chip").innerText(), /Ben/);

  await ana.fill("#word", "Rocket");
  await ana.click("#lockBtn");
  await ana.waitForSelector(".notice.pending");
  assert.match(await ana.locator(".notice.pending").innerText(), /ROCKET.*Ben/);

  await ben.waitForFunction(() => /Ana has locked/.test(document.querySelector("#formHelp")?.textContent || ""), null, {timeout: 10000});
  assert.doesNotMatch(await ben.content(), /rocket/i, "Ana's word must stay hidden from Ben before the reveal");
  // "Now playing" row: Ana sees her own locked word, Ben only sees a "?" for it.
  assert.match(await ana.locator(".trail-now").innerText(), /ROCKET[\s\S]*\?/i);
  assert.doesNotMatch(await ben.locator(".trail-now").innerText(), /rocket/i);

  await ben.fill("#word", "Planet");
  await ben.click("#lockBtn");
  // Each player gets the reveal in the modal, their own word first; the board waits for Keep playing.
  const benReveal = await revealShown(ben);
  assert.match(benReveal, /YOUR WORD[\s\S]*PLANET[\s\S]*ANA'S WORD[\s\S]*ROCKET/i);
  assert.equal(await ben.locator("#prompt").count(), 0, "Ben's board stays on move 1 under the modal");
  assert.ok(await continueReveal(ben));
  await ben.waitForSelector("#prompt");
  assert.deepEqual((await ben.locator("#prompt .tile").allInnerTexts()).map(w => w.toLowerCase()), ["rocket", "planet"]);
  assert.match(await ben.locator(".trail-row").first().innerText(), /ROCKET[\s\S]*PLANET/i);

  const anaReveal = await revealShown(ana);
  assert.match(anaReveal, /YOUR WORD[\s\S]*ROCKET[\s\S]*BEN'S WORD[\s\S]*PLANET/i);
  assert.equal(await ana.locator("#prompt").count(), 0, "Ana's board stays on move 1 under the modal");
  assert.ok(await continueReveal(ana));
  await ana.waitForSelector("#prompt");
  assert.deepEqual((await ana.locator("#prompt .tile").allInnerTexts()).map(w => w.toLowerCase()), ["rocket", "planet"], "same stable order for both players");
  assert.match(await ana.locator(".trail-row").first().innerText(), /ROCKET[\s\S]*PLANET/i);

  // Refresh keeps state; a match ends the game for both.
  await ana.reload();
  await ana.waitForSelector("#prompt");
  await ana.fill("#word", "space");
  await ana.click("#lockBtn");
  await ana.waitForSelector(".notice.pending");
  await ben.fill("#word", "Space");
  await ben.click("#lockBtn");
  for (const page of [ben, ana]) {
    assert.match(await revealShown(page), /SAME WORD/);
    assert.equal(await page.locator("#app .end").count(), 0, "game over waits for the reveal to be dismissed");
    assert.ok(await continueReveal(page));
    await page.waitForSelector(".end.win");
  }
  await ctxA.close();
  await ctxB.close();
});

async function joinAs(page, name) {
  await page.fill("#nameInput", name);
  await page.click('dialog button[type="submit"]');
}

test("family: letter badges, notifications bell, rematch", async () => {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext({viewport: {width: 360, height: 740}});
  const ana = await named(ctxA), elo = await named(ctxB);
  // Solo-only players (no name yet) never see the bell; the header badge is a neutral "?".
  await ana.waitForSelector("#startSolo");
  assert.equal(await ana.isVisible("#notifBtn"), false);
  assert.equal((await ana.locator("#profileBtn").innerText()).trim(), "?");
  assert.equal(await ana.locator("main").evaluate(el => /🤖|👥|👨‍👩‍👧/u.test(el.textContent)), false, "no emoji avatars");

  await ana.click("#createFamily");
  await joinAs(ana, "ana");
  await ana.waitForSelector("#joinCode");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  assert.equal((await ana.locator("#profileBtn").innerText()).trim(), "A", "header badge shows the initial, uppercase");
  assert.equal(await ana.isVisible("#notifBtn"), true, "named, online family player gets the bell");

  await elo.goto(`${server.url}/join/${code}`);
  await joinAs(elo, "Élodie");
  await elo.waitForSelector("dialog #joinInput");
  await elo.click('dialog button[type="submit"]');
  await elo.waitForSelector("#word");
  assert.equal((await elo.locator("#profileBtn").innerText()).trim(), "É", "accented initial");
  assert.equal((await elo.locator(".mode-chip .badge").innerText()).trim(), "A");
  // Phone header with the bell stays on one line and never scrolls sideways.
  const [bell, profile] = [await elo.locator("#notifBtn").boundingBox(), await elo.locator("#profileBtn").boundingBox()];
  assert.ok(Math.abs(bell.y - profile.y) < 4 && profile.x + profile.width <= 360, "bell and profile badge share the header row");
  assert.ok(await elo.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  // Ana's polling sees the join and the bell shows a number (not just a colour).
  await ana.waitForSelector("#word", {timeout: 10000});
  assert.equal((await ana.locator(".mode-chip .badge").innerText()).trim(), "É");
  assert.match(await ana.locator(".mode-chip").innerText(), /You vs Élodie/);
  await ana.waitForFunction(() => document.getElementById("notifCount")?.textContent === "1" && !document.getElementById("notifCount").hidden, null, {timeout: 10000});
  assert.match(await ana.getAttribute("#notifBtn", "aria-label"), /1 new/);

  // Open the panel: newest first, unread rows say "New" in words, clicking marks read and opens the game.
  await ana.click("#notifBtn");
  await ana.waitForSelector("#notifList .notif-row");
  assert.match(await ana.locator("#notifList").innerText(), /Élodie joined your game![\s\S]*New/i);
  await ana.evaluate(() => window.dispatchEvent(new Event("focus"))); // a refresh while open never duplicates rows
  await ana.waitForTimeout(400);
  assert.equal(await ana.locator("#notifList .notif-row").count(), 1);
  await ana.locator("#notifList .notif-row").first().click();
  await ana.waitForFunction(() => !document.getElementById("dialog").open);
  await ana.waitForFunction(() => document.getElementById("notifCount").hidden);

  // Play to a match.
  await ana.fill("#word", "moon");
  await ana.click("#lockBtn");
  await ana.waitForSelector(".notice.pending");
  await elo.fill("#word", "moon");
  await elo.click("#lockBtn");
  await continueReveal(elo);
  await elo.waitForSelector(".end.win");
  for (const id of ["#newGameBtn", "#homeBtn", "#historyBtn"]) assert.equal(await elo.isVisible(id), true);
  assert.match(await elo.locator("#newGameBtn").innerText(), /Rematch/);

  // Rematch: Élodie starts it, lands in the new game, Ana is told.
  const finishedUrl = elo.url();
  await elo.click("#newGameBtn");
  await elo.waitForFunction(url => location.href !== url && /\/games\//.test(location.pathname), finishedUrl);
  await elo.waitForSelector("#word");
  assert.match(await elo.locator("#toasts").innerText(), /Rematch started/);
  assert.equal(await elo.locator(".trail-row").count(), 0, "a rematch starts fresh");

  await ana.goto(server.url);
  await ana.waitForFunction(() => Number(document.getElementById("notifCount")?.textContent) >= 1, null, {timeout: 10000});
  await ana.click("#notifBtn");
  await ana.waitForSelector("#notifList .notif-row");
  const rows = await ana.locator("#notifList .notif-row").allInnerTexts();
  assert.match(rows[0], /Élodie wants a rematch!/, "newest first");
  assert.equal(new Set(await ana.locator("#notifList .notif-row").evaluateAll(els => els.map(e => e.dataset.id))).size, rows.length, "no duplicate entries");
  await ana.click("#notifMarkAll");
  await ana.waitForFunction(() => document.getElementById("notifCount").hidden);
  assert.equal(await ana.locator("#notifList .notif-new").count(), 0);
  await ana.keyboard.press("Escape");
  await ana.reload();
  await ana.waitForSelector("#notifBtn:not([hidden])");
  await ana.waitForTimeout(500);
  assert.equal(await ana.locator("#notifCount").isHidden(), true, "mark all read is saved on the server");

  // Offline: the bell hides.
  await ctxA.setOffline(true);
  await ana.waitForSelector("#notifBtn", {state: "hidden"});
  await ctxA.setOffline(false);
  await ctxA.close();
  await ctxB.close();
});
