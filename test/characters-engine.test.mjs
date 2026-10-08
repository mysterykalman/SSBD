// Milo and Gary: one engine, one lexicon, one scoring and the same fairness rules, with two
// selection profiles. Milo (easier) plays the most obvious answer; Gary (harder) sometimes plays
// the second or third genuinely strong reading. Neither is ever given a weaker word for difficulty:
// difficulty must never be created by choosing implausible words.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile, readdir} from "node:fs/promises";
import {readFileSync} from "node:fs";
import {ENGINE_CONFIG, nearMatchOf, openingPool, playerStyle, selectBotWord, wordClass} from "../src/shared/engine.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {currentMove, seededRandom} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {wordKey} from "../src/shared/words.js";

const lex = getLexicon("en");
const everyday = [...lex.concepts.values()].filter(c => c.links.size >= 8 && !c.label.includes(" ")).map(c => c.label);
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
const HUMAN = ["sea", "sand", "castle", "lobster", "sandbox", "jogging", "butter", "fly", "banana", "rocket", "garden", "violin"];
function play(character, seed, language = "en") {
  let game = startSoloGame({id: `g-${seed}`, language, seed, character, now: "2026-01-01T00:00:00.000Z"});
  const words = [currentMove(game).hidden.b];
  for (const word of HUMAN) {
    if (game.status !== "ACTIVE") break;
    const r = submitSoloWord(game, word, "2026-01-01T00:00:01.000Z");
    if (!r.ok) continue;
    game = r.game;
    if (game.status === "ACTIVE") words.push(currentMove(game).hidden.b);
  }
  return {game, words};
}

test("same lexicon and scoring for both: every candidate gets the same score whoever plays", () => {
  for (const [a, b] of randomPairs(5, 80)) {
    const g = selectBotWord({pair: [a, b], seed: 3, character: "gary"}).decision, m = selectBotWord({pair: [a, b], seed: 3, character: "milo"}).decision;
    const scores = d => Object.fromEntries(d.candidates.map(c => [c.word, [c.final, c.relA, c.relB, c.kindA, c.kindB, c.plausibility, c.highQuality]]));
    const gs = scores(g), ms = scores(m);
    for (const word of Object.keys(gs)) if (ms[word]) assert.deepEqual(ms[word], gs[word], `${a}+${b}: ${word}`);
    assert.equal(g.dataset, m.dataset);
    assert.equal(g.inputs.map(i => i.ids.join("+")).join(), m.inputs.map(i => i.ids.join("+")).join());
  }
});

test("Milo favours the top answer: he plays the obvious word, varying only between virtually equal ones", t => {
  let decisions = 0, top = 0;
  for (const [a, b] of relatedPairs(9, 150)) {
    for (let seed = 1; seed <= 6; seed++) {
      const r = selectBotWord({pair: [a, b], seed, character: "milo"});
      if (!r.decision.window || r.decision.recovery) continue;
      decisions++;
      if (r.word === r.decision.pool[0]) top++;
      const w = ENGINE_CONFIG.profiles.milo.window;
      assert.ok(r.decision.pool.length <= w.size, `${a}+${b}`);
      for (const word of r.decision.pool) {
        const c = r.decision.candidates.find(x => x.word === word);
        assert.ok(c.profileScore >= r.decision.window.topFinal - w.margin - 1e-9, `${a}+${b}: ${word} is not virtually equal to the top`);
      }
    }
  }
  t.diagnostic(`Milo played the top of his range in ${top}/${decisions} decisions`);
  assert.ok(top / decisions >= 0.85, `${top}/${decisions}`);
  // The reported examples: Milo's answer is the obvious one.
  for (const [pair, expected] of [[["paw", "fish"], ["cat", "pet"]], [["bed", "moon"], ["night"]], [["trees", "bird"], ["nest"]], [["microwave", "oven"], ["kitchen", "hot"]], [["chicken", "sea"], ["fish"]]]) {
    for (let seed = 1; seed <= 20; seed++) assert.ok(expected.includes(selectBotWord({pair, seed, character: "milo"}).word), `${pair}`);
  }
});

test("Gary may choose among near-equal strong answers, and never a lower-quality one to make the game longer", t => {
  let varied = 0;
  for (const [a, b] of relatedPairs(11, 150)) {
    const seen = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const r = selectBotWord({pair: [a, b], seed, character: "gary"});
      seen.add(r.word);
      const pick = r.decision.candidates.find(c => c.word === r.word);
      // Whenever any answer clears the quality floor, Gary's does too (no weaker word for difficulty).
      if (r.decision.candidates.some(c => c.highQuality)) {
        assert.ok(pick.highQuality, `${a}+${b}: Gary played ${r.word} below the floor`);
        const best = r.decision.candidates.filter(c => c.highQuality)[0];
        assert.ok(pick.final >= best.final - ENGINE_CONFIG.profiles.gary.window.margin - 1e-9, `${a}+${b}: ${r.word} is not near the best (${best.word})`);
        assert.ok(pick.plausibility >= best.plausibility - ENGINE_CONFIG.profiles.gary.window.plausibility - 1e-9);
      }
    }
    if (seen.size > 1) varied++;
  }
  t.diagnostic(`Gary varied between strong readings on ${varied}/150 pairs`);
  assert.ok(varied >= 30, `only ${varied} pairs ever varied`);
  // BED + MOON: Gary sometimes says DREAM instead of NIGHT; both are strong.
  const bed = new Set(Array.from({length: 40}, (_, seed) => selectBotWord({pair: ["bed", "moon"], seed, character: "gary"}).word));
  assert.ok(bed.has("night") && bed.has("dream"), [...bed].join(","));
  assert.ok([...bed].every(w => ["night", "dream", "sleep"].includes(w)), [...bed].join(","));
});

test("recovery only when no high-quality (or anchored) answer exists, and recovery picks are readable hubs", () => {
  let recoveries = 0;
  for (const [a, b] of randomPairs(13, 300)) {
    for (const character of ["milo", "gary"]) {
      const {word, decision} = selectBotWord({pair: [a, b], seed: 1, character});
      if (!decision.recovery) continue;
      recoveries++;
      assert.ok(!decision.candidates.some(c => c.highQuality), `${a}+${b}: recovery while a high-quality answer existed`);
      assert.equal(decision.lowQuality, true);
      assert.equal(decision.pool.length, 1, "recovery is the single most readable hub, no variety");
      const c = lex.concepts.get(lex.resolve(word));
      assert.ok(c, `${a}+${b} → ${word} is a known word`);
      assert.ok(c.links.size >= 6 || c.members.size, `${a}+${b} → ${word} is a familiar hub (${c.links.size} links)`);
      assert.ok(!["thing", "stuff", "good", "nice", "new", "old"].includes(c.id), `${a}+${b} → ${word} is too vague`);
      const pick = decision.candidates.find(x => x.word === word);
      if (decision.stage === "recovery") assert.ok(pick.weak >= ENGINE_CONFIG.recovery.minWeak, `${a}+${b} → ${word} relates to both words`);
    }
  }
  assert.ok(recoveries > 0);
  // Reported: VACATION + FARM is not TURKEY (now a recovery round, and never turkey).
  for (let seed = 1; seed <= 30; seed++) {
    for (const character of ["milo", "gary"]) {
      const r = selectBotWord({pair: ["vacation", "farm"], seed, character});
      assert.notEqual(r.word, "turkey");
      assert.equal(r.decision.recovery, true);
    }
  }
});

test("openings come from the derived pool: familiar, bridgeable, child-friendly", () => {
  const pool = openingPool("en");
  assert.ok(pool.length >= 40, `${pool.length} opening words`);
  for (const seed of ["dog", "school", "beach", "pizza", "music", "car", "rain", "movie", "game", "book", "summer", "family", "park", "water", "party", "night", "tree", "snow"]) {
    assert.ok(pool.includes(seed), `${seed} is an opening`);
  }
  for (const id of pool) {
    const c = lex.concepts.get(id);
    assert.ok(!c.label.includes(" ") && c.links.size >= 9, `${id}: single familiar word`);
    assert.ok(!["ghost", "monster", "war", "sad", "scary", "spider", "trash"].includes(id), `${id} is not child-friendly`);
  }
  // Derived, not a fixed list: it contains words beyond the seeds.
  assert.ok(pool.filter(id => !["dog", "school", "beach", "pizza", "music", "car", "rain", "movie", "home", "game", "book", "summer", "food", "family", "park", "water", "party", "night", "tree", "snow"].includes(id)).length >= 20);
  for (let seed = 1; seed <= 40; seed++) {
    for (const character of ["milo", "gary"]) {
      const game = startSoloGame({id: `open-${seed}`, seed, character});
      const opening = currentMove(game).hidden.b;
      assert.ok(pool.includes(lex.resolve(opening)), `${opening} comes from the opening pool`);
    }
  }
});

test("player style: learned only from rounds already revealed, and only a light tie-breaker", () => {
  // The style is built from the player's earlier words, never the current round's.
  const history = [{a: "apple", b: "tree"}, {a: "banana", b: "fruit"}, {a: "pizza", b: "cheese"}];
  const style = playerStyle(history, "en");
  assert.equal(style.rounds, 3);
  assert.equal(style.shares.food, 1);
  // The engine is never given the open round's word: the Solo lifecycle passes revealed rounds only.
  const solo = readFileSync(new URL("../src/shared/solo.js", import.meta.url), "utf8");
  assert.match(solo, /const history = game\.moves\.flatMap\(m => \(m\.words \? \[\{a: m\.words\.a, b: m\.words\.b\}\] : \[\]\)\);/);
  // A tie-break only reorders the near-best range; it never adds a word outside it.
  let changed = 0;
  for (const [a, b] of relatedPairs(11, 300)) {
    const plain = selectBotWord({pair: [a, b], seed: 5, character: "gary"});
    const styled = selectBotWord({pair: [a, b], seed: 5, character: "gary", history});
    assert.deepEqual([...styled.decision.pool].sort(), [...plain.decision.pool].sort(), `${a}+${b}: same near-best range`);
    if (styled.decision.tieBreak?.changed) changed++;
    if (styled.decision.pool.length > 1) assert.equal(styled.decision.style.applied, true);
  }
  assert.ok(changed > 0, "the player's style did reorder some near-equal answers");
  // Fewer than two revealed rounds: no style yet.
  const early = selectBotWord({pair: ["bed", "moon"], seed: 1, character: "gary", history: [{a: "apple", b: "tree"}]});
  assert.equal(early.decision.style.applied, false);
});

test("near-miss momentum: closely related revealed words set a near-match state that favours the cluster", () => {
  assert.deepEqual(nearMatchOf([{a: "warm", b: "hot"}], "en"), ["warm", "hot"]);
  assert.equal(nearMatchOf([{a: "violin", b: "pizza"}], "en"), null);
  assert.equal(nearMatchOf([], "en"), null);
  let applied = 0, changed = 0;
  for (const [a, b] of relatedPairs(11, 300)) {
    const r = selectBotWord({pair: [a, b], seed: 2, character: "gary", history: [{a, b}]});
    const plain = selectBotWord({pair: [a, b], seed: 2, character: "gary"});
    assert.deepEqual([...r.decision.pool].sort(), [...plain.decision.pool].sort(), "same near-best range");
    if (r.decision.nearMatch?.applied) {
      applied++;
      // Within the range, the answers tied most strongly to BOTH words come first.
      const weaks = r.decision.pool.map(w => r.decision.candidates.find(c => c.word === w)).map(c => c.profileScore + (c.tie || 0));
      for (let i = 1; i < weaks.length; i++) assert.ok(weaks[i - 1] >= weaks[i] - 1e-9);
      if (r.decision.tieBreak?.changed) changed++;
    }
  }
  assert.ok(applied > 0);
  assert.ok(changed > 0, "near-match history changed the order of some near-equal answers");
});

test("the hidden current word never affects the bot; Milo and Gary follow the same commit-before-reveal rule", () => {
  for (const character of ["milo", "gary"]) {
    for (let seed = 1; seed <= 10; seed++) {
      let game = startSoloGame({id: `hidden-${character}-${seed}`, seed, character});
      const r1 = submitSoloWord(game, "garden");
      if (!r1.ok || r1.game.status !== "ACTIVE") continue;
      game = r1.game;
      const committed = currentMove(game).hidden.b;
      const seen = new Set();
      for (const answer of ["whale", "pencil", "turtle", "lantern", "anchor", "carrot", committed]) {
        const r = submitSoloWord(game, answer);
        if (r.ok) seen.add(r.move.words.b);
      }
      assert.deepEqual([...seen], [committed], `${character} seed ${seed}`);
    }
  }
});

test("determinism per character: the same game replays identically, and old games without a character are Gary's", () => {
  for (const character of ["gary", "milo"]) {
    for (let seed = 1; seed <= 8; seed++) assert.deepEqual(play(character, seed).words, play(character, seed).words);
  }
  const legacy = startSoloGame({id: "old", seed: 3});
  assert.equal(legacy.character, undefined);
  assert.deepEqual(play(undefined, 3).words, play("gary", 3).words);
});

test("the character only selects a profile: no other engine rule reads it", async () => {
  const dir = new URL("../src/shared/", import.meta.url);
  for (const file of (await readdir(dir, {recursive: true})).filter(f => f.endsWith(".js"))) {
    const source = (await readFile(new URL(file, dir), "utf8")).replace(/^\s*(\/\/|\*).*$/gm, "");
    if (file === "solo.js") {
      // startSoloGame stores it; lockBotWord passes it to the engine as part of its explicit input.
      assert.equal((source.match(/\bcharacter\b/g) || []).length, 6, "solo.js stores the character and passes it on, nothing else");
      continue;
    }
    if (file === "engine.js") {
      // The engine reads it once, to pick the selection profile (and records it in the decision).
      const lines = source.match(/.*\bcharacter\b.*/g).map(line => line.trim());
      assert.deepEqual(lines.filter(line => !line.startsWith("@param") && !line.includes("@typedef")), [
        'export function selectBotWord({pair, blocked = [], history = [], language = "en", character = "gary", seed = 0, config = ENGINE_CONFIG}) {',
        'const who = character === "milo" ? "milo" : "gary";',
        'const decision = {engine: ENGINE_VERSION, dataset: DATASET_VERSION, config, seed, language: lang, character: who, profile: profile.difficulty, pair: inputs.length ? inputs : null,'
      ]);
      continue;
    }
    if (file === "engine-2.2.js") continue; // frozen, for replay only (it sets the character aside)
    if (file === "gamelog.js") {
      // The evaluation log records which character played (to compare them); it never chooses a word.
      assert.doesNotMatch(source, /selectBotWord|chooseResponse|rankCandidates|from "\.\/(engine|bot)\.js"/, file);
      continue;
    }
    if (file === "types.js") continue;
    assert.doesNotMatch(source, /\bcharacter\b|\bmilo\b/i, file);
  }
});

// ---------- the human evaluation fixture ----------

const HUMAN_EVAL = JSON.parse(readFileSync(new URL("./fixtures/human-eval.json", import.meta.url), "utf8"));
const has = (list, w) => (list || []).some(x => wordKey(x) === wordKey(w));

test("human evaluation: Milo plays accepted answers, Gary accepted or alternate ones, neither a rejected one", () => {
  assert.equal(HUMAN_EVAL.schema, 1);
  assert.match(HUMAN_EVAL.version, /^human-eval-\d+$/);
  for (const c of HUMAN_EVAL.cases) {
    for (const character of ["milo", "gary"]) {
      for (let seed = 1; seed <= 25; seed++) {
        const r = selectBotWord({pair: c.pair, seed, character});
        assert.ok(!has(c.reject, r.word), `${c.id} ${character}: ${r.word} is a rejected answer`);
        if (c.recovery) { assert.equal(r.decision.recovery, true, `${c.id}: marked as recovery`); continue; }
        if (character === "milo") assert.ok(has(c.accept, r.word), `${c.id} Milo: ${r.word} is not an accepted answer`);
        else assert.ok(has(c.accept, r.word) || has(c.alternate, r.word), `${c.id} Gary: ${r.word} is neither accepted nor an alternate`);
      }
    }
  }
});

test("word classes cover the vocabulary (for the player-style tie-breaker)", () => {
  const classes = new Set([...lex.concepts.values()].map(wordClass));
  for (const c of ["animal", "food", "object", "place", "nature", "people", "event", "activity", "abstract", "descriptive"]) assert.ok(classes.has(c), c);
});
