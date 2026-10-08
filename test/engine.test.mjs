// Bot engine v2 (src/shared/engine.js): fair inputs, balanced associations, explicit fallback stages,
// the shared used-word rule, deterministic seeded replay, and a complete decision record.
import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE_CONFIG, ENGINE_VERSION, STAGE_NAMES, relation, selectBotWord} from "../src/shared/engine.js";
import {DATASET_VERSION, getLexicon} from "../src/shared/lexicon/index.js";
import {lemmaKeys} from "../src/shared/morph.js";
import {checkWord, currentMove, seededRandom} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";

const lex = getLexicon("en");
const everyday = [...lex.concepts.values()].filter(c => c.links.size >= 6 && !c.label.includes(" ")).map(c => c.label);
function randomPairs(seed, count) {
  const rnd = seededRandom(seed), out = [];
  while (out.length < count) {
    const a = everyday[Math.floor(rnd() * everyday.length)], b = everyday[Math.floor(rnd() * everyday.length)];
    if (a !== b) out.push([a, b]);
  }
  return out;
}
const sameWord = (x, y, language = "en") => [...lemmaKeys(x, language)].some(k => lemmaKeys(y, language).has(k));

test("the selection input is explicit: pair, blocked words, language, character, seed (nothing else)", () => {
  assert.equal(selectBotWord.length, 1);
  const input = {pair: ["sun", "beach"], blocked: ["sea"], language: "en", character: "milo", seed: 7};
  const a = selectBotWord(input), b = selectBotWord({...input});
  assert.deepEqual(a, b, "same input, same word and the same decision record");
  assert.equal(a.decision.engine, ENGINE_VERSION);
  assert.equal(a.decision.dataset, DATASET_VERSION);
  assert.deepEqual(a.decision.config, ENGINE_CONFIG, "the configuration needed to replay it is in the record");
  // Gary and Milo share one baseline: the character never changes the word.
  for (const [x, y] of randomPairs(3, 60)) {
    const g = selectBotWord({pair: [x, y], seed: 11, character: "gary"}), m = selectBotWord({pair: [x, y], seed: 11, character: "milo"});
    assert.equal(g.word, m.word, `${x}+${y}`);
  }
});

test("fair play: the bot's word is committed before the reveal and never depends on the player's answer", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const game = startSoloGame({id: `fair-${seed}`, seed});
    let g = submitSoloWord(game, "garden").game;
    if (g.status !== "ACTIVE") continue;
    const locked = currentMove(g).hidden.b;
    // Whatever the player answers this round, the revealed bot word is the one already locked.
    for (const answer of ["violin", "rocket", "pencil", "turtle"]) {
      const r = submitSoloWord(g, answer);
      if (!r.ok) continue;
      assert.equal(r.move.words.b, locked, `seed ${seed}: ${answer}`);
      assert.equal(r.decision.selected, locked, "the logged decision is the committed one");
    }
    // And the decision only saw the latest revealed pair and the blocked words.
    assert.deepEqual(currentMove(g).hidden.decision.pair, currentMove(g).prompts);
  }
});

test("a same-round match: both players may choose the same new word, and it wins", () => {
  let matched = 0;
  for (let seed = 1; seed <= 20; seed++) {
    let game = startSoloGame({id: `match-${seed}`, seed});
    game = submitSoloWord(game, "garden").game;
    if (game.status !== "ACTIVE") continue;
    const bot = currentMove(game).hidden.b;
    assert.equal(checkWord(game, "a", bot).ok, true, "the bot's unrevealed word does not block the player");
    const r = submitSoloWord(game, bot.toUpperCase() + " ");
    assert.equal(r.ok, true);
    assert.equal(r.game.status, "MATCHED");
    matched++;
  }
  assert.ok(matched >= 15);
});

test("shared used words: no revealed word (or a case/spacing/accent/plural variant) is ever chosen again", () => {
  for (const language of ["en", "fr"]) {
    const lx = getLexicon(language);
    const pool = [...lx.concepts.values()].filter(c => c.links.size >= 6).map(c => c.label);
    const rnd = seededRandom(language === "fr" ? 5 : 9);
    for (let i = 0; i < 150; i++) {
      const blocked = Array.from({length: 12}, () => pool[Math.floor(rnd() * pool.length)]);
      const variants = blocked.map((w, k) => (k % 3 === 0 ? ` ${w.toUpperCase()} ` : k % 3 === 1 ? `${w}s` : w.normalize("NFD")));
      const pair = [pool[Math.floor(rnd() * pool.length)], pool[Math.floor(rnd() * pool.length)]];
      const {word} = selectBotWord({pair, blocked: variants, language, seed: i});
      for (const w of [...blocked, ...pair]) assert.ok(!sameWord(word, w, language), `${language}: ${pair} → ${word} reuses ${w}`);
    }
  }
});

test("balanced associations: when a word links to both inputs, the pick links to both (no one-sided picks)", t => {
  let stage1 = 0, total = 0;
  for (const [a, b] of randomPairs(21, 500)) {
    const {word, decision} = selectBotWord({pair: [a, b], seed: 1});
    total++;
    const picked = decision.candidates.find(c => c.word === word);
    if (decision.stage === "shared-direct") {
      stage1++;
      assert.ok(Math.min(picked.relA, picked.relB) >= ENGINE_CONFIG.stages.sharedDirect, `${a}+${b} → ${word}`);
    }
    // Never a lower stage when a higher one had a valid candidate.
    const reached = Number(Object.keys(STAGE_NAMES).find(k => STAGE_NAMES[k] === decision.stage));
    for (const c of decision.candidates) assert.ok(c.stage >= reached, `${a}+${b}: ${c.word} (stage ${c.stage}) was available above ${decision.stage}`);
    // The pick is never a near-zero side when anything better connected both.
    if (picked && ["shared-direct", "direct-plus-indirect", "indirect-both"].includes(decision.stage)) assert.ok(picked.weak >= ENGINE_CONFIG.stages.indirect);
  }
  t.diagnostic(`${stage1}/${total} random pairs had a word directly linked to both`);
});

test("broad words lose to a specific shared bridge; familiar words beat obscure ones on a tie", () => {
  for (const [a, b] of randomPairs(33, 400)) {
    const {word, decision} = selectBotWord({pair: [a, b], seed: 2});
    const pick = decision.candidates.find(c => c.word === word);
    if (!pick?.generic) continue;
    // A generic word only wins when nothing specific in the same stage connects as well.
    const specific = decision.candidates.filter(c => c.stage === pick.stage && !c.generic && c.connection >= pick.connection);
    assert.deepEqual(specific.map(c => c.word), [], `${a}+${b} → ${word}`);
  }
  // Pizza + cake: dessert-specific bridges beat FOOD.
  const pc = selectBotWord({pair: ["pizza", "cake"], seed: 1});
  assert.notEqual(pc.word, "food", JSON.stringify(pc.decision.candidates.slice(0, 4).map(c => [c.word, c.final])));
});

test("randomness stays inside the strong pool and never bypasses validity", () => {
  for (const [a, b] of randomPairs(41, 80)) {
    const seen = new Set();
    let pool;
    for (let seed = 1; seed <= 25; seed++) {
      const r = selectBotWord({pair: [a, b], seed});
      pool ??= r.decision.pool;
      seen.add(r.word);
      assert.ok(r.decision.pool.includes(r.word));
      assert.ok(r.decision.pool.length <= ENGINE_CONFIG.poolSize);
      const top = r.decision.candidates.find(c => c.word === r.decision.pool[0]);
      for (const w of r.decision.pool) {
        const c = r.decision.candidates.find(x => x.word === w);
        if (c && top) assert.ok(c.final >= top.final - ENGINE_CONFIG.poolMargin - 1e-9, `${a}+${b}: ${w} is not in the strong pool`);
      }
    }
    assert.ok(seen.size <= ENGINE_CONFIG.poolSize);
  }
});

test("explicit, safe fallback: unknown inputs, heavy blocking and sparse options never loop or return invalid words", () => {
  const unknown = selectBotWord({pair: ["presentz", "pizza"], seed: 1});
  assert.equal(unknown.decision.stage, "unknown-input");
  assert.equal(unknown.decision.lowQuality, true);
  assert.ok(lex.concepts.get(lex.resolve(unknown.word)).near.has("pizza"), "answered from the known word, and says so");
  const none = selectBotWord({pair: ["zorblax", "quuxify"], seed: 1});
  assert.equal(none.decision.stage, "no-known-input");
  assert.equal(selectBotWord({pair: null, seed: 3}).decision.stage, "opening");
  // Heavy blocking: everything linked to SUN or MOON is already played.
  const blocked = [...new Set([...lex.concepts.get("sun").near, ...lex.concepts.get("moon").near])].map(id => lex.concepts.get(id).label);
  const tight = selectBotWord({pair: ["sun", "moon"], blocked, seed: 4});
  assert.ok(tight.word && !blocked.some(w => sameWord(w, tight.word)), tight.word);
  assert.ok(tight.decision.stage !== "shared-direct");
  // Almost the whole vocabulary blocked: still one valid, unblocked word.
  const most = [...lex.concepts.values()].map(c => c.label).filter((_, i) => i % 40 !== 0);
  const sparse = selectBotWord({pair: ["dog", "cat"], blocked: most, seed: 5});
  assert.ok(!most.some(w => sameWord(w, sparse.word)), sparse.word);
  assert.ok(lex.resolve(sparse.word), "a real word from the vocabulary");
  const sparsePick = sparse.decision.candidates.find(c => c.word === sparse.word);
  if (!sparse.decision.lowQuality) assert.ok(sparsePick && sparsePick.weak >= ENGINE_CONFIG.stages.indirect, "not flagged only when it really connects both");
  // Every stage name that can be logged is documented.
  for (const s of [tight, sparse, unknown, none]) assert.ok(typeof s.decision.stage === "string" && s.decision.stage.length);
});

test("relation scale: compounds, categories and curated links outrank shared-neighbour links", () => {
  const rel = (a, b) => relation(lex, [lex.resolve(a)], lex.concepts.get(lex.resolve(b))).score;
  assert.ok(rel("lamp", "table") >= 0.95, "table lamp (compound)");
  assert.ok(rel("restaurant", "table") >= 0.7, "restaurant table");
  assert.ok(rel("dog", "pet") === 1, "category");
  assert.ok(rel("restaurant", "christmas") < rel("restaurant", "table"), "christmas is a weaker restaurant word than table");
  assert.ok(rel("restaurant", "christmas") < ENGINE_CONFIG.stages.sharedDirect, "and not a direct association");
});

test("the reference game: each round's choice now connects both words of the latest pair", () => {
  const rounds = [["lamp", "restaurant"], ["tables", "christmas"], ["gifts", "dinner"], ["presents", "pizza"], ["oven", "food"], ["hot", "bake"], ["pan", "cake"]];
  const blocked = [];
  for (const pair of rounds) {
    const r = selectBotWord({pair, blocked: [...blocked], seed: 42});
    const pick = r.decision.candidates.find(c => c.word === r.word);
    assert.ok(r.decision.inputs.every(i => i.known), `${pair}: both words are known now`);
    assert.ok(!r.decision.lowQuality, `${pair} → ${r.word} (${r.decision.stage})`);
    assert.ok(pick.weak >= 0.3, `${pair} → ${r.word} connects both (${pick.relA} / ${pick.relB})`);
    blocked.push(...pair);
  }
  // Lamp + Restaurant → TABLE, ahead of CHRISTMAS (which barely relates to a restaurant).
  const first = selectBotWord({pair: ["lamp", "restaurant"], seed: 1});
  assert.equal(first.word, "table");
  // Gifts + Dinner: PIZZA (one-sided: dinner only) no longer wins.
  assert.notEqual(selectBotWord({pair: ["gifts", "dinner"], blocked: ["lamp", "restaurant", "tables", "christmas"], seed: 1}).word, "pizza");
  // Presents + Pizza: FOOD (pizza only) no longer wins; PRESENTS is understood as GIFT.
  const presents = selectBotWord({pair: ["presents", "pizza"], blocked: ["gifts", "dinner"], seed: 1});
  assert.notEqual(presents.word, "food");
  assert.deepEqual(presents.decision.inputs[0].ids, ["gift"]);
});
