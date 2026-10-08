// @ts-check
// The Solo bot. It only ever sees the two prompt words and the words already
// revealed in this game; it never sees the player's word for the move it is
// choosing for.

import {getLexicon} from "./lexicon/index.js";

/**
 * Engine-1 is retired (Solo uses src/shared/engine.js). It stays for replays and its own tests, frozen
 * on the last dataset it was validated against, so newer vocabulary never changes its behaviour.
 */
export const ENGINE1_DATASET = "lexicon-2";
import {lemmaKeys} from "./morph.js";
import {createSpeller, wordKey} from "./words.js";
import {hashString} from "./rules.js";

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
   * Ranking weights (sum to 1). The objective is "what will the player most likely type?", so the
   * human term leads; fit and centre are tie-breakers that must not overturn a clear human-likelihood
   * lead (they started at 30% / 15% and did: KID beat GAME for SISTER + PLAY on structure alone).
   *  human        similarity to the predicted human answers (probability-weighted)
   *  fit          semantic fit to both current words (the weaker side counts most)
   *  centre       convergence toward the semantic centre: balanced between the two words, and
   *               on the theme the recent trail is building (history informs, never dominates)
   *  personality  Gary's whim: only ever breaks near-ties. Derived from the game state itself (the
   *               words on the table, the trail, the words used), so the same state always gets the
   *               same word, while a different context can tip a different near-tie.
   */
  weights: {human: 0.70, fit: 0.15, centre: 0.10, personality: 0.05},
  /**
   * Likely-human-answer = P(the human types exactly this word now) + nextTurn × closeness to the
   * other predicted answers (a near miss still sets up a match on the following move, but it is
   * worth much less than meeting now).
   */
  nextTurn: 0.4,
  /**
   * Human first, as a rule rather than a weight: only candidates whose likely-human-answer score is
   * within this margin of the best one (after the game's own penalties) are contenders. Fit, centre
   * and personality only choose among contenders, so they can never overturn a clear human lead.
   */
  humanMargin: 0.1,
  /**
   * Both words must matter. Per-word support (0..1, from the current pair only, never the trail):
   *  weakSideSupport >= strong      no penalty
   *  acceptable .. strong           a small penalty (only decides near-ties)
   *  oneSided .. acceptable         a meaningful penalty
   *  < oneSided                     near-zero: one word is functionally irrelevant. Not allowed to win,
   *                                 unless it leads human likelihood by `oneSidedLead` and no candidate
   *                                 with better support is reasonably human-likely (`reasonableHuman`).
   *  imbalance > imbalanceMax with weakSideSupport < imbalanceWeak: an extra strongly-one-sided penalty.
   * A lazy decomposition (BOX for SANDBOX, BED for BEDTIME) is rejected outright unless the OTHER word
   * supports it independently (>= lazyOtherSupport). Set `supportRules: false` for the previous model.
   */
  supportRules: true,
  support: {strong: 0.40, acceptable: 0.25, oneSided: 0.15, smallPenalty: 0.02, weakPenalty: 0.12,
    imbalanceMax: 0.60, imbalanceWeak: 0.20, imbalancePenalty: 0.15, oneSidedLead: 0.30, reasonableHuman: 0.50, lazyOtherSupport: 0.25},
  /** First-thought strength at which the other word stops holding a candidate answer back (generate-and-check). */
  plausible: 0.3,
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
 * Per-word support: how meaningfully one current word, on its own, connects to a candidate (0..1).
 *  1.00 the candidate is the word's category (DOG → PET) or a phrase + link
 *  .90  a common phrase ("snow" + "ball")    .90–.60 the word's own first-thought list names it (by rank)
 *  .75  the candidate is a kind of the word   .65 the candidate's list names the word
 *  .40  three shared neighbours               .25 two shared neighbours (weak but recognizable)
 *  .10  one shared neighbour (technically explainable only)   .05 only a common tag   0 nothing
 * Computed from the current word only: the trail never raises it. An unknown word supports nothing.
 */
function wordSupport(lex, promptIds, candidate) {
  let best = 0;
  for (const promptId of promptIds) {
    const prompt = lex.concepts.get(promptId);
    if (!prompt || prompt.id === candidate.id) continue;
    let value;
    const rank = prompt.out.get(candidate.id);
    if (prompt.kinds.has(candidate.id) || (prompt.phrases.has(candidate.id) && prompt.links.has(candidate.id))) value = 1;
    else if (prompt.phrases.has(candidate.id)) value = 0.9;
    else if (rank !== undefined) value = Math.max(0.6, 0.9 - rank * 0.03);
    else if (candidate.kinds.has(prompt.id)) value = 0.75;
    else if (candidate.out.has(prompt.id) || prompt.links.has(candidate.id)) value = 0.65;
    else {
      let shared = 0;
      for (const neighbour of candidate.near) if (prompt.near.has(neighbour)) shared++;
      value = shared >= 3 ? 0.4 : shared === 2 ? 0.25 : shared === 1 ? 0.1 : candidate.tags.some(tag => prompt.tags.includes(tag)) ? 0.05 : 0;
    }
    best = Math.max(best, value);
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
/**
 * How people answer: they think of a strong first association of EITHER word, then keep it if it
 * is at least plausible for the other (`plausible` is the strength at which the other side no
 * longer holds it back). A word the other side doesn't suggest at all scores 0. This does not
 * reward balance for its own sake: GAME for SISTER + PLAY counts as PLAY's first thought that a
 * sister plausibly fits, not as a weak "average" of the two.
 */
function generateAndCheck(fA, fB, tuning) {
  const strong = Math.max(fA, fB), weak = Math.min(fA, fB);
  if (weak <= 0) return 0;
  return strong * Math.sqrt(Math.min(1, weak / tuning.plausible));
}

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

/** Word-graph distance (links, phrases and categories), capped: 0 same word, 1 linked, 2 one word apart… */
const MAX_HOPS = 4;
const hopCache = new Map();
export function hops(lex, from, to) {
  if (from === to) return 0;
  const key = `${lex.language}:${from}`;
  let dist = hopCache.get(key);
  if (!dist) {
    dist = new Map([[from, 0]]);
    let frontier = [from];
    for (let d = 1; d < MAX_HOPS && frontier.length; d++) {
      const next = [];
      for (const id of frontier) for (const n of lex.concepts.get(id)?.near || []) if (!dist.has(n)) { dist.set(n, d); next.push(n); }
      frontier = next;
    }
    hopCache.set(key, dist);
  }
  return dist.get(to) ?? MAX_HOPS;
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
    let joint = idsA.length && idsB.length ? generateAndCheck(fA, fB, tuning) : 0.5 * Math.max(fA, fB);
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
 * `dataset` pins a lexicon version (the replay tool runs this engine on the data it shipped with).
 * @param {{prompts: string[], language?: Language, excludeKeys?: Set<string>, history?: string[][], tuning?: typeof BOT_TUNING, dataset?: string}} options
 */
export function rankCandidates({prompts, language = "en", excludeKeys = new Set(), history = [], tuning = BOT_TUNING, dataset = ENGINE1_DATASET}) {
  const lex = getLexicon(language, dataset);
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
  // The same prediction without the trail: what the trail adds is reported separately, and the
  // trail-free numbers decide whether a one-sided word could ever win (the trail can't rescue it).
  const plain = predictHumanAnswers(lex, idsA, idsB, () => 0, allowed, tuning).map(h => ({concept: lex.concepts.get(h.id), p: h.p}));
  const humanFrom = (list, candidate, sideways) => list.reduce((sum, h) => sum + h.p * (h.concept.id === candidate.id ? 1 : tuning.nextTurn * similarity(candidate, h.concept)), 0) * (sideways ? 0.6 : 1);
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
    const humanRaw = humanFrom(predictedConcepts, candidate, sideways);
    const humanPlainRaw = humanFrom(plain, candidate, sideways);
    // Per-word support from the current pair only (see wordSupport).
    const supportA = wordSupport(lex, idsA, candidate), supportB = wordSupport(lex, idsB, candidate);
    const weakSide = Math.min(supportA, supportB), imbalance = Math.abs(supportA - supportB);
    // Convergence distance: expected word-graph hops from this word to the human's answer.
    const after = predictedConcepts.reduce((sum, h) => sum + h.p * hops(lex, candidate.id, h.concept.id), 0);
    // 2. Fit to both current words (the weaker side counts most).
    const fit = 0.6 * weakest + 0.4 * average;
    // 3. Semantic centre: balanced between the two words, and on the trail's emerging theme.
    const balance = strongest > 0 ? weakest / strongest : 0;
    const onTheme = theme(candidate);
    const centre = 0.55 * balance + 0.45 * onTheme;
    const recency = tuning.recency.find(([from, to]) => roundsAgo !== undefined && roundsAgo >= from && roundsAgo <= to);
    // A piece of a prompt word ("snow" for "snowman") or a word built on one is a lazy answer.
    const contained = [...promptKeys].some(key => key.length >= 3 && candidate.key.length >= 3 && (key.includes(candidate.key) || candidate.key.includes(key)));
    // Lazy decomposition: the candidate is a piece (substring, token, prefix, suffix) of one current
    // word (BOX in SANDBOX). It is only acceptable when the OTHER word supports it on its own.
    const [keyA, keyB] = list.map(wordKey);
    const pieceOf = key => Boolean(key) && key.length > candidate.key.length && candidate.key.length >= 2 && key.includes(candidate.key);
    const lazyFrom = pieceOf(keyA) ? "a" : pieceOf(keyB) ? "b" : null;
    // When the other word is itself the rest of that compound (SAND + SANDBOX → BOX), its "support"
    // only comes through the compound, so the candidate is a pure leftover and never counts as supported.
    const otherKey = lazyFrom === "a" ? keyB : keyA, compoundKey = lazyFrom === "a" ? keyA : keyB;
    const leftover = Boolean(lazyFrom) && Boolean(otherKey) && otherKey.length >= 2 && compoundKey.includes(otherKey);
    const lazyOther = !lazyFrom ? 1 : leftover ? 0 : lazyFrom === "a" ? supportB : supportA;
    const lazyReject = tuning.supportRules && Boolean(lazyFrom) && lazyOther < tuning.support.lazyOtherSupport;
    const lazyPenalty = contained ? tuning.containedPenalty : 0;
    const penalty = (recency ? recency[2] : 0) + lazyPenalty;
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
      humanRaw, humanPlainRaw, human: 0, humanPlain: 0, fit, centre, balance, theme: onTheme, sideways, after, personality: 0, penalty, score: 0, contender: false,
      supportA, supportB, weakSide, imbalance, lazyFrom, lazyOther, lazyReject, lazyPenalty, supportPenalty: 0, trail: 0, viable: true, rejectedBecause: "",
      passes, lopsided, tier: passes ? 1 : lopsided ? 0 : relaxed ? 2 : wide ? 3 : category ? 4 : paths ? 5 : 0});
  }
  // Before Gary moves, the players are as far apart as the two words on the table (their last words).
  let before = MAX_HOPS;
  for (const a of idsA) for (const b of idsB) before = Math.min(before, hops(lex, a, b));
  // Everything Gary may look at, as one key: the same complete state always gives the same whims.
  const stateKey = [language, ...list.map(wordKey), "|", ...history.map(round => round.map(wordKey).join("+")), "|", ...[...excludeKeys].sort()].join(" ");
  // Likely-human-answer is relative: the candidate closest to the predicted answers scores 1.
  const bestHuman = ranked.reduce((max, item) => Math.max(max, item.humanRaw), 0) || 1;
  const bestPlain = ranked.reduce((max, item) => Math.max(max, item.humanPlainRaw), 0) || 1;
  const sup = tuning.support;
  for (const item of ranked) {
    item.human = item.humanRaw / bestHuman;
    item.humanPlain = item.humanPlainRaw / bestPlain;
    // Personality only ever separates near-ties: 5% of the total at most, fixed by the state.
    item.personality = hashString(`${stateKey}|${item.id}`) / 4294967296;
    // Both words must matter: a tie-quality penalty for weak support on one side (never enough on its
    // own to beat a clearly more human answer; see the contender rule below).
    if (tuning.supportRules) {
      item.supportPenalty = item.weakSide >= sup.strong ? 0 : item.weakSide >= sup.acceptable ? sup.smallPenalty : sup.weakPenalty;
      if (item.imbalance > sup.imbalanceMax && item.weakSide < sup.imbalanceWeak) item.supportPenalty += sup.imbalancePenalty;
    }
    item.score = w.human * item.human + w.fit * item.fit + w.centre * item.centre + w.personality * item.personality - item.penalty - item.supportPenalty;
    // What the trail added: its pull on the human prediction and its share of the semantic centre.
    item.trail = w.human * (item.human - item.humanPlain) + w.centre * 0.45 * item.theme;
  }
  // Viability (current pair only; the trail and personality play no part). A lazy decomposition the
  // other word doesn't support can't win. A near-zero one-sided word can't win either, unless it leads
  // the trail-free human likelihood by a wide margin and nothing better supported is reasonably likely.
  const tiers = new Map();
  for (const item of ranked) (tiers.get(item.tier) || tiers.set(item.tier, []).get(item.tier)).push(item);
  for (const group of tiers.values()) {
    for (const item of group) {
      if (!tuning.supportRules) continue;
      if (item.lazyReject) {
        item.viable = false;
        item.rejectedBecause = `lazy: a piece of ${list[item.lazyFrom === "a" ? 0 : 1].toUpperCase()}, and ${list[item.lazyFrom === "a" ? 1 : 0].toUpperCase()} supports it only ${item.lazyOther.toFixed(2)}`;
        continue;
      }
      if (item.weakSide >= sup.oneSided) continue;
      const others = group.filter(x => x !== item && !x.lazyReject);
      const lead = item.humanPlain - Math.max(0, ...others.map(x => x.humanPlain));
      const betterSupported = others.some(x => x.weakSide > item.weakSide && x.weakSide >= sup.oneSided && x.humanPlain >= sup.reasonableHuman);
      if (lead >= sup.oneSidedLead && !betterSupported) continue; // the documented exception
      item.viable = false;
      const [weakName, strongName] = item.supportA <= item.supportB ? [list[0], list[1]] : [list[1], list[0]];
      item.rejectedBecause = `one-sided: ${weakName.toUpperCase()} support only ${Math.min(item.supportA, item.supportB).toFixed(2)} vs ${strongName.toUpperCase()} ${Math.max(item.supportA, item.supportB).toFixed(2)}`;
    }
    // Contenders: viable, and within humanMargin of the most human-likely viable candidate of the tier
    // (counting the game's own lazy/recency penalties, never the support penalties: support only ever
    // breaks near-ties, it never overturns a clearly more human answer).
    const effectiveHuman = item => item.human - item.penalty / w.human;
    const viable = group.filter(item => item.viable);
    const best = Math.max(-Infinity, ...viable.map(effectiveHuman));
    for (const item of group) item.contender = item.viable && effectiveHuman(item) >= best - tuning.humanMargin;
  }
  // Order: contenders by score; then other viable words by score; then words that can't win. When a
  // tier has nothing viable at all (every word is one-sided), the best-supported weak side goes first,
  // then the most independent two-step paths to the weaker word, ignoring trail and personality:
  // Gary must answer something, and it should touch both words as much as the data allows.
  ranked.sort((x, y) => Number(y.contender) - Number(x.contender) || Number(y.viable) - Number(x.viable) || Number(x.lazyReject) - Number(y.lazyReject)
    || (x.viable ? y.score - x.score : y.weakSide - x.weakSide || (y.supportA + y.supportB) - (x.supportA + x.supportB) || y.humanPlain - x.humanPlain
      || Math.min(y.pathsA, y.pathsB) - Math.min(x.pathsA, x.pathsB))
    || x.word.localeCompare(y.word));
  return {ranked, predicted, themeWords, before, knownA: idsA.length > 0, knownB: idsB.length > 0};
}

/** First move: no prompts yet, so pick a friendly, well-connected word at random. */
// Openings set the mood of a whole game, so they skip spooky or sad concepts.
const GLOOMY_OPENINGS = new Set(["nightmare", "scary", "fear", "ghost", "monster", "haunted_house", "skeleton", "zombie", "witch", "spider", "snake", "shark", "sad", "angry", "cry", "storm", "volcano", "dark"]);

/**
 * @param {{language?: Language, excludeKeys?: Set<string>, rng?: () => number, dataset?: string}} options
 * @returns {BotPick}
 */
export function chooseOpening({language = "en", excludeKeys = new Set(), rng = Math.random, dataset = ENGINE1_DATASET}) {
  const lex = getLexicon(language, dataset);
  const pool = [...lex.concepts.values()].filter(c => c.links.size >= 7 && !c.label.includes(" ") && !GLOOMY_OPENINGS.has(c.id) && !isExcluded(c.key, excludeKeys));
  const fallback = [...lex.concepts.values()].filter(c => !isExcluded(c.key, excludeKeys));
  const list = pool.length ? pool : fallback;
  if (!list.length) throw new Error("No words left for the bot");
  return {word: list[Math.floor(rng() * list.length)].label, quality: "opening"};
}

/**
 * @typedef {{word: string, total: number, human: number, fit: number, centre: number, personality: number, penalty: number, sides: [number, number], sideways: boolean, after: number, contender: boolean, tier: number,
 *   supportA: number, supportB: number, weakSide: number, imbalance: number, trail: number, personalityPart: number, lazyPenalty: number, supportPenalty: number, viable: boolean, rejected: string}} ScoredCandidate
 * @typedef {{pair: [string, string], language: Language, trail: string[], predicted: {word: string, p: number, why: string}[], candidates: ScoredCandidate[], selected: string, reason: string, beat: string, explanations: string[], distance: {before: number, after: number}, quality: import("./types.js").BotQuality, weights: typeof BOT_TUNING.weights}} GaryDecision
 */

const round3 = x => Math.round(x * 1000) / 1000;

/**
 * Why candidate #1 beat candidate #2, term by term (weighted, so the numbers add up to the margin).
 * e.g. "GAME beat FAMILY by +0.041 because human-likelihood +0.035 and personality +0.022
 * outweighed FAMILY's dual-word fit advantage 0.015".
 */
export function beatLine(first, second, weights) {
  const A = first.word.toUpperCase();
  if (!second) return `${A} had no eligible rival`;
  const B = second.word.toUpperCase();
  /** @type {[string, number][]} */
  const terms = [
    ["human-likelihood", weights.human * (first.human - second.human)],
    ["dual-word fit", weights.fit * (first.fit - second.fit)],
    ["semantic centre", weights.centre * (first.centre - second.centre)],
    ["personality", weights.personality * (first.personality - second.personality)],
    ["penalties", second.penalty - first.penalty],
    ["weak-side support", second.supportPenalty - first.supportPenalty]
  ];
  const margin = first.score - second.score;
  const fmt = v => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(3)}`;
  const pros = terms.filter(([, v]) => v > 0.0005).sort((x, y) => y[1] - x[1]);
  const cons = terms.filter(([, v]) => v < -0.0005).sort((x, y) => x[1] - y[1]);
  const ahead = pros.map(([name, v]) => `${name} ${fmt(v)}`).join(" and ") || "a tie broken by name";
  if (!cons.length) return `${A} beat ${B} by ${fmt(margin)}: ahead on ${ahead}`;
  return `${A} beat ${B} by ${fmt(margin)} because ${ahead} outweighed ${B}'s ${cons.map(([name, v]) => `${name} advantage ${Math.abs(v).toFixed(3)}`).join(" and ")}`;
}

/**
 * Plain-English notes on the support rules for the diagnostics: likely words that could not win (and
 * why), and whether weak-side support settled a near-tie between #1 and #2.
 */
function supportExplanations(ranked, pick, runnerUp, pair) {
  const notes = [];
  const [wordA, wordB] = pair.map(word => word.toUpperCase());
  const notable = ranked.filter(item => item !== pick && !item.viable && (item.human >= 0.5 || item.score >= pick.score)).slice(0, 4);
  for (const item of notable) {
    const name = item.word.toUpperCase();
    if (item.lazyReject) {
      const [from, other] = item.lazyFrom === "a" ? [wordA, wordB] : [wordB, wordA];
      notes.push(`${name} was rejected as a lazy decomposition of ${from} because ${other} independently supported ${name} at only ${item.lazyOther.toFixed(2)}${item.lazyOther === 0 ? ` (${from} = ${other} + ${name})` : ""}.`);
    } else {
      const [weak, strong, weakValue, strongValue] = item.supportA <= item.supportB ? [wordA, wordB, item.supportA, item.supportB] : [wordB, wordA, item.supportB, item.supportA];
      notes.push(strongValue < 0.15
        ? `${name} was rejected because neither word really supports it (${wordA} ${item.supportA.toFixed(2)}, ${wordB} ${item.supportB.toFixed(2)}).`
        : `${name} was rejected because ${weak} support was only ${weakValue.toFixed(2)} despite ${strong} support of ${strongValue.toFixed(2)}.`);
    }
  }
  if (runnerUp && runnerUp.contender && Math.abs(pick.human - runnerUp.human) <= 0.1 && pick.weakSide > runnerUp.weakSide + 0.05) {
    notes.push(`${pick.word.toUpperCase()} beat ${runnerUp.word.toUpperCase()} because their human likelihood was within ${Math.abs(pick.human - runnerUp.human).toFixed(2)}, but ${pick.word.toUpperCase()} had stronger weak-side support: ${pick.weakSide.toFixed(2)} vs ${runnerUp.weakSide.toFixed(2)}.`);
  }
  if (!pick.viable) notes.push(`No candidate connected both words: ${pick.word.toUpperCase()} was the best-supported option (weak side ${pick.weakSide.toFixed(2)}).`);
  return notes;
}

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
 * @param {{prompts: [string, string] | string[], language?: Language, excludeKeys?: Set<string>, history?: string[][], rng?: () => number, tuning?: typeof BOT_TUNING, explain?: boolean, dataset?: string}} options
 * @returns {BotPick & {decision?: GaryDecision}}
 */
export function chooseResponse({prompts, language = "en", excludeKeys = new Set(), history = [], rng = Math.random, tuning = BOT_TUNING, explain: wantExplain = false, dataset = ENGINE1_DATASET}) {
  // rng is only used for an opening or last-resort word; a decision about words on the table is a
  // pure function of the game state.
  const {ranked, predicted, themeWords, before, knownA, knownB} = rankCandidates({prompts, language, excludeKeys, history, tuning, dataset});
  const lex = getLexicon(language, dataset);
  const tier = n => ranked.filter(item => item.tier === n);
  /** @type {{pick: any, runnerUp: any, rivals: number, quality: import("./types.js").BotQuality, note: string} | null} */
  let choice = null;
  const from = (pool, quality, note) => ({pick: pool[0], runnerUp: pool[1] || null, rivals: pool.filter(r => r.contender).length - 1, quality, note});
  // First pass: the best tier that has a word allowed to win (viable: not lazy, not one-sided).
  // Second pass, only if no tier has one: the original tier order (the best-supported weak bridge).
  const notes = {1: "", 2: "fallback tier 2: no word links both strongly", 3: "fallback tier 3: no word links both strongly", 4: "fallback tier 4: no word links both strongly", 5: "fallback tier 5: linked through two-step paths"};
  for (const n of [1, 2, 3, 4, 5]) {
    if (choice || (n === 5 && !(knownA && knownB))) continue;
    const pool = tier(n);
    if (pool.some(item => item.viable)) choice = from(pool, n === 1 ? "strong" : "loose", notes[n]);
  }
  // A lazy decomposition never wins, not even as a last resort, while any other word is left in any tier.
  const anyNotLazy = ranked.some(item => item.tier >= 1 && item.tier <= (knownA && knownB ? 5 : 4) && !item.lazyReject);
  const usable = pool => (anyNotLazy ? pool.filter(item => !item.lazyReject) : pool);
  const strong = usable(tier(1));
  if (!choice && strong.length) choice = from(strong, "strong", "");
  for (const n of [2, 3, 4]) if (!choice && usable(tier(n)).length) choice = from(usable(tier(n)), "loose", notes[n]);
  if (!choice && usable(tier(5)).length && knownA && knownB) choice = from(usable(tier(5)), "loose", notes[5]);
  // Only reachable when a prompt is unknown to the vocabulary: nothing can relate to it.
  if (!choice && ranked.length && (!knownA || !knownB)) {
    const known = ranked.slice().sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b) || y.score - x.score);
    choice = from(known, "loose", "one prompt is unknown to the game; answered from the other");
  }
  if (!choice) {
    const balanced = ranked.filter(item => !item.lopsided && item.pathsA > 0 && item.pathsB > 0);
    if (balanced.length) choice = from(balanced, "loose", "last resort: balanced paths");
  }
  if (!choice) {
    const list = (Array.isArray(prompts) ? prompts : []).map(p => wordKey(String(p ?? ""))).filter(Boolean);
    const opening = chooseOpening({language, excludeKeys: new Set([...excludeKeys, ...list]), rng, dataset});
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
    candidates: [...new Set([...ranked.filter(item => item.tier > 0).slice(0, 12), ...ranked.filter(item => !item.viable && (item.human >= 0.5 || item.score >= choice.pick.score)).slice(0, 4)])].map(item => ({
      word: item.word, total: round3(item.score), human: round3(item.human), fit: round3(item.fit), centre: round3(item.centre),
      personality: round3(item.personality), penalty: round3(item.penalty), sides: [round3(item.a), round3(item.b)], sideways: item.sideways, after: round3(item.after), contender: item.contender, tier: item.tier,
      supportA: round3(item.supportA), supportB: round3(item.supportB), weakSide: round3(item.weakSide), imbalance: round3(item.imbalance), trail: round3(item.trail),
      personalityPart: round3(tuning.weights.personality * item.personality), lazyPenalty: round3(item.lazyPenalty), supportPenalty: round3(item.supportPenalty), viable: item.viable, rejected: item.rejectedBecause
    })),
    selected: choice.pick.word,
    reason: explain(choice.pick, predicted, lex, choice.note),
    beat: choice.runnerUp && !choice.runnerUp.contender
      ? `${choice.pick.word.toUpperCase()} was the only word within ${tuning.humanMargin} of the most likely human answer; next best ${choice.runnerUp.word.toUpperCase()} trailed on human-likelihood by ${(choice.pick.human - choice.runnerUp.human).toFixed(3)}`
      : beatLine(choice.pick, choice.runnerUp, tuning.weights),
    explanations: supportExplanations(ranked, choice.pick, choice.runnerUp, pair),
    distance: {before: round3(before), after: round3(choice.pick.after)},
    quality: choice.quality,
    weights: tuning.weights
  };
  return {...result, decision};
}
