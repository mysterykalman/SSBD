// The replay/regression workflow: versioned fixtures run through the old and current engines.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FIXTURES, casesFromLog, oldEngine, replayCase} from "../scripts/replay.mjs";
import {selectBotWord} from "../src/shared/engine.js";
import {lemmaKeys} from "../src/shared/morph.js";

const fixtures = JSON.parse(readFileSync(FIXTURES, "utf8"));

test("fixtures are versioned and every case keeps the full engine input and its expectations", () => {
  assert.equal(fixtures.schema, 1);
  assert.match(fixtures.version, /^replay-\d+$/);
  const ids = new Set();
  const categories = new Set();
  for (const c of fixtures.cases) {
    assert.ok(!ids.has(c.id), `unique id ${c.id}`);
    ids.add(c.id);
    categories.add(c.category);
    assert.ok(["en", "fr"].includes(c.language), c.id);
    assert.equal(c.pair.length, 2, c.id);
    assert.ok(Array.isArray(c.blocked), c.id);
    assert.equal(typeof c.seed, "number", c.id);
    assert.ok(Array.isArray(c.flags), c.id);
    assert.ok(c.expect && typeof c.expect === "object", c.id);
    assert.ok(["pass", "known-gap"].includes(c.status), c.id);
    if (c.status === "known-gap") assert.ok(c.gap, `${c.id} explains its gap`);
  }
  for (const needed of ["reported game", "reference game", "familiar connection", "unrelated pair", "ambiguous word", "sparse vocabulary", "heavy blocking", "compound", "broad vs specific", "French"]) {
    assert.ok(categories.has(needed), `covers ${needed}`);
  }
});

test("the current engine meets every fixture marked pass; known gaps still give a safe word", () => {
  const rows = fixtures.cases.map(replayCase);
  const failing = rows.filter(r => r.verdict === "FAIL");
  assert.deepEqual(failing.map(r => `${r.id}: ${r.problems.join("; ")}`), []);
  for (const r of rows) {
    assert.ok(r.current && r.current.trim(), `${r.id} gives a word`);
    assert.ok(!r.problems.some(p => p.includes("blocked")), `${r.id} never repeats a used word`);
  }
});

test("replays are deterministic for the same input and seed", () => {
  for (const c of fixtures.cases) {
    const a = replayCase(c), b = replayCase(c);
    assert.equal(a.current, b.current, c.id);
    assert.equal(a.old, b.old, c.id);
  }
});

test("the old engine runs on its original data: the reference game reproduces the logged choices", () => {
  for (const c of fixtures.cases.filter(x => x.original?.engine === "engine-1")) {
    assert.equal(oldEngine(c), c.original.word, `${c.id}: engine-1 on lexicon-1 still chooses ${c.original.word}`);
  }
});

test("logged rounds become replay cases with the input the bot actually had", () => {
  const exported = {games: [{game_id: "g1", character: "milo", language: "en", engine_version: "engine-2.0", rounds_list: [
    {round: 1, pair_a: null, pair_b: null, user_word: "lamp", bot_word: "restaurant", decision: {seed: 11}},
    {round: 2, pair_a: "lamp", pair_b: "restaurant", user_word: "table", bot_word: "dinner", decision: {seed: 12}, flags: ["good"]},
    {round: 3, pair_a: "table", pair_b: "dinner", user_word: "family", bot_word: "family", decision: {seed: 13}}
  ]}]};
  const cases = casesFromLog(exported);
  assert.deepEqual(cases.map(c => c.id), ["g1#2", "g1#3"]);
  assert.deepEqual(cases[0].pair, ["lamp", "restaurant"]);
  assert.deepEqual(cases[0].blocked, ["lamp", "restaurant"]);
  assert.equal(cases[0].seed, 12);
  assert.deepEqual(cases[0].flags, ["good"]);
  assert.deepEqual(cases[1].blocked, ["lamp", "restaurant", "table", "dinner"]);
  // Replaying a logged round reproduces the engine's choice exactly (same input, same seed).
  assert.deepEqual(cases[1].history, [{a: "lamp", b: "restaurant"}, {a: "table", b: "dinner"}], "the revealed rounds, for the tie-breakers");
  assert.equal(cases[1].character, "milo");
  const live = selectBotWord({pair: cases[1].pair, blocked: cases[1].blocked, history: cases[1].history, character: "milo", language: "en", seed: cases[1].seed});
  assert.equal(replayCase(cases[1]).current, live.word);
  for (const k of lemmaKeys(live.word, "en")) assert.ok(!["table", "dinner", "lamp", "restaurant"].includes(k));
});

test("logs never feed the engine: the engine and the dataset do not read game logs", () => {
  for (const file of ["../src/shared/engine.js", "../src/shared/bot.js", "../src/shared/lexicon/index.js", "../src/shared/solo.js"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.ok(!/gamelog|bot_rounds|bot_reviews|localStorage|fetch\(/.test(source), `${file} has no path from logs to rankings`);
  }
});
