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
 * Tuning for the bot's answer (one place, so a future difficulty setting can adjust it).
 * Objective: "what single word would an ordinary person most likely think of after seeing
 * these exact two words?" — an answer that meets the player, not one that impresses them.
 */
export const BOT_TUNING = {
  /** Each prompt must independently relate at least this strongly (0..1), or the candidate is rejected. */
  minPerSide: 0.45,
  weights: {weakest: 0.40, human: 0.30, average: 0.15, obvious: 0.10, novelty: 0.05},
  /** Weighted pick among the best few (after quality filtering). */
  pick: [0.55, 0.30, 0.15],
  /** Only candidates within this share of the best score make the shortlist. */
  shortlistRatio: 0.85,
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
  minPaths: 2,
  pathBalance: 0.4,
  /** Last resort for two known prompts: paths from both, weaker count ≥ this share of the stronger. */
  lastBalance: 0.3
};

/**
 * How strongly a candidate relates to one prompt (which may stand for several concepts,
 * e.g. both halves of "firetruck"), and how likely a person is to think of it from that prompt.
 *  strength 1.0 phrase + link, .95 common phrase/compound ("snow" + "ball"), .9 the prompt's own
 *  list names it, .8 the candidate's list names the prompt, .55/.45/.25 three/two/one shared
 *  neighbours, .1 only a common tag.
 */
function sideRelation(lex, promptIds, candidate) {
  let best = {strength: 0, human: 0};
  for (const promptId of promptIds) {
    const prompt = lex.concepts.get(promptId);
    if (!prompt || prompt.id === candidate.id) continue;
    const phrase = prompt.phrases.has(candidate.id), link = prompt.links.has(candidate.id);
    const outRank = prompt.out.get(candidate.id), named = outRank !== undefined, namedBack = candidate.out.has(prompt.id);
    let shared = 0;
    for (const neighbour of candidate.near) if (prompt.near.has(neighbour)) shared++;
    const commonTag = candidate.tags.some(tag => prompt.tags.includes(tag));
    const strength = phrase && link ? 1 : phrase ? 0.95 : named ? 0.9 : namedBack ? 0.8
      : shared >= 3 ? 0.55 : shared === 2 ? 0.45 : shared === 1 ? 0.25 : commonTag ? 0.1 : 0;
    // Words a curator listed first for this prompt are what people say first.
    const human = named ? Math.max(0.6, 1 - outRank * 0.04) : phrase ? 0.85 : namedBack ? 0.65
      : shared >= 3 ? 0.35 : shared === 2 ? 0.25 : shared === 1 ? 0.1 : 0;
    if (strength > best.strength || (strength === best.strength && human > best.human)) best = {strength, human};
  }
  return best;
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
 * Score every candidate for these exact prompts. Returns all candidates (best first) with their
 * parts, so callers and tests can see why a word won or was rejected.
 * @param {{prompts: string[], language?: Language, excludeKeys?: Set<string>, history?: string[][], tuning?: typeof BOT_TUNING}} options
 */
export function rankCandidates({prompts, language = "en", excludeKeys = new Set(), history = [], tuning = BOT_TUNING}) {
  const lex = getLexicon(language);
  const list = (Array.isArray(prompts) ? prompts : []).slice(0, 2).map(p => String(p ?? ""));
  const [idsA = [], idsB = []] = list.map(p => resolvePrompt(lex, p, language));
  const promptIds = new Set([...idsA, ...idsB]);
  const promptKeys = new Set(list.map(wordKey).filter(Boolean));
  // Never answer with a word already in the game, or a grammatical variant of one (or of a prompt).
  const blocked = new Set();
  for (const word of [...list, ...excludeKeys]) for (const key of lemmaKeys(word, language)) blocked.add(key);
  const ago = recentConcepts(lex, history);
  const w = tuning.weights;
  const ranked = [];
  for (const candidate of lex.concepts.values()) {
    if (promptIds.has(candidate.id)) continue;
    if (isExcluded(candidate.key, promptKeys) || isExcluded(candidate.key, excludeKeys)) continue;
    if ([...cachedLemmas(candidate.label, language)].some(key => blocked.has(key))) continue;
    const roundsAgo = ago.get(candidate.id);
    if (roundsAgo === 1) continue; // the concept the trail just left: no orbiting back
    const a = sideRelation(lex, idsA, candidate), b = sideRelation(lex, idsB, candidate);
    const pathsA = pathCount(lex, idsA, candidate, promptIds), pathsB = pathCount(lex, idsB, candidate, promptIds);
    if (a.strength + b.strength <= 0 && pathsA + pathsB <= 0) continue;
    const weakest = Math.min(a.strength, b.strength), average = (a.strength + b.strength) / 2;
    const familiarity = Math.min(1, candidate.links.size / 10);
    const human = ((a.human + b.human) / 2) * (0.75 + 0.25 * familiarity);
    const obvious = Math.max(0, (candidate.label.includes(" ") ? 0.65 : 1) - (candidate.label.length > 9 ? 0.2 : 0));
    const recency = tuning.recency.find(([from, to]) => roundsAgo !== undefined && roundsAgo >= from && roundsAgo <= to);
    const novelty = recency ? 1 - recency[2] * 4 : 1;
    // A piece of a prompt word ("snow" for "snowman") or a word built on one is a lazy answer.
    const contained = [...promptKeys].some(key => key.length >= 3 && candidate.key.length >= 3 && (key.includes(candidate.key) || candidate.key.includes(key)));
    const score = weakest * w.weakest + human * w.human + average * w.average + obvious * w.obvious + Math.max(0, novelty) * w.novelty
      - (recency ? recency[2] : 0) - (contained ? tuning.containedPenalty : 0);
    const passes = a.strength >= tuning.minPerSide && b.strength >= tuning.minPerSide;
    const relaxed = weakest >= tuning.relaxedPerSide && weakest >= tuning.relaxedBalance * Math.max(a.strength, b.strength);
    const minPaths = Math.min(pathsA, pathsB), maxPaths = Math.max(pathsA, pathsB);
    const broadened = minPaths >= tuning.minPaths && minPaths >= tuning.pathBalance * maxPaths;
    ranked.push({word: candidate.label, id: candidate.id, a: a.strength, b: b.strength, pathsA, pathsB, weakest, average, human, obvious, novelty, score,
      passes, tier: passes ? 1 : relaxed ? 2 : broadened ? 3 : 0});
  }
  ranked.sort((x, y) => y.score - x.score || x.word.localeCompare(y.word));
  return {ranked, knownA: idsA.length > 0, knownB: idsB.length > 0};
}

/** Weighted pick among the best few: top 55%, second 30%, third 15% (renormalised if fewer). */
function pickFromShortlist(items, rng, tuning) {
  const top = items[0].score;
  const shortlist = items.filter(item => item.score >= top * tuning.shortlistRatio).slice(0, tuning.pick.length);
  const weights = tuning.pick.slice(0, shortlist.length);
  const total = weights.reduce((sum, x) => sum + x, 0);
  let roll = rng() * total;
  for (let i = 0; i < shortlist.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return shortlist[i];
  }
  return shortlist[shortlist.length - 1];
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
 * Choose exactly one word for these exact two prompts. The answer must relate to BOTH prompts on
 * its own; this is an invariant, not a preference.
 *  tier 1 (strong): both sides ≥ minPerSide. Weighted pick (55/30/15) among the best few.
 *  tier 2 (relaxed, quality "loose"): both sides ≥ relaxedPerSide and balanced.
 *  tier 3 (broadened, "loose"): enough independent two/three-step paths from each prompt, balanced.
 *  then: the candidate with the most balanced paths from both prompts (both > 0).
 * A one-sided word is never returned for two known prompts. The single exception is a prompt
 * that means nothing to the game's vocabulary (nonsense, one letter): no relationship to it can
 * exist, so the bot answers from the known prompt. Gary still sends exactly one word.
 * @param {{prompts: [string, string] | string[], language?: Language, excludeKeys?: Set<string>, history?: string[][], rng?: () => number, tuning?: typeof BOT_TUNING}} options
 * @returns {BotPick}
 */
export function chooseResponse({prompts, language = "en", excludeKeys = new Set(), history = [], rng = Math.random, tuning = BOT_TUNING}) {
  const {ranked, knownA, knownB} = rankCandidates({prompts, language, excludeKeys, history, tuning});
  const tier = n => ranked.filter(item => item.tier === n);
  const strong = tier(1);
  if (strong.length) return {word: pickFromShortlist(strong, rng, tuning).word, quality: "strong"};
  const relaxed = tier(2);
  if (relaxed.length) return {word: pickFromShortlist(relaxed, rng, tuning).word, quality: "loose"};
  const byPaths = items => items.map(item => ({...item, score: Math.min(item.pathsA, item.pathsB) + item.score / 10})).sort((x, y) => y.score - x.score);
  const broadened = tier(3);
  if (broadened.length) return {word: pickFromShortlist(byPaths(broadened), rng, tuning).word, quality: "loose"};
  if (knownA && knownB) {
    const twoSided = ranked.filter(item => item.pathsA > 0 && item.pathsB > 0 && Math.min(item.pathsA, item.pathsB) >= tuning.lastBalance * Math.max(item.pathsA, item.pathsB));
    if (twoSided.length) return {word: pickFromShortlist(byPaths(twoSided), rng, tuning).word, quality: "loose"};
  }
  // Only reachable when a prompt is unknown to the vocabulary (or the graph has no route at all).
  if (ranked.length && (!knownA || !knownB)) {
    const known = ranked.slice().sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b) || y.score - x.score);
    return {word: pickFromShortlist(known.map(item => ({...item, score: Math.max(item.a, item.b)})), rng, tuning).word, quality: "loose"};
  }
  const list = (Array.isArray(prompts) ? prompts : []).map(p => wordKey(String(p ?? ""))).filter(Boolean);
  return {...chooseOpening({language, excludeKeys: new Set([...excludeKeys, ...list]), rng}), quality: "loose"};
}
