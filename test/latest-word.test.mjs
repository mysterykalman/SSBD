// engine-2.4/2.5: every Solo answer (Gary's and Milo's) is directly connected to at least one of the two
// latest words, or clearly tied to both (3+ shared neighbours each), so the player can see where it came
// from without reconstructing the whole trail. No answer is reached only through faint shared neighbours
// or two-step paths (DESSERT + PENCIL → HOME).
import {test} from "node:test";
import assert from "node:assert/strict";
import {selectBotWord} from "../src/shared/engine.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";
import {understandWord} from "../src/shared/understand.js";

const DIRECT = new Set(["category", "compound", "curated", "member", "link"]);

/** Is `word` a direct association (either direction) of any concept `input` stands for? */
function directlyTied(lex, language, input, word) {
  const ids = understandWord(input, language, lex).ids, target = understandWord(word, language, lex).ids;
  return ids.some(id => {
    const c = lex.concepts.get(id);
    return target.some(t => c.links.has(t) || c.phrases.has(t) || c.kinds.has(t) || lex.concepts.get(t)?.kinds.has(id));
  });
}

for (const language of ["en", "fr"]) {
  const lex = getLexicon(language);
  const everyday = [...lex.concepts.values()].filter(c => c.links.size >= 8 && !c.label.includes(" ")).map(c => c.label);
  test(`${language}: every answer, for both characters, is a direct link of one of the latest two words`, () => {
    const rnd = seededRandom(language === "en" ? 41 : 42);
    let recovery = 0;
    for (let i = 0; i < 400; i++) {
      const a = everyday[Math.floor(rnd() * everyday.length)], b = everyday[Math.floor(rnd() * everyday.length)];
      if (a === b) continue;
      for (const character of ["milo", "gary"]) {
        const {word, decision} = selectBotWord({pair: [a, b], language, character, seed: i});
        if (decision.stage === "no-candidates") continue;
        if (decision.recovery) recovery++;
        const pick = decision.candidates.find(c => c.word === word);
        assert.ok(pick, `${a} + ${b} → ${word} is a scored candidate`);
        const clearlyBoth = pick.kindA === "shared-3" && pick.kindB === "shared-3";
        assert.ok(DIRECT.has(pick.kindA) || DIRECT.has(pick.kindB) || clearlyBoth, `${character}: ${a} + ${b} → ${word} (${pick.kindA}/${pick.kindB}, ${decision.stage}) is tied directly to ${a} or ${b}`);
        if (!clearlyBoth) assert.ok(directlyTied(lex, language, a, word) || directlyTied(lex, language, b, word), `${a} + ${b} → ${word}: the link is in the word graph`);
      }
    }
    assert.ok(recovery > 20, "the sample includes hard (recovery) pairs");
  });
}

test("the old leaps are gone: recovery hubs reached only through shared neighbours", () => {
  for (const [a, b, leap] of [["dessert", "pencil", "home"], ["swim", "pencil", "park"], ["tea", "car", "water"], ["pirate", "warm", "beach"]]) {
    for (const character of ["milo", "gary"]) {
      const {word, decision} = selectBotWord({pair: [a, b], language: "en", character, seed: 3});
      const pick = decision.candidates.find(c => c.word === word);
      assert.ok(DIRECT.has(pick.kindA) || DIRECT.has(pick.kindB) || (pick.kindA === "shared-3" && pick.kindB === "shared-3"), `${character}: ${a} + ${b} → ${word} (${pick.kindA}/${pick.kindB})`);
      if (word === leap) assert.ok(DIRECT.has(pick.kindA) || DIRECT.has(pick.kindB), `${a} + ${b} → ${leap} is only allowed now that it is a direct link`);
    }
  }
});

test("only the latest pair matters: older rounds never decide which word is connected", () => {
  // The same latest pair with different earlier trails: the answer is always tied to that pair.
  const pair = ["ocean", "boat"];
  for (const history of [[], [{a: "dog", b: "cat"}], [{a: "pizza", b: "cheese"}, {a: "snow", b: "winter"}]]) {
    for (const character of ["milo", "gary"]) {
      const {word, decision} = selectBotWord({pair, history, blocked: history.flatMap(r => [r.a, r.b]), language: "en", character, seed: 9});
      assert.ok(decision.highQuality, `${character}: ${word} is a strong answer for OCEAN + BOAT`);
      const pick = decision.candidates.find(c => c.word === word);
      assert.ok(DIRECT.has(pick.kindA) && DIRECT.has(pick.kindB));
    }
  }
});
