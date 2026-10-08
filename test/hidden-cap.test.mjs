// The 20-move cap is an internal safety limit: the player never sees it. No player-facing copy and no
// line Gary or Milo can say mentions it (a count, a "last chance", running out of moves), in English
// or French, and reaching it ends gracefully ("That one got away from us."), never as a loss.
import {test} from "node:test";
import assert from "node:assert/strict";
import {STRINGS} from "../src/client/i18n.js";
import {characterKeys} from "../src/client/characters.js";
import {GARY_NARRATIVE} from "../src/client/gary-narrative.js";
import {MILO_NARRATIVE} from "../src/client/milo-narrative.js";
import {MAX_MOVES, moveOutcome} from "../src/shared/rules.js";

const REVEALS_CAP = {
  en: [/\b20\b/, /\btwenty\b/i, /last chances?/i, /(^|\. )last one\.|this is the last one/i, /final move|last move/i, /run(ning)? out of (moves|tries|chances)/i, /moves? (left|to go|remaining)/i, /\bout of moves\b/i, /\bof \{max\}/i, /\byou lost\b/i, /\bwe lost\b/i, /\bgame over\b/i],
  fr: [/\b20\b/, /\bvingt\b/i, /derni[eè]res? chances?/i, /(^|\. )le dernier\.|c’est le dernier\b/i, /dernier coup/i, /court de coups/i, /coups? restants?/i, /\bencore \{n\} coups\b/i, /\bsur \{max\}/i, /\bon a perdu\b/i, /\btu as perdu\b/i, /partie terminée/i]
};
const offenders = (lang, keys) => keys.flatMap(key => REVEALS_CAP[lang].filter(re => re.test(STRINGS[lang][key] ?? "")).map(re => `${lang}.${key}: ${STRINGS[lang][key]} (${re})`));

test("the internal cap still exists (a safety limit), and the game still ends there", () => {
  assert.equal(MAX_MOVES, 20);
  assert.equal(moveOutcome(MAX_MOVES, "violin", "pizza"), "EXHAUSTED");
  assert.equal(moveOutcome(MAX_MOVES - 1, "violin", "pizza"), "REVEALED");
});

test("Gary never reveals the hidden limit (every branch, every one-off line, EN and FR)", () => {
  const keys = characterKeys("gary").filter(k => k.startsWith("gn."));
  assert.ok(keys.length > 150);
  for (const lang of ["en", "fr"]) assert.deepEqual(offenders(lang, keys), []);
});

test("Milo never reveals the hidden limit (every branch, every one-off line, EN and FR)", () => {
  const keys = characterKeys("milo").filter(k => k.startsWith("mn."));
  assert.ok(keys.length > 150);
  for (const lang of ["en", "fr"]) assert.deepEqual(offenders(lang, keys), []);
});

test("no player-facing copy reveals the limit; the cap ending is neutral", () => {
  for (const lang of ["en", "fr"]) assert.deepEqual(offenders(lang, Object.keys(STRINGS[lang])), []);
  assert.equal(STRINGS.en.gameOverTitle, "That one got away from us.");
  assert.equal(STRINGS.en.progressFinale, "That one got away from us.");
  assert.equal(STRINGS.en.moveN, "Move {n}");
  for (const removed of ["moveOf", "movesLeft", "progressToGo", "gameOverCopy", "exhaustedCopy"]) assert.equal(STRINGS.en[removed], undefined, removed);
  // The exhausted beats still exist (the game still ends there), each with a follow-up for the end screen.
  for (const n of [GARY_NARRATIVE, MILO_NARRATIVE]) {
    for (const pair of n.pairsOf("exhausted")) assert.ok(n.pairKeys("exhausted", pair).extra);
  }
});

test("quit and leave copy: plain, never a win or a loss", () => {
  assert.deepEqual(["quitTitle", "quitBody", "quitKeep", "quitConfirm"].map(k => STRINGS.en[k]), ["Quit this game?", "Your current game will end.", "Keep playing", "Quit game"]);
  assert.deepEqual(["leaveTitle", "leaveBody", "quitKeep", "leaveConfirm"].map(k => STRINGS.en[k]), ["Leave this game?", "The other player will be told that you left.", "Keep playing", "Leave game"]);
  assert.equal(STRINGS.en.endedOtherLeft, "{name} left the game.");
  for (const lang of ["en", "fr"]) {
    for (const key of ["quitTitle", "quitBody", "quitConfirm", "leaveTitle", "leaveBody", "leaveConfirm", "endedOtherLeft", "endedYouLeft", "endedQuit", "endedTitle", "statusEnded"]) {
      assert.ok(STRINGS[lang][key], `${lang}.${key}`);
      assert.doesNotMatch(STRINGS[lang][key], /\b(win|won|lose|lost|loss|gagn|perdu)/i, `${lang}.${key}`);
    }
  }
});
