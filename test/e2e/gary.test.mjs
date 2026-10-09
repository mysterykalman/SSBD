// Gary from Accounting: the Solo teammate's presentation. These tests check the character
// never changes the game, never leaks into family games, and stays accessible.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, garyBeat, joinRoom, launch, soloRecord, startServer, startSolo, usedWords} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const NOT_A_PERSON = /typing|online|joined|connected|\bbot\b|robot|en ligne|rejoint/i;

async function submit(page, word) {
  await page.fill("#word", word);
  await page.click("#lockBtn");
}

test("first Solo game introduces Gary once; the intro can be reopened from the profile badge", async () => {
  const context = await browser.newContext({meetGary: true, viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#garyIntro[open]");
  const intro = await page.locator("#garyIntro").innerText();
  assert.match(intro, /MEET YOUR TEAMMATE/i);
  assert.doesNotMatch(intro, /rival|opponent/i);
  assert.match(intro, /Gary from Accounting/);
  assert.match(intro, /Hi\. I'm Gary\.\s+I do words now\.\s+Apparently\./);
  assert.equal(await page.getAttribute("#garyIntro", "aria-labelledby"), "garyIntroTitle");
  assert.equal(await page.getAttribute("#garyIntro .intro-art", "aria-hidden"), "true", "art is decorative next to his name");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "garyIntroGo");
  assert.match(await page.locator("#garyIntroGo").innerText(), /Fine, Gary\. Let's play\./);
  await page.keyboard.press("Enter");
  await page.waitForSelector("#garyIntro", {state: "detached"});
  assert.equal(await page.evaluate(() => document.activeElement?.id), "word");
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_gary_met")), "1");
  // Later games and reloads: no intro.
  await page.reload();
  await page.waitForSelector("#word");
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  await page.waitForTimeout(200);
  assert.equal(await page.locator("#garyIntro").count(), 0);
  // Reopen on purpose.
  await page.click("#profileBtn");
  await page.click("#meetGaryAgain");
  await page.waitForSelector("#garyIntro[open]");
  await page.keyboard.press("Escape");
  await page.waitForSelector("#garyIntro", {state: "detached"});
  // Milo can be met again too: his picker card lines, in the same dialog.
  await page.click("#profileBtn");
  assert.deepEqual((await page.locator("dialog .link").allInnerTexts()).filter(x => /^Meet/.test(x.trim())).map(x => x.trim()), ["Meet Gary again", "Meet Milo again"]);
  await page.click("#meetMiloAgain");
  await page.waitForSelector("#garyIntro[open][data-character=milo]");
  const milo = await page.locator("#garyIntro").innerText();
  assert.match(milo, /YOUR TEAMMATE/i);
  assert.match(milo, /I’ve been waiting, like, all day\.\s+Are you ready to play already\?/);
  assert.match(await page.locator("#garyIntroGo").innerText(), /Okay, Milo\. Let’s play!/);
  await page.click("#garyIntroGo");
  await page.waitForSelector("#garyIntro", {state: "detached"});
  await context.close();
});

test("Solo shows Gary (never 'Bot'); his typed word is exactly the engine's word; game state carries no Gary data", async () => {
  const context = await browser.newContext({garyRandomValue: 0.1});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  assert.equal(await page.locator(".mode-chip .badge.gary").count(), 1, "Gary's badge in the mode chip");
  const hidden = await botWord(page);
  // Watch Gary's chip while he types: every visible state is a prefix of his word; screen readers get it whole.
  await page.evaluate(() => {
    window.__typed = [];
    window.__said = [];
    new MutationObserver(() => {
      const chip = document.getElementById("garyWord");
      if (chip) window.__typed.push({visible: chip.querySelector(".typed")?.textContent ?? "", spoken: chip.querySelector(".sr-only")?.textContent ?? ""});
    }).observe(document.body, {subtree: true, childList: true, characterData: true});
    new MutationObserver(() => { const text = document.getElementById("srAnnounce")?.textContent; if (text) window.__said.push(text); })
      .observe(document.body, {subtree: true, childList: true, characterData: true});
  });
  await submit(page, hidden.toLowerCase() === "tulip" ? "daisy" : "tulip");
  await page.waitForSelector("#revealContinue");
  const modal = await page.locator("#revealModal").innerText();
  assert.deepEqual((await page.locator("#revealModal .rv-word small").allInnerTexts()).map(x => x.trim()), ["YOU", "GARY"]);
  assert.doesNotMatch(modal, NOT_A_PERSON);
  const beat = await garyBeat(page);
  assert.equal(beat.branch, "opening", `move 1 is Gary's opening pair: ${beat.before} / ${beat.after}`);
  assert.equal(await page.locator("#garyWord .typed").textContent(), hidden, "visible word is the engine's word");
  const frames = await page.evaluate(() => window.__typed);
  assert.ok(frames.length > 1, "typed in over several frames");
  for (const frame of frames) {
    assert.ok(hidden.startsWith(frame.visible), `"${frame.visible}" is a prefix of "${hidden}"`);
    if (frame.spoken) assert.equal(frame.spoken, hidden, "screen readers get the whole word, never a partial one");
  }
  // The announcement lands 150 ms after the reveal completes (so focus moves can't cut it off).
  await page.waitForFunction(() => window.__said.length > 0);
  await page.waitForTimeout(400);
  const said = await page.evaluate(() => window.__said);
  assert.equal(new Set(said).size, 1, "one announcement for the reveal");
  assert.match(said[0], new RegExp(`Gary: ${hidden}`, "i"));
  assert.ok(said[0].includes(`Gary: ${beat.before}`) && said[0].includes(`Gary: ${beat.after}`), `both of Gary's lines are announced: ${said[0]}`);
  const store = await page.evaluate(() => localStorage.getItem("ssbd.store"));
  const game = Object.values(JSON.parse(store).solo)[0];
  // The game remembers who the player chose (that is all): none of Gary's lines are stored in it.
  assert.equal(game.character, "gary");
  // (The committed engine decision names the profile that chose the word: "character":"gary" and the
  // config's "gary" profile. Those are engine facts, not dialogue.)
  const stored = JSON.stringify({...game, character: undefined}).replace(/"character":"gary"|"gary":\{/g, "");
  assert.doesNotMatch(stored, /gary|gn\.|suspense|suspicious|worse instructions/i, "Gary's lines are never stored in the game");
  assert.equal(game.moves[0].words.b, hidden, "the revealed word is the engine's locked word");
  await page.click("#revealContinue");
  await page.waitForSelector("#prompt");
  const app = await page.locator("#app").innerText();
  assert.match(app, /GARY/);
  assert.doesNotMatch(app, /\bbot\b|robot|typing|online|joined/i);
  await context.close();
});

test("family games never show Gary", async () => {
  const ctxA = await browser.newContext({reducedMotion: "reduce"}), ctxB = await browser.newContext({reducedMotion: "reduce"});
  const ana = await ctxA.newPage(), ben = await ctxB.newPage();
  await ana.goto(server.url);
  await ana.click("#createFamily");
  await ana.fill("#nameInput", "Ana");
  await ana.click('dialog button[type="submit"]');
  await ana.waitForSelector("#joinCode");
  const code = (await ana.locator("#joinCode").innerText()).trim();
  await ben.goto(`${server.url}/join/${code}`);
  await joinRoom(ben, {name: "Ben"});
  await ben.waitForSelector("#word");
  await ana.waitForSelector("#word", {timeout: 10000});
  await submit(ana, "Kite");
  await submit(ben, "Wind");
  await ben.waitForSelector("#revealContinue");
  await ana.waitForSelector("#revealContinue", {timeout: 10000});
  for (const page of [ana, ben]) {
    assert.doesNotMatch(await page.locator("body").innerText(), /gary/i);
    assert.equal(await page.locator(".badge.gary, .gary-art, #garyLine").count(), 0);
  }
  await ctxA.close();
  await ctxB.close();
});

test("reduced motion: Gary's word appears complete straight away", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  const hidden = await botWord(page);
  await submit(page, hidden.toLowerCase() === "acorn" ? "maple" : "acorn");
  await page.waitForSelector("#revealContinue", {timeout: 1000});
  assert.equal(await page.locator("#garyWord .typed").textContent(), hidden);
  const beat = await garyBeat(page);
  assert.ok(beat.branch, "both of Gary's lines appear complete, from one pair");
  await context.close();
});

test("French: Gary's copy, refresh mid-reveal keeps his word, offline Solo still has Gary", async () => {
  const context = await browser.newContext({locale: "fr-CA", meetGary: true});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await startSolo(page);
  await page.waitForSelector("#garyIntro[open]");
  assert.match(await page.locator("#garyIntro").innerText(), /Gary de la comptabilité[\s\S]*Je fais des mots maintenant\.[\s\S]*Apparemment\./);
  await page.click("#garyIntroGo");
  const hidden = await botWord(page);
  await submit(page, hidden.toLowerCase() === "s" ? "t" : "s");
  await page.waitForSelector("#revealModal[open]");
  await page.reload();
  await page.waitForSelector("#revealContinue");
  assert.deepEqual((await page.locator("#revealModal .rv-word small").allInnerTexts()).map(x => x.trim()), ["TOI", "GARY"]);
  assert.equal(await page.locator("#garyWord .typed").textContent(), hidden, "same word after a refresh");
  await page.click("#revealContinue");
  await page.waitForSelector("#prompt");
  assert.match(await page.locator("#app").innerText(), /GARY/);
  await context.close();
});

test("game over: Gary's 20-move beat and its follow-up; a fast match gets his fast-win beat", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  const words = ["whale", "garden", "pencil", "rocket", "banana", "violin", "jungle", "candle", "turtle", "pillow", "comet", "meadow", "pebble", "lantern", "bubble", "castle", "forest", "kitten", "carrot", "dragon", "puzzle", "sandal"];
  let used = 0, exhausted = null;
  for (let move = 1; move <= 20; move++) {
    const bot = (await botWord(page)).toLowerCase();
    const played = usedWords(await soloRecord(page)); // a word either side played is used up
    let mine; do { mine = words[used++]; } while (mine === bot || played.has(mine));
    await submit(page, mine);
    await page.waitForSelector("#revealContinue");
    const beat = await garyBeat(page);
    assert.ok(beat.branch, `move ${move}: one approved pair (${beat.before} / ${beat.after})`);
    if (move === 1) assert.equal(beat.branch, "opening");
    if (move === 20) { assert.equal(beat.branch, "exhausted"); exhausted = beat; }
    await page.click("#revealContinue");
    await page.waitForSelector("#revealModal", {state: "detached"});
  }
  await page.waitForSelector("#app .end.over #garyBye");
  const bye = await page.locator("#garyBye").innerText();
  assert.ok(bye.includes(exhausted.extra), `the follow-up of the same 20-move pair: ${bye}`);
  assert.doesNotMatch(bye, /finally\n|same time tomorrow/, "the old goodbye is gone");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await context.close();

  const winCtx = await browser.newContext({reducedMotion: "reduce", garyRandomValue: 0.1});
  const win = await winCtx.newPage();
  await win.goto(server.url);
  await startSolo(win);
  await win.waitForSelector("#word");
  await submit(win, await botWord(win));
  await win.waitForSelector("#revealContinue");
  assert.equal((await garyBeat(win)).branch, "fastWin", "an early match gets Gary's fast-win beat");
  await win.click("#revealContinue");
  await win.waitForSelector("#app .end.win");
  await winCtx.close();
});

test("Gary's intro and reveal fit at phone, landscape, tablet and desktop sizes", async () => {
  for (const viewport of [{width: 320, height: 640}, {width: 667, height: 375}, {width: 768, height: 1024}, {width: 1280, height: 860}]) {
    const context = await browser.newContext({viewport, meetGary: true, reducedMotion: "reduce", garyRandomValue: 0.1});
    const page = await context.newPage();
    await page.goto(server.url);
    await startSolo(page);
    await page.waitForSelector("#garyIntro[open]");
    const intro = await page.evaluate(() => {
      const dlg = document.getElementById("garyIntro").getBoundingClientRect();
      const cta = document.getElementById("garyIntroGo").getBoundingClientRect();
      return {inside: dlg.left >= 0 && dlg.right <= innerWidth && dlg.top >= 0 && dlg.bottom <= innerHeight, ctaHeight: cta.height, noScroll: document.documentElement.scrollWidth <= innerWidth + 1};
    });
    assert.ok(intro.inside && intro.noScroll, `intro fits at ${viewport.width}x${viewport.height}`);
    assert.ok(intro.ctaHeight >= 44);
    await page.click("#garyIntroGo");
    const bot = (await botWord(page)).toLowerCase();
    await submit(page, bot === "lighthouse" ? "harbour" : "lighthouse");
    await page.waitForSelector("#revealContinue");
    const reveal = await page.evaluate(() => {
      const box = el => el.getBoundingClientRect();
      const parts = [...document.querySelectorAll("#revealModal .rv-word, #revealModal .rv-words .op, #garyLine, #revealModal .rv-next, #revealContinue")].map(box);
      let overlap = false;
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        const p = parts[i], q = parts[j];
        if (p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1) overlap = true;
      }
      return {overlap, noScroll: document.documentElement.scrollWidth <= innerWidth + 1};
    });
    assert.ok(!reveal.overlap, `Gary's reveal overlaps at ${viewport.width}x${viewport.height}`);
    assert.ok(reveal.noScroll);
    await context.close();
  }
});
