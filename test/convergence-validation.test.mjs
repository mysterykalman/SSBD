// Validation of Gary's convergence model on GENERAL samples (random pairs from the lexicon and
// simulated games), not on hand-picked pairs:
//   Fixed-state determinism   the same complete game state always gives the same word
//   Contextual variation      different legitimate trails can change the answer, within reason
//   Convergence distance      Gary's move brings the players closer, about as close as any eligible move
//   Human first               structure never overturns a clear human-likelihood lead
import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE1_DATASET, BOT_TUNING, chooseOpening, chooseResponse, rankCandidates} from "../src/shared/bot.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";

const lex = getLexicon("en", ENGINE1_DATASET);
const everyday = [...lex.concepts.values()].filter(c => c.links.size >= 6 && !c.label.includes(" ")).map(c => c.label);

/** Seeded random pairs of everyday words. */
function randomPairs(seed, count) {
  const rnd = seededRandom(seed);
  const pairs = [];
  while (pairs.length < count) {
    const a = everyday[Math.floor(rnd() * everyday.length)], b = everyday[Math.floor(rnd() * everyday.length)];
    if (a !== b) pairs.push([a, b]);
  }
  return pairs;
}

/**
 * A legitimate game trail: two opening words, then rounds where a model player answers by sampling
 * Gary's own predicted-human distribution and Gary answers as in a real game.
 */
function simulatedTrail(seed, rounds) {
  const rnd = seededRandom(seed);
  const used = new Set();
  let a = chooseOpening({rng: rnd}).word;
  let b = chooseOpening({rng: rnd, excludeKeys: new Set([a])}).word;
  const history = [[a, b]];
  used.add(a); used.add(b);
  const turns = [];
  for (let i = 1; i < rounds; i++) {
    const state = {prompts: [a, b], history: history.slice(), excludeKeys: new Set(used)};
    turns.push(state);
    const {predicted} = rankCandidates(state);
    let roll = rnd(), human = predicted[0]?.word;
    for (const p of predicted) { roll -= p.p; if (roll <= 0) { human = p.word; break; } }
    const gary = chooseResponse({...state, rng: rnd}).word;
    if (!human || human === gary) break;
    history.push([human, gary]);
    used.add(human); used.add(gary);
    a = human; b = gary;
  }
  return {history, used, turns};
}

test("Fixed-state determinism: the same complete state gives the same Gary word 200/200, whatever the game's random seed", t => {
  const states = [
    {prompts: ["wife", "brother"], history: []},
    {prompts: ["dog", "cat"], history: []},
    {prompts: ["sister", "play"], history: []},
    {prompts: ["sun", "moon"], history: [["night", "dark"], ["owl", "dream"]]},
    ...randomPairs(21, 6).map(prompts => ({prompts, history: []})),
    ...[1, 2, 3, 4].flatMap(seed => simulatedTrail(seed, 5).turns)
  ];
  for (const state of states) {
    const words = new Set(), decisions = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const {word, decision} = chooseResponse({...state, rng: seededRandom(seed * 104729), explain: true});
      words.add(word);
      decisions.add(JSON.stringify(decision.candidates));
    }
    assert.equal(words.size, 1, `${state.prompts} with trail ${JSON.stringify(state.history)}: ${[...words]}`);
    assert.equal(decisions.size, 1, `${state.prompts}: the whole ranking is fixed by the state`);
  }
  t.diagnostic(`${states.length} states × 200 seeds: every state gave one word and one ranking`);
});

test("Contextual variation: 200 legitimate trails per pair can tip near-ties between likely answers, never toward an unlikely one", t => {
  const report = {};
  let variedPairs = 0;
  for (const pair of [["dog", "cat"], ["sun", "moon"], ["sister", "play"], ["rain", "snow"], ["bed", "tired"]]) {
    const seen = new Map();
    for (let seed = 1; seed <= 200; seed++) {
      const {history, used} = simulatedTrail(seed * 7 + 1, 1 + (seed % 3));
      const excludeKeys = new Set([...used].filter(w => !pair.includes(w)));
      const word = chooseResponse({prompts: pair, history, excludeKeys, rng: seededRandom(1)}).word;
      seen.set(word, (seen.get(word) || 0) + 1);
      const here = rankCandidates({prompts: pair, history, excludeKeys});
      const row = here.ranked.find(r => r.word === word);
      assert.ok(row && row.tier === 1, `${pair}: ${word} must relate strongly to both words`);
      // Context moves Gary only among the answers people most likely give in THIS state (words the
      // trail already used are off the table, so the next most likely answer takes over).
      const likely = here.predicted.slice(0, 3).map(p => p.word);
      assert.ok(likely.includes(word), `${pair} after ${JSON.stringify(history)}: ${word} (likely: ${likely})`);
    }
    report[pair.join("+")] = Object.fromEntries([...seen].sort((x, y) => y[1] - x[1]));
    if (seen.size > 1) variedPairs++;
    // Context never takes over. With one clear contender (nothing else within the human margin of
    // the likeliest answer) that answer holds almost always; a genuine near-tie between equally
    // likely human answers may split, but one of them still leads.
    const contenders = rankCandidates({prompts: pair}).ranked.filter(r => r.tier === 1 && r.contender).length;
    const lead = [...seen].sort((x, y) => y[1] - x[1])[0];
    assert.ok(lead[1] >= (contenders === 1 ? 180 : 100), `${pair} (${contenders} contenders): ${JSON.stringify(report[pair.join("+")])}`);
  }
  t.diagnostic(`answers over 200 trails: ${JSON.stringify(report)}`);
  assert.ok(variedPairs >= 2, `context changed the answer for ${variedPairs} pairs: ${JSON.stringify(report)}`);
});

/** Turns to judge: random pairs plus every turn of a few simulated games. */
function sampleTurns() {
  return [...randomPairs(5, 500).map(prompts => ({prompts, history: [], excludeKeys: new Set()})), ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap(seed => simulatedTrail(seed * 13, 8).turns)];
}

/** Judge a policy (weights) by expected word-graph distance between the two players after Gary's move. */
function distanceReport(weights) {
  const tuning = {...BOT_TUNING, weights};
  let n = 0, before = 0, after = 0, reduced = 0, nearBest = 0, worst = 0;
  for (const state of sampleTurns()) {
    const {ranked, before: b} = rankCandidates({...state, tuning});
    const pool = ranked.filter(r => r.tier === 1);
    if (!pool.length) continue;
    const pick = pool[0], best = Math.min(...pool.map(r => r.after));
    n++;
    before += b;
    after += pick.after;
    if (pick.after < b) reduced++;
    if (pick.after - best <= 0.25) nearBest++;
    worst = Math.max(worst, pick.after - best);
  }
  return {n, before: before / n, after: after / n, reduced: reduced / n, nearBest: nearBest / n, worst};
}

test("Convergence distance: Gary's move shrinks the expected distance to the player's answer, about as much as any eligible move", t => {
  const gary = distanceReport(BOT_TUNING.weights);
  const fmt = r => `${r.n} turns, ${r.before.toFixed(2)} → ${r.after.toFixed(2)} hops, reduced ${(r.reduced * 100).toFixed(0)}%, within 0.25 of best ${(r.nearBest * 100).toFixed(0)}%, worst ${r.worst.toFixed(2)}`;
  t.diagnostic(`Gary: ${fmt(gary)}`);
  assert.ok(gary.n >= 150, `${gary.n} turns`);
  assert.ok(gary.after < gary.before * 0.3, `before ${gary.before.toFixed(2)} → after ${gary.after.toFixed(2)} hops`);
  assert.ok(gary.reduced >= 0.95, `distance reduced on ${(gary.reduced * 100).toFixed(0)}% of turns`);
  assert.ok(gary.nearBest >= 0.95, `within 0.25 hops of the best eligible move on ${(gary.nearBest * 100).toFixed(0)}% of turns`);
  assert.ok(gary.worst <= 0.5, `worst turn ${gary.worst.toFixed(2)} hops behind the best move`);
  // The same bar catches "defensible but wandering" play: ranking on structure alone fails it.
  const structural = distanceReport({human: 0, fit: 0.6, centre: 0.35, personality: 0.05});
  t.diagnostic(`structure-only: ${fmt(structural)}`);
  assert.ok(structural.nearBest < 0.9 || structural.worst > 1, `structure-only play should fail: ${JSON.stringify(structural)}`);
  assert.ok(structural.after > gary.after * 1.2, "structure-only play leaves the players further apart");
});

test("Human first: structure (fit, centre, personality) never overturns a clear lead in human likelihood", t => {
  let turns = 0, humanTop = 0;
  for (const state of sampleTurns()) {
    const pool = rankCandidates(state).ranked.filter(r => r.tier === 1);
    if (pool.length < 2) continue;
    turns++;
    const leader = pool.reduce((m, r) => (r.human > m.human ? r : m));
    if (leader === pool[0]) { humanTop++; continue; }
    // Only the game's own rules (a lazy piece-of-a-prompt answer, a word from two rounds ago) may
    // overturn a lead bigger than 0.1; structure alone may only settle near-ties.
    if (leader.penalty > pool[0].penalty) continue;
    assert.ok(leader.human - pool[0].human <= 0.1, `${state.prompts}: ${pool[0].word} beat ${leader.word} on structure (human ${pool[0].human.toFixed(2)} vs ${leader.human.toFixed(2)})`);
  }
  t.diagnostic(`human-likelihood leader picked on ${humanTop}/${turns} turns (the rest: near-ties within 0.1, or the leader broke a game rule)`);
  assert.ok(humanTop / turns >= 0.9, `Gary picked the human-likelihood leader on ${humanTop}/${turns} turns`);
});
