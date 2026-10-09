// Together reveal reactions: kind, varied, by how close the two answers were, never the same line
// two rounds in a row, and the same for both players (deterministic per game and move).
import {test} from "node:test";
import assert from "node:assert/strict";
import {REACTIONS, closeness, reactionKeys} from "../src/client/reactions.js";
import {STRINGS} from "../src/client/i18n.js";
import {getLexicon} from "../src/shared/lexicon/index.js";

const en = getLexicon("en"), fr = getLexicon("fr");
const moves = pairs => pairs.map(([a, b], i) => ({number: i + 1, status: "REVEALED", words: {a, b}}));

test("closeness reads how near the two answers are, the same whichever side you are", () => {
  assert.equal(closeness(en, "ocean", "sea"), "close");
  assert.equal(closeness(en, "sea", "ocean"), "close");
  assert.equal(closeness(en, "dog", "dog"), "close");
  assert.equal(closeness(en, "violin", "carrot"), "apart");
  assert.equal(closeness(en, "zzqx", "sea"), "neutral", "an unknown word is never judged");
  assert.equal(closeness(fr, "mer", "océan"), "close");
  for (const [a, b] of [["cat", "dog"], ["apple", "banana"], ["piano", "guitar"]]) {
    assert.ok(["close", "related"].includes(closeness(en, a, b)), `${a}/${b}`);
  }
});

test("every reaction line exists in English and French, is short and kind", () => {
  for (const key of Object.values(REACTIONS).flat()) {
    for (const lang of ["en", "fr"]) {
      const line = STRINGS[lang][key];
      assert.ok(line, `${lang} ${key}`);
      assert.ok(line.length <= 60, `${lang} ${key} is short`);
      assert.doesNotMatch(line, /\b(wrong|bad|fail|lose|loser|stupid|silly|nul|raté|perdu)\b/i, `${lang} ${key} is kind`);
    }
  }
});

test("lines rotate and never repeat in consecutive rounds, whatever the mix", () => {
  const trails = [
    [["ocean", "sea"], ["wave", "water"], ["beach", "sand"], ["sun", "sunshine"], ["boat", "ship"], ["fish", "shark"]],
    [["violin", "carrot"], ["rocket", "pillow"], ["zebra", "candle"], ["anchor", "pencil"], ["turtle", "garden"]],
    [["zzqx", "sea"], ["qqq", "www"], ["ocean", "sea"], ["violin", "carrot"], ["kkk", "jjj"], ["cat", "dog"]]
  ];
  for (const [i, pairs] of trails.entries()) {
    for (const id of ["g1", "g2", "another-game", `x${i}`]) {
      const keys = [...reactionKeys(en, id, moves(pairs)).values()];
      assert.equal(keys.length, pairs.length);
      for (let n = 1; n < keys.length; n++) assert.notEqual(keys[n], keys[n - 1], `${id} round ${n + 1}`);
    }
  }
  // A long run in one group still cycles through all its lines.
  const close = [...reactionKeys(en, "g", moves(Array(8).fill(["ocean", "sea"]))).values()];
  assert.equal(new Set(close).size, REACTIONS.close.length);
  assert.ok(close.every(k => REACTIONS.close.includes(k)));
});

test("both players (and a refresh) get the same line; matches and the last move get none", () => {
  const game = moves([["ocean", "sea"], ["violin", "carrot"]]);
  assert.deepEqual([...reactionKeys(en, "g", game)], [...reactionKeys(en, "g", game.map(m => ({...m, words: {a: m.words.b, b: m.words.a}})))]);
  const ended = [...game, {number: 3, status: "MATCHED", words: {a: "x", b: "x"}}, {number: 4, status: "OPEN", words: null}];
  assert.equal(reactionKeys(en, "g", ended).has(3), false);
  assert.equal(reactionKeys(en, "g", [{number: 20, status: "EXHAUSTED", words: {a: "a", b: "b"}}]).size, 0);
});
