import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {SHOTS, botWord, launch, lockIn, noHorizontalScroll, revealShown, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

const VIEWPORTS = {
  "phone-320": {width: 320, height: 640},
  "phone-landscape-667": {width: 667, height: 375},
  "tablet-768": {width: 768, height: 1024},
  "desktop-1280": {width: 1280, height: 800}
};

/** Every word tile/chip and every visible button stays on screen; buttons are big enough to tap; no acronym. */
async function assertTidy(page, viewport) {
  for (const el of await page.locator(".tile, .chip, .mode-chip, .trail-meta").all()) {
    const box = await el.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, `a word tile overflows the screen: ${await el.innerText()}`);
  }
  for (const el of await page.locator("main button:visible, header button:visible").all()) {
    const box = await el.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, `button clipped: ${await el.innerText()}`);
    assert.ok(box.height >= 44 && box.width >= 44, `button too small to tap: ${await el.innerText()} (${box.width}x${box.height})`);
  }
  // Text inside chips must not be clipped by its box.
  const clipped = await page.evaluate(() => [...document.querySelectorAll(".chip, .tile, .btn")].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
  assert.deepEqual(clipped, [], "text is clipped inside a chip, tile or button");
  assert.doesNotMatch(await page.locator("body").innerText(), /SSBD/, "the acronym never appears in the UI");
}

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
    await page.waitForSelector("#word");
    // Solo move 1: instruction + input only, no fabricated words, no multiplayer chrome.
    assert.equal(await page.locator("#prompt, .tile, .trail-row, .share, .notice.pending").count(), 0, "Solo move 1 shows only the instruction and input");
    assert.doesNotMatch(await page.locator("main").innerText(), /family game|waiting for|join|your friend/i);
    if (SHOTS) await page.screenshot({path: `${SHOTS}/${name}-solo-move1.png`, fullPage: true});
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
    await assertTidy(page, viewport);
    if (SHOTS) await page.screenshot({path: `${SHOTS}/${name}-game.png`, fullPage: true});

    // French UI (longer strings) with a long multi-word French entry in a fresh game.
    await page.click('[data-lang="fr"]');
    await page.waitForSelector(".lang-note");
    await page.click(".lang-note button");
    await page.waitForSelector("#word");
    const frBot = await botWord(page);
    await lockIn(page, frBot.toLowerCase() === "arc-en-ciel magique" ? "licorne" : "arc-en-ciel magique");
    await page.waitForSelector(".trail-row");
    assert.ok(await noHorizontalScroll(page), "French game screen scrolls sideways");
    await assertTidy(page, viewport);
    if (SHOTS) await page.screenshot({path: `${SHOTS}/${name}-game-fr.png`, fullPage: true});
    await page.click('[data-lang="en"]');
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
  await page.waitForFunction(() => document.activeElement?.id === "word", null, {timeout: 2000});
  await page.keyboard.type("lighthouse");
  await page.keyboard.press("Enter");
  // The reveal modal takes focus on "Keep playing"; Enter continues, with a visible focus ring.
  await revealShown(page);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "revealContinue");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), "none", "focus ring visible on Keep playing");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#revealModal", {state: "detached"});
  await page.waitForSelector(".trail-row");
  const active = await page.evaluate(() => document.activeElement?.id || (document.activeElement?.matches(".end .board-title") ? "end-title" : document.activeElement?.tagName));
  assert.ok(active === "word" || active === "end-title", `focus after move: ${active}`);
  assert.equal(await page.getAttribute(".stones", "role"), "progressbar");
  assert.ok(await page.getAttribute('[data-lang="en"]', "aria-pressed"));
  await context.close();
});

test("reveal and win animations never block input and respect reduced motion", async () => {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion});
    const page = await context.newPage();
    await page.goto(server.url);
    await page.click("#startSolo");
    await page.waitForSelector("#word");
    const bot = await botWord(page);
    await lockIn(page, bot.toLowerCase() === "giraffe" ? "penguin" : "giraffe", {reveal: false});
    const started = Date.now();
    await page.waitForSelector("#revealModal[open]");
    if (reducedMotion === "reduce") {
      // No countdown and no reveal animation: the result and the button are there straight away.
      assert.equal(await page.locator("#revealCount").isVisible(), false, "no countdown with reduced motion");
      await page.locator("#revealContinue").waitFor({state: "visible", timeout: 1000});
      assert.ok(Date.now() - started < 1000, "reveal shown within 1s with reduced motion");
      const moving = await page.evaluate(() => [...document.querySelectorAll("#revealModal *")]
        .filter(el => { const s = getComputedStyle(el); return parseFloat(s.transitionDuration) > 0.01 || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0.01); })
        .map(el => el.className));
      assert.deepEqual(moving, [], "no reveal animation with reduced motion");
    } else {
      assert.equal(await page.locator("#revealCount").isVisible(), true, "countdown plays with motion");
    }
    // The modal intentionally holds the board until "Keep playing", which is focused and takes the click as soon as it appears.
    await page.locator("#revealContinue").waitFor({state: "visible"});
    assert.equal(await page.evaluate(() => document.activeElement?.id), "revealContinue", "Keep playing is focused");
    await page.locator("#revealContinue").click({trial: true, timeout: 500});
    await page.click("#revealContinue", {timeout: 500});
    await page.waitForSelector("#revealModal", {state: "detached"});
    // The input is focused and usable straight away after continuing.
    assert.equal(await page.evaluate(() => document.activeElement?.id), "word", "focus returns to the word box");
    await page.keyboard.type("zebra");
    assert.equal(await page.inputValue("#word"), "zebra");
    // Win: type the bot's word; confetti never intercepts clicks and is gone quickly.
    await lockIn(page, await botWord(page));
    await page.waitForSelector(".end.win");
    const confetti = page.locator(".confetti");
    if (reducedMotion === "reduce") assert.equal(await confetti.count(), 0, "no confetti with reduced motion");
    else {
      assert.equal(await confetti.evaluate(el => getComputedStyle(el).pointerEvents), "none");
      await page.locator("#newGameBtn").click({timeout: 1000});
      await page.waitForSelector("#word");
      await page.waitForFunction(() => !document.querySelector(".confetti"), null, {timeout: 2500});
    }
    await context.close();
  }
});

test("offline pill never covers the logo on phones (EN and FR)", async () => {
  for (const lang of ["en", "fr"]) {
    for (const width of [320, 390]) {
      const context = await browser.newContext({viewport: {width, height: 700}});
      const page = await context.newPage();
      await page.goto(server.url);
      await page.waitForSelector("#startSolo");
      if (lang === "fr") await page.click('[data-lang="fr"]');
      await context.setOffline(true);
      await page.waitForSelector("#offlinePill:not([hidden])");
      const brand = await page.locator(".brand").boundingBox();
      const pill = await page.locator("#offlinePill").boundingBox();
      const overlap = !(pill.x >= brand.x + brand.width || pill.y >= brand.y + brand.height || pill.x + pill.width <= brand.x || pill.y + pill.height <= brand.y);
      assert.ok(!overlap, `pill overlaps logo at ${width}px (${lang})`);
      assert.ok(pill.height < 48, `pill wraps at ${width}px (${lang})`);
      assert.ok(await noHorizontalScroll(page));
      await context.close();
    }
  }
});

test("connectivity toasts replace each other instead of stacking", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  for (let i = 0; i < 4; i++) { await context.setOffline(i % 2 === 0); await page.waitForTimeout(80); }
  assert.equal(await page.locator('.toast[data-key="network"]').count(), 1);
  await context.close();
});
