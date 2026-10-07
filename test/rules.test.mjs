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

// ---------- state-machine transitions ----------

import {FINISHED, SCHEMA_VERSION, SIDES, hashString, isFinished, moveRandom} from "../src/shared/rules.js";

const deepFreeze = obj => {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
};

test("fresh game: schema, ids, language fallback, nothing revealed", () => {
  const g = createGame({id: "fresh", language: "de", now: "2026-01-01T00:00:00.000Z"});
  assert.equal(g.schema, SCHEMA_VERSION);
  assert.equal(g.language, "en", "unknown languages fall back to English");
  assert.equal(createGame({id: "x", language: "fr"}).language, "fr");
  assert.equal(g.mode, "solo");
  assert.equal(g.createdAt, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(g.moves, [{number: 1, prompts: null, words: null, status: "OPEN", openedAt: "2026-01-01T00:00:00.000Z", revealedAt: null}]);
  assert.equal(usedKeys(g).size, 0);
  assert.equal(isFinished(g), false);
});

test("OPEN -> REVEALED stamps the reveal time and opens the next move with the same time", () => {
  const g = revealMove(createGame({id: "t"}), {a: "Sun", b: "Moon"}, "2026-02-02T00:00:00.000Z");
  assert.equal(g.status, "ACTIVE");
  assert.equal(g.updatedAt, "2026-02-02T00:00:00.000Z");
  assert.deepEqual(g.moves[0].words, {a: "Sun", b: "Moon"});
  assert.equal(g.moves[0].revealedAt, "2026-02-02T00:00:00.000Z");
  assert.deepEqual(g.moves[1], {number: 2, prompts: ["Sun", "Moon"], words: null, status: "OPEN", openedAt: "2026-02-02T00:00:00.000Z", revealedAt: null});
});

test("OPEN -> MATCHED on any move, ignoring case, accents, spaces, hyphens and edge punctuation", () => {
  for (const [a, b] of [["Pizza", "pizza!"], ["Crème", "creme"], ["ice cream", "Ice-Cream"], ["Œuf", "oeuf"], ["rock'n roll", "Rock n Roll"]]) {
    let g = createGame({id: "m"});
    g = revealMove(g, {a: "left", b: "right"});
    g = revealMove(g, {a, b});
    assert.equal(g.status, "MATCHED", `${a} / ${b}`);
    assert.equal(g.moves.length, 2);
    assert.equal(g.moves[1].status, "MATCHED");
    assert.deepEqual(g.moves[1].words, {a, b}, "the friendly forms are kept as typed");
  }
});

test("OPEN(move 20) -> MATCHED beats EXHAUSTED when the last words are the same", () => {
  let g = createGame({id: "m20"});
  for (let i = 1; i < MAX_MOVES; i++) g = revealMove(g, {a: `a${"x".repeat(i)}`, b: `b${"x".repeat(i)}`});
  assert.equal(currentMove(g).number, MAX_MOVES);
  g = revealMove(g, {a: "Same", b: "same"});
  assert.equal(g.status, "MATCHED");
  assert.equal(g.moves.length, MAX_MOVES);
});

test("finished games reject every transition and every word", () => {
  const matched = revealMove(createGame({id: "f"}), {a: "cat", b: "Cat"});
  let exhausted = createGame({id: "e"});
  for (let i = 1; i <= MAX_MOVES; i++) exhausted = revealMove(exhausted, {a: `a${"x".repeat(i)}`, b: `b${"x".repeat(i)}`});
  for (const g of [matched, exhausted]) {
    assert.ok(FINISHED.has(g.status));
    assert.ok(isFinished(g));
    assert.throws(() => revealMove(g, {a: "dog", b: "bird"}), /finished/);
    for (const side of SIDES) assert.equal(checkWord(g, side, "brand new").code, "GAME_OVER");
  }
});

test("a move cannot be revealed without both words", () => {
  const g = createGame({id: "both"});
  for (const words of [undefined, {}, {a: "sun"}, {b: "moon"}, {a: "sun", b: ""}, {a: "  ", b: "moon"}, {a: "!!!", b: "moon"}]) {
    assert.throws(() => revealMove(g, words), /Both words/, JSON.stringify(words));
  }
  assert.equal(moveOutcome(3, "", ""), "REVEALED", "two empty words are not a match");
});

test("revealMove refuses a game whose last move is not open", () => {
  const g = createGame({id: "closed"});
  const broken = {...g, moves: [{...g.moves[0], status: "REVEALED", words: {a: "x", b: "y"}}]};
  assert.throws(() => revealMove(broken, {a: "sun", b: "moon"}), /not open/);
});

test("invalid word codes come straight from validation", () => {
  const g = createGame({id: "codes"});
  const cases = {
    "": "EMPTY", "   ": "EMPTY", "?!": "EMPTY",
    ["x".repeat(30)]: "TOO_LONG",
    "abc1": "INVALID_CHARACTERS", "a@b": "INVALID_CHARACTERS", "sun_moon": "INVALID_CHARACTERS",
    "one two three four": "TOO_MANY_WORDS",
    "\u0301": "INVALID_CHARACTERS"
  };
  for (const [raw, code] of Object.entries(cases)) assert.equal(checkWord(g, "a", raw).code, code, JSON.stringify(raw));
  assert.equal(checkWord(g, "a", undefined).code, "EMPTY");
  assert.equal(checkWord(g, "a", null).code, "EMPTY");
  const ok = checkWord(g, "a", "  “Sunflower!”  ");
  assert.deepEqual(ok, {ok: true, word: "Sunflower", key: "sunflower"});
});

test("duplicate codes: SAME_AS_LAST for the side's last word, ALREADY_USED for older ones, per side only", () => {
  let g = createGame({id: "dup"});
  g = revealMove(g, {a: "Sun", b: "Moon"});
  g = revealMove(g, {a: "Sky", b: "Night"});
  g = revealMove(g, {a: "Cloud", b: "Star"});
  assert.deepEqual(checkWord(g, "a", "cloud"), {ok: false, code: "SAME_AS_LAST", word: "cloud"});
  assert.equal(checkWord(g, "a", "  SKY. ").code, "ALREADY_USED");
  assert.equal(checkWord(g, "a", "sun").code, "ALREADY_USED");
  assert.equal(checkWord(g, "b", "STAR").code, "SAME_AS_LAST");
  assert.equal(checkWord(g, "b", "moon").code, "ALREADY_USED");
  for (const w of ["moon", "night", "star"]) assert.equal(checkWord(g, "a", w).ok, true, `a may answer with b's ${w}`);
  for (const w of ["sun", "sky", "cloud"]) assert.equal(checkWord(g, "b", w).ok, true, `b may answer with a's ${w}`);
  assert.equal(checkWord(g, "a", "Sun-flower").ok, true, "a longer word is not a duplicate");
});

test("transitions never mutate their input (deep-frozen games still advance)", () => {
  let g = deepFreeze(createGame({id: "frozen"}));
  const snapshots = [];
  for (let i = 1; i <= 5; i++) {
    snapshots.push([g, JSON.stringify(g)]);
    checkWord(g, "a", "word");
    g = deepFreeze(revealMove(g, {a: `a${"x".repeat(i)}`, b: `b${"x".repeat(i)}`}));
  }
  for (const [old, json] of snapshots) assert.equal(JSON.stringify(old), json);
  assert.equal(g.moves.length, 6);
});

test("moveRandom is stable per game and move, and differs across moves and seeds", () => {
  const g = createGame({id: "rng", seed: 5});
  assert.equal(moveRandom(g, 1)(), moveRandom(g, 1)());
  assert.notEqual(moveRandom(g, 1)(), moveRandom(g, 2)());
  assert.notEqual(moveRandom(g, 1)(), moveRandom({...g, seed: 6}, 1)());
  assert.equal(hashString("abc"), hashString("abc"));
  assert.notEqual(hashString("abc"), hashString("abd"));
});

// ---------- property-style: many random games, invariants after every step ----------

const POOL = ["sun", "Moon", "star", "sky", "rain", "cloud", "Snow", "ice", "tree", "leaf", "cat", "dog", "fish", "bird", "Crème", "creme", "ice cream", "ice-cream", "boat", "sea"];

function checkInvariants(g, label) {
  assert.ok(g.moves.length >= 1 && g.moves.length <= MAX_MOVES, label);
  g.moves.forEach((m, i) => assert.equal(m.number, i + 1, `${label}: move numbers are contiguous`));
  assert.equal(g.moves[0].prompts, null, `${label}: move 1 has no prompts`);
  const last = g.moves.at(-1);
  for (const m of g.moves.slice(0, -1)) assert.equal(m.status, "REVEALED", `${label}: only the last move can be open or final`);
  for (let i = 1; i < g.moves.length; i++) {
    assert.deepEqual(g.moves[i].prompts, [g.moves[i - 1].words.a, g.moves[i - 1].words.b], `${label}: prompts are the previous reveal`);
  }
  for (const m of g.moves) {
    if (m.status === "OPEN") {
      assert.equal(m.words, null, `${label}: open moves reveal nothing`);
      assert.equal(m.revealedAt, null);
    } else {
      assert.ok(m.words && m.words.a && m.words.b, `${label}: revealed moves have both words`);
      assert.ok(m.revealedAt);
      assert.equal(m.status, moveOutcome(m.number, m.words.a, m.words.b), `${label}: outcome matches words`);
    }
  }
  if (g.status === "ACTIVE") assert.equal(last.status, "OPEN", label);
  else {
    assert.ok(FINISHED.has(g.status), label);
    assert.equal(last.status, g.status, `${label}: game status mirrors the last move`);
  }
  if (g.status === "EXHAUSTED") assert.equal(g.moves.length, MAX_MOVES);
  // Neither side ever repeated one of its own words.
  for (const side of SIDES) {
    const keys = g.moves.filter(m => m.words).map(m => m.words[side].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[\s'-]/g, ""));
    assert.equal(new Set(keys).size, keys.length, `${label}: side ${side} repeated a word`);
  }
}

test("property: 400 random games keep every invariant after every step", () => {
  let matched = 0, exhausted = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const rng = seededRandom(seed);
    const pick = () => POOL[Math.floor(rng() * POOL.length)] + (rng() < 0.5 ? "" : "x".repeat(1 + Math.floor(rng() * 4)));
    let g = createGame({id: `p${seed}`, seed});
    checkInvariants(g, `seed ${seed} start`);
    let guard = 0;
    while (!isFinished(g) && guard++ < 500) {
      const words = {};
      for (const side of SIDES) {
        let attempt = 0, check;
        do check = checkWord(g, side, pick()); while (!check.ok && attempt++ < 50);
        if (!check.ok) {
          assert.ok(["SAME_AS_LAST", "ALREADY_USED"].includes(check.code), check.code);
          check = checkWord(g, side, `${side}${"z".repeat(currentMove(g).number)}`);
        }
        assert.ok(check.ok);
        words[side] = check.word;
      }
      const before = JSON.stringify(g);
      const next = revealMove(g, words);
      assert.equal(JSON.stringify(g), before, "input untouched");
      const closed = next.moves[currentMove(g).number - 1];
      assert.deepEqual(closed.words, words);
      g = next;
      checkInvariants(g, `seed ${seed} move ${closed.number}`);
    }
    assert.ok(isFinished(g), `seed ${seed} finished`);
    assert.throws(() => revealMove(g, {a: "late", b: "words"}));
    if (g.status === "MATCHED") matched++; else exhausted++;
  }
  assert.ok(matched > 0 && exhausted > 0, `both endings exercised (matched ${matched}, exhausted ${exhausted})`);
});

// ---------- one-letter words ----------

test("one-letter words are accepted and follow the same duplicate rules", () => {
  let g = createGame({id: "one"});
  for (const raw of ["s", "S", " s ", "a", "I", "é", "É", "x"]) assert.equal(checkWord(g, "a", raw).ok, true, JSON.stringify(raw));
  assert.deepEqual(checkWord(g, "a", " s "), {ok: true, word: "s", key: "s"});
  g = revealMove(g, {a: "s", b: "é"});
  assert.equal(g.status, "ACTIVE");
  assert.deepEqual(currentMove(g).prompts, ["s", "é"]);
  assert.deepEqual(checkWord(g, "a", "S"), {ok: false, code: "SAME_AS_LAST", word: "S"});
  assert.equal(checkWord(g, "a", " s! ").code, "SAME_AS_LAST");
  assert.equal(checkWord(g, "b", "e").code, "SAME_AS_LAST", "É/é/e share one key");
  assert.equal(checkWord(g, "b", "É").code, "SAME_AS_LAST");
  assert.equal(checkWord(g, "a", "é").ok, true, "the other side's one-letter word is fine");
  g = revealMove(g, {a: "a", b: "I"});
  assert.equal(checkWord(g, "a", "s").code, "ALREADY_USED");
  assert.equal(checkWord(g, "a", "A").code, "SAME_AS_LAST");
  assert.equal(checkWord(g, "b", "i").code, "SAME_AS_LAST");
  assert.equal(checkWord(g, "a", "ss").ok, true, "a longer word is not a duplicate");
});

test("one-letter words can match and end the game", () => {
  const g = revealMove(createGame({id: "one-match"}), {a: "É", b: "e"});
  assert.equal(g.status, "MATCHED");
  assert.equal(moveOutcome(4, "s", "S"), "MATCHED");
  assert.equal(moveOutcome(4, "s", "a"), "REVEALED");
});
