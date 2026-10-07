// @ts-check
// The Solo bot. It only ever sees the two prompt words and the words already
// revealed in this game; it never sees the player's word for the move it is
// choosing for.

import {getLexicon} from "./lexicon/index.js";
import {lemmaKeys} from "./morph.js";
import {createSpeller, wordKey} from "./words.js";

/**
 * @typedef {import("./types.js").BotPick} BotPick
 * @typedef {import("./types.js").Language} Language
 */


/**
 * Singular/plural spellings a word key might also be written as (en + fr).
 * @param {string} key a wordKey
 * @returns {Set<string>}
 */
export function wordForms(key) {
  const out = new Set([key, key + "s", key + "x", key + "es"]);
  if (key.length > 3 && /[sx]$/.test(key)) out.add(key.slice(0, -1));
  if (key.length > 4 && key.endsWith("es")) out.add(key.slice(0, -2));
  if (key.length > 4 && key.endsWith("ies")) out.add(key.slice(0, -3) + "y");
  if (key.length > 2 && key.endsWith("y")) out.add(key.slice(0, -1) + "ies");
  if (key.length > 4 && key.endsWith("ves")) out.add(key.slice(0, -3) + "f");
  if (key.length > 2 && key.endsWith("f")) out.add(key.slice(0, -1) + "ves");
  if (key.length > 4 && key.endsWith("aux")) out.add(key.slice(0, -3) + "al");
  if (key.length > 3 && key.endsWith("al")) out.add(key.slice(0, -2) + "aux");
  return out;
}

function isExcluded(key, excludeKeys) {
  for (const form of wordForms(key)) if (excludeKeys.has(form)) return true;
  return false;
}

/**
 * Tuning for Gary's answer (one place, so a future difficulty setting can adjust it).
 * Objective: semantic convergence. Gary predicts what the human is most likely to type for these
 * two words and picks the word that gives the best chance of both players saying the same thing,
 * now or on the very next move. A word that is merely defensible for both prompts is not enough.
 */
export const BOT_TUNING = {
  /**
   * Ranking weights (sum to 1):
   *  human        similarity to the predicted human answers (probability-weighted)
   *  fit          semantic fit to both current words (the weaker side counts most)
   *  centre       convergence toward the semantic centre: balanced between the two words, and
   *               on the theme the recent trail is building (history informs, never dominates)
   *  personality  Gary's whim: only ever breaks near-ties
   */
  weights: {human: 0.50, fit: 0.30, centre: 0.15, personality: 0.05},
  /** How many predicted human answers to keep (probabilities are renormalised over these). */
  predictions: 8,
  /** Trail rounds that shape the theme, newest first, and their weights. */
  themeRounds: [1, 0.6, 0.35],
  /** Each prompt must independently relate at least this strongly (0..1), or the candidate is rejected. */
  minPerSide: 0.45,
  /** Concept seen N rounds ago → extra score penalty (1 round ago is rejected outright). */
  recency: [[2, 2, 0.25], [3, 5, 0.12], [6, 8, 0.05]],
  /** Penalty for answering with a piece of a prompt word, or a word containing one. */
  containedPenalty: 0.25,
  /**
   * Bounded fallback tiers, used only when no candidate clears minPerSide. Both prompts must
   * still relate on their own in every tier; one strong side never carries a weak one.
   *  tier 2: both sides ≥ relaxedPerSide and the weaker side ≥ relaxedBalance × the stronger.
   *  tier 3: broadened search over two- and three-step paths; at least minPaths independent
   *          paths from EACH prompt, and the weaker count ≥ pathBalance × the stronger.
   */
  relaxedPerSide: 0.25,
  relaxedBalance: 0.5,
  /** tier 3: both sides still ≥ relaxedPerSide, a little less balanced (two shared-neighbour links). */
  wideBalance: 0.45,
  /** tier 4: both sides at least share a category (≥ categoryPerSide), balanced, and no side is a
   *  direct link (< directStrength), so a strong side can't carry a category-only side. */
  categoryPerSide: 0.1,
  categoryBalance: 0.25,
  directStrength: 0.8,
  /** tier 5 (last resort): independent two/three-step paths from both prompts, balanced. */
  minPaths: 2,
  pathBalance: 0.4
};

/**
 * How strongly a candidate relates to one prompt (which may stand for several concepts,
 * e.g. both halves of "firetruck"), and how likely a person is to think of it from that prompt.
 *  strength 1.0 the candidate is the prompt's category (DOG → PET) or phrase + link, .95 common
 *  phrase/compound ("snow" + "ball"), .9 the prompt's own list names it, .85 the candidate is a
 *  kind of the prompt (FRUIT → APPLE), .8 the candidate's list names the prompt, .55/.45/.25
 *  three/two/one shared neighbours, .1 only a common tag.
 */
function sideRelation(lex, promptIds, candidate) {
  let best = {strength: 0, human: 0};
  for (const promptId of promptIds) {
    const prompt = lex.concepts.get(promptId);
    if (!prompt || prompt.id === candidate.id) continue;
    const category = prompt.kinds.get(candidate.id), member = candidate.kinds.has(prompt.id);
    const phrase = prompt.phrases.has(candidate.id), link = prompt.links.has(candidate.id);
    const outRank = prompt.out.get(candidate.id), named = outRank !== undefined, namedBack = candidate.out.has(prompt.id);
    let shared = 0;
    for (const neighbour of candidate.near) if (prompt.near.has(neighbour)) shared++;
    const commonTag = candidate.tags.some(tag => prompt.tags.includes(tag));
    const strength = category !== undefined || (phrase && link) ? 1 : phrase ? 0.95 : named ? 0.9 : member ? 0.85 : namedBack ? 0.8
      : shared >= 3 ? 0.55 : shared === 2 ? 0.45 : shared === 1 ? 0.25 : commonTag ? 0.1 : 0;
    // Words a curator listed first for this prompt are what people say first.
    const human = category !== undefined ? 0.95 * category : named ? Math.max(0.6, 1 - outRank * 0.04) : phrase ? 0.85 : namedBack ? 0.65
      : member ? 0.5 : shared >= 3 ? 0.35 : shared === 2 ? 0.25 : shared === 1 ? 0.1 : 0;
    if (strength > best.strength || (strength === best.strength && human > best.human)) best = {strength, human};
  }
  return best;
}

/**
 * How readily a person who sees `promptId` thinks of concept `h` (0..1). The prompt's category
 * comes first (DOG → PET), then the curator's ordered first-thought list (rank 0 is the most
 * common answer), then phrases, then weaker reverse and neighbourhood links.
 */
function firstThought(lex, promptId, h) {
  const prompt = lex.concepts.get(promptId);
  if (!prompt || prompt.id === h.id) return 0;
  const category = prompt.kinds.get(h.id);
  if (category !== undefined) return category;
  const rank = prompt.out.get(h.id);
  if (rank !== undefined) return 1 / (1 + 0.3 * rank);
  if (prompt.phrases.has(h.id)) return 0.7;
  const back = h.out.get(prompt.id);
  if (back !== undefined) return 0.45 / (1 + 0.15 * back);
  if (h.kinds.has(prompt.id)) return 0.35;
  let shared = 0;
  for (const neighbour of h.near) if (prompt.near.has(neighbour) && ++shared >= 2) return 0.15;
  return 0;
}
const thoughtFrom = (lex, ids, h) => ids.reduce((best, id) => Math.max(best, firstThought(lex, id, h)), 0);
/** The weight of a category both prompts belong to (DOG + CAT → PET), or 0. */
function sharedCategory(lex, idsA, idsB, h) {
  const weightFor = ids => ids.reduce((best, id) => Math.max(best, lex.concepts.get(id)?.kinds.get(h.id) ?? 0), 0);
  return Math.min(weightFor(idsA), weightFor(idsB));
}

/** Whether `h` is the same kind of thing as one of these prompts (both members of one category). */
function lateralTo(lex, ids, h) {
  for (const id of ids) {
    const prompt = lex.concepts.get(id);
    if (prompt) for (const category of prompt.kinds.keys()) if (h.kinds.has(category)) return true;
  }
  return false;
}

/**
 * A sideways swap for one prompt: the same kind of thing as that prompt (SISTER → BROTHER,
 * APPLE → ORANGE, DOG + CAT → MOUSE) that the other prompt does not itself suggest. Swaps keep
 * a game going without bringing the players closer. A category both prompts share is never one.
 */
function isSideways(lex, idsA, idsB, h) {
  if (sharedCategory(lex, idsA, idsB, h)) return false;
  return (lateralTo(lex, idsA, h) && thoughtFrom(lex, idsB, h) < 0.5) || (lateralTo(lex, idsB, h) && thoughtFrom(lex, idsA, h) < 0.5);
}

/**
 * Similarity between two concepts for convergence: same word 1, one is a kind of the other .6,
 * directly linked .45, a common phrase .35, two shared neighbours .2.
 */
function similarity(x, y) {
  if (x.id === y.id) return 1;
  if (x.kinds.has(y.id) || y.kinds.has(x.id)) return 0.6;
  if (x.links.has(y.id)) return 0.45;
  if (x.phrases.has(y.id)) return 0.35;
  let shared = 0;
  for (const neighbour of x.near) if (y.near.has(neighbour) && ++shared >= 2) return 0.2;
  return 0;
}

/** Everyday words (well connected, one short word) are what people actually type. */
function commonness(concept) {
  return (0.55 + 0.45 * Math.min(1, concept.links.size / 10)) * (concept.label.includes(" ") ? 0.75 : 1) * (concept.label.length > 10 ? 0.85 : 1);
}

/**
 * The trail's theme: the words revealed in the last few rounds (newest weighted most). Returns a
 * function giving how strongly a concept sits on that theme (0..1), plus the words it used.
 */
function trailTheme(lex, history, tuning) {
  const words = [];
  history.slice().reverse().slice(0, tuning.themeRounds.length).forEach((round, i) => {
    for (const word of round) for (const id of lex.resolveAll(word)) words.push({id, word, weight: tuning.themeRounds[i]});
  });
  const total = words.reduce((sum, w) => sum + w.weight, 0);
  const cache = new Map();
  const theme = concept => {
    if (!total) return 0;
    if (!cache.has(concept.id)) cache.set(concept.id, words.reduce((sum, w) => sum + w.weight * sideRelation(lex, [w.id], concept).strength, 0) / total);
    return cache.get(concept.id);
  };
  return {theme, words: [...new Set(words.map(w => w.word))]};
}

/**
 * Gary's model of the human: the words a person is most likely to type for these two prompts,
 * with probabilities. Both words must bring the answer to mind (a geometric mean, so an answer
 * one word suggests and the other doesn't scores near zero); a category both words belong to is
 * the strongest signal; everyday words beat rare ones; the trail's theme nudges a little.
 * @returns {{id: string, word: string, p: number, why: string}[]}
 */
function predictHumanAnswers(lex, idsA, idsB, theme, allowed, tuning) {
  const scored = [];
  for (const h of lex.concepts.values()) {
    if (!allowed(h)) continue;
    const fA = thoughtFrom(lex, idsA, h), fB = thoughtFrom(lex, idsB, h);
    let joint = idsA.length && idsB.length ? Math.sqrt(fA * fB) : 0.5 * Math.max(fA, fB);
    // A sideways swap for one prompt (SISTER → BROTHER, APPLE → ORANGE: the same kind of thing)
    // is not a connection; people rarely give one unless the other word suggests it too.
    const lateral = isSideways(lex, idsA, idsB, h);
    if (lateral) joint *= 0.5;
    const category = sharedCategory(lex, idsA, idsB, h);
    if (category) joint = 1 - (1 - joint) * (1 - category);
    if (joint <= 0) continue;
    const score = joint * commonness(h) * (1 + 0.25 * theme(h));
    const why = category ? `both are kinds of ${h.label}` : `first thoughts: ${fA.toFixed(2)} / ${fB.toFixed(2)}${lateral ? " (sideways swap, halved)" : ""}`;
    scored.push({id: h.id, word: h.label, score, why});
  }
  scored.sort((x, y) => y.score - x.score || x.word.localeCompare(y.word));
  const top = scored.slice(0, tuning.predictions);
  const total = top.reduce((sum, item) => sum + item.score ** 2, 0) || 1;
  return top.map(({id, word, score, why}) => ({id, word, p: score ** 2 / total, why}));
}

/**
 * Independent paths from one prompt to a candidate, not passing through the other prompt or
 * the candidate itself: a shared neighbour counts 2 (prompt → x → candidate), a neighbour of a
 * neighbour counts 1 (prompt → x → y → candidate). Used only by the broadened fallback tier.
 */
function pathCount(lex, promptIds, candidate, avoid) {
  let best = 0;
  for (const promptId of promptIds) {
    const prompt = lex.concepts.get(promptId);
    if (!prompt || prompt.id === candidate.id) continue;
    let paths = 0;
    for (const x of prompt.near) {
      if (avoid.has(x) || x === candidate.id) continue;
      if (candidate.near.has(x)) { paths += 2; continue; }
      const middle = lex.concepts.get(x);
      for (const y of candidate.near) if (y !== x && !avoid.has(y) && middle.near.has(y)) { paths += 1; break; }
    }
    best = Math.max(best, paths);
  }
  return best;
}

/** Concept ids for a typed word: as typed, then its base forms ("running" → run), then a confident spelling fix. */
const spellerCache = new Map();
function resolvePrompt(lex, word, language) {
  const direct = lex.resolveAll(word);
  if (direct.length) return direct;
  for (const key of lemmaKeys(word, language)) {
    const ids = lex.resolveAll(key);
    if (ids.length) return ids;
  }
  if (!spellerCache.has(language)) spellerCache.set(language, createSpeller(lex.words));
  const fixed = spellerCache.get(language).suggest(word);
  return fixed ? lex.resolveAll(fixed) : [];
}

/** Concept ids seen in recent rounds → how many rounds ago (1 = the round just revealed). */
function recentConcepts(lex, history) {
  const ago = new Map();
  history.slice().reverse().forEach((round, i) => {
    for (const word of round) for (const id of lex.resolveAll(word)) if (!ago.has(id)) ago.set(id, i + 1);
  });
  return ago;
}

const lemmaCache = new Map();
function cachedLemmas(label, language) {
  const key = `${language}:${label}`;
  if (!lemmaCache.has(key)) lemmaCache.set(key, lemmaKeys(label, language));
  return lemmaCache.get(key);
}

/**
 * Score every candidate for these exact prompts. Returns all candidates (best first) with every
 * part of their score, the predicted human answers and the trail theme, so callers, tests and
 * the developer diagnostics can see exactly why a word won or was rejected.
 * @param {{prompts: string[], language?: Language, excludeKeys?: Set<string>, history?: string[][], tuning?: typeof BOT_TUNING, rng?: () => number}} options
 */
export function rankCandidates({prompts, language = "en", excludeKeys = new Set(), history = [], tuning = BOT_TUNING, rng}) {
  const lex = getLexicon(language);
  const list = (Array.isArray(prompts) ? prompts : []).slice(0, 2).map(p => String(p ?? ""));
  const [idsA = [], idsB = []] = list.map(p => resolvePrompt(lex, p, language));
  const promptIds = new Set([...idsA, ...idsB]);
  const promptKeys = new Set(list.map(wordKey).filter(Boolean));
  // Never answer with a word already in the game, or a grammatical variant of one (or of a prompt).
  const blocked = new Set();
  for (const word of [...list, ...excludeKeys]) for (const key of lemmaKeys(word, language)) blocked.add(key);
  const ago = recentConcepts(lex, history);
  const allowed = candidate => !promptIds.has(candidate.id)
    && !isExcluded(candidate.key, promptKeys) && !isExcluded(candidate.key, excludeKeys)
    && ![...cachedLemmas(candidate.label, language)].some(key => blocked.has(key))
    && ago.get(candidate.id) !== 1; // the concept the trail just left: no orbiting back
  const {theme, words: themeWords} = trailTheme(lex, history, tuning);
  const predicted = predictHumanAnswers(lex, idsA, idsB, theme, allowed, tuning);
  const predictedConcepts = predicted.map(h => ({concept: lex.concepts.get(h.id), p: h.p}));
  const w = tuning.weights;
  const ranked = [];
  for (const candidate of lex.concepts.values()) {
    if (!allowed(candidate)) continue;
    const roundsAgo = ago.get(candidate.id);
    const a = sideRelation(lex, idsA, candidate), b = sideRelation(lex, idsB, candidate);
    const pathsA = pathCount(lex, idsA, candidate, promptIds), pathsB = pathCount(lex, idsB, candidate, promptIds);
    if (a.strength + b.strength <= 0 && pathsA + pathsB <= 0) continue;
    const weakest = Math.min(a.strength, b.strength), strongest = Math.max(a.strength, b.strength), average = (a.strength + b.strength) / 2;
    // 1. Likely-human-answer: how close this word is to what the player will probably type.
    //    A sideways swap (MOUSE for DOG + CAT: one more of the same kind, not what they share)
    //    keeps the game going without bringing the players closer, so it counts for less.
    const sideways = isSideways(lex, idsA, idsB, candidate);
    const humanRaw = predictedConcepts.reduce((sum, h) => sum + h.p * similarity(candidate, h.concept), 0) * (sideways ? 0.6 : 1);
    // 2. Fit to both current words (the weaker side counts most).
    const fit = 0.6 * weakest + 0.4 * average;
    // 3. Semantic centre: balanced between the two words, and on the trail's emerging theme.
    const balance = strongest > 0 ? weakest / strongest : 0;
    const onTheme = theme(candidate);
    const centre = 0.55 * balance + 0.45 * onTheme;
    const recency = tuning.recency.find(([from, to]) => roundsAgo !== undefined && roundsAgo >= from && roundsAgo <= to);
    // A piece of a prompt word ("snow" for "snowman") or a word built on one is a lazy answer.
    const contained = [...promptKeys].some(key => key.length >= 3 && candidate.key.length >= 3 && (key.includes(candidate.key) || candidate.key.includes(key)));
    const penalty = (recency ? recency[2] : 0) + (contained ? tuning.containedPenalty : 0);
    // Tiers (see BOT_TUNING): every tier needs a relationship to EACH prompt, and a strong side never
    // carries a weak one (strong to one word + one shared neighbour of the other is never enough).
    const passes = a.strength >= tuning.minPerSide && b.strength >= tuning.minPerSide;
    // Lopsided (the FACE-for-SOCKS+EYE pattern): direct to one word, under the bar for the other. Never eligible.
    const lopsided = strongest >= tuning.directStrength && weakest < tuning.minPerSide;
    const relaxed = weakest >= tuning.relaxedPerSide && weakest >= tuning.relaxedBalance * strongest;
    const wide = weakest >= tuning.relaxedPerSide && weakest >= tuning.wideBalance * strongest;
    const category = weakest >= tuning.categoryPerSide && weakest >= tuning.categoryBalance * strongest && strongest < tuning.directStrength;
    const minPaths = Math.min(pathsA, pathsB), maxPaths = Math.max(pathsA, pathsB);
    const paths = minPaths >= tuning.minPaths && minPaths >= tuning.pathBalance * maxPaths;
    ranked.push({word: candidate.label, id: candidate.id, a: a.strength, b: b.strength, pathsA, pathsB, weakest, average,
      humanRaw, human: 0, fit, centre, balance, theme: onTheme, sideways, personality: 0, penalty, score: 0,
      passes, lopsided, tier: passes ? 1 : lopsided ? 0 : relaxed ? 2 : wide ? 3 : category ? 4 : paths ? 5 : 0});
  }
  // Likely-human-answer is relative: the candidate closest to the predicted answers scores 1.
  const bestHuman = ranked.reduce((max, item) => Math.max(max, item.humanRaw), 0) || 1;
  for (const item of ranked) {
    item.human = item.humanRaw / bestHuman;
    // Personality only ever separates near-ties: 5% of the total at most.
    item.personality = rng ? rng() : 0.5;
    item.score = w.human * item.human + w.fit * item.fit + w.centre * item.centre + w.personality * item.personality - item.penalty;
  }
  ranked.sort((x, y) => y.score - x.score || x.word.localeCompare(y.word));
  return {ranked, predicted, themeWords, knownA: idsA.length > 0, knownB: idsB.length > 0};
}

/** First move: no prompts yet, so pick a friendly, well-connected word at random. */
// Openings set the mood of a whole game, so they skip spooky or sad concepts.
const GLOOMY_OPENINGS = new Set(["nightmare", "scary", "fear", "ghost", "monster", "haunted_house", "skeleton", "zombie", "witch", "spider", "snake", "shark", "sad", "angry", "cry", "storm", "volcano", "dark"]);

/**
 * @param {{language?: Language, excludeKeys?: Set<string>, rng?: () => number}} options
 * @returns {BotPick}
 */
export function chooseOpening({language = "en", excludeKeys = new Set(), rng = Math.random}) {
  const lex = getLexicon(language);
  const pool = [...lex.concepts.values()].filter(c => c.links.size >= 7 && !c.label.includes(" ") && !GLOOMY_OPENINGS.has(c.id) && !isExcluded(c.key, excludeKeys));
  const fallback = [...lex.concepts.values()].filter(c => !isExcluded(c.key, excludeKeys));
  const list = pool.length ? pool : fallback;
  if (!list.length) throw new Error("No words left for the bot");
  return {word: list[Math.floor(rng() * list.length)].label, quality: "opening"};
}

/**
 * @typedef {{word: string, total: number, human: number, fit: number, centre: number, personality: number, penalty: number, sides: [number, number], sideways: boolean, tier: number}} ScoredCandidate
 * @typedef {{pair: [string, string], language: Language, trail: string[], predicted: {word: string, p: number, why: string}[], candidates: ScoredCandidate[], selected: string, reason: string, quality: import("./types.js").BotQuality, weights: typeof BOT_TUNING.weights}} GaryDecision
 */

const round3 = x => Math.round(x * 1000) / 1000;

/** Why this word won, in a sentence (for the developer diagnostics). */
function explain(pick, predicted, lex, tierNote) {
  const parts = [];
  const top = predicted[0];
  const self = predicted.find(h => h.id === pick.id);
  if (self && self === top) parts.push(`most likely human answer (${Math.round(top.p * 100)}%: ${top.why})`);
  else if (self) parts.push(`predicted human answer #${predicted.indexOf(self) + 1} (${Math.round(self.p * 100)}%)`);
  else if (top) {
    const near = predicted.filter(h => similarity(lex.concepts.get(pick.id), lex.concepts.get(h.id)) >= 0.45).map(h => h.word.toUpperCase());
    parts.push(near.length ? `closest available word to the predicted answers ${near.slice(0, 3).join(", ")}` : `no predicted answer available; best remaining fit`);
  }
  parts.push(`fits both words ${pick.a.toFixed(2)} / ${pick.b.toFixed(2)}`);
  if (pick.theme >= 0.3) parts.push(`on the trail's theme (${pick.theme.toFixed(2)})`);
  if (tierNote) parts.push(tierNote);
  return parts.join("; ");
}

/**
 * Choose exactly one word for these exact two prompts, aiming to meet the player in the middle:
 * the word with the best chance that both players say the same thing now or on the next move.
 * The answer must still relate to BOTH prompts on its own; this is an invariant, not a preference.
 *  tier 1 (strong): both sides ≥ minPerSide. The best-ranked candidate wins.
 *  tier 2–5 (quality "loose"): bounded fallbacks, both prompts still related, best-ranked wins.
 * A one-sided word is never returned for two known prompts. The single exception is a prompt
 * that means nothing to the game's vocabulary (nonsense, one letter): no relationship to it can
 * exist, so Gary answers from the known prompt. Gary still sends exactly one word.
 * With `explain: true` the result carries the full decision (see GaryDecision).
 * @param {{prompts: [string, string] | string[], language?: Language, excludeKeys?: Set<string>, history?: string[][], rng?: () => number, tuning?: typeof BOT_TUNING, explain?: boolean}} options
 * @returns {BotPick & {decision?: GaryDecision}}
 */
export function chooseResponse({prompts, language = "en", excludeKeys = new Set(), history = [], rng = Math.random, tuning = BOT_TUNING, explain: wantExplain = false}) {
  const {ranked, predicted, themeWords, knownA, knownB} = rankCandidates({prompts, language, excludeKeys, history, tuning, rng});
  const lex = getLexicon(language);
  const tier = n => ranked.filter(item => item.tier === n);
  /** @type {{pick: any, quality: import("./types.js").BotQuality, note: string} | null} */
  let choice = null;
  const strong = tier(1);
  if (strong.length) choice = {pick: strong[0], quality: "strong", note: ""};
  for (const n of [2, 3, 4]) if (!choice && tier(n).length) choice = {pick: tier(n)[0], quality: "loose", note: `fallback tier ${n}: no word links both strongly`};
  if (!choice && tier(5).length && knownA && knownB) choice = {pick: tier(5)[0], quality: "loose", note: "fallback tier 5: linked through two-step paths"};
  // Only reachable when a prompt is unknown to the vocabulary: nothing can relate to it.
  if (!choice && ranked.length && (!knownA || !knownB)) {
    const known = ranked.slice().sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b) || y.score - x.score);
    choice = {pick: known[0], quality: "loose", note: "one prompt is unknown to the game; answered from the other"};
  }
  if (!choice) {
    const balanced = ranked.filter(item => !item.lopsided && item.pathsA > 0 && item.pathsB > 0);
    if (balanced.length) choice = {pick: balanced[0], quality: "loose", note: "last resort: balanced paths"};
  }
  if (!choice) {
    const list = (Array.isArray(prompts) ? prompts : []).map(p => wordKey(String(p ?? ""))).filter(Boolean);
    const opening = chooseOpening({language, excludeKeys: new Set([...excludeKeys, ...list]), rng});
    return {...opening, quality: "loose"};
  }
  /** @type {BotPick} */
  const result = {word: choice.pick.word, quality: choice.quality};
  if (!wantExplain) return result;
  const pair = /** @type {[string, string]} */ ((Array.isArray(prompts) ? prompts : []).slice(0, 2).map(p => String(p ?? "")));
  /** @type {GaryDecision} */
  const decision = {
    pair,
    language,
    trail: themeWords,
    predicted: predicted.map(h => ({word: h.word, p: round3(h.p), why: h.why})),
    candidates: ranked.filter(item => item.tier > 0).slice(0, 12).map(item => ({
      word: item.word, total: round3(item.score), human: round3(item.human), fit: round3(item.fit), centre: round3(item.centre),
      personality: round3(item.personality), penalty: round3(item.penalty), sides: [round3(item.a), round3(item.b)], sideways: item.sideways, tier: item.tier
    })),
    selected: choice.pick.word,
    reason: explain(choice.pick, predicted, lex, choice.note),
    quality: choice.quality,
    weights: tuning.weights
  };
  return {...result, decision};
}
