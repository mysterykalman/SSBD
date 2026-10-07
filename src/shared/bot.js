// @ts-check
// The Solo bot. It only ever sees the two prompt words and the words already
// revealed in this game; it never sees the player's word for the move it is
// choosing for.

import {getLexicon} from "./lexicon/index.js";
import {wordKey} from "./words.js";

/**
 * @typedef {import("./types.js").BotPick} BotPick
 * @typedef {import("./types.js").Language} Language
 */

const TOP_CHOICES = 6;
const TEMPERATURE = 2.2;

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
 * How a candidate relates to one prompt (which may stand for several concepts,
 * e.g. both halves of "firetruck").
 * level 2: direct link or common phrase/compound ("snow" + "ball");
 * level 1: shares at least two neighbours (a clear shared concept);
 * level 0: at most a faint hint (one shared neighbour or a common tag).
 */
function relation(lex, promptIds, candidate) {
  let best = {score: 0, level: 0};
  for (const promptId of promptIds) {
    const prompt = lex.concepts.get(promptId);
    if (!prompt || prompt.id === candidate.id) continue;
    const link = prompt.links.has(candidate.id), phrase = prompt.phrases.has(candidate.id);
    let shared = 0;
    for (const neighbour of candidate.near) if (prompt.near.has(neighbour)) shared++;
    const commonTags = candidate.tags.filter(tag => prompt.tags.includes(tag)).length;
    const base = phrase && link ? 8 : phrase ? 7.5 : link ? 6 : 0;
    const score = base + Math.min(3, shared * 0.75) + Math.min(1, commonTags * 0.5);
    const level = base > 0 ? 2 : shared >= 2 ? 1 : 0;
    if (level > best.level || (level === best.level && score > best.score)) best = {score, level};
  }
  return best;
}

/** 3: direct on both sides; 2: direct + shared concept; 1: one-sided or two faint; 0: faint. */
function tierOf(a, b) {
  const hi = Math.max(a.level, b.level), lo = Math.min(a.level, b.level);
  if (hi === 2 && lo === 2) return 3;
  if (hi === 2 && lo === 1) return 2;
  if (hi === 2 || lo === 1) return 1;
  return 0;
}

function weightedPick(items, rng) {
  if (items.length === 1) return items[0];
  const top = items[0].score;
  const weights = items.map(item => Math.exp((item.score - top) / TEMPERATURE));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
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
 * Choose exactly one word that connects both prompts.
 * Candidates are ranked by tier first (see tierOf), so a one-sided word is only
 * used when no two-sided word is left, then by score with some seeded
 * randomness among the best few.
 * quality: "strong" when the word relates clearly to both prompts,
 *          "loose" when it only relates to one of them (or neither was known).
 * @param {{prompts: [string, string] | string[], language?: Language, excludeKeys?: Set<string>, rng?: () => number}} options
 * @returns {BotPick}
 */
export function chooseResponse({prompts, language = "en", excludeKeys = new Set(), rng = Math.random}) {
  const lex = getLexicon(language);
  const list = (Array.isArray(prompts) ? prompts : []).slice(0, 2).map(p => String(p ?? ""));
  const [idsA = [], idsB = []] = list.map(p => lex.resolveAll(p));
  const promptIds = new Set([...idsA, ...idsB]);
  const promptKeys = new Set(list.map(wordKey).filter(Boolean));
  const oneSided = !idsA.length || !idsB.length;
  const scored = [];
  if (promptIds.size) {
    for (const candidate of lex.concepts.values()) {
      if (promptIds.has(candidate.id)) continue;
      if (isExcluded(candidate.key, promptKeys) || isExcluded(candidate.key, excludeKeys)) continue;
      const a = relation(lex, idsA, candidate), b = relation(lex, idsB, candidate);
      if (a.score + b.score <= 0) continue;
      const tier = tierOf(a, b);
      // With one prompt unknown, rank by closeness to the known prompt alone.
      const score = oneSided ? a.score + b.score : a.score + b.score - Math.abs(a.score - b.score) * 0.25;
      scored.push({word: candidate.label, score, tier});
    }
  }
  if (scored.length) {
    const top = Math.max(...scored.map(item => item.tier));
    const shortlist = scored.filter(item => item.tier === top).sort((x, y) => y.score - x.score).slice(0, TOP_CHOICES);
    const pick = weightedPick(shortlist, rng);
    return {word: pick.word, quality: pick.tier >= 2 ? "strong" : "loose"};
  }
  return {...chooseOpening({language, excludeKeys: new Set([...excludeKeys, ...promptKeys]), rng}), quality: "loose"};
}
