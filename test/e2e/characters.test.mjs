// Choosing who to play Solo with: Gary or Milo. One shared character system, the same word engine,
// and the chosen character replaces every Gary label, avatar and line for that game.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, lockIn, soloRecord, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const MILO_LINES = /ooh|I've got one|boing|again! again|next one's ours|let's gooo|wiggling|love that one|thinking hat|socks|snack|happy spin|hmmm|wheee|nice one|SO close|twins|wavelength|whoa|surprise|plot twist|still going|totally do this|WHAT|already\?!|PHEW|never gave up|YAY|same word!|best\. day|round two|hoping you'd say|SO fun|again tomorrow/i;

/** Every bit of text in the page a person could see or hear (visible text, sr-only text, ARIA labels, image alts). */
const allText = page => page.evaluate(() => [document.body.textContent,
  ...[...document.querySelectorAll("[aria-label], [alt], [title]")].map(el => `${el.getAttribute("aria-label") || ""} ${el.getAttribute("alt") || ""} ${el.getAttribute("title") || ""}`)].join(" "));
const portrait = (page, selector) => page.locator(selector).first().evaluate(el => el.querySelector("img")?.className || el.className);

test("the picker: 'Who do you want to play with?', two big cards, a clear selected state, never difficulty or age", async () => {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 860}]) {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await page.click("#startSolo");
    await page.waitForSelector("#characterPicker[open]");
    const picker = await page.locator("#characterPicker").innerText();
    assert.match(picker, /Who do you want to play with\?/);
    assert.match(await page.locator('label[data-character="gary"]').innerText(), /Gary from Accounting\s+He was told there would be cake\./);
    assert.match(await page.locator('label[data-character="milo"]').innerText(), /^\s*Milo\s+Ready\. Probably too ready\.\s*$/);
    assert.doesNotMatch(picker, /difficult|easy|hard|level|\bbots?\b|\bAI\b|robot|kids?\b|child|age\b/i);
    // Each card: a large avatar of that character, a name and one line.
    for (const id of ["gary", "milo"]) {
      const art = await page.locator(`label[data-character="${id}"] .pick-art`).boundingBox();
      assert.ok(art.width >= 88 && art.height >= 88, `${id} avatar is large (${art.width}px)`);
      assert.match(await portrait(page, `label[data-character="${id}"] .pick-art`), new RegExp(`art-${id}`));
    }
    // Gary is preselected the first time; the selected card looks selected and is announced as checked.
    assert.ok(await page.isChecked("#pick-gary"));
    assert.equal(await page.evaluate(() => document.activeElement?.id), "pick-gary");
    const bg = id => page.locator(`label[data-character="${id}"]`).evaluate(el => getComputedStyle(el).backgroundColor);
    const [garyOn, miloOff] = [await bg("gary"), await bg("milo")];
    assert.notEqual(garyOn, miloOff, "selected card stands out");
    assert.match(await page.locator("#startCharacter").innerText(), /Play with Gary/);
    await page.click('label[data-character="milo"]');
    assert.ok(await page.isChecked("#pick-milo"));
    assert.equal(await bg("milo"), garyOn, "the selection moved to Milo");
    assert.match(await page.locator("#startCharacter").innerText(), /Play with Milo/);
    // Arrow keys switch too (they are real radio buttons).
    await page.focus("#pick-milo");
    await page.keyboard.press("ArrowLeft");
    assert.ok(await page.isChecked("#pick-gary"));
    // Both cards fit side by side, inside the dialog, with no sideways scroll.
    const boxes = await page.$$eval("#characterPicker .pick-card", cards => cards.map(c => c.getBoundingClientRect().toJSON()));
    assert.ok(Math.abs(boxes[0].top - boxes[1].top) <= 4 && boxes[0].right <= boxes[1].left, "side by side");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // Cancel goes back home without starting anything.
    await page.click("#cancelCharacter");
    await page.waitForSelector("#characterPicker", {state: "detached"});
    assert.equal(new URL(page.url()).pathname, "/");
    await context.close();
  }
});

test("choosing Gary: the game shows Gary, exactly as before", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "gary");
  await page.waitForSelector("#word");
  assert.equal((await soloRecord(page)).character, "gary");
  assert.match(await page.locator("#app").innerText(), /Gary is picking his own word right now/);
  assert.match(await page.locator("#formHelp").innerText(), /Gary has picked his word\./);
  assert.match(await portrait(page, ".mode-chip .badge.gary"), /art-gary/);
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "tulip" ? "daisy" : "tulip", {reveal: false});
  await page.waitForSelector("#revealContinue");
  const garyModal = await page.locator("#revealModal").innerText();
  assert.match(garyModal, /GARY.S WORD/);
  // Gary keeps the shared reveal wording.
  assert.match(garyModal, /Nice connection! The trail continues\./);
  assert.match(garyModal, /Next move starts with \S+ \+ \S+/);
  assert.equal((await page.locator("#revealContinue").innerText()).trim(), "Keep playing");
  assert.match(await portrait(page, "#revealModal .rv-word.gary small"), /art-gary/);
  assert.match(await portrait(page, "#garyLine"), /art-gary/);
  assert.match(await page.locator("#garyLine .gary-bubble").innerText(), /sigh/);
  assert.doesNotMatch(await allText(page), /milo/i);
  await context.close();
});

test("choosing Milo: Milo everywhere (labels, avatars, his own lines), and no Gary anywhere in the game", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1, meetGary: true});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "milo");
  // His own one-time intro.
  await page.waitForSelector("#garyIntro[open]");
  const intro = await page.locator("#garyIntro").innerText();
  assert.match(intro, /SAY HI TO\s+Milo\s+Hi! I'm Milo!\s+I LOVE words\.\s+Let's go go go!/i);
  assert.match(await portrait(page, "#garyIntro .intro-art"), /art-milo/);
  assert.doesNotMatch(intro, /gary|rival/i);
  await page.click("#garyIntroGo");
  await page.waitForSelector("#garyIntro", {state: "detached"});
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_milo_met")), "1");
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_gary_met")), null, "meeting Milo is not meeting Gary");

  assert.equal((await soloRecord(page)).character, "milo");
  assert.match(await page.locator("#app").innerText(), /Type any word you like! Milo is picking one too, super fast\. Then you both reveal!/);
  assert.match(await page.locator("#formHelp").innerText(), /Milo is ready\. Like, REALLY ready\./);
  assert.match(await portrait(page, ".mode-chip .badge.gary"), /art-milo/);
  assert.doesNotMatch(await allText(page), /gary/i, "start of game");

  // Move 1: Milo's word, Milo's avatar, Milo speaking one of his own lines.
  const first = await botWord(page);
  await lockIn(page, first.toLowerCase() === "garden" ? "pencil" : "garden", {reveal: false});
  await page.waitForSelector("#revealContinue");
  const modal = await page.locator("#revealModal").innerText();
  assert.match(modal, /MILO.S WORD/);
  // The reveal screen speaks in Milo's voice too: the outcome, the next pair and the button.
  assert.match(modal, /Ooh, nice connection! On we go!/);
  assert.match(modal, /Next up: \S+ \+ \S+\. Let's gooo!/);
  assert.doesNotMatch(modal, /The trail continues|Next move starts with/);
  assert.equal((await page.locator("#revealContinue").innerText()).trim(), "Keep going!");
  assert.match(await portrait(page, "#revealModal .rv-word.gary small"), /art-milo/);
  assert.match(await portrait(page, "#garyLine"), /art-milo/, "the reaction shows Milo's avatar");
  const line = await page.locator("#garyLine .gary-bubble").innerText();
  assert.match(line, MILO_LINES);
  assert.doesNotMatch(line, /sigh|ugh|fine|object|rude/i, "never one of Gary's lines");
  assert.doesNotMatch(await allText(page), /gary/i, "reveal");
  await page.waitForFunction(() => /Milo: ooh/i.test(document.getElementById("srAnnounce")?.textContent || ""));
  await page.click("#revealContinue");
  await page.waitForSelector("#revealModal", {state: "detached"});

  // The latest-row rule is unchanged with Milo.
  await page.waitForSelector("#trailNow #nowHint");
  assert.match(await page.locator("#trailNow").innerText(), /Match these two words!\s+Old rows are just your history\./);
  assert.match(await page.locator("#trailNow").innerText(), /MILO/);
  assert.match(await page.locator("#formHelp").innerText(), /Milo is ready\. Like, REALLY ready\./);
  assert.doesNotMatch(await allText(page), /gary/i, "board with a trail");

  // Win: Milo's early-match reaction (not a second "high five"), then the final screen.
  await lockIn(page, await botWord(page), {reveal: false});
  await page.waitForSelector("#revealContinue");
  const win = await page.locator("#revealModal").innerText();
  assert.match(await page.locator("#garyLine .gary-bubble").innerText(), /WHAT! already\?! amazing!/);
  assert.equal(win.split(/high five/i).length - 1, 1, "'high five' only once: in the match subcopy");
  assert.match(await portrait(page, "#garyLine"), /art-milo/);
  await page.click("#revealContinue");
  await page.waitForSelector("#app .end.win");
  // The final screen keeps the shared win copy; the button names who you'd play again.
  assert.match(await page.locator("#app .end").innerText(), /YOU DID IT!\s+Matched on move 2\. Somebody cue the tiny parade\./);
  assert.equal((await page.locator("#newGameBtn").innerText()).trim(), "Play again with Milo");
  assert.doesNotMatch(await allText(page), /gary/i, "end screen");
  await context.close();
});

test("the choice is remembered and preselected; Play again keeps Milo and he greets the rematch", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "milo");
  await page.waitForSelector("#word");
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_character")), "milo");
  // Home: Milo's avatar on the Solo card and in the game list; the picker opens on Milo, even after a reload.
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  assert.match(await portrait(page, ".solo-card .badge.gary"), /art-milo/);
  assert.match(await portrait(page, "#gameList .badge.gary"), /art-milo/);
  await page.reload();
  await page.click("#startSolo");
  await page.waitForSelector("#characterPicker[open]");
  assert.ok(await page.isChecked("#pick-milo"), "Milo preselected");
  await page.click("#startCharacter");
  await page.waitForSelector("#word");
  // No rematch greeting on a new game from home.
  assert.equal(await page.locator("#rematchLine").count(), 0);

  // Win, then Play again: same character, no picker, and Milo says hello again.
  const firstId = (await soloRecord(page)).id;
  await lockIn(page, await botWord(page));
  await page.waitForSelector("#app .end.win");
  await page.click("#newGameBtn");
  await page.waitForSelector("#word");
  assert.equal(await page.locator("#characterPicker").count(), 0, "Play again skips the picker");
  const game = await soloRecord(page);
  assert.notEqual(game.id, firstId);
  assert.equal(game.character, "milo", "rematch keeps the character");
  assert.equal(game.rematch, true);
  const greeting = page.locator("#rematchLine");
  assert.match(await greeting.innerText(), /I was hoping you'd say that|round two! I stretched!/);
  assert.match(await portrait(page, "#rematchLine"), /art-milo/);
  assert.doesNotMatch(await allText(page), /gary/i);
  // The greeting is for the first move only.
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "garden" ? "pencil" : "garden");
  await page.waitForSelector("#trailNow #nowHint");
  assert.equal(await page.locator("#rematchLine").count(), 0);

  // A new Solo from home can switch back to Gary.
  await page.goto(server.url);
  await startSolo(page, "gary");
  await page.waitForSelector("#word");
  assert.equal((await soloRecord(page)).character, "gary");
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_character")), "gary");
  await context.close();
});

test("Gary's rematch: Play again keeps Gary, with one of his own greetings", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "gary");
  await page.waitForSelector("#word");
  await lockIn(page, await botWord(page));
  await page.waitForSelector("#app .end.win");
  await page.click("#newGameBtn");
  await page.waitForSelector("#rematchLine");
  assert.equal((await soloRecord(page)).character, "gary");
  assert.match(await page.locator("#rematchLine").innerText(), /again\? fine\.|round two\. I brought a pen\./);
  assert.match(await portrait(page, "#rematchLine"), /art-gary/);
  assert.doesNotMatch(await allText(page), /milo/i);
  await context.close();
});

test("French: the picker and Milo's game are translated", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click('[data-lang="fr"]');
  await page.click("#startSolo");
  await page.waitForSelector("#characterPicker[open]");
  const picker = await page.locator("#characterPicker").innerText();
  assert.match(picker, /Avec qui veux-tu jouer[\s ]\?/);
  assert.match(picker, /Gary de la comptabilité\s+On lui avait promis du gâteau\./);
  assert.match(picker, /Milo\s+Prêt\. Sûrement trop prêt\./);
  await page.click('label[data-character="milo"]');
  assert.match(await page.locator("#startCharacter").innerText(), /Jouer avec Milo/);
  await page.click("#startCharacter");
  await page.waitForSelector("#word");
  assert.match(await page.locator("#app").innerText(), /Milo en choisit un aussi, à toute vitesse/);
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "jardin" ? "fusée" : "jardin", {reveal: false});
  await page.waitForSelector("#revealContinue");
  const frModal = await page.locator("#revealModal").innerText();
  assert.match(frModal, /MOT DE MILO/);
  assert.match(frModal, /Oh, belle connexion[\s\u202f]! On continue[\s\u202f]!/);
  assert.match(frModal, /La suite[\s\u202f]: \S+ \+ \S+\. C’est parti[\s\u202f]!/);
  assert.match(await page.locator("#revealContinue").innerText(), /Allez, la suite[\s\u202f]!/);
  assert.match(await page.locator("#garyLine .gary-bubble").innerText(), /^oh[\s ]!/);
  assert.doesNotMatch(await allText(page), /gary/i);
  await context.close();
});

test("family games never show the picker or a Solo character", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click("#createFamily");
  await page.fill("#nameInput", "Ana");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("#joinCode");
  assert.equal(await page.locator("#characterPicker, .badge.gary, #rematchLine").count(), 0);
  assert.doesNotMatch(await page.locator("#app").innerText(), /milo|gary/i);
  await context.close();
});
