// @ts-check
// Input understanding: what concept a typed word stands for, and how sure we are.
//
// Used by the Solo engine (both words of the revealed pair) and by the browser's "Did you mean?"
// prompt, so the game and the bot read a player's word the same way. Steps, first hit wins:
//   exact       the word, or a synonym/variant listed in the lexicon (alias)
//   plural      a plural of a known word (twigs → twig)
//   morphology  an inflection the game's own rules know (surfing → surf, rode → ride; src/shared/morph.js)
//   derived     a known word plus a derivational ending (snowy → snow)
//   compound    two known words written together or apart (birdnest → bird + nest)
//   fuzzy       a typing slip of a known word (battelship → battleship, chikcen → chicken)
//   component   an unknown longer word ending in a known one (dragonship → ship), low confidence
//   unresolved  nothing above
// Spacing never matters (sea horse = seahorse) and neither do case, accents or apostrophes:
// comparison keys drop them (src/shared/words.js wordKey).
//
// Fuzzy matching is conservative so it never "corrects" a real word into another one:
//   - only words of 4+ letters, never a word the speller already knows as a real word
//   - edit distance 1 (2 for 8+ letters, keeping the first two letters), one unique closest concept
//   - "high" confidence for a typical slip (swapped neighbours, a letter left out or doubled, a
//     sound-alike letter); "medium" for any other single change after the first letter, or two
//     changes in a long word

import {getLexicon} from "./lexicon/index.js";
import {lemmaKeys} from "./morph.js";
import {cleanWord, editDistance, wordKey} from "./words.js";

/**
 * @typedef {"exact" | "plural" | "morphology" | "derived" | "compound" | "fuzzy" | "component" | "unresolved"} UnderstandMethod
 * @typedef {"certain" | "high" | "medium" | "low"} Confidence
 * @typedef {{input: string, normalized: string, key: string, ids: string[], method: UnderstandMethod, via: string | null,
 *   confidence: Confidence | null, spacing: boolean, morphology: boolean, fuzzy: boolean, unresolved: boolean}} Understanding
 */

const SOUND_ALIKE = [/^[aeiouy]{2}$/, /^[sz]{2}$/, /^[ck]{2}$/, /^[cs]{2}$/, /^[kq]{2}$/, /^[gj]{2}$/, /^[fv]{2}$/, /^[mn]{2}$/];
const soundAlike = (x, y) => SOUND_ALIKE.some(re => re.test(x + y));

/** A typical slip: neighbours swapped, a letter left out (not the first), a letter doubled, or a sound-alike letter. */
export function isTypicalSlip(typed, target) {
  if (typed.length === target.length) {
    const diff = [];
    for (let i = 0; i < typed.length; i++) if (typed[i] !== target[i]) diff.push(i);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && typed[diff[0]] === target[diff[1]] && typed[diff[1]] === target[diff[0]]) return true;
    return diff.length === 1 && diff[0] > 0 && soundAlike(typed[diff[0]], target[diff[0]]);
  }
  if (typed.length + 1 === target.length) {
    for (let i = 1; i < target.length; i++) if (target.slice(0, i) + target.slice(i + 1) === typed) return true;
    return false;
  }
  if (typed.length === target.length + 1) {
    for (let i = 0; i < typed.length; i++) {
      if (typed.slice(0, i) + typed.slice(i + 1) === target && (typed[i] === typed[i - 1] || typed[i] === typed[i + 1])) return true;
    }
  }
  return false;
}

const fuzzyIndexes = new Map();
/** Every key a typed word can be corrected to (concept labels and aliases), by length, with its display word. */
function fuzzyIndex(lex) {
  const id = `${lex.language}:${lex.dataset}`;
  if (fuzzyIndexes.has(id)) return fuzzyIndexes.get(id);
  const byLength = new Map();
  const add = (key, concept, display) => {
    if (key.length < 3) return;
    if (!byLength.has(key.length)) byLength.set(key.length, []);
    byLength.get(key.length).push({key, concept, display});
  };
  for (const [key, concept] of lex.byKey) add(key, concept, lex.concepts.get(concept).label);
  for (const [key, concept] of lex.aliases) add(key, concept, lex.aliasWords?.get(key) || lex.concepts.get(concept).label);
  fuzzyIndexes.set(id, byLength);
  return byLength;
}

/**
 * The closest known word to a typed key, or null. Conservative (see the header).
 * @returns {{concept: string, display: string, distance: number, confidence: "high" | "medium"} | null}
 */
export function fuzzyMatch(lex, key) {
  if (key.length < 4) return null;
  const limit = key.length >= 8 ? 2 : 1;
  const byLength = fuzzyIndex(lex);
  let best = limit + 1, found = [];
  for (let length = key.length - limit; length <= key.length + limit; length++) {
    for (const entry of byLength.get(length) || []) {
      const distance = editDistance(key, entry.key, Math.min(limit, best));
      if (distance < best) { best = distance; found = [entry]; }
      else if (distance === best) found.push(entry);
    }
  }
  if (best > limit || !found.length) return null;
  // Several spellings of the same concept are fine; two different concepts are a guess.
  const concepts = new Set(found.map(f => f.concept));
  if (concepts.size !== 1) return null;
  const match = found.find(f => lex.byKey.get(f.key) === f.concept) || found[0];
  if (best === 1) {
    if (isTypicalSlip(key, match.key)) return {concept: match.concept, display: match.display, distance: 1, confidence: "high"};
    // Any other single change: never the first letter, and only for 5+ letters.
    if (key[0] !== match.key[0] || key.length < 5) return null;
    return {concept: match.concept, display: match.display, distance: 1, confidence: "medium"};
  }
  if (match.key.slice(0, 2) !== key.slice(0, 2)) return null;
  return {concept: match.concept, display: match.display, distance: 2, confidence: "medium"};
}

/** A rough sound-alike spelling: ph→f, ck/c/q→k (c before e/i/y → s), z→s, doubled letters once. */
export function phoneticKey(key) {
  return key.replace(/ph/g, "f").replace(/ck/g, "k").replace(/c(?=[eiy])/g, "s").replace(/[cq]/g, "k").replace(/z/g, "s").replace(/x/g, "ks").replace(/(.)\1+/g, "$1");
}
const phoneticIndexes = new Map();
/** A known word spelled the way it sounds ("elefant" → elephant, "jiraffe" no), same first letter, unique. */
function phoneticMatch(lex, key) {
  if (key.length < 5) return null;
  const id = `${lex.language}:${lex.dataset}`;
  if (!phoneticIndexes.has(id)) {
    const index = new Map();
    for (const [k, concept] of [...lex.byKey, ...lex.aliases]) {
      const p = phoneticKey(k);
      if (!index.has(p)) index.set(p, new Map());
      index.get(p).set(concept, lex.byKey.has(k) ? lex.concepts.get(concept).label : lex.aliasWords?.get(k) || lex.concepts.get(concept).label);
    }
    phoneticIndexes.set(id, index);
  }
  const hits = phoneticIndexes.get(id).get(phoneticKey(key));
  if (!hits || hits.size !== 1) return null;
  const [[concept, display]] = [...hits];
  if (wordKey(display)[0] !== key[0]) return null;
  return {concept, display, distance: 0, confidence: /** @type {"high"} */ ("high")};
}

/**
 * What a typed word stands for in the game's word graph.
 * @param {unknown} raw
 * @param {string} [language]
 * @param {any} [lex]
 * @returns {Understanding}
 */
export function understandWord(raw, language = "en", lex = getLexicon(language)) {
  const normalized = cleanWord(raw);
  const key = wordKey(raw);
  /** @type {Understanding} */
  const out = {input: String(raw ?? ""), normalized, key, ids: [], method: "unresolved", via: null, confidence: null, spacing: false, morphology: false, fuzzy: false, unresolved: true};
  if (!key) return out;
  const done = (ids, method, confidence, extra = {}) => {
    const label = ids.map(id => lex.concepts.get(id)?.label).filter(Boolean);
    // Spacing differs from the concept's own spelling ("sea horse" for seahorse, "birdnest" for bird nest).
    const spaced = /[\s-]/.test(normalized), conceptSpaced = label.length === 1 && /[\s-]/.test(label[0]);
    return Object.assign(out, {ids, method, confidence, via: label.join(" + ") || null, unresolved: false,
      spacing: method === "compound" ? !spaced : label.length === 1 && spaced !== conceptSpaced}, extra);
  };
  if (lex.byKey.has(key)) return done([lex.byKey.get(key)], "exact", "certain");
  if (lex.aliases.has(key)) return done([lex.aliases.get(key)], "exact", "certain");
  const plural = lex.exact(key);
  if (plural) return done([plural], "plural", "certain", {morphology: true});
  for (const lemma of lemmaKeys(raw, lex.language)) {
    if (lemma === key) continue;
    const id = lex.exact(lemma);
    if (id) return done([id], "morphology", "certain", {morphology: true});
  }
  const resolved = lex.resolveAll(raw);
  if (resolved.length === 2) return done(resolved, "compound", "high");
  const real = Boolean(lex.vocabulary?.has(key));
  // A real word is understood as itself ("snowy" → snow); a non-word is first checked for a typing
  // slip ("surfin" → surfing) before a looser guess from its first letters.
  if (resolved.length === 1 && real) return done(resolved, "derived", "high", {morphology: true});
  // A real word the speller knows is never corrected into another one ("draft" stays draft).
  if (!real) {
    const fuzzy = fuzzyMatch(lex, key) || phoneticMatch(lex, key);
    if (fuzzy) return done([fuzzy.concept], "fuzzy", fuzzy.confidence, {fuzzy: true, via: fuzzy.display});
  }
  if (resolved.length === 1) return done(resolved, "derived", "medium", {morphology: true});
  // An unknown longer word ending in a known word of 4+ letters: its head ("dragonfort" → fort).
  if (key.length >= 7) {
    for (let cut = 3; cut <= key.length - 4; cut++) {
      const tail = key.slice(cut);
      if (tail.length / key.length < 0.5) break;
      const id = lex.exact(tail);
      if (id) return done([id], "component", "low");
    }
  }
  return out;
}

/**
 * A spelling suggestion for the "Did you mean?" prompt: only when the typed word is not understood
 * as it is and a known word is a confident match.
 * @returns {{word: string, confidence: "high" | "medium"} | null}
 */
export function correctionFor(raw, language = "en", lex = getLexicon(language)) {
  const u = understandWord(raw, language, lex);
  if (u.method !== "fuzzy" || !u.via) return null;
  return {word: u.via, confidence: /** @type {"high" | "medium"} */ (u.confidence)};
}
