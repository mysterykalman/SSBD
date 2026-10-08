// Choosing who to play Solo with: Gary or Milo. One shared character system, the same word engine,
// and the chosen character replaces every Gary label, avatar and line for that game.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, garyBeat, launch, lockIn, soloRecord, startServer, startSolo} from "./helpers.mjs";
import {characterKeys as characterKeysOf} from "../../src/client/characters.js";
import {STRINGS} from "../../src/client/i18n.js";
import {oneOffKeys} from "../../src/client/gary-narrative.js";
import {MILO_NARRATIVE} from "../../src/client/milo-narrative.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

// Every line Milo may say (his approved narrative, exact texts), and his old writing that must be gone.
const MILO_TEXTS = new Set(characterKeysOf("milo").map(key => STRINGS.en[key]));
const OLD_MILO = /Hi! I'm Milo!|I LOVE words|Let's go go go|\(I'm ready\.\)|SAY HI TO|Probably too ready|Let's play, Milo|gooo|boing|wiggl|thinking hat|happy spin|wheee|twins|Okay, what are you thinking\?|Already\?! Okay, we’re good at this|That was fun\. Again\?|wavelength|plot twist|super fast|REALLY ready|big leap|still grinning|Keep going!|Next up:|WHAT! already|best\. day|same word! same word|hoping you'd say|I stretched|SO fun|again tomorrow|that one's taken/i;

/** Every bit of text in the page a person could see or hear (visible text, sr-only text, ARIA labels, image alts). */
const allText = page => page.evaluate(() => [document.body.textContent,
  ...[...document.querySelectorAll("[aria-label], [alt], [title]")].map(el => `${el.getAttribute("aria-label") || ""} ${el.getAttribute("alt") || ""} ${el.getAttribute("title") || ""}`)].join(" "));
const portrait = (page, selector) => page.locator(selector).first().evaluate(el => el.querySelector("img")?.className || el.className);

test("the homepage tile: 'Solo Play', Gary and Milo side by side at the same size, 'Choose your player' opens the picker", async () => {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 860}]) {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await page.waitForSelector("#startSolo");
    assert.equal((await page.locator(".solo-card h2").innerText()).trim(), "Solo Play");
    assert.deepEqual((await page.locator(".solo-card .start-copy p").allInnerTexts()).map(x => x.trim()), ["Milo finished his homework early, so now he’s free to play.",
      "We couldn’t find anyone else, so we got Gary from Accounting. HR said this counts as team building."]);
    assert.equal((await page.locator("#startSolo").innerText()).trim(), "Choose your player");
    assert.doesNotMatch(await page.locator("main").innerText(), /Play Solo|Plays offline too|We heard you had no friends/);
    // Both portraits (the existing artwork), the same size, side by side, neither on top of the other.
    const pair = await page.$$eval("#soloPair .badge", badges => badges.map(b => ({art: b.querySelector("img")?.className || "", box: b.getBoundingClientRect().toJSON()})));
    assert.equal(pair.length, 2);
    assert.match(pair[0].art, /art-gary/);
    assert.match(pair[1].art, /art-milo/);
    assert.equal(Math.round(pair[0].box.width), Math.round(pair[1].box.width));
    assert.equal(Math.round(pair[0].box.height), Math.round(pair[1].box.height));
    assert.ok(pair[0].box.right <= pair[1].box.left + 0.5, "side by side, no overlap");
    assert.ok(Math.abs(pair[0].box.top - pair[1].box.top) < 6, "level with each other");
    assert.ok(pair[0].box.width >= 40 && pair[0].box.width <= 60, "compact enough for the tile header");
    await page.click("#startSolo");
    await page.waitForSelector("#characterPicker[open]");
    assert.match(await page.locator("#characterPicker").innerText(), /Who do you want to play with\?/);
    await context.close();
  }
});

test("the picker: 'Who do you want to play with?', two big cards, a clear selected state, never difficulty or age", async () => {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 860}]) {
    const context = await browser.newContext({viewport, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await page.click("#startSolo");
    await page.waitForSelector("#characterPicker[open]");
    const picker = await page.locator("#characterPicker").innerText();
    assert.match(picker, /Who do you want to play with\?/);
    // The approved cards, word for word: a name and two lines each, no "SAY HI TO" style label.
    assert.equal((await page.locator('label[data-character="gary"]').innerText()).trim().replace(/\s+/g, " "),
      "Gary We heard you had no friends, so we lured Gary over from Accounting with the promise of cake. There is no cake.");
    assert.equal((await page.locator('label[data-character="milo"]').innerText()).trim().replace(/\s+/g, " "),
      "Milo I’ve been waiting, like, all day. Are you ready to play already?");
    assert.deepEqual(await page.locator(".pick-name").allInnerTexts(), ["Gary", "Milo"]);
    assert.doesNotMatch(picker, OLD_MILO);
    assert.doesNotMatch(picker, /say hi|meet your/i);
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
  assert.match(await page.locator("#app").innerText(), /Gary is thinking\. This was not on his calendar\./);
  assert.match(await page.locator("#formHelp").innerText(), /Gary has a word\. Apparently we're doing this\./);
  assert.match(await portrait(page, ".mode-chip .badge.gary"), /art-gary/);
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "tulip" ? "daisy" : "tulip", {reveal: false});
  await page.waitForSelector("#revealContinue");
  const garyModal = await page.locator("#revealModal").innerText();
  assert.deepEqual((await page.locator("#revealModal .rv-word small").allInnerTexts()).map(x => x.trim()), ["YOU", "GARY"], "reveal labels: You / Gary");
  // Gary's reveal: one opening beat (before, then after the words), and his wording of the next pair.
  const first = await garyBeat(page);
  assert.equal(first.branch, "opening", `${first.before} / ${first.after}`);
  assert.equal(await page.locator("#revealModal .rv-outcome").count(), 0, "his AFTER line is the reaction; no separate result line");
  assert.match(garyModal, /Next: \S+ \+ \S+/);
  assert.doesNotMatch(garyModal, /Nice connection|On we go|trail continues|Fine\. Now try/);
  for (const line of await page.locator("#revealModal .gary-says, #revealModal .rv-next").allInnerTexts()) assert.doesNotMatch(line, /!/, `Gary does not exclaim: ${line}`);
  assert.match(await portrait(page, "#revealModal .rv-word.gary small"), /art-gary/);
  assert.match(await portrait(page, "#garyLine"), /art-gary/);
  assert.match(await portrait(page, "#garyBefore"), /art-gary/);
  assert.equal((await page.locator("#revealContinue").innerText()).trim(), "Keep playing");
  await page.click("#revealContinue");
  await page.waitForSelector("#revealModal", {state: "detached"});
  // Move 2: his beat now follows how the game is going.
  const second = await botWord(page);
  await lockIn(page, second.toLowerCase() === "violin" ? "trumpet" : "violin", {reveal: false});
  await page.waitForSelector("#revealContinue");
  // Move 2: a beat from the branch this game's direction calls for (never the opening again).
  const second2 = await garyBeat(page);
  assert.ok(second2.branch && second2.branch !== "opening", `${second2.before} / ${second2.after}`);
  assert.match(await portrait(page, "#garyLine"), /art-gary/, "Gary's remark on move 2 is still Gary's");
  assert.ok(!MILO_TEXTS.has(await page.locator("#garyLine .gary-says").getAttribute("data-full")), "never one of Milo's lines");
  assert.doesNotMatch(await allText(page), /milo/i);
  await context.close();
});

test("choosing Milo: his narrative at every step, his avatar everywhere, and no Gary anywhere in the game", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1, meetGary: true});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "milo");
  // No intro dialog: his card was the introduction. A fresh game has no greeting (that is for Play again).
  await page.waitForSelector("#word");
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#garyIntro").count(), 0);
  assert.equal(await page.locator("#rematchLine").count(), 0);
  assert.equal((await page.locator("#formHelp").innerText()).trim(), "Milo has picked a word.");
  assert.equal((await soloRecord(page)).character, "milo");
  assert.match(await portrait(page, ".mode-chip .badge.gary"), /art-milo/);
  assert.doesNotMatch(await allText(page), /gary/i, "start of game");
  assert.doesNotMatch(await allText(page), OLD_MILO);

  // Move 1 reveal: one opening beat from his narrative (before, then after the words), no result sentence.
  const first = await botWord(page);
  await lockIn(page, first.toLowerCase() === "garden" ? "pencil" : "garden", {reveal: false});
  await page.waitForSelector("#revealContinue");
  const modal = await page.locator("#revealModal").innerText();
  assert.deepEqual((await page.locator("#revealModal .rv-word small").allInnerTexts()).map(x => x.trim()), ["YOU", "MILO"]);
  const beat = await garyBeat(page);
  assert.equal(beat.character, "milo");
  assert.equal(beat.branch, "opening", `${beat.before} / ${beat.after}`);
  assert.equal(await page.locator("#revealModal .rv-outcome").count(), 0, "his AFTER line is the reaction; no separate result line");
  assert.equal(await page.locator("#revealModal .rv-note").count(), 0, "no stacked system note");
  assert.match(modal, /Next: \S+ \+ \S+/);
  assert.equal((await page.locator("#revealContinue").innerText()).trim(), "Keep playing");
  assert.match(await portrait(page, "#revealModal .rv-word.gary small"), /art-milo/);
  assert.match(await portrait(page, "#garyBefore"), /art-milo/);
  for (const text of await page.locator("#revealModal .gary-says").evaluateAll(els => els.map(el => el.dataset.full))) assert.ok(MILO_TEXTS.has(text), text);
  assert.doesNotMatch(await allText(page), /gary/i, "reveal");
  assert.doesNotMatch(await allText(page), OLD_MILO);
  await page.click("#revealContinue");
  await page.waitForSelector("#revealModal", {state: "detached"});

  // Move 2: the current pair label, the usual line above the word box, and his own used-word line.
  await page.waitForSelector("#trailNow #nowHint");
  assert.equal((await page.locator("#trailNow #nowHint").innerText()).trim(), "Match these two");
  assert.doesNotMatch(await page.locator("#app").innerText(), /Old rows are just your history/);
  assert.equal((await page.locator("#formHelp").innerText()).trim(), "Milo has picked a word.");
  await page.fill("#word", first);
  await page.click("#lockBtn");
  await page.waitForFunction(() => document.getElementById("formHelp")?.classList.contains("error"));
  const gameId = (await soloRecord(page)).id;
  assert.equal((await page.locator("#formHelp").textContent()).trim(), STRINGS.en[MILO_NARRATIVE.oneOffLine("alreadyUsed", gameId, 0)]);
  assert.doesNotMatch(await allText(page), /gary/i, "board with a trail");

  // Win on move 2: a fast-win beat; its AFTER line on the card, then its POST-WIN line.
  await lockIn(page, await botWord(page), {reveal: false});
  await page.waitForSelector("#revealContinue");
  const win = await garyBeat(page);
  assert.equal(win.branch, "fastWin");
  assert.match(await portrait(page, "#garyLine"), /art-milo/);
  assert.match(await page.locator("#revealModal").innerText(), /THAT’S A MATCH!\s+You both said \S+\.(?! Your brains)/);
  await page.click("#revealContinue");
  await page.waitForSelector("#app .end.win");
  assert.match(await page.locator("#app .end").innerText(), /YOU DID IT!\s+Matched on move 2(?!\.)/);
  assert.equal((await page.locator("#winReaction .wc-bubble").first().innerText()).trim().replace(/^Milo:\s*/, ""), win.after);
  assert.equal((await page.locator("#postWinLine").innerText()).trim().replace(/^Milo:\s*/, ""), win.extra);
  assert.equal((await page.locator("#newGameBtn").innerText()).trim(), "Play again with Milo");
  assert.doesNotMatch(await allText(page), /gary/i, "end screen");
  assert.doesNotMatch(await allText(page), OLD_MILO);
  await context.close();
});

test("Milo notices a long think: after 20 seconds on a move his line becomes one of his waiting lines", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(server.url);
  await startSolo(page, "milo");
  await page.waitForSelector("#word");
  assert.equal((await page.locator("#formHelp").innerText()).trim(), "Milo has picked a word.");
  await page.clock.fastForward(19000);
  assert.equal((await page.locator("#formHelp").innerText()).trim(), "Milo has picked a word.");
  await page.clock.fastForward(2000);
  const expected = STRINGS.en[MILO_NARRATIVE.oneOffLine("waiting", (await soloRecord(page)).id, 0)];
  await page.waitForFunction(text => document.getElementById("formHelp")?.textContent.trim() === text, expected);
  await context.close();
});

test("the built app: the new cards are in it; the old tile copy and Milo's old writing are not", async () => {
  const html = await (await fetch(server.url)).text();
  const script = html.match(/src="(\/assets\/app\.[0-9a-f]+\.js)"/)[1];
  const bundle = await (await fetch(server.url + script)).text();
  for (const old of ["Hi! I'm Milo!", "I LOVE words.", "Let's go go go!", "(I'm ready.)", "Say hi to", "Ready. Probably too ready.", "Play Solo", "We heard you had no friends.", "Plays offline too. Fancy.",
    "Okay, what are you thinking?", "Already?! Okay, we’re good at this.", "That was fun. Again?", "Nice connection! The trail continues.", "Your brains did a high five.", "Old rows are just your history.", "Fine. Now try"]) {
    assert.ok(!bundle.includes(old), `"${old}" is still in the app`);
  }
  assert.ok(bundle.includes("We heard you had no friends, so we lured Gary over from Accounting with the promise of cake."));
  assert.ok(bundle.includes("been waiting, like, all day."), "Milo's card");
  assert.ok(bundle.includes("since, like, five minutes before we started."), "Milo's narrative");
  assert.ok(bundle.includes("Solo Play") && bundle.includes("Choose your player") && bundle.includes("HR said this counts as team building."));
  for (const old of ["Hang out with Milo or Gary from Accounting.", "Friends not around?", "Choose someone who claims to know you well.", "Time to investigate."]) assert.ok(!bundle.includes(old), `"${old}" is still in the app`);
});

test("the choice is remembered and preselected; Play again keeps Milo and he greets the rematch", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page, "milo");
  await page.waitForSelector("#word");
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_character")), "milo");
  // Home: the tile always shows both of them; the game list shows Milo; the picker opens on Milo, even after a reload.
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  assert.equal(await page.locator("#soloPair .badge").count(), 2);
  assert.match(await portrait(page, "#gameList .badge.gary"), /art-milo/);
  await page.reload();
  await page.click("#startSolo");
  await page.waitForSelector("#characterPicker[open]");
  assert.ok(await page.isChecked("#pick-milo"), "Milo preselected");
  await page.click("#startCharacter");
  await page.waitForSelector("#word");
  // A new game from home has no greeting (that is for Play again).
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
  assert.ok(MILO_NARRATIVE.oneOffKeys("rematch").map(key => STRINGS.en[key]).includes((await greeting.locator(".gary-bubble").innerText()).trim().replace(/^Milo:\s*/, "")), "one of his four rematch lines");
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
  assert.ok(oneOffKeys("rematch").map(key => STRINGS.en[key]).includes((await page.locator("#rematchLine .gary-bubble").innerText()).replace(/^Gary:\s*/, "").trim()), "one of his four rematch lines");
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
  assert.match(picker, /Gary\s+Il paraît que tu n’as pas d’amis, alors on a attiré Gary de la comptabilité avec une promesse de gâteau\.\s+Il n’y a pas de gâteau\./);
  assert.match(picker, /Milo\s+Je t’attends depuis, genre, toute la journée\.\s+Alors, on peut jouer maintenant[\s ]\?/);
  await page.click('label[data-character="milo"]');
  assert.match(await page.locator("#startCharacter").innerText(), /Jouer avec Milo/);
  await page.click("#startCharacter");
  await page.waitForSelector("#word");
  assert.equal(await page.locator("#rematchLine").count(), 0);
  assert.match(await page.locator("#formHelp").innerText(), /Milo a choisi son mot\./);
  const bot = await botWord(page);
  await lockIn(page, bot.toLowerCase() === "jardin" ? "fusée" : "jardin", {reveal: false});
  await page.waitForSelector("#revealContinue");
  const frModal = await page.locator("#revealModal").innerText();
  assert.deepEqual((await page.locator("#revealModal .rv-word small").allInnerTexts()).map(x => x.trim()), ["TOI", "MILO"]);
  // Move 1: one of Milo's opening beats, in French.
  const beat = await garyBeat(page, "fr");
  assert.equal(beat.character, "milo");
  assert.equal(beat.branch, "opening");
  assert.match(frModal, /Ensuite\s?: \S+ \+ \S+/);
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
