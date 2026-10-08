// Developer diagnostics for Gary's decisions: shown only in development mode, after the reveal,
// with the pair, the predicted human answers, every candidate's score, the pick and the reason.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, lockIn, startServer, startSolo} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

test("developer mode: the decision panel explains Gary's pick after each reveal (and the console logs it)", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  await context.addInitScript(() => localStorage.setItem("ssbd_debug_gary", "1"));
  const page = await context.newPage();
  const logs = [];
  page.on("console", m => logs.push(m.text()));
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  assert.match(await page.locator("#garyDebug").innerText(), /No decision recorded yet/, "nothing is shown before a reveal");
  // Move 1: Gary's opening.
  const opening = await botWord(page);
  // Words Gary knows, so the next pair has real predictions.
  await lockIn(page, opening.toLowerCase() === "garden" ? "pencil" : "garden");
  assert.match(await page.locator("#garyDebug").innerText(), /\(opening move\)/);
  // Move 2: a real pair.
  const prompts = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("ssbd.store"));
    const game = data.solo[location.pathname.split("/").pop()];
    return game.moves[game.moves.length - 1].prompts;
  });
  const gary = await botWord(page);
  await lockIn(page, gary.toLowerCase() === "violin" ? "candle" : "violin");
  const panel = await page.locator("#garyDebug").innerText();
  for (const label of ["Current pair", "Predicted human answers", "Gary's candidate words", "score", "Selected word", "Reason selected"]) assert.ok(panel.includes(label), `panel shows ${label}`);
  assert.ok(panel.includes(prompts.map(w => w.toUpperCase()).join(" + ")), "the pair Gary answered");
  assert.ok(panel.includes(gary.toUpperCase()), "the word he selected");
  assert.equal(await page.locator("#garyDebug tr.gd-pick").count(), 1, "the selected candidate is highlighted");
  assert.ok(await page.locator("#garyDebug .gd-candidates tbody tr").count() >= 2);
  // Console: one collapsed group per revealed decision, and window.__garyDecisions.
  assert.ok(logs.some(l => l.startsWith(`[gary] ${prompts.map(w => w.toUpperCase()).join(" + ")} → ${gary.toUpperCase()}`)), logs.join("\n"));
  assert.equal(await page.evaluate(() => window.__garyDecisions.length), 2);
  await context.close();
});

test("players never see the panel (automated browsers count as players unless they opt in)", async () => {
  const context = await browser.newContext({reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await startSolo(page);
  await page.waitForSelector("#word");
  const opening = await botWord(page);
  await lockIn(page, opening.toLowerCase() === "acorn" ? "maple" : "acorn");
  assert.equal(await page.locator("#garyDebug").count(), 0);
  assert.equal(await page.evaluate(() => window.__garyDecisions), undefined);
  // And nothing about decisions was stored with the game.
  assert.ok(!(await page.evaluate(() => localStorage.getItem("ssbd.store"))).includes("garyDecision"));
  await context.close();
});
