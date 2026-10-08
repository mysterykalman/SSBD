// The win sequence: "THAT’S A MATCH!" + "You both said WORD. Your brains did a high five." in the
// reveal modal, then "YOU DID IT!" + "Matched on move N" on the final
// screen only. Against Gary, his reaction reads as Gary speaking: his avatar beside a speech bubble.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const count = (text, phrase) => text.split(phrase).length - 1;
const box = (page, selector) => page.locator(selector).first().boundingBox();

test("Gary win: match copy with the word in the modal, Gary's avatar speaking his reaction, YOU DID IT only on the final screen with the move number", async () => {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 860}]) {
    // Gary remarks on this reveal (fixed presentation randomness); reduced motion keeps it quick.
    const context = await browser.newContext({viewport, reducedMotion: "reduce", garyRandomValue: 0.1});
    const page = await context.newPage();
    await page.goto(server.url);
    await startSolo(page);
    await page.waitForSelector("#word");
    // Move 1: no match. Move 2: say Gary's word.
    const first = await botWord(page);
    await page.fill("#word", first.toLowerCase() === "garden" ? "pencil" : "garden");
    await page.click("#lockBtn");
    await page.waitForSelector("#revealContinue");
    await page.click("#revealContinue");
    await page.waitForSelector("#revealModal", {state: "detached"});
    const word = (await botWord(page)).toUpperCase();
    await page.fill("#word", word.toLowerCase());
    await page.click("#lockBtn");
    await page.waitForSelector("#revealContinue");

    // Reveal modal: the match announcement, with the matched word, and never "YOU DID IT!".
    const modal = await page.locator("#revealModal").innerText();
    assert.match(modal, /THAT’S A MATCH!/);
    assert.ok(modal.includes(`You both said ${word}. Your brains did a high five.`), modal);
    assert.equal(count(modal, "YOU DID IT!"), 0, "YOU DID IT! is saved for the final screen");
    assert.doesNotMatch(modal, /Same same!|SAME WORD/);

    // Gary's reaction: his avatar right beside a speech bubble with the line.
    const reaction = page.locator("#revealModal #garyLine");
    assert.ok(await reaction.isVisible(), "Gary reacts");
    assert.equal(await reaction.locator(".gary-art").count(), 1, "with his avatar");
    assert.match(await reaction.locator(".gary-bubble").innerText(), /already\? huh/, "a move-2 match gets Gary's early-match line");
    const avatar = await box(page, "#garyLine .gary-art"), bubble = await box(page, "#garyLine .gary-bubble");
    assert.ok(avatar.x + avatar.width <= bubble.x + 1 && bubble.x - (avatar.x + avatar.width) <= 16, "the avatar sits right beside the bubble");
    assert.ok(avatar.y < bubble.y + bubble.height && bubble.y < avatar.y + avatar.height, "on the same row");
    // Order: the two words, then Gary speaking, then the announcement, then Continue.
    const words = await box(page, "#revealModal .rv-words"), outcome = await box(page, "#revealModal .rv-outcome"), button = await box(page, "#revealContinue");
    assert.ok(words.y + words.height <= Math.min(avatar.y, bubble.y) + 1, "Gary speaks below the word cards");
    assert.ok(Math.max(avatar.y + avatar.height, bubble.y + bubble.height) <= outcome.y + 1, "before the announcement");
    assert.ok(outcome.y + outcome.height <= button.y + 1, "and Continue comes last");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
    // The screen-reader announcement carries the same copy.
    await page.waitForFunction(() => /THAT’S A MATCH!/.test(document.getElementById("srAnnounce")?.textContent || ""));

    // Final screen: YOU DID IT! once, with the winning move number; the modal copy is gone.
    await page.click("#revealContinue");
    await page.waitForSelector("#app .end.win");
    const end = await page.locator("#app .end").innerText();
    assert.match(end, /YOU DID IT!\s+Matched on move 2(?!\.)/);
    // The visible game (the live region keeps the last spoken announcement, which is fine).
    const all = await page.locator("#app").innerText();
    assert.equal(count(all, "YOU DID IT!"), 1);
    assert.equal(count(all, "THAT’S A MATCH!"), 0);
    await context.close();
  }
});

test("human vs human win: the same copy for both players, no Gary reaction, the move number on the final screen", async () => {
  const post = (path, body) => fetch(server.url + path, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(r => r.json());
  const ana = await post("/api/player", {display_name: "Ana"}), ben = await post("/api/player", {display_name: "Ben"});
  const game = await post("/api/games", {player_id: ana.id, solo: false});
  await post("/api/games/join", {player_id: ben.id, join_code: game.join_code});
  const pages = [];
  for (const player of [ana, ben]) {
    const context = await browser.newContext({reducedMotion: "reduce"});
    await context.addInitScript(p => localStorage.setItem("ssbd_player", JSON.stringify(p)), player);
    const page = await context.newPage();
    await page.goto(`${server.url}/games/${game.id}`);
    await page.waitForSelector("#word");
    pages.push(page);
  }
  const play = async words => {
    for (const [i, page] of pages.entries()) {
      await page.fill("#word", words[i]);
      await page.click("#lockBtn");
    }
    for (const page of pages) await page.waitForSelector("#revealContinue", {timeout: 10000});
  };
  await play(["ocean", "forest"]);
  for (const page of pages) { await page.click("#revealContinue"); await page.waitForSelector("#revealModal", {state: "detached"}); }
  await play(["rocket", "Rocket"]);
  for (const page of pages) {
    const modal = await page.locator("#revealModal").innerText();
    assert.match(modal, /THAT’S A MATCH!/);
    assert.ok(modal.includes("You both said ROCKET. Your brains did a high five."), modal);
    assert.equal(count(modal, "YOU DID IT!"), 0);
    assert.equal(await page.locator("#garyLine").count(), 0, "no Gary in family games");
    await page.click("#revealContinue");
    await page.waitForSelector("#app .end.win");
    const all = await page.locator("#app").innerText();
    assert.match(all, /YOU DID IT!\s+Matched on move 2(?!\.)/);
    assert.equal(count(all, "YOU DID IT!"), 1);
    await page.context().close();
  }
});

test("French: the same two-step sequence, translated", async () => {
  const context = await browser.newContext({reducedMotion: "reduce", locale: "fr-FR"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.click('[data-lang="fr"]');
  await startSolo(page);
  await page.waitForSelector("#word");
  const word = (await botWord(page)).toUpperCase();
  await page.fill("#word", word.toLowerCase());
  await page.click("#lockBtn");
  await page.waitForSelector("#revealContinue");
  const modal = await page.locator("#revealModal").innerText();
  assert.match(modal, /C’EST UN MATCH[\s\u202f]!/); // French puts a narrow no-break space before "!"
  assert.ok(modal.includes(`Vous avez tous les deux dit ${word}. Vos cerveaux se sont tapé dans la main.`), modal);
  await page.click("#revealContinue");
  await page.waitForSelector("#app .end.win");
  assert.match(await page.locator("#app .end").innerText(), /TU AS RÉUSSI[\s\u202f]!\s+Trouvé au coup 1(?!\.)/);
  await context.close();
});
