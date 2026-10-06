import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, lockIn, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

test("offline Solo: start, play, refresh, reopen and finish with no network", async () => {
  const context = await browser.newContext();
  let page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  // Wait for the service worker to take control and precache the shell.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const apiCalls = [];
  page.on("request", r => { if (r.url().includes("/api/")) apiCalls.push(r.url()); });
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector("#startSolo");
  assert.equal(await page.isVisible("#offlinePill"), true);
  assert.match(await page.locator("#offlinePill").innerText(), /Solo still works/);
  assert.equal(await page.isDisabled("#createFamily"), true);

  await page.click("#startSolo");
  for (const w of ["whale", "ocean", "bubble", "coral"]) {
    if (await page.locator(".end").count()) break;
    const bot = await botWord(page);
    await lockIn(page, bot.toLowerCase() === w ? `${w}s` : w);
    await page.waitForSelector(".trail-row");
  }
  const trail = await page.locator(".trail-row").allInnerTexts();
  assert.ok(trail.length >= 1);
  await page.reload();
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await page.locator(".trail-row").allInnerTexts(), trail);

  const url = page.url();
  await page.close();
  page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector(".trail-row");
  assert.deepEqual(await page.locator(".trail-row").allInnerTexts(), trail);

  if (!(await page.locator(".end").count())) {
    await lockIn(page, await botWord(page));
    await page.waitForSelector(".end.win");
  }
  await page.reload();
  await page.waitForSelector(".end");
  assert.deepEqual(apiCalls, [], "Solo never called the API while offline");
  await context.close();
});
