// Every modal can be dismissed with a ✕ in its corner; the profile window closes on Close, ✕ and
// Save; and the settings gear on the avatar never loops (a MutationObserver writing the button it
// watches froze the page).
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {launch, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const closed = (page, sel) => page.waitForFunction(s => !document.querySelector(s)?.open, sel, {timeout: 3000});

test("the avatar button settles (no endless updates), and the profile window closes on Close, ✕ and Save", async () => {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await ctx.newPage();
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "Ethan");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  await page.goto(server.url);
  const changes = await page.evaluate(() => new Promise(resolve => {
    let n = 0;
    new MutationObserver(list => { n += list.length; }).observe(document.getElementById("profileBtn"), {attributes: true, childList: true, subtree: true, characterData: true});
    setTimeout(() => resolve(n), 800);
  }));
  assert.ok(changes < 10, `the avatar button settles (${changes} changes)`);
  for (const how of ["#dialog .row.end .btn.ghost", "#dialog .dialog-x", '#dialog button[type="submit"]']) {
    await page.click("#profileBtn");
    await page.waitForSelector("#dialog[open]");
    assert.equal(await page.getAttribute("#dialog .dialog-x", "aria-label"), "Close");
    await page.click(how);
    await closed(page, "#dialog");
  }
  await ctx.close();
});

test("✕ closes the join, character picker, quit and character intro modals", async () => {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: "reduce"});
  const page = await ctx.newPage();
  await page.goto(server.url);
  await page.click("#joinFamily");
  await page.waitForSelector("#dialog[open]");
  await page.click("#dialog .dialog-x");
  await closed(page, "#dialog");
  await page.click("#startSolo");
  await page.waitForSelector("#characterPicker[open]");
  await page.click("#characterPicker .dialog-x");
  await page.waitForSelector("#characterPicker", {state: "detached"});
  await startSolo(page);
  await page.waitForSelector("#word");
  await page.click("#quitBtn");
  await page.waitForSelector("#quitDialog[open]");
  await page.click("#quitDialog .dialog-x");
  await page.waitForSelector("#quitDialog", {state: "detached"});
  assert.equal(await page.locator("#word").count(), 1, "closing the quit dialog keeps the game going");
  await page.click("#profileBtn");
  await page.click("#meetMiloAgain");
  await page.waitForSelector("#garyIntro[open]");
  await page.click("#garyIntro .dialog-x");
  await page.waitForSelector("#garyIntro", {state: "detached"});
  await ctx.close();
});
