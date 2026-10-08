// The Family waiting room: a big, centred 4-character code (AA00), no "Copy invite link" button,
// and joining with the code (lowercase works; malformed codes get a friendly message).
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {joinRoom, launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

async function host(viewport) {
  const context = await browser.newContext({viewport, reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "Ana");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  return {context, page};
}

test("waiting room: the AA00 code is the centred focal point, with no copy-link button and no leftover space", async () => {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 900}]) {
    const {context, page} = await host(viewport);
    const code = (await page.locator("#joinCode").innerText()).trim();
    assert.match(code, /^[A-Z]{2}[0-9]{2}$/);
    const card = await page.locator(".share").innerText();
    assert.match(card, /Invite a friend\s+Share this code\. The game starts when they join\./);
    assert.match(await page.locator("#boardTitle").innerText(), /Waiting for a friend to join/);
    assert.doesNotMatch(await page.locator("#app").innerText(), /Copy invite link|invite link/i);
    assert.equal(await page.locator(".share button, .share a").count(), 0, "no button left in the card");
    assert.deepEqual(await page.$$eval(".share > *", els => els.map(el => el.tagName)), ["H2", "P", "P"], "nothing but heading, copy and code");
    // The code sits in the middle of the card, and the card ends right after it.
    const [shareBox, codeBox] = [await page.locator(".share").boundingBox(), await page.locator("#joinCode").boundingBox()];
    assert.ok(Math.abs((codeBox.x + codeBox.width / 2) - (shareBox.x + shareBox.width / 2)) <= 2, "code centred");
    assert.ok(shareBox.y + shareBox.height - (codeBox.y + codeBox.height) <= 40, "no empty space below the code");
    assert.ok(await page.$eval("#joinCode", el => parseFloat(getComputedStyle(el).fontSize)) >= 32, "large and legible");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
    // No old hyphenated format anywhere in the Family flow.
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /\b[A-Z]{4}-\d{2}\b/);
    await context.close();
  }
});

test("joining: the code typed in lowercase works; a malformed code gets a friendly message", async () => {
  const {context, page} = await host({width: 1280, height: 900});
  const code = (await page.locator("#joinCode").innerText()).trim();
  const friend = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: "reduce"});
  const ben = await friend.newPage();
  await ben.goto(server.url);
  await ben.click("#joinFamily");
  await ben.waitForSelector("dialog #joinInput");
  assert.match(await ben.locator("#dialog").innerText(), /like AB12/);
  for (const bad of ["ABCD-12", "A1B2", "AB123"]) {
    await ben.fill("#joinInput", bad);
    await ben.click('dialog button[type="submit"]');
    await ben.waitForFunction(() => /two letters and two numbers/.test(document.getElementById("dialogError")?.textContent || ""));
  }
  await joinRoom(ben, {name: "Ben", code: code.toLowerCase()});
  await ben.waitForSelector("#word");
  await page.waitForSelector("#word", {timeout: 10000});
  assert.match(await page.locator(".mode-chip").innerText(), /Ben/);
  await friend.close();
  await context.close();
});
