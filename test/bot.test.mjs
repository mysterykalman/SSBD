import {test} from "node:test";
import assert from "node:assert/strict";
import {BOT_TUNING, chooseResponse, rankCandidates} from "../src/shared/bot.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";
import {sameUnderlyingWord} from "../src/shared/morph.js";

const picks = (prompts, n = 300, extra = {}) => {
  const out = new Map();
  for (let seed = 1; seed <= n; seed++) {
    const {word, quality} = chooseResponse({prompts, rng: seededRandom(seed * 7919), ...extra});
    out.set(word, (out.get(word) || 0) + 1);
    assert.ok(quality === "strong" || quality === "loose");
  }
  return out;
};

test("the brief's examples: answers connect BOTH words; one-sided answers are rejected", () => {
  const cases = [
    [["winter", "snowman"], ["scarf", "cold", "sled"], ["snow"]],
    [["snow", "scarf"], ["mitten", "winter", "cold"], []],
    [["fabric", "mitten"], ["glove", "wool", "scarf"], []],
    [["socks", "eye"], ["pair"], ["face"]],
    [["cold", "hair"], ["hat"], ["snow"]],
    [["hand", "glove"], ["finger", "mitten"], ["leather"]]
  ];
  for (const [prompts, expected, forbidden] of cases) {
    const seen = picks(prompts);
    for (const word of seen.keys()) {
      assert.ok(expected.includes(word), `${prompts.join("+")} -> ${word} (expected one of ${expected})`);
      assert.ok(!forbidden.includes(word));
    }
  }
});

test("invariant: every pick relates to BOTH prompts on its own (strong or fallback), in English and French", () => {
  for (const language of ["en", "fr"]) {
    const lex = getLexicon(language);
    const ids = [...lex.concepts.keys()];
    const random = seededRandom(99);
    const tiers = {};
    for (let i = 0; i < 1500; i++) {
      const a = lex.concepts.get(ids[Math.floor(random() * ids.length)]).label, b = lex.concepts.get(ids[Math.floor(random() * ids.length)]).label;
      if (a === b) continue;
      const {ranked} = rankCandidates({prompts: [a, b], language});
      const pick = chooseResponse({prompts: [a, b], language, rng: random});
      const row = ranked.find(r => r.word === pick.word);
      tiers[row.tier] = (tiers[row.tier] || 0) + 1;
      const sideA = Math.max(row.a, row.pathsA > 0 ? 0.01 : 0), sideB = Math.max(row.b, row.pathsB > 0 ? 0.01 : 0);
      assert.ok(sideA > 0 && sideB > 0, `${a}+${b} -> ${pick.word} is one-sided (${row.a}/${row.b}, paths ${row.pathsA}/${row.pathsB})`);
      if (pick.quality === "strong") assert.ok(row.a >= BOT_TUNING.minPerSide && row.b >= BOT_TUNING.minPerSide, `${a}+${b} -> ${pick.word}`);
      // Tiers are tried in order: a fallback is only used when every better tier is empty.
      for (let better = 1; better < (row.tier || 4); better++) assert.ok(!ranked.some(r => r.tier === better), `${a}+${b}: skipped tier ${better}`);
      if (row.tier === 2) assert.ok(row.weakest >= BOT_TUNING.relaxedBalance * Math.max(row.a, row.b), "tier 2 is balanced");
      if (row.tier === 3 || row.tier === 0) {
        const lo = Math.min(row.pathsA, row.pathsB), hi = Math.max(row.pathsA, row.pathsB);
        assert.ok(lo >= BOT_TUNING.lastBalance * hi, `${a}+${b} -> ${pick.word}: paths ${row.pathsA}/${row.pathsB} not balanced`);
      }
    }
    assert.ok(tiers[1] > 300, `${language}: strong picks ${tiers[1]}`);
  }
});

test("a strong link to one word never carries a missing link to the other", () => {
  // SOCKS + EYE: FACE is strongly tied to EYE only; COLD + HAIR: SNOW is strongly tied to COLD only.
  for (const [prompts, oneSided] of [[["socks", "eye"], "face"], [["cold", "hair"], "snow"]]) {
    const row = rankCandidates({prompts}).ranked.find(r => r.word === oneSided);
    assert.ok(row && !row.passes && row.tier !== 2, `${oneSided} must not qualify for ${prompts}`);
    for (let seed = 1; seed <= 200; seed++) assert.notEqual(chooseResponse({prompts, rng: seededRandom(seed)}).word, oneSided);
  }
});

test("no pair-specific logic: the bot code names no test words, and PAIR/SLED win for unrelated-to-the-tests pairs too", async () => {
  const {readFile} = await import("node:fs/promises");
  const code = (await readFile(new URL("../src/shared/bot.js", import.meta.url), "utf8")).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const word of ["socks", "eye", "winter", "snowman", "hand", "glove", "pair", "sled", "scarf", "mitten", "fabric", "hair", "cold"]) {
    assert.doesNotMatch(code, new RegExp(`["'\`]${word}["'\`]`), `bot.js special-cases "${word}"`);
  }
  const top = prompts => rankCandidates({prompts}).ranked.filter(r => r.tier === 1).slice(0, 3).map(r => r.word);
  assert.ok(top(["boots", "glasses"]).includes("pair"));
  assert.ok(top(["shoe", "ear"]).includes("pair"));
  assert.ok(top(["hill", "snow"]).includes("sled"));
});

test("unknown prompts: base forms and confident spelling fixes are tried before giving up", () => {
  const typo = rankCandidates({prompts: ["freind", "dog"]});
  assert.ok(typo.knownA, "a confident spelling fix resolves the prompt");
  const plural = rankCandidates({prompts: ["mittens", "snowmen"]});
  assert.ok(plural.knownA && plural.knownB);
  const nonsense = chooseResponse({prompts: ["zorblax", "dog"], rng: seededRandom(1)});
  assert.equal(nonsense.quality, "loose", "nothing can relate to a word the game doesn't know");
  assert.ok(nonsense.word);
});

test("weighted choice happens only among the best few, roughly 55/30/15", () => {
  const prompts = ["sun", "moon"];
  const {ranked} = rankCandidates({prompts});
  const strong = ranked.filter(r => r.passes);
  const top3 = strong.slice(0, 3).map(r => r.word);
  const seen = picks(prompts, 3000);
  for (const word of seen.keys()) assert.ok(top3.includes(word), `${word} outside the shortlist ${top3}`);
  const share = word => (seen.get(word) || 0) / 3000;
  assert.ok(Math.abs(share(top3[0]) - 0.55) < 0.05, `top ${share(top3[0])}`);
  assert.ok(Math.abs(share(top3[1]) - 0.30) < 0.05, `second ${share(top3[1])}`);
  assert.ok(Math.abs(share(top3[2]) - 0.15) < 0.05, `third ${share(top3[2])}`);
});

test("loop prevention: last round's concepts are rejected, recent ones penalised, used words and their variants never reused", () => {
  // HAT + HEAD → HAIR; next HAIR + CAP must not orbit back to HAT or HEAD.
  const history = [["hat", "head"], ["hair", "cap"]];
  const next = rankCandidates({prompts: ["hair", "cap"], history: history.slice(0, 1).concat([["hair", "cap"]])});
  assert.ok(!next.ranked.some(r => r.word === "hair" || r.word === "cap"), "the prompts themselves are never answers");
  const lastRound = rankCandidates({prompts: ["sun", "beach"], history: [["dog", "sky"]]});
  assert.ok(!lastRound.ranked.some(r => r.word === "sky"), "a concept from the round just played is rejected");
  const plain = rankCandidates({prompts: ["sun", "moon"]}).ranked.find(r => r.word === "sky");
  const twoAgo = rankCandidates({prompts: ["sun", "moon"], history: [["sky", "dog"], ["pizza", "cake"]]}).ranked.find(r => r.word === "sky");
  assert.ok(twoAgo.score < plain.score - 0.2, "two rounds ago: strong penalty");
  const sixAgo = rankCandidates({prompts: ["sun", "moon"], history: [["sky", "dog"], ["a1", "b1"], ["a2", "b2"], ["a3", "b3"], ["a4", "b4"], ["a5", "b5"]]}).ranked.find(r => r.word === "sky");
  assert.ok(sixAgo.score < plain.score && sixAgo.score > twoAgo.score, "older rounds: smaller penalty");
  // The previous answer, and any grammatical variant of a used word, is never chosen.
  const used = new Set(["tails", "paw"]);
  for (let seed = 1; seed <= 100; seed++) {
    const {word} = chooseResponse({prompts: ["dog", "cat"], excludeKeys: used, rng: seededRandom(seed)});
    assert.ok(![...used].some(u => sameUnderlyingWord(u, word)), `${word} reuses a used word`);
  }
});

test("lazy answers built on a prompt word lose out (SNOW for SNOWMAN)", () => {
  const seen = picks(["winter", "snowman"], 500);
  assert.ok(!seen.has("snow"));
});

test("French uses the same logic", () => {
  const seen = picks(["soleil", "lune"], 200, {language: "fr"});
  const lex = getLexicon("fr");
  for (const word of seen.keys()) assert.ok(lex.resolve(word), word);
  const {ranked} = rankCandidates({prompts: ["soleil", "lune"], language: "fr"});
  assert.ok(ranked.filter(r => r.passes).length >= 3);
});
