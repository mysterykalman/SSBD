// Bot engine v2 (src/shared/engine.js): fair inputs, balanced associations, explicit fallback stages,
// the shared used-word rule, deterministic seeded replay, and a complete decision record.
import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE_CONFIG, ENGINE_VERSION, STAGE_NAMES, plausibility, relation, selectBotWord} from "../src/shared/engine.js";
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

const WINDOW = ENGINE_CONFIG.window;
/** Every word the engine may vary between: within the quality window of the best answer. */
const inWindow = (c, d) => c.word === d.candidates[0]?.word || (c.final >= d.window.minFinal - 1e-9 && c.plausibility >= d.window.minPlausibility - 1e-9 && !c.generic && !c.piece);

test("balanced associations: the answer links to both inputs whenever a word does (no one-sided picks)", t => {
  let stage1 = 0, total = 0;
  for (const [a, b] of randomPairs(21, 500)) {
    const {word, decision} = selectBotWord({pair: [a, b], seed: 1});
    total++;
    const picked = decision.candidates.find(c => c.word === word);
    assert.ok(picked || decision.stage === "no-candidates", `${a}+${b} → ${word} is in the decision record`);
    const reached = Number(Object.keys(STAGE_NAMES).find(k => STAGE_NAMES[k] === decision.stage));
    if (decision.stage === "shared-direct") {
      stage1++;
      assert.ok(Math.min(picked.relA, picked.relB) >= ENGINE_CONFIG.stages.sharedDirect, `${a}+${b} → ${word}`);
    }
    // Never a lower stage when a higher one had a valid candidate, and the pick is from the reached stage.
    for (const c of decision.candidates) assert.ok(c.stage >= reached, `${a}+${b}: ${c.word} (stage ${c.stage}) was available above ${decision.stage}`);
    if (picked && reached <= 3) assert.equal(picked.stage, reached, `${a}+${b} → ${word}`);
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

test("quality-constrained variety: only answers inside the quality window are ever chosen", () => {
  for (const [a, b] of randomPairs(41, 80)) {
    for (let seed = 1; seed <= 25; seed++) {
      const r = selectBotWord({pair: [a, b], seed});
      if (!r.decision.window) continue;
      assert.ok(r.decision.pool.includes(r.word), `${a}+${b}: ${r.word} was drawn from its window`);
      assert.deepEqual(selectBotWord({pair: [a, b], seed}), r, "the same seed gives the same word");
      assert.ok(r.decision.pool.length <= WINDOW.size);
      assert.equal(r.decision.window.size, r.decision.pool.length);
      for (const w of r.decision.pool) {
        const c = r.decision.candidates.find(x => x.word === w);
        assert.ok(c && inWindow(c, r.decision), `${a}+${b}: ${w} is outside the quality window`);
      }
    }
  }
});

test("one clear best answer is always chosen; several equally good answers can vary", () => {
  // PAW + FISH: PET (or CAT, which loves fish) is the shared idea; DOG fits paw but barely fish, and
  // is never chosen to fill a quota.
  const words = new Set(Array.from({length: 60}, (_, seed) => selectBotWord({pair: ["paw", "fish"], seed}).word));
  assert.ok([...words].every(w => ["pet", "cat"].includes(w)), [...words].join(","));
  assert.ok(!words.has("dog"));
  // A pair with several near-equal shared answers varies between them only.
  let varied = 0;
  for (const [a, b] of randomPairs(77, 60)) {
    const seen = new Set(), windows = new Set();
    for (let seed = 1; seed <= 20; seed++) { const r = selectBotWord({pair: [a, b], seed}); seen.add(r.word); r.decision.pool.forEach(w => windows.add(w)); }
    for (const w of seen) assert.ok(windows.has(w));
    if (seen.size > 1) varied++;
  }
  assert.ok(varied >= 3, `only ${varied} pairs ever varied`);
  // Nothing is chosen to fill a quota: a weaker answer outside the window never appears.
  for (let seed = 1; seed <= 60; seed++) assert.notEqual(selectBotWord({pair: ["trees", "bird"], seed}).word, "frog");
});

test("explicit, safe fallback: unknown inputs, heavy blocking and sparse options never loop or return invalid words", () => {
  const unknown = selectBotWord({pair: ["zorblax", "pizza"], seed: 1});
  assert.equal(unknown.decision.stage, "unknown-input");
  assert.equal(unknown.decision.lowQuality, true);
  assert.equal(unknown.decision.fallback, "broad-known-side");
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

test("relation scale: compounds that are real links, categories and curated links outrank shared neighbours; a bare compound half is weak", () => {
  const rel = (a, b) => relation(lex, [lex.resolve(a)], lex.concepts.get(lex.resolve(b))).score;
  const kind = (a, b) => relation(lex, [lex.resolve(a)], lex.concepts.get(lex.resolve(b))).kind;
  assert.ok(rel("lamp", "table") >= 0.95, "table lamp (compound and link)");
  // SEA → HORSE only because of "seahorse": half of a compound, not a meaning.
  assert.equal(kind("sea", "horse"), "compound-part");
  assert.ok(rel("sea", "horse") < ENGINE_CONFIG.stages.sharedDirect);
  assert.ok(plausibility("compound-part", "shared-3", false) < plausibility("link", "curated", false));
  assert.ok(plausibility("shared-2", "shared-2", false) < plausibility("shared-2", "link", false), "a graph-only path is marked down");
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
  assert.ok(!first.decision.pool.includes("christmas"));
  // Gifts + Dinner: PIZZA (one-sided: dinner only) no longer wins.
  assert.notEqual(selectBotWord({pair: ["gifts", "dinner"], blocked: ["lamp", "restaurant", "tables", "christmas"], seed: 1}).word, "pizza");
  // Presents + Pizza: FOOD (pizza only) no longer wins; PRESENTS is understood as GIFT.
  const presents = selectBotWord({pair: ["presents", "pizza"], blocked: ["gifts", "dinner"], seed: 1});
  assert.notEqual(presents.word, "food");
  assert.deepEqual(presents.decision.inputs[0].ids, ["gift"]);
});

// ---------- the 10:56 engine-2.1 game (Gary, 14 moves, rated 1 star) ----------
// The pairs Gary answered, rebuilt from the round words (player / Gary): battleship/barn, wood/farm,
// trees/bird, birdnest/nest, twigs/egg, chicks/shell, chicken/sea, tuna/horse, seahorse/ride,
// surfing/tail, wave/cat, paw/fish, aquarium/dog, pet/pet.
const GAME_1056 = [["battleship", "barn"], ["wood", "farm"], ["trees", "bird"], ["birdnest", "nest"], ["twigs", "egg"], ["chicks", "shell"],
  ["chicken", "sea"], ["tuna", "horse"], ["seahorse", "ride"], ["surfing", "tail"], ["wave", "cat"], ["paw", "fish"], ["aquarium", "dog"]];

test("10:56 game: every player word is understood now; no round collapses to one side", () => {
  const blocked = [];
  for (const pair of GAME_1056) {
    for (let seed = 1; seed <= 20; seed++) {
      const r = selectBotWord({pair, blocked: [...blocked], seed});
      assert.ok(r.decision.inputs.every(i => i.known), `${pair}: ${r.decision.inputs.filter(i => !i.known).map(i => i.word)} not understood`);
      assert.notEqual(r.decision.stage, "unknown-input", `${pair}`);
    }
    blocked.push(...pair);
  }
  const words = Object.fromEntries(GAME_1056.flat().map(w => [w, selectBotWord({pair: [w, "dog"], seed: 1}).decision.inputs[0]]));
  assert.deepEqual(words.twigs.ids, ["twig"]);
  assert.deepEqual(words.chicks.ids, ["chick"]);
  assert.deepEqual(words.surfing.ids, ["surf"]);
  assert.deepEqual(words.battleship.ids, ["battleship"]);
  assert.deepEqual(words.tuna.ids, ["tuna"]);
  assert.deepEqual(words.birdnest.ids, ["bird", "nest"]);
});

test("10:56 game: CHICKEN + SEA is never HORSE (seahorse is a word fragment, not a meaning); PAW + FISH is PET", () => {
  const before = ["battleship", "barn", "wood", "farm", "trees", "bird", "birdnest", "nest", "twigs", "egg", "chicks", "shell"];
  for (let seed = 0; seed < 100; seed++) {
    const r = selectBotWord({pair: ["chicken", "sea"], blocked: before, seed});
    assert.notEqual(r.word, "horse", `seed ${seed}`);
    assert.ok(!r.decision.pool.includes("horse"));
    const pick = r.decision.candidates.find(c => c.word === r.word);
    assert.ok(pick.weak >= ENGINE_CONFIG.stages.sharedDirect, `chicken + sea → ${r.word} links to both directly`);
  }
  const later = [...before, "chicken", "sea", "tuna", "horse", "seahorse", "ride", "surfing", "tail", "wave", "cat"];
  for (let seed = 0; seed < 100; seed++) assert.equal(selectBotWord({pair: ["paw", "fish"], blocked: later, seed}).word, "pet", `seed ${seed}`);
  // TREES + BIRD: the nest, not a random far word.
  for (let seed = 0; seed < 50; seed++) assert.equal(selectBotWord({pair: ["trees", "bird"], blocked: ["battleship", "barn", "wood", "farm"], seed}).word, "nest");
});

test("one unknown word: a broad answer from the known word, not a narrow continuation of it", () => {
  for (const known of ["barn", "shell", "horse", "tail"]) {
    for (let seed = 1; seed <= 10; seed++) {
      const r = selectBotWord({pair: ["zorblax", known], seed});
      assert.equal(r.decision.stage, "unknown-input");
      const pick = r.decision.candidates.find(c => c.word === r.word);
      assert.ok(["category", "compound", "curated", "member", "link"].includes(pick.kindB), `${known} → ${r.word} is directly tied to ${known}`);
      const c = lex.concepts.get(lex.resolve(r.word));
      assert.ok(c.members.size > 0 || c.links.size >= 8, `${known} → ${r.word} is a broad, familiar word (${c.links.size} links)`);
    }
  }
  assert.equal(selectBotWord({pair: ["zorblax", "barn"], seed: 1}).word, "farm");
});
