// Both current words must matter. General invariants for Gary's per-word support rules, checked on
// broad samples (random pairs from every tier, every compound pair in the lexicon, and simulated games
// where the player often answers one-sidedly), never on hand-picked expected answers.
import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE1_DATASET, BOT_TUNING, chooseOpening, chooseResponse, rankCandidates} from "../src/shared/bot.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";
import {wordKey} from "../src/shared/words.js";

const lex = getLexicon("en", ENGINE1_DATASET);
const concepts = [...lex.concepts.values()];
const everyday = concepts.filter(c => c.links.size >= 4 && !c.label.includes(" ")).map(c => c.label);
const SUP = BOT_TUNING.support;

function randomPairs(seed, count) {
  const rnd = seededRandom(seed), pairs = [];
  while (pairs.length < count) {
    const a = everyday[Math.floor(rnd() * everyday.length)], b = everyday[Math.floor(rnd() * everyday.length)];
    if (a !== b) pairs.push([a, b]);
  }
  return pairs;
}

/** Every pair (X, compound) where the compound word contains X: SAND + SANDBOX, SNOW + SNOWMAN, ... */
function compoundPairs() {
  const pairs = [];
  for (const whole of concepts) for (const part of concepts) {
    if (part.id !== whole.id && part.key.length >= 3 && whole.key.length > part.key.length && whole.key.includes(part.key) && !whole.label.includes(" ")) pairs.push([part.label, whole.label]);
  }
  return pairs;
}

/** Simulated games where the player answers from just ONE of the two words half the time (as kids do). */
function lopsidedGames(seed, games, rounds) {
  const rnd = seededRandom(seed), states = [];
  for (let g = 0; g < games; g++) {
    const used = new Set();
    let a = chooseOpening({rng: rnd}).word, b = chooseOpening({rng: rnd, excludeKeys: new Set([a])}).word;
    const history = [[a, b]];
    used.add(wordKey(a)); used.add(wordKey(b));
    for (let r = 0; r < rounds; r++) {
      states.push({prompts: [a, b], history: history.slice(), excludeKeys: new Set(used)});
      const gary = chooseResponse({prompts: [a, b], history, excludeKeys: new Set(used), rng: rnd}).word;
      const source = lex.concepts.get(lex.resolve(rnd() < 0.5 ? a : b));
      const options = [...(source?.near || [])].map(id => lex.concepts.get(id).label).filter(w => !used.has(wordKey(w)) && w !== gary);
      const human = options.length ? options[Math.floor(rnd() * options.length)] : everyday[Math.floor(rnd() * everyday.length)];
      if (wordKey(human) === wordKey(gary)) break;
      history.push([human, gary]);
      used.add(wordKey(human)); used.add(wordKey(gary));
      a = human; b = gary;
    }
  }
  return states;
}

const SAMPLE = [
  ...randomPairs(91, 400).map(prompts => ({prompts, history: [], excludeKeys: new Set()})),
  ...compoundPairs().map(prompts => ({prompts, history: [], excludeKeys: new Set()})),
  ...lopsidedGames(17, 25, 8)
];

/** Gary's pick for a state, with its whole ranking. */
function decide(state, tuning = BOT_TUNING) {
  const {ranked, knownA, knownB} = rankCandidates({...state, tuning});
  const word = chooseResponse({...state, tuning, rng: seededRandom(1)}).word;
  return {ranked, pick: ranked.find(r => r.word === word), word, known: knownA && knownB};
}

test("support is per word, 0..1, and comes from the current pair only (the trail never changes it)", () => {
  for (const state of SAMPLE.filter(s => s.history.length > 1).slice(0, 60)) {
    const withTrail = rankCandidates(state).ranked;
    const bare = new Map(rankCandidates({...state, history: []}).ranked.map(r => [r.word, r]));
    for (const r of withTrail) {
      assert.ok(r.supportA >= 0 && r.supportA <= 1 && r.supportB >= 0 && r.supportB <= 1);
      assert.equal(r.weakSide, Math.min(r.supportA, r.supportB));
      const plain = bare.get(r.word);
      if (plain) assert.deepEqual([plain.supportA, plain.supportB], [r.supportA, r.supportB], `${state.prompts} → ${r.word}`);
    }
  }
});

test("Human-first invariant: outside an intentional rejection, nothing more than 0.10 below the top human likelihood wins", t => {
  let checked = 0;
  for (const state of SAMPLE) {
    const {ranked, pick} = decide(state);
    if (!pick || !pick.viable) continue;
    const pool = ranked.filter(r => r.tier === pick.tier && r.viable);
    const effective = r => r.human - r.penalty / BOT_TUNING.weights.human;
    const leader = Math.max(...pool.map(effective));
    assert.ok(effective(pick) >= leader - BOT_TUNING.humanMargin - 1e-9, `${state.prompts}: ${pick.word} is ${(leader - effective(pick)).toFixed(3)} below the human leader`);
    // Any more-human word that lost was rejected on purpose (lazy or one-sided), and says so.
    for (const r of ranked.filter(r => r.tier === pick.tier && !r.viable && effective(r) > leader + 1e-9)) assert.ok(r.rejectedBecause, r.word);
    checked++;
  }
  t.diagnostic(`${checked} decisions checked`);
});

test("Weak-side invariant: a near-zero word never beats a similarly human-likely contender with weak-side support >= 0.30", t => {
  let nearZero = 0;
  for (const state of SAMPLE) {
    const {ranked, pick, known} = decide(state);
    if (!pick || pick.weakSide >= SUP.oneSided || !known) continue;
    nearZero++;
    const better = ranked.filter(r => r.viable && r.weakSide >= 0.3 && r.human >= pick.human - BOT_TUNING.humanMargin);
    assert.deepEqual(better.map(r => r.word), [], `${state.prompts} → ${pick.word} (weak side ${pick.weakSide})`);
    // It can only have won as the documented exception or because nothing connects both words.
    assert.ok(pick.viable || !ranked.some(r => r.viable), `${state.prompts} → ${pick.word}`);
  }
  t.diagnostic(`${nearZero} picks had near-zero weak-side support (no two-sided word existed in the data)`);
});

test("Weak support (0.15–0.25) loses to a comparably human-likely contender with weak-side support >= 0.30", () => {
  for (const state of SAMPLE) {
    const {ranked, pick} = decide(state);
    if (!pick || pick.weakSide >= SUP.acceptable || pick.weakSide < SUP.oneSided) continue;
    const rival = ranked.find(r => r.contender && r.tier === pick.tier && r.weakSide >= 0.3 && Math.abs(r.human - pick.human) <= 0.05);
    assert.ok(!rival, `${state.prompts}: ${pick.word} (weak ${pick.weakSide}) beat ${rival?.word} (weak ${rival?.weakSide})`);
  }
});

test("Trail invariant: a trail never makes a near-zero word beat a valid two-sided contender", () => {
  const trails = [[["shell", "beach"], ["sand", "wave"]], [["farm", "barn"], ["cow", "tractor"]], [["rocket", "astronaut"], ["alien", "planet"]], [["sand", "bucket"], ["castle", "tower"]]];
  for (const state of SAMPLE.slice(0, 400)) {
    for (const trail of trails) {
      const history = [...trail, state.prompts];
      const used = new Set(trail.flat().map(wordKey));
      if (state.prompts.some(p => used.has(wordKey(p)))) continue;
      const {ranked, pick} = decide({prompts: state.prompts, history, excludeKeys: used});
      if (!pick || pick.weakSide >= SUP.oneSided) continue;
      const valid = ranked.filter(r => r.viable && r.weakSide >= 0.3);
      assert.deepEqual(valid.map(r => r.word), [], `${state.prompts} + trail ${JSON.stringify(trail)} → ${pick.word}`);
    }
  }
});

test("Lazy-answer invariant: a piece of a compound loses unless the other word supports it on its own", t => {
  let rejected = 0;
  for (const prompts of compoundPairs()) {
    const {ranked, word} = decide({prompts, history: [], excludeKeys: new Set()});
    const [part, whole] = prompts.map(wordKey);
    const key = wordKey(word);
    // Never the leftover of the compound (SAND + SANDBOX → BOX).
    assert.ok(!(whole.includes(key) && key !== part && whole.replace(part, "") === key), `${prompts} → ${word}`);
    const pick = ranked.find(r => r.word === word);
    if (pick?.lazyFrom) assert.ok(pick.lazyOther >= SUP.lazyOtherSupport, `${prompts} → ${word}: lazy, other side ${pick.lazyOther}`);
    rejected += ranked.filter(r => r.lazyReject).length;
  }
  t.diagnostic(`${compoundPairs().length} compound pairs, ${rejected} lazy candidates rejected`);
});

test("Determinism invariant: the same complete state gives the same word 200/200 (including fallback turns)", () => {
  const states = [...SAMPLE.filter((_, i) => i % 37 === 0), ...compoundPairs().slice(0, 5).map(prompts => ({prompts, history: [], excludeKeys: new Set()}))];
  for (const state of states) {
    const words = new Set();
    for (let seed = 1; seed <= 200; seed++) words.add(chooseResponse({...state, rng: seededRandom(seed * 7919)}).word);
    assert.equal(words.size, 1, `${state.prompts}: ${[...words]}`);
  }
});

test("Convergence invariant: on the exact same turns, the refined model is no worse than the previous one, and every change is an intentional rejection", t => {
  const previousTuning = {...BOT_TUNING, supportRules: false};
  const report = (turns, tuning) => {
    let n = 0, after = 0, near = 0;
    for (const state of turns) {
      const {ranked, pick} = decide(state, tuning);
      if (!pick || pick.tier !== 1) continue;
      n++;
      after += pick.after;
      if (pick.after - Math.min(...ranked.filter(r => r.tier === 1).map(r => r.after)) <= 0.25) near++;
    }
    return {n, after: after / n, near: near / n};
  };
  // 1. The original benchmark turns (everyday random pairs): equal or better.
  const everydayPairs = randomPairs(5, 500).map(prompts => ({prompts, history: [], excludeKeys: new Set()}));
  const previous = report(everydayPairs, previousTuning), refined = report(everydayPairs, BOT_TUNING);
  t.diagnostic(`benchmark turns: previous ${previous.after.toFixed(3)} hops, ${(previous.near * 100).toFixed(1)}% near best; refined ${refined.after.toFixed(3)} hops, ${(refined.near * 100).toFixed(1)}% near best (${refined.n} turns)`);
  assert.ok(refined.after <= previous.after + 0.005, "expected distance did not regress");
  assert.ok(refined.near >= previous.near - 0.005, "share of near-best moves did not regress");
  // 2. The adversarial sample (compounds, one-sided games): any different pick is explained by the
  //    previous pick being rejected on purpose (lazy, or one word functionally irrelevant).
  let changed = 0;
  for (const state of SAMPLE) {
    const before = decide(state, previousTuning).word, now = decide(state);
    if (before === now.word) continue;
    changed++;
    const old = now.ranked.find(r => r.word === before);
    assert.ok(old && (!old.viable || old.supportPenalty > 0 || !old.contender), `${state.prompts}: ${before} → ${now.word} without a support reason`);
  }
  const adversarialPrevious = report(SAMPLE, previousTuning), adversarialRefined = report(SAMPLE, BOT_TUNING);
  t.diagnostic(`adversarial turns: ${changed} picks changed; previous ${adversarialPrevious.after.toFixed(3)} hops, refined ${adversarialRefined.after.toFixed(3)} hops (rejecting lazy and one-sided words costs a little expected distance by design)`);
});

test("No overcorrection: legitimate asymmetric answers still win (Gary does not demand symmetry)", t => {
  let asymmetric = 0, total = 0;
  for (const state of SAMPLE) {
    const {pick} = decide(state);
    if (!pick) continue;
    total++;
    if (pick.imbalance >= 0.35 && pick.weakSide >= SUP.acceptable) asymmetric++;
  }
  t.diagnostic(`${asymmetric}/${total} picks were clearly asymmetric yet supported on both sides`);
  assert.ok(asymmetric >= total * 0.1, `${asymmetric}/${total}`);
});
