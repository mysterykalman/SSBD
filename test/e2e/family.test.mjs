import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

async function named(context, name) {
  const page = await context.newPage();
  await page.goto(server.url);
  return page;
}

test("family game: create, join, private words, simultaneous reveal, next prompt", async () => {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext({viewport: {width: 375, height: 740}});
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

  await ben.fill("#word", "Planet");
  await ben.click("#lockBtn");
  await ben.waitForSelector("#prompt");
  assert.deepEqual((await ben.locator("#prompt .tile").allInnerTexts()).map(w => w.toLowerCase()), ["rocket", "planet"]);
  assert.match(await ben.locator(".reveal").innerText(), /ANA[\s\S]*ROCKET[\s\S]*YOU[\s\S]*PLANET/i);

  await ana.waitForSelector("#prompt", {timeout: 10000});
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
  await ben.waitForSelector(".end.win");
  await ana.waitForSelector(".end.win", {timeout: 10000});
  await ctxA.close();
  await ctxB.close();
});
