import {test} from "node:test";
import assert from "node:assert/strict";
import {MAX_MOVES, checkWord, createGame, currentMove, moveOutcome, revealMove, seededRandom, usedKeys} from "../src/shared/rules.js";

test("a new game has one open move with no prompts", () => {
  const g = createGame({id: "g1"});
  assert.equal(g.status, "ACTIVE");
  assert.equal(g.moves.length, 1);
  assert.deepEqual(currentMove(g), {...currentMove(g), number: 1, prompts: null, words: null, status: "OPEN"});
});

test("revealed words become the exact next prompts, in slot order", () => {
  let g = createGame({id: "g1"});
  g = revealMove(g, {a: "Sun", b: "Moon"});
  assert.equal(g.moves[0].status, "REVEALED");
  assert.deepEqual(currentMove(g).prompts, ["Sun", "Moon"]);
  assert.equal(currentMove(g).number, 2);
  g = revealMove(g, {a: "Sky", b: "Night"});
  assert.deepEqual(currentMove(g).prompts, ["Sky", "Night"]);
});

test("matching words end the game early; matching ignores case and accents", () => {
  let g = createGame({id: "g1"});
  g = revealMove(g, {a: "Étoile", b: "etoile"});
  assert.equal(g.status, "MATCHED");
  assert.equal(g.moves.length, 1);
  assert.throws(() => revealMove(g, {a: "x", b: "y"}));
  assert.equal(checkWord(g, "a", "anything").code, "GAME_OVER");
});

test("move 20 without a match exhausts the game", () => {
  let g = createGame({id: "g1"});
  for (let i = 1; i <= MAX_MOVES; i++) {
    assert.equal(g.status, "ACTIVE");
    assert.equal(currentMove(g).number, i);
    g = revealMove(g, {a: `left${"x".repeat(i)}`, b: `right${"x".repeat(i)}`});
  }
  assert.equal(g.status, "EXHAUSTED");
  assert.equal(g.moves.length, MAX_MOVES);
  assert.equal(g.moves.at(-1).status, "EXHAUSTED");
  assert.equal(moveOutcome(20, "a", "b"), "EXHAUSTED");
  assert.equal(moveOutcome(20, "same", "SAME"), "MATCHED");
});

test("a side may not reuse its own words; the other side's words are fine", () => {
  let g = createGame({id: "g1"});
  g = revealMove(g, {a: "Sun", b: "Moon"});
  g = revealMove(g, {a: "Sky", b: "Star"});
  assert.equal(checkWord(g, "a", "sky").code, "SAME_AS_LAST");
  assert.equal(checkWord(g, "a", "SUN!").code, "ALREADY_USED");
  assert.equal(checkWord(g, "a", "moon").ok, true);
  assert.equal(checkWord(g, "b", "star").code, "SAME_AS_LAST");
  assert.deepEqual([...usedKeys(g)].sort(), ["moon", "sky", "star", "sun"]);
  assert.deepEqual([...usedKeys(g, "a")].sort(), ["sky", "sun"]);
});

test("revealMove does not mutate its input", () => {
  const g = createGame({id: "g1"});
  const snapshot = JSON.stringify(g);
  revealMove(g, {a: "Sun", b: "Moon"});
  assert.equal(JSON.stringify(g), snapshot);
});

test("seededRandom is deterministic per seed and varies across seeds", () => {
  const a = seededRandom(42), b = seededRandom(42), c = seededRandom(43);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  assert.ok(seqA.every(x => x >= 0 && x < 1));
});
