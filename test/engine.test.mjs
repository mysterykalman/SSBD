// Bot engine (src/shared/engine.js): fair inputs, the human-first quality floor, explicit anchored
// and recovery tiers, the shared used-word rule, deterministic seeded replay, and a complete record.
import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE_CONFIG, ENGINE_VERSION, isAnchored, plausibility, relation, selectBotWord} from "../src/shared/engine.js";
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
/** Two words tied to the same everyday word (what real games produce: each pair comes from the last answers). */
const hubs = [...lex.concepts.values()].filter(c => c.links.size >= 10 && !c.label.includes(" "));
function relatedPairs(seed, count) {
  const rnd = seededRandom(seed), out = [];
  while (out.length < count) {
    const hub = hubs[Math.floor(rnd() * hubs.length)];
    const near = [...hub.links].map(id => lex.concepts.get(id)).filter(c => !c.label.includes(" "));
    const a = near[Math.floor(rnd() * near.length)], b = near[Math.floor(rnd() * near.length)];
    if (a && b && a !== b) out.push([a.label, b.label]);
  }
  return out;
}
const sameWord = (x, y, language = "en") => [...lemmaKeys(x, language)].some(k => lemmaKeys(y, language).has(k));

test("the selection input is explicit: pair, blocked words, revealed rounds, language, character, seed (nothing else)", () => {
  assert.equal(selectBotWord.length, 1);
  const input = {pair: ["sun", "beach"], blocked: ["sea"], history: [{a: "sea", b: "wave"}], language: "en", character: "milo", seed: 7};
  const a = selectBotWord(input), b = selectBotWord({...input});
  assert.deepEqual(a, b, "same input, same word and the same decision record");
  assert.equal(a.decision.engine, ENGINE_VERSION);
  assert.equal(a.decision.dataset, DATASET_VERSION);
  assert.deepEqual(a.decision.config, ENGINE_CONFIG, "the configuration needed to replay it is in the record");
  assert.equal(a.decision.character, "milo");
  assert.equal(a.decision.profile, "easier");
  assert.equal(selectBotWord({...input, character: "gary"}).decision.profile, "harder");
  assert.equal(selectBotWord({...input, character: undefined}).decision.character, "gary", "older games are Gary's");
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

const DIRECT = ["category", "compound", "curated", "member", "link"];
/** Every word a character may vary between: within its near-best range of the top answer. */
const inWindow = (c, d) => c.word === d.pool[0] || c.word === d.candidates[0]?.word
  || (c.profileScore >= d.window.minFinal - 1e-9 && c.plausibility >= d.window.minPlausibility - 1e-9 && !c.generic && !c.piece);

test("human-first quality floor: whenever an answer is direct on both sides, the pick is one of them (both characters)", t => {
  let high = 0, anchored = 0, recovery = 0, total = 0;
  for (const [a, b] of randomPairs(21, 400)) {
    for (const character of ["milo", "gary"]) {
      const {word, decision} = selectBotWord({pair: [a, b], seed: 1, character});
      total++;
      const picked = decision.candidates.find(c => c.word === word);
      assert.ok(picked || decision.stage === "no-candidates", `${a}+${b} → ${word} is in the decision record`);
      if (decision.candidates.some(c => c.highQuality)) {
        high++;
        assert.ok(picked.highQuality, `${character}: ${a}+${b} → ${word} is below the floor while a high-quality answer existed`);
        assert.equal(decision.stage, "shared-direct");
        assert.equal(decision.recovery, false);
        assert.equal(decision.highQuality, true);
        assert.ok(DIRECT.includes(picked.kindA) && DIRECT.includes(picked.kindB), `${a}+${b} → ${word}: both sides direct`);
        assert.ok(picked.plausibility >= ENGINE_CONFIG.floor.plausibility && picked.weak >= ENGINE_CONFIG.floor.weak);
      } else if (decision.stage === "anchored") {
        anchored++;
        assert.ok(isAnchored(picked), `${a}+${b} → ${word}`);
        assert.equal(decision.recovery, false);
        assert.equal(decision.highQuality, false, "anchored answers are logged as below the high-quality threshold");
      } else {
        recovery++;
        assert.equal(decision.recovery, true, `${a}+${b} → ${word} (${decision.stage}) is marked as recovery`);
        assert.ok(decision.recoveryReason, "and says why");
      }
    }
  }
  t.diagnostic(`${total} decisions: ${high} high quality, ${anchored} anchored, ${recovery} recovery`);
});

test("broad words lose to a specific shared bridge: a generic word only wins when nothing specific is as good", () => {
  for (const [a, b] of randomPairs(33, 400)) {
    const {word, decision} = selectBotWord({pair: [a, b], seed: 2});
    const pick = decision.candidates.find(c => c.word === word);
    if (!pick?.generic) continue;
    // A generic word is marked down: any specific answer in the same tier that scores as well wins.
    const specific = decision.candidates.filter(c => !c.generic && Boolean(c.highQuality) === Boolean(pick.highQuality) && c.final >= pick.final);
    if (pick.highQuality) assert.deepEqual(specific.map(c => c.word), [], `${a}+${b} → ${word}`);
    else assert.ok(decision.recovery || decision.stage === "anchored", `${a}+${b} → ${word}`);
  }
  // Pizza + cake: dessert-specific bridges beat FOOD.
  const pc = selectBotWord({pair: ["pizza", "cake"], seed: 1});
  assert.notEqual(pc.word, "food", JSON.stringify(pc.decision.candidates.slice(0, 4).map(c => [c.word, c.final])));
});

test("quality-constrained variety: only answers inside the character's near-best range are ever chosen", () => {
  for (const character of ["milo", "gary"]) {
    const w = ENGINE_CONFIG.profiles[character].window;
    for (const [a, b] of randomPairs(41, 60)) {
      for (let seed = 1; seed <= 20; seed++) {
        const r = selectBotWord({pair: [a, b], seed, character});
        if (!r.decision.window) continue;
        assert.ok(r.decision.pool.includes(r.word), `${a}+${b}: ${r.word} was drawn from its range`);
        assert.deepEqual(selectBotWord({pair: [a, b], seed, character}), r, "the same seed gives the same word");
        const recoverySize = character === "gary" && r.decision.recoveryTier === "balanced" ? ENGINE_CONFIG.profiles.gary.recoveryWindow.size : 1;
        assert.ok(r.decision.pool.length <= (r.decision.recovery ? recoverySize : r.decision.stage === "anchored" ? 1 : w.size));
        assert.equal(r.decision.window.size, r.decision.pool.length);
        for (const word of r.decision.pool) {
          const c = r.decision.candidates.find(x => x.word === word);
          assert.ok(c && inWindow(c, r.decision), `${character} ${a}+${b}: ${word} is outside the near-best range`);
          if (!r.decision.recovery && r.decision.stage === "shared-direct") assert.ok(c.highQuality, `${character} ${a}+${b}: ${word} is in the range but below the floor`);
        }
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
  for (const [a, b] of relatedPairs(77, 60)) {
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
  assert.equal(unknown.decision.fallback, "least-bad-known-side");
  assert.ok(lex.concepts.get(lex.resolve(unknown.word)).near.has("pizza"), "answered from the known word, and says so");
  const none = selectBotWord({pair: ["zorblax", "quuxify"], seed: 1});
  assert.equal(none.decision.stage, "no-known-input");
  assert.equal(selectBotWord({pair: null, seed: 3}).decision.stage, "opening");
  // Heavy blocking: everything linked to SUN or MOON is already played.
  const blocked = [...new Set([...lex.concepts.get("sun").near, ...lex.concepts.get("moon").near])].map(id => lex.concepts.get(id).label);
  const tight = selectBotWord({pair: ["sun", "moon"], blocked, seed: 4});
  assert.ok(tight.word && !blocked.some(w => sameWord(w, tight.word)), tight.word);
  assert.ok(tight.decision.stage !== "shared-direct");
  assert.ok(tight.decision.recovery || tight.decision.stage === "anchored", "and says it is not a high-quality answer");
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
  // TREES + BIRD: Milo (consensus-seeking) always plays the nest; Gary may play another answer tied
  // directly to both words, never a random far word.
  for (let seed = 0; seed < 50; seed++) assert.equal(selectBotWord({pair: ["trees", "bird"], blocked: ["battleship", "barn", "wood", "farm"], seed, character: "milo"}).word, "nest");
  for (let seed = 0; seed < 50; seed++) {
    const r = selectBotWord({pair: ["trees", "bird"], blocked: ["battleship", "barn", "wood", "farm"], seed, character: "gary"});
    const pick = r.decision.candidates.find(c => c.word === r.word);
    assert.ok(pick.highQuality && pick.weak >= ENGINE_CONFIG.floor.weak, `gary trees + bird → ${r.word}`);
  }
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
