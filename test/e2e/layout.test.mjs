import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {SHOTS, botWord, launch, lockIn, noHorizontalScroll, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

const VIEWPORTS = {
  "phone-320": {width: 320, height: 640},
  "phone-landscape-667": {width: 667, height: 375},
  "tablet-768": {width: 768, height: 1024},
  "desktop-1280": {width: 1280, height: 800}
};

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`layout at ${name}: no overflow, controls reachable, long words wrap`, async () => {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await page.waitForSelector("#startSolo");
    assert.ok(await noHorizontalScroll(page), "home scrolls sideways");
    if (SHOTS) await page.screenshot({path: `${SHOTS}/${name}-home.png`, fullPage: true});
    for (const fr of [false, true]) {
      if (fr) await page.click('[data-lang="fr"]');
      assert.ok(await noHorizontalScroll(page), `home overflow (fr=${fr})`);
    }
    await page.click('[data-lang="en"]');
    await page.click("#startSolo");
    const long = "Supercalifragilistic";
    const bot = await botWord(page);
    await lockIn(page, long);
    await page.waitForSelector(".trail-row");
    if (!(await page.locator(".end").count())) {
      await lockIn(page, bot.toLowerCase() === "abracadabra" ? "hocus" : "abracadabra wizardry");
      await page.waitForSelector(".trail-row:nth-child(2)");
    }
    assert.ok(await noHorizontalScroll(page), "game screen scrolls sideways");
    for (const sel of ["#word", "#lockBtn", "#backBtn"]) {
      if (!(await page.locator(sel).count())) continue;
      const box = await page.locator(sel).boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, `${sel} clipped`);
      assert.ok(box.height >= 44, `${sel} touch target too small (${box.height})`);
    }
    for (const el of await page.locator(".tile, .chip").all()) {
      const box = await el.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, "a word tile overflows the screen");
    }
    if (SHOTS) await page.screenshot({path: `${SHOTS}/${name}-game.png`, fullPage: true});
    await context.close();
  });
}

test("keyboard: start and play Solo with the keyboard only, focus is visible", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.id === "startSolo");
  }
  assert.ok(reached, "Start Solo is reachable by Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, "none", "focus ring visible");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#word");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "word");
  await page.keyboard.type("lighthouse");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".trail-row");
  const active = await page.evaluate(() => document.activeElement?.id);
  assert.ok(active === "word" || active === "newGameBtn", `focus after move: ${active}`);
  assert.equal(await page.getAttribute(".meter", "role"), "progressbar");
  assert.ok(await page.getAttribute('[data-lang="en"]', "aria-pressed"));
  await context.close();
});
