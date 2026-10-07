// Optional content that is absent must not render as text: no stray "null", "undefined", "false"
// or "NaN" anywhere in the UI (it once appeared under the Word Trail, from an absent optional panel).
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, continueReveal, launch, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** Every text node in the page whose whole content is a leaked JS value, plus any such word in the visible text. */
async function leaks(page) {
  return page.evaluate(() => {
    const bad = /^(null|undefined|false|true|NaN|\[object Object\])$/;
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (bad.test(node.textContent.trim())) found.push(`${node.parentElement?.id || node.parentElement?.className || node.parentElement?.tagName}: "${node.textContent.trim()}"`);
    }
    const visible = document.body.innerText.match(/\b(null|undefined|NaN)\b/g) || [];
    return [...found, ...visible.map(word => `visible text: ${word}`)];
  });
}

test("no null/undefined/false text in the game UI when optional content is absent (Solo, reveal, family, end)", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  assert.deepEqual(await leaks(page), [], "home");

  // Solo game: the developer-only Gary panel is absent for players.
  await startSolo(page);
  await page.waitForSelector("#word");
  assert.equal(await page.locator("#garyDebug").count(), 0);
  assert.deepEqual(await leaks(page), [], "Solo start");
  const trailNext = await page.locator(".trail").evaluate(el => el.nextSibling && (el.nextSibling.nodeType === Node.TEXT_NODE ? el.nextSibling.textContent : el.nextSibling.nodeName));
  assert.notEqual(trailNext, "null", "nothing is rendered after the Word Trail");
  const bot = await botWord(page);
  await page.fill("#word", bot.toLowerCase() === "garden" ? "pencil" : "garden");
  await page.click("#lockBtn");
  await page.waitForSelector("#revealContinue");
  assert.deepEqual(await leaks(page), [], "reveal");
  await continueReveal(page);
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await leaks(page), [], "after a move");
  // Win: play Gary's own word.
  await page.fill("#word", await botWord(page));
  await page.click("#lockBtn");
  await continueReveal(page);
  await page.waitForSelector("#app .end");
  assert.deepEqual(await leaks(page), [], "game over");

  // Family game waiting for a friend (no opponent, no prompts yet).
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "Ana");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  assert.deepEqual(await leaks(page), [], "family waiting");
  await context.close();
});
