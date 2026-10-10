// engine-2.5 regression tests, from the engine-2.4 / lexicon-4 playtest logs: ordinary words collapsed
// into a one-sided fallback ("frame + tree → apple"), technically valid but lopsided bridges survived
// ("computer + night → mouse", 0.88 / 0.12), and the bot passed over the human-obvious answer. These
// test quality constraints and ranking behaviour, not a lookup table of expected words.
import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE_CONFIG, ENGINE_VERSION, selectBotWord, slipKind} from "../src/shared/engine.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {ADDED_CONCEPTS_5} from "../src/shared/lexicon/additions5.js";
import {understandWord} from "../src/shared/understand.js";
import {currentMove, seededRandom} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {lemmaKeys} from "../src/shared/morph.js";

const lex = getLexicon("en");
const DIRECT = new Set(["category", "compound", "curated", "member", "link"]);
const pickOf = r => r.decision.candidates.find(c => c.word === r.word);
const SEEDS = Array.from({length: 12}, (_, i) => i + 1);
/** The playtest pairs that went wrong. */
const PLAYTEST = [["oven", "cake"], ["pan", "kitchen"], ["fur", "zoo"], ["computer", "night"], ["screen", "mouse"], ["goggles", "sun"], ["frame", "tree"], ["peripheral", "phone"]];

test("engine and dataset versions", () => {
  assert.equal(ENGINE_VERSION, "engine-2.5.1");
  assert.equal(lex.dataset, "lexicon-5");
});

test("ordinary playtest words are understood exactly (no unknown-input collapse, no misreading)", () => {
  for (const word of ["frame", "peripheral", "accessory", "goggles", "protection", "solar", "structure", "spatula"]) {
    const u = understandWord(word, "en", lex);
    assert.equal(u.unresolved, false, word);
    assert.equal(u.method, "exact", word);
  }
  // Real words that the old resolver "corrected" into a different word now stay themselves.
  for (const [word, wrong] of [["speaker", "shoe"], ["chain", "chair"], ["wifi", "wife"], ["password", "passport"], ["cough", "sofa"], ["speed", "seed"], ["trick", "truck"], ["globe", "glove"], ["forecast", "forest"], ["orchard", "hard"]]) {
    const u = understandWord(word, "en", lex);
    assert.notEqual(u.ids[0], wrong, `${word} is not ${wrong}`);
    assert.equal(u.method, "exact", word);
  }
});

test("pairs with those words get a genuinely shared answer, not the known side only", () => {
  for (const pair of [["frame", "tree"], ["goggles", "sun"], ["peripheral", "phone"], ["accessory", "bag"], ["solar", "energy"], ["spatula", "pancake"], ["protection", "helmet"], ["structure", "bridge"]]) {
    for (const character of ["milo", "gary"]) {
      for (const seed of SEEDS) {
        const r = selectBotWord({pair, character, seed});
        assert.notEqual(r.decision.stage, "unknown-input", `${character} ${pair.join("+")}`);
        assert.ok(pickOf(r).weak >= ENGINE_CONFIG.recovery.minWeak, `${character} ${pair.join("+")} → ${r.word} (${pickOf(r).relA}/${pickOf(r).relB}) relates to both words`);
      }
    }
  }
});

test("the playtest pairs: never one-sided, never an unknown-word fallback, a first-thought answer", () => {
  for (const pair of PLAYTEST) {
    for (const character of ["milo", "gary"]) {
      for (const seed of SEEDS) {
        const r = selectBotWord({pair, character, seed});
        const p = pickOf(r);
        assert.equal(r.decision.unresolvedInputs, 0, `${pair.join("+")} both words understood`);
        assert.ok(p.highQuality, `${character} ${pair.join("+")} → ${r.word} (${p.relA}/${p.relB}) is a high-quality shared answer`);
        assert.ok(p.weak >= ENGINE_CONFIG.floor.weak, `${character} ${pair.join("+")} → ${r.word} is not one-sided`);
        // Milo plays the human-obvious answer; Gary may play a less obvious but still strong one.
        assert.ok(p.consensus >= (character === "milo" ? 0.65 : 0.5), `${character} ${pair.join("+")} → ${r.word} is human-obvious (${p.consensus})`);
      }
    }
  }
  // The specific lopsided answers from the logs are gone.
  for (const seed of SEEDS) {
    assert.notEqual(selectBotWord({pair: ["computer", "night"], seed}).word, "mouse");
    for (const character of ["milo", "gary"]) assert.ok(!["phone", "tablet"].includes(selectBotWord({pair: ["screen", "mouse"], seed, character}).word));
    assert.notEqual(selectBotWord({pair: ["fur", "zoo"], seed, character: "milo"}).word, "cat");
  }
});

test("a balanced candidate beats a lopsided one with a stronger total (0.70 / 0.70 over 1.00 / 0.12)", () => {
  // Across many pairs: whenever the engine had to recover, a pick with a faint weak side only happens
  // when no balanced bridge existed, and a high-quality pick is never lopsided.
  const words = [...lex.concepts.values()].filter(c => c.links.size >= 8 && !c.label.includes(" ")).map(c => c.label);
  const rnd = seededRandom(25);
  let recoveries = 0;
  for (let i = 0; i < 400; i++) {
    const pair = [words[Math.floor(rnd() * words.length)], words[Math.floor(rnd() * words.length)]];
    if (pair[0] === pair[1]) continue;
    const r = selectBotWord({pair, seed: i, character: i % 2 ? "milo" : "gary"});
    const p = pickOf(r);
    if (!p) continue;
    if (r.decision.stage === "shared-direct") assert.ok(p.weak >= ENGINE_CONFIG.floor.weak, `${pair.join("+")} → ${r.word}`);
    if (r.decision.stage === "recovery") {
      recoveries++;
      const balanced = r.decision.candidates.filter(c => c.weak >= ENGINE_CONFIG.recovery.minWeak);
      if (r.decision.recoveryTier === "weak") assert.equal(balanced.length, 0, `${pair.join("+")}: a balanced bridge existed (${balanced.map(c => c.word)})`);
      else assert.ok(p.weak >= ENGINE_CONFIG.recovery.minWeak, `${pair.join("+")} → ${r.word} (${p.relA}/${p.relB})`);
      // Never a faint bridge with no direct link on either side (one shared neighbour each).
      assert.ok(DIRECT.has(p.kindA) || DIRECT.has(p.kindB) || p.weak >= ENGINE_CONFIG.recovery.minWeak, `${pair.join("+")} → ${r.word} (${p.kindA}/${p.kindB})`);
    }
  }
  assert.ok(recoveries > 20);
  // The weak side dominates recovery scoring: a 0.70 / 0.70 bridge outranks a 1.00 / 0.12 one.
  const r = ENGINE_CONFIG.recovery;
  assert.ok(r.weak * 0.7 + r.strong * 0.7 > r.weak * 0.12 + r.strong * 1.0 + r.consensus + r.familiarity + r.breadth + r.plausibility - 0.65);
});

test("Milo prefers the obvious consensus answer among several strong options", () => {
  for (const pair of [["oven", "cake"], ["pan", "kitchen"], ["fur", "zoo"], ["trees", "bird"], ["sand", "shell"], ["rain", "cloud"], ["snow", "cold"]]) {
    const words = SEEDS.map(seed => selectBotWord({pair, seed, character: "milo"}));
    const counts = new Map();
    for (const r of words) counts.set(r.word, (counts.get(r.word) || 0) + 1);
    const [top, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
    assert.ok(n >= SEEDS.length * 0.75, `${pair.join("+")}: Milo is predictable (${[...counts].map(([w, k]) => `${w}×${k}`).join(", ")})`);
    // His usual answer is the most human-obvious high-quality one (or within a hair of it).
    const d = words.find(r => r.word === top).decision;
    const hq = d.candidates.filter(c => c.highQuality);
    const best = Math.max(...hq.map(c => c.consensus));
    assert.ok(d.candidates.find(c => c.word === top).consensus >= best - 0.12, `${pair.join("+")}: ${top} is among the most obvious`);
  }
});

test("Gary can select a less-obvious answer, but only another genuinely strong one", () => {
  const words = [...lex.concepts.values()].filter(c => c.links.size >= 10 && !c.label.includes(" "));
  const rnd = seededRandom(31);
  let varied = 0, total = 0;
  for (let i = 0; i < 300; i++) {
    const hub = words[Math.floor(rnd() * words.length)];
    const near = [...hub.links].map(id => lex.concepts.get(id)).filter(c => c && !c.label.includes(" "));
    if (near.length < 2) continue;
    const pair = [near[Math.floor(rnd() * near.length)].label, near[Math.floor(rnd() * near.length)].label];
    if (pair[0] === pair[1]) continue;
    const r = selectBotWord({pair, seed: i, character: "gary"});
    if (r.decision.stage !== "shared-direct") continue;
    total++;
    if (r.decision.selection.varied || r.decision.selection.semanticTop !== r.word) {
      varied++;
      assert.ok(pickOf(r).highQuality, `gary ${pair.join("+")} → ${r.word} is still high quality`);
    }
  }
  assert.ok(varied > total * 0.05, `Gary sometimes plays a less obvious strong answer (${varied}/${total})`);
  // Milo varies much less often than Gary on the same pairs.
  let miloVaried = 0;
  const rnd2 = seededRandom(31);
  for (let i = 0; i < 300; i++) {
    const hub = words[Math.floor(rnd2() * words.length)];
    const near = [...hub.links].map(id => lex.concepts.get(id)).filter(c => c && !c.label.includes(" "));
    if (near.length < 2) continue;
    const pair = [near[Math.floor(rnd2() * near.length)].label, near[Math.floor(rnd2() * near.length)].label];
    if (pair[0] === pair[1]) continue;
    const r = selectBotWord({pair, seed: i, character: "milo"});
    if (r.decision.stage === "shared-direct" && r.decision.selection.varied) miloVaried++;
  }
  assert.ok(miloVaried < varied, `Milo varies less (${miloVaried}) than Gary (${varied})`);
});

test("engine-2.5.1: Gary weighs human obviousness too, less than Milo, and never plays an obscure answer", () => {
  const {milo, gary} = ENGINE_CONFIG.profiles;
  assert.ok(gary.consensus > 0, "obviousness is part of Gary's score");
  assert.ok(milo.consensus > gary.consensus, "Milo weighs it more strongly");
  // On related pairs, both play high-quality answers; Milo's is (nearly) the most obvious one, Gary's
  // stays close to it ("I can see why he went there"), and Gary varies more often.
  const words = [...lex.concepts.values()].filter(c => c.links.size >= 10 && !c.label.includes(" "));
  const gaps = {milo: [], gary: []}, varied = {milo: 0, gary: 0};
  for (const character of ["milo", "gary"]) {
    const rnd = seededRandom(31);
    for (let i = 0; i < 600; i++) {
      const hub = words[Math.floor(rnd() * words.length)];
      const near = [...hub.links].map(id => lex.concepts.get(id)).filter(c => c && !c.label.includes(" "));
      if (near.length < 2) continue;
      const pair = [near[Math.floor(rnd() * near.length)].label, near[Math.floor(rnd() * near.length)].label];
      if (pair[0] === pair[1]) continue;
      const r = selectBotWord({pair, seed: i, character});
      if (r.decision.stage !== "shared-direct") continue;
      const best = Math.max(...r.decision.candidates.filter(c => c.highQuality).map(c => c.consensus));
      assert.ok(pickOf(r).highQuality, `${character} ${pair.join("+")} → ${r.word}`);
      gaps[character].push(best - pickOf(r).consensus);
      if (r.decision.selection.varied) varied[character]++;
    }
  }
  const p95 = xs => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length * 0.95)];
  assert.ok(p95(gaps.milo) <= 0.1, `Milo plays the obvious answer (p95 gap ${p95(gaps.milo)})`);
  assert.ok(p95(gaps.gary) <= 0.25, `Gary stays close to the obvious answer (p95 gap ${p95(gaps.gary)})`);
  assert.ok(Math.max(...gaps.gary) <= 0.45, `Gary never plays an obscure answer (max gap ${Math.max(...gaps.gary)})`);
  assert.ok(varied.gary > varied.milo * 3, `Gary varies more often (${varied.gary} vs ${varied.milo})`);
});

test("exact legitimate matches are never delayed: the bot never sees the open word, and a clear answer is played", () => {
  // Playing exactly the bot's committed word (or any form of it) is a match, for both characters.
  for (const character of ["milo", "gary"]) {
    for (let seed = 1; seed <= 15; seed++) {
      let game = startSoloGame({id: `m-${character}-${seed}`, seed, character});
      game = submitSoloWord(game, "rain").game; // move 1
      if (game.status === "MATCHED") continue;
      const hidden = currentMove(game).hidden.b;
      const r = submitSoloWord(game, hidden);
      assert.equal(r.game.status, "MATCHED", `${character} ${seed}: ${hidden}`);
    }
  }
  // When one answer clearly stands out, both characters play it (no dodging for difficulty).
  for (const character of ["milo", "gary"]) {
    for (let seed = 0; seed < 30; seed++) assert.ok(["pet", "cat"].includes(selectBotWord({pair: ["paw", "fish"], seed, character}).word));
  }
});

test("morphology still matches (paw / paws) and blocked words stay blocked in every form", () => {
  let game = startSoloGame({id: "morph-1", seed: 4, character: "milo"});
  game = submitSoloWord(game, "dog").game;
  if (game.status !== "MATCHED") {
    const hidden = currentMove(game).hidden.b;
    const plural = hidden.endsWith("s") ? hidden : `${hidden}s`;
    assert.equal(submitSoloWord(game, plural).game.status, "MATCHED", `${plural} matches ${hidden}`);
  }
  assert.deepEqual(understandWord("paws", "en", lex).ids, ["paw"]);
  // A word played earlier (in any form) is never the bot's answer.
  for (const character of ["milo", "gary"]) {
    for (let seed = 1; seed <= 20; seed++) {
      const r = selectBotWord({pair: ["oven", "cake"], blocked: ["bakes", "kitchens", "pans"], seed, character});
      const keys = new Set(["bakes", "kitchens", "pans"].flatMap(w => [...lemmaKeys(w, "en")]));
      assert.ok(![...lemmaKeys(r.word, "en")].some(k => keys.has(k)), `${character}: ${r.word} was already played`);
    }
  }
});

test("an unknown or only-guessed word: the least-bad answer, never a compound or misreading, logged as low quality", () => {
  for (const [unknown, known, compounds] of [["zorblax", "tree", ["apple", "christmas", "family", "palm tree"]], ["zorblax", "sun", ["flower", "sunflower"]], ["tackle", "fish", ["feather"]], ["stump", "tree", ["family"]]]) {
    for (const character of ["milo", "gary"]) {
      const r = selectBotWord({pair: [unknown, known], seed: 3, character});
      assert.equal(r.decision.stage, "unknown-input", `${unknown}+${known}`);
      assert.equal(r.decision.lowQuality, true);
      assert.equal(r.decision.fallback, "least-bad-known-side");
      assert.ok(!compounds.includes(r.word), `${unknown}+${known} → ${r.word}`);
      assert.ok(DIRECT.has(pickOf(r).kindB) && pickOf(r).kindB !== "compound", `${unknown}+${known} → ${r.word} (${pickOf(r).kindB})`);
    }
  }
  // A kept typo is still understood when the slip is a typical typo (swapped letters, a letter left out,
  // spelled the way it sounds); a changed letter that can make another real word is not trusted.
  for (const [typed, meant] of [["chikcen", "chicken"], ["aqurium", "aquarium"], ["elefant", "elephant"]]) {
    const r = selectBotWord({pair: [typed, "zoo"], seed: 1});
    assert.deepEqual(r.decision.inputs[0].ids, [meant], typed);
  }
  // A spelling correction the player kept as typed is not trusted: "tackle" is not "tickle".
  const tackle = selectBotWord({pair: ["tackle", "fish"], seed: 1});
  assert.equal(tackle.decision.inputs[0].known, false);
  assert.equal(tackle.decision.inputs[0].understood, true);
});

test("slip kinds: which kept spellings are typos of the intended word", () => {
  assert.equal(slipKind("chikcen", "chicken"), "swap");
  assert.equal(slipKind("aqurium", "aquarium"), "omission");
  assert.equal(slipKind("appple", "apple"), "sound"); // doubled letters sound the same (trusted either way)
  assert.equal(slipKind("bannana", "banana"), "sound");
  assert.equal(slipKind("elefant", "elephant"), "sound");
  assert.equal(slipKind("stump", "stamp"), "substitution");
  assert.equal(slipKind("tackle", "tickle"), "substitution");
  assert.equal(slipKind("shooting", "shopping"), null);
});

test("diagnostics: understanding, fallback, why the pick won, both relations, consensus, profile and trajectory", () => {
  const history = [{a: "dog", b: "bone"}, {a: "puppy", b: "park"}, {a: "oven", b: "cake"}];
  const r = selectBotWord({pair: ["oven", "cake"], history, seed: 2, character: "milo"});
  const d = r.decision;
  for (const input of d.inputs) assert.ok("known" in input && "understood" in input && "method" in input && "confidence" in input);
  assert.ok(typeof d.lowQuality === "boolean");
  assert.ok(d.selection && d.selection.pick === r.word);
  assert.ok(typeof d.selection.semanticTop === "string" && typeof d.selection.profileTop === "string");
  assert.ok(typeof d.selection.profileChanged === "boolean" && typeof d.selection.varied === "boolean");
  assert.deepEqual(d.selection.trajectory.words, ["dog", "puppy"], "the player's revealed direction (before the latest round)");
  assert.ok(d.selection.alternatives.length >= 2);
  for (const alt of d.selection.alternatives) for (const key of ["word", "relA", "relB", "consensus", "final", "profileScore", "behind"]) assert.ok(key in alt, key);
  assert.ok(typeof d.pickBalance === "number" && typeof d.pickConsensus === "number" && typeof d.pickStrong === "number");
  for (const c of d.candidates) assert.ok(typeof c.consensus === "number");
});

test("the player's revealed direction pulls Milo more than Gary", () => {
  // A cooking trail: candidates tied to it get a ranking boost, weighted per character.
  const history = [{a: "stove", b: "pot"}, {a: "spatula", b: "pan"}, {a: "oven", b: "cake"}];
  for (const character of ["milo", "gary"]) {
    const r = selectBotWord({pair: ["oven", "cake"], history, seed: 1, character});
    const withTrail = r.decision.candidates.filter(c => c.trajectory > 0);
    assert.ok(withTrail.length > 0, character);
  }
  assert.ok(ENGINE_CONFIG.profiles.milo.trajectory > ENGINE_CONFIG.profiles.gary.trajectory);
  assert.ok(ENGINE_CONFIG.profiles.milo.nearMatch > ENGINE_CONFIG.profiles.gary.nearMatch);
  assert.ok(ENGINE_CONFIG.profiles.milo.consensus > ENGINE_CONFIG.profiles.gary.consensus);
});

test("lexicon-5: every new word has its own spelling in both languages (no label read back as another word)", () => {
  for (const language of ["en", "fr"]) {
    const l = getLexicon(language);
    for (const [id] of ADDED_CONCEPTS_5) {
      const c = l.concepts.get(id);
      assert.equal(l.byKey.get(c.key), id, `${language}: "${c.label}" (${id}) reads back as ${l.byKey.get(c.key)}`);
      assert.ok(c.links.size >= 5, `${language}: ${id} has ${c.links.size} links`);
    }
  }
});
