// The Solo bot. It only ever sees the two prompt words and the words already
// revealed in this game; it never sees the player's word for the move it is
// choosing for.

import {getLexicon} from "./lexicon/index.js";
import {wordKey} from "./words.js";

const TOP_CHOICES = 6;
const TEMPERATURE = 1.6;

function stems(key) {
  const out = [key];
  if (key.length > 3 && /[sx]$/.test(key)) out.push(key.slice(0, -1));
  return out;
}

function isExcluded(key, excludeKeys) {
  for (const k of stems(key)) if (excludeKeys.has(k) || excludeKeys.has(k + "s") || excludeKeys.has(k + "x")) return true;
  return false;
}

function relation(lex, promptId, candidate) {
  if (!promptId) return 0;
  const prompt = lex.concepts.get(promptId);
  if (prompt.id === candidate.id) return 0;
  let score = 0;
  if (prompt.links.has(candidate.id)) score += 6;
  let shared = 0;
  for (const neighbour of candidate.links) if (prompt.links.has(neighbour)) shared++;
  score += Math.min(4, shared * 1.25);
  const commonTags = candidate.tags.filter(tag => prompt.tags.includes(tag)).length;
  score += Math.min(2, commonTags);
  return score;
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
export function chooseOpening({language = "en", excludeKeys = new Set(), rng = Math.random}) {
  const lex = getLexicon(language);
  const pool = [...lex.concepts.values()].filter(c => c.links.size >= 7 && !c.label.includes(" ") && !isExcluded(c.key, excludeKeys));
  const fallback = [...lex.concepts.values()].filter(c => !isExcluded(c.key, excludeKeys));
  const list = pool.length ? pool : fallback;
  if (!list.length) throw new Error("No words left for the bot");
  return {word: list[Math.floor(rng() * list.length)].label, quality: "opening"};
}

/**
 * Choose a word that connects both prompts.
 * quality: "strong" when the word relates clearly to both prompts,
 *          "loose" when it only relates to one of them (or neither was known).
 */
export function chooseResponse({prompts, language = "en", excludeKeys = new Set(), rng = Math.random}) {
  const lex = getLexicon(language);
  const [idA, idB] = prompts.map(p => lex.resolve(p));
  const promptKeys = new Set(prompts.map(wordKey));
  const scored = [];
  for (const candidate of lex.concepts.values()) {
    if (candidate.id === idA || candidate.id === idB) continue;
    if (promptKeys.has(candidate.key) || isExcluded(candidate.key, excludeKeys)) continue;
    const a = relation(lex, idA, candidate), b = relation(lex, idB, candidate);
    if (a + b <= 0) continue;
    const both = a >= 3 && b >= 3;
    const score = a + b + (both ? 4 : 0) - Math.abs(a - b) * 0.35;
    scored.push({word: candidate.label, score, both});
  }
  scored.sort((x, y) => y.score - x.score);
  const strong = scored.filter(item => item.both);
  const shortlist = (strong.length ? strong : scored).slice(0, TOP_CHOICES);
  if (shortlist.length) {
    const pick = weightedPick(shortlist, rng);
    return {word: pick.word, quality: pick.both ? "strong" : "loose"};
  }
  return {...chooseOpening({language, excludeKeys: new Set([...excludeKeys, ...promptKeys]), rng}), quality: "loose"};
}
