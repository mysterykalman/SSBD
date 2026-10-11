import test from "node:test";
import assert from "node:assert/strict";

import {applyAssociationContextToPick, selectContextualBotWord} from "../src/shared/solo.js";

function syntheticPick(word = "rocket") {
  return {
    word,
    quality: "strong",
    decision: {
      highQuality: true,
      selected: word,
      pool: ["rocket", "animal"],
      candidates: [
        {word: "rocket", profileScore: 0.7, final: 0.7, plausibility: 0.9, highQuality: true},
        {word: "animal", profileScore: 0.7, final: 0.7, plausibility: 0.9, highQuality: true}
      ],
      selection: {pick: word}
    }
  };
}

test("semantic context reorders an already-approved Solo pool without widening it", () => {
  const pick = applyAssociationContextToPick(syntheticPick(), {
    pair: ["pet", "home"],
    history: [{a: "dog", b: "cat"}],
    language: "en",
    character: "milo"
  });
  assert.equal(pick.word, "animal");
  assert.equal(pick.decision.context.applied, true);
  assert.equal(pick.decision.context.previous, "rocket");
  assert.equal(pick.decision.context.selected, "animal");
  assert.deepEqual(new Set(pick.decision.context.ranking.map(row => row.word)), new Set(["rocket", "animal"]));
  assert.ok(pick.decision.context.ranking[0].semantic > pick.decision.context.ranking[1].semantic);
});

test("semantic context does not act before any revealed history exists", () => {
  const original = syntheticPick();
  const pick = applyAssociationContextToPick(original, {pair: ["pet", "home"], history: [], language: "en", character: "milo"});
  assert.equal(pick.word, "rocket");
  assert.equal(pick.decision.context, undefined);
});

test("production contextual selection remains deterministic and fair-state-only", () => {
  const input = {
    pair: ["pet", "home"],
    history: [{a: "dog", b: "cat"}],
    blocked: ["dog", "cat"],
    language: "en",
    character: "gary",
    seed: 424242
  };
  const first = selectContextualBotWord(input);
  const second = selectContextualBotWord(input);
  assert.equal(first.word, second.word);
  assert.deepEqual(first.decision.context, second.decision.context);
  assert.ok(["strong", "loose", "opening"].includes(first.quality));
});
