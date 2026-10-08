// @ts-check
// Solo bot engine v2 (Gary and Milo). Local, non-generative and inspectable: it ranks words from the
// curated association graph (src/shared/lexicon) and returns a structured record of how it chose.
//
// Fair play: the only input is what both players can already see. `selectBotWord` takes the latest
// revealed pair, the words blocked by earlier revealed rounds, the language, the character and a
// seed. It never receives the player's word for the round it is choosing for, and the game commits
// its choice before the round is revealed (src/shared/solo.js).
//
// Scoring (all values are heuristic scores, not probabilities):
//   relation(input, candidate) ∈ [0, 1]  how directly the candidate is associated with ONE input:
//     1.00 the input's category (DOG → PET), or a compound/phrase that is also a link
//     0.95 a compound or set phrase (TABLE + LAMP → "table lamp")
//     0.90 → 0.70 named in the input's curated association list (by rank: 0.90 − 0.02 × rank, ≥ 0.70)
//     0.75 a kind of the input (FRUIT → APPLE)
//     0.70 any other direct link
//     0.40 / 0.30 / 0.12 no direct link, but 3+ / 2 / 1 shared neighbours (indirect)
//     0.05 only a common topic tag;  0 nothing
//   weak = min(relA, relB), strong = max(relA, relB)
//   connection = 0.65 × weak + 0.35 × strong                         ∈ [0, 1]  (the weaker side counts most)
//   oneSided   = 0.30 × max(0, strong − weak − 0.45)                 ∈ [0, 0.17]
//   familiarity = 0.7 × min(1, links / 12) + 0.3 × (short single word) ∈ [0, 1]
//   cue        = mean over inputs of 1 / (1 + 0.25 × rank in its curated list) (0 if not listed) ∈ [0, 1]
//   generic    = 0.10 for broad words (food, thing, animal...)       so a specific shared bridge wins
//   final = 0.70 × connection + 0.15 × familiarity + 0.15 × cue − oneSided − generic − piecePenalty
// Stages (the first one with any valid candidate is used; the stage is logged):
//   1 shared-direct          weak ≥ 0.70: directly associated with both inputs
//   2 direct-plus-indirect   weak ≥ 0.30 and strong ≥ 0.70
//   3 indirect-both          weak ≥ 0.30
//   4 weak-fallback          weak ≥ 0.12 (one shared neighbour each)        → lowQuality
//   5 best-available         anything still connected to both (weak > 0)    → lowQuality
//   6 one-input-only         nothing connects both: best for the stronger input → lowQuality
//   unknown-input            one input is not in the graph: answered from the other → lowQuality
//   no-known-input / opening a friendly familiar word
// Randomness: only among the strong pool (final within POOL_MARGIN of the best, at most POOL_SIZE),
// from a seeded generator, after validity and the stage's minimum quality have been checked.

import {getLexicon, DATASET_VERSION} from "./lexicon/index.js";
import {lemmaKeys} from "./morph.js";
import {wordKey} from "./words.js";
import {hashString, seededRandom} from "./rules.js";

export const ENGINE_VERSION = "engine-2.0";

/** Everything that shapes a decision (logged with it, so a decision can be replayed exactly). */
export const ENGINE_CONFIG = Object.freeze({
  weights: {connection: 0.70, familiarity: 0.15, cue: 0.15},
  connection: {weak: 0.65, strong: 0.35},
  oneSided: {gap: 0.45, factor: 0.30},
  genericPenalty: 0.10,
  piecePenalty: 0.10,
  stages: {sharedDirect: 0.70, indirect: 0.30, strongSide: 0.70, weak: 0.12},
  poolMargin: 0.03,
  poolSize: 3,
  logCandidates: 8
});

/** Broad words: fine when nothing better connects, but a more specific shared bridge should win. */
const GENERIC = new Set(["food", "thing", "stuff", "animal", "people", "person", "place", "fun", "good", "nice", "big", "small", "color", "toy", "eat", "drink", "happy", "new", "time"]);
const GLOOMY = new Set(["nightmare", "scary", "fear", "ghost", "monster", "haunted_house", "skeleton", "zombie", "witch", "spider", "snake", "shark", "sad", "angry", "cry", "storm", "volcano", "dark"]);
const round3 = x => Math.round(x * 1000) / 1000;

/**
 * How directly a candidate is associated with one input (which may stand for two concepts, e.g. both
 * halves of "firetruck"). Returns the score and the kind of link (see the scale above).
 */
export function relation(lex, inputIds, candidate) {
  let best = {score: 0, kind: "none"};
  for (const id of inputIds) {
    const input = lex.concepts.get(id);
    if (!input || input.id === candidate.id) continue;
    let score, kind;
    const rank = input.out.get(candidate.id);
    if (input.kinds.has(candidate.id)) { score = 1; kind = "category"; }
    else if (input.phrases.has(candidate.id) && input.links.has(candidate.id)) { score = 1; kind = "compound"; }
    else if (input.phrases.has(candidate.id)) { score = 0.95; kind = "compound"; }
    else if (rank !== undefined) { score = Math.max(0.7, 0.9 - 0.02 * rank); kind = "curated"; }
    else if (candidate.kinds.has(input.id)) { score = 0.75; kind = "member"; }
    else if (input.links.has(candidate.id)) { score = 0.7; kind = "link"; }
    else {
      let shared = 0;
      for (const n of candidate.near) if (input.near.has(n)) shared++;
      if (shared >= 3) { score = 0.4; kind = "shared-3"; }
      else if (shared === 2) { score = 0.3; kind = "shared-2"; }
      else if (shared === 1) { score = 0.12; kind = "shared-1"; }
      else if (candidate.tags.some(tag => input.tags.includes(tag))) { score = 0.05; kind = "tag"; }
      else { score = 0; kind = "none"; }
    }
    if (score > best.score) best = {score, kind};
  }
  return best;
}

function familiarity(concept) {
  const short = !concept.label.includes(" ") && concept.label.length <= 10 ? 1 : 0;
  return 0.7 * Math.min(1, concept.links.size / 12) + 0.3 * short;
}

function cueFrom(lex, inputIds, candidate) {
  let best = 0;
  for (const id of inputIds) {
    const rank = lex.concepts.get(id)?.out.get(candidate.id);
    if (rank !== undefined) best = Math.max(best, 1 / (1 + 0.25 * rank));
  }
  return best;
}

/** The game's normalisation for "already used": case, spacing, accents and singular/plural forms. */
function blockedKeys(words, language) {
  const keys = new Set();
  for (const word of words) for (const key of lemmaKeys(word, language)) keys.add(key);
  return keys;
}
function isBlocked(label, blocked, language) {
  for (const key of lemmaKeys(label, language)) if (blocked.has(key)) return true;
  return false;
}
/** The candidate is a piece of an input, or an input is a piece of it (SAND + SANDBOX → BOX). */
function pieceOf(candidateKey, inputKeys) {
  return inputKeys.some(k => k && k.length >= 3 && candidateKey.length >= 3 && k !== candidateKey && (k.includes(candidateKey) || candidateKey.includes(k)));
}

function stageOf(weak, strong, cfg) {
  if (weak >= cfg.stages.sharedDirect) return 1;
  if (weak >= cfg.stages.indirect && strong >= cfg.stages.strongSide) return 2;
  if (weak >= cfg.stages.indirect) return 3;
  if (weak >= cfg.stages.weak) return 4;
  if (weak > 0) return 5;
  return 6;
}
export const STAGE_NAMES = {1: "shared-direct", 2: "direct-plus-indirect", 3: "indirect-both", 4: "weak-fallback", 5: "best-available", 6: "one-input-only"};

/**
 * @typedef {{word: string, rank: number, stage: number, sources: string[], relA: number, relB: number, kindA: string, kindB: string,
 *   weak: number, strong: number, connection: number, familiarity: number, cue: number, oneSided: number, generic: number, piece: number, final: number}} ScoredWord
 * @typedef {{engine: string, dataset: string, config: typeof ENGINE_CONFIG, seed: number, language: string,
 *   pair: string[] | null, inputs: {word: string, ids: string[], known: boolean}[], blockedCount: number, stage: string, lowQuality: boolean,
 *   candidates: ScoredWord[], rejected: {word: string, reason: string}[], pool: string[], selected: string, quality: string, generated: number}} EngineDecision
 */

/**
 * Choose the bot's word. Pure and deterministic for the same input.
 * @param {{pair: [string, string] | string[] | null, blocked?: Iterable<string>, language?: string, character?: string, seed?: number, config?: typeof ENGINE_CONFIG}} input
 *   pair: the latest revealed pair (null for the first move); blocked: every word revealed in earlier rounds.
 * @returns {{word: string, quality: "strong" | "loose" | "opening", decision: EngineDecision}}
 */
export function selectBotWord({pair, blocked = [], language = "en", character = "gary", seed = 0, config = ENGINE_CONFIG}) {
  const lang = language === "fr" ? "fr" : "en";
  const lex = getLexicon(lang);
  const inputs = Array.isArray(pair) ? pair.slice(0, 2).map(w => String(w ?? "")) : [];
  const blockedWords = [...blocked, ...inputs];
  const blockedSet = blockedKeys(blockedWords, lang);
  const rng = seededRandom(hashString(`${seed}:${inputs.join("+")}:${[...blockedSet].sort().join(",")}`));
  const resolved = inputs.map(word => ({word, ids: lex.resolveAll(word), known: false}));
  for (const r of resolved) r.known = r.ids.length > 0;
  // The character is part of the input (for future per-character choices within the strong pool),
  // but both characters currently share one baseline, so it does not shape the decision record.
  void character;
  /** @type {EngineDecision} */
  const decision = {engine: ENGINE_VERSION, dataset: DATASET_VERSION, config, seed, language: lang, pair: inputs.length ? inputs : null,
    inputs: resolved, blockedCount: new Set(blockedWords.map(wordKey)).size, stage: "", lowQuality: false, candidates: [], rejected: [], pool: [], selected: "", quality: "", generated: 0};

  const valid = concept => !isBlocked(concept.label, blockedSet, lang);
  const friendly = concept => concept.links.size >= 7 && !concept.label.includes(" ") && !GLOOMY.has(concept.id);
  const finish = (word, quality, stage, lowQuality) => {
    decision.selected = word; decision.quality = quality; decision.stage = stage; decision.lowQuality = lowQuality;
    return {word, quality, decision};
  };

  // First move, or neither input is a word the graph knows: a friendly, familiar word.
  const known = resolved.filter(r => r.known);
  if (!inputs.length || !known.length) {
    const pool = [...lex.concepts.values()].filter(c => friendly(c) && valid(c));
    const list = pool.length ? pool : [...lex.concepts.values()].filter(valid);
    if (!list.length) throw new Error("No words left for the bot");
    const pick = list[Math.floor(rng() * list.length)];
    decision.pool = [pick.label];
    return finish(pick.label, inputs.length ? "loose" : "opening", inputs.length ? "no-known-input" : "opening", Boolean(inputs.length));
  }

  // Candidates: the direct associations of each input (curated links, compounds, categories).
  const inputIds = new Set(known.flatMap(r => r.ids));
  const inputKeys = inputs.map(wordKey);
  const sources = new Map();
  const add = (id, source) => { if (inputIds.has(id)) return; if (!sources.has(id)) sources.set(id, new Set()); sources.get(id).add(source); };
  resolved.forEach((r, i) => {
    for (const id of r.ids) {
      const c = lex.concepts.get(id);
      for (const n of c.links) add(n, `assoc-${"AB"[i]}`);
      for (const n of c.phrases) add(n, `compound-${"AB"[i]}`);
      for (const n of c.kinds.keys()) add(n, `category-${"AB"[i]}`);
    }
  });
  const score = (id, extraSource) => {
    const c = lex.concepts.get(id);
    const a = relation(lex, resolved[0]?.ids || [], c), b = relation(lex, resolved[1]?.ids || [], c);
    const weak = Math.min(a.score, b.score), strong = Math.max(a.score, b.score);
    const connection = config.connection.weak * weak + config.connection.strong * strong;
    const oneSided = config.oneSided.factor * Math.max(0, strong - weak - config.oneSided.gap);
    const fam = familiarity(c), cue = cueFrom(lex, [...inputIds], c);
    const generic = GENERIC.has(c.id) ? config.genericPenalty : 0;
    const piece = pieceOf(c.key, inputKeys) ? config.piecePenalty : 0;
    const final = config.weights.connection * connection + config.weights.familiarity * fam + config.weights.cue * cue - oneSided - generic - piece;
    return {concept: c, word: c.label, rank: 0, stage: stageOf(weak, strong, config), sources: [...(sources.get(id) || []), ...(extraSource ? [extraSource] : [])].sort(),
      relA: a.score, relB: b.score, kindA: a.kind, kindB: b.kind, weak, strong, connection: round3(connection), familiarity: round3(fam), cue: round3(cue),
      oneSided: round3(oneSided), generic, piece, final: round3(final)};
  };
  /** @type {{word: string, reason: string, final: number}[]} */
  const rejected = [];
  const judge = scored => {
    if (!valid(scored.concept)) { rejected.push({word: scored.word, reason: "already played (blocked)", final: scored.final}); return false; }
    if (scored.piece && Math.min(scored.relA, scored.relB) < config.stages.sharedDirect) { rejected.push({word: scored.word, reason: "a piece of an input word (lazy compound split)", final: scored.final}); return false; }
    return true;
  };
  let pool = [...sources.keys()].map(id => score(id)).filter(judge);

  // Controlled broadening: only if no candidate is directly associated with both inputs, add
  // two-step neighbours (a neighbour of a neighbour of each input), never deeper.
  if (resolved.length === 2 && resolved.every(r => r.known) && !pool.some(s => s.stage <= 2)) {
    const ring = ids => { const out = new Set(); for (const id of ids) for (const n of lex.concepts.get(id).near) for (const m of lex.concepts.get(n)?.near || []) out.add(m); return out; };
    const ringA = ring(resolved[0].ids), ringB = ring(resolved[1].ids);
    for (const id of ringA) if (ringB.has(id) && !sources.has(id) && !inputIds.has(id)) { sources.set(id, new Set(["two-step"])); const s = score(id); if (judge(s)) pool.push(s); }
  }
  decision.generated = sources.size;

  // One input unknown: answer from the other, but say so (logged as a low-quality decision).
  if (resolved.length === 2 && resolved.some(r => !r.known)) {
    const knownIndex = resolved[0].known ? 0 : 1;
    pool = pool.map(s => ({...s, final: round3(config.weights.connection * (knownIndex === 0 ? s.relA : s.relB) + config.weights.familiarity * s.familiarity + config.weights.cue * s.cue - s.generic - s.piece)}));
    return choose(pool, "unknown-input", true, 6);
  }
  const best = Math.min(...pool.map(s => s.stage), 6);
  return choose(pool, best === 6 && !pool.length ? "one-input-only" : STAGE_NAMES[best], best >= 4, best);

  function choose(all, stage, lowQuality, stageNumber) {
    // Every candidate in one order: the reached stage first (best first), then the lower stages.
    const order = (x, y) => (stage === "unknown-input" ? 0 : x.stage - y.stage) || y.final - x.final || x.word.localeCompare(y.word);
    const everything = all.slice().sort(order);
    everything.forEach((s, i) => { s.rank = i + 1; });
    const ranked = everything.filter(s => stage === "unknown-input" || s.stage === stageNumber);
    if (!ranked.length) {
      // Tight constraints: nothing connected is left. Fall back to any familiar unblocked word.
      const spare = [...lex.concepts.values()].filter(c => friendly(c) && valid(c));
      const list = spare.length ? spare : [...lex.concepts.values()].filter(valid);
      if (!list.length) throw new Error("No words left for the bot");
      const pick = list[Math.floor(rng() * list.length)];
      decision.rejected = rejected.slice(0, 6).map(({word, reason}) => ({word, reason}));
      decision.pool = [pick.label];
      return finish(pick.label, "loose", "no-candidates", true);
    }
    const top = ranked[0].final;
    const strongPool = ranked.filter(s => s.final >= top - config.poolMargin).slice(0, config.poolSize);
    const pick = strongPool[Math.floor(rng() * strongPool.length)];
    decision.candidates = everything.slice(0, config.logCandidates).map(({concept: _c, ...rest}) => rest);
    // Notable rejections: blocked or lazy words that would otherwise have ranked near the top.
    decision.rejected = rejected.filter(r => r.final >= top - 0.15).sort((x, y) => y.final - x.final).slice(0, 6).map(({word, reason}) => ({word, reason}));
    // Also note strong one-sided words that lost to the balanced pick (why the obvious word was not chosen).
    for (const s of all.filter(s => s.stage > stageNumber && s.strong >= 0.85 && !strongPool.includes(s)).sort((x, y) => y.strong - x.strong).slice(0, 3)) {
      const why = s.weak < config.stages.weak ? "one-sided" : "weaker on one word than the chosen stage";
      decision.rejected.push({word: s.word, reason: `${why}: ${round3(s.relA)} / ${round3(s.relB)}`});
    }
    decision.pool = strongPool.map(s => s.word);
    return finish(pick.word, lowQuality ? "loose" : "strong", stage, lowQuality);
  }
}
