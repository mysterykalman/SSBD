// @ts-check
// Word cleaning, comparison and validation shared by the server, the browser
// and the Solo bot. The "display" form keeps what the player typed (minus
// stray punctuation); the "key" form is what we compare.

/** @typedef {import("./types.js").WordCheck} WordCheck */

export const MAX_WORD_LENGTH = 24;
export const MAX_WORD_PARTS = 3;
/** One letter is enough: "s", "a", "I" and "é" are all playable. */
export const MIN_KEY_LENGTH = 1;

const EDGE_PUNCTUATION = /^[\s"'“”‘’«»`.,!?¿¡;:()[\]{}*_~-]+|[\s"'“”‘’«»`.,!?¿¡;:()[\]{}*_~-]+$/gu;
const ALLOWED = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

/**
 * Friendly display form: trimmed, single spaces, straight apostrophes, no edge punctuation.
 * @param {unknown} raw
 * @returns {string}
 */
export function cleanWord(raw) {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/[‘’`´]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(EDGE_PUNCTUATION, "")
    .replace(/\s*([-'])\s*/g, "$1")
    .trim();
}

/**
 * Comparison key: case, accents, spaces, hyphens and apostrophes do not matter.
 * @param {unknown} raw
 * @returns {string}
 */
export function wordKey(raw) {
  return cleanWord(raw)
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s'-]+/g, "");
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function sameWord(a, b) {
  const left = wordKey(a);
  return left !== "" && left === wordKey(b);
}

/**
 * Validate one submitted word.
 * Returns {ok:true, word, key} or {ok:false, code, word}.
 * Codes: EMPTY, TOO_LONG, INVALID_CHARACTERS, TOO_MANY_WORDS.
 *
 * A single letter ("s", "a", "I", "é") is a valid word: unusual input must not
 * block play. TOO_SHORT is no longer returned; it stays in the code lists of
 * the client and server only so older messages keep a translation.
 * @param {unknown} raw
 * @returns {WordCheck}
 */
export function validateWord(raw) {
  const word = cleanWord(raw);
  if (!word) return {ok: false, code: "EMPTY", word};
  if (word.length > MAX_WORD_LENGTH) return {ok: false, code: "TOO_LONG", word};
  if (!ALLOWED.test(word)) return {ok: false, code: "INVALID_CHARACTERS", word};
  const key = wordKey(word);
  // Only possible for input made of combining marks alone (no base letter).
  if (key.length < MIN_KEY_LENGTH) return {ok: false, code: "INVALID_CHARACTERS", word};
  if (word.split(" ").length > MAX_WORD_PARTS) return {ok: false, code: "TOO_MANY_WORDS", word};
  return {ok: true, word, key};
}

/** Optimal-string-alignment distance with an early exit once `limit` is exceeded. */
export function editDistance(a, b, limit = Infinity) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, rows[i - 2][j - 2] + 1);
      rows[i][j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > limit) return limit + 1;
  }
  return rows[a.length][b.length];
}

const PLURAL_ENDINGS = [["s", ""], ["x", ""], ["es", ""], ["ies", "y"], ["ves", "f"], ["aux", "al"]];

function isPluralOfKnown(key, byKey) {
  for (const [ending, replacement] of PLURAL_ENDINGS) {
    if (key.length > ending.length + 1 && key.endsWith(ending) && byKey.has(key.slice(0, -ending.length) + replacement)) return true;
  }
  return false;
}

// Letter swaps that sound alike, so they are likely slips rather than a different word.
const SOUND_ALIKE = [/^[aeiouy]{2}$/, /^[sz]{2}$/, /^[ck]{2}$/, /^[cs]{2}$/, /^[kq]{2}$/, /^[gj]{2}$/];
const soundAlike = (x, y) => SOUND_ALIKE.some(re => re.test(x + y));

/**
 * Is `candidate` one typical childhood slip away from `typed`?
 * Allowed: two neighbouring letters swapped, one letter left out, one letter
 * doubled by accident, or one sound-alike letter swapped (never the first letter).
 * Rejected: other one-letter changes, which usually make a different real word
 * ("draft" is not a typo for "raft", nor "stamp" for "swamp").
 */
function isTypicalSlip(typed, candidate) {
  if (typed.length === candidate.length) {
    const diff = [];
    for (let i = 0; i < typed.length; i++) if (typed[i] !== candidate[i]) diff.push(i);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && typed[diff[0]] === candidate[diff[1]] && typed[diff[1]] === candidate[diff[0]]) return true;
    return diff.length === 1 && diff[0] > 0 && typed.length >= 4 && soundAlike(typed[diff[0]], candidate[diff[0]]);
  }
  if (typed.length + 1 === candidate.length) {
    // A letter left out; never at the very start ("rain" is not "train").
    for (let i = 1; i < candidate.length; i++) if (candidate.slice(0, i) + candidate.slice(i + 1) === typed) return typed.length >= 4;
    return false;
  }
  if (typed.length === candidate.length + 1) {
    // One extra letter, only when it repeats its neighbour ("mooon", "chatteau").
    for (let i = 0; i < typed.length; i++) {
      if (typed.slice(0, i) + typed.slice(i + 1) === candidate) {
        if (typed[i] === typed[i - 1] || typed[i] === typed[i + 1]) return true;
      }
    }
  }
  return false;
}

function isInflectionOfKnown(key, byKey) {
  for (const ending of ["ed", "ing", "er", "est", "ly", "d"]) {
    if (key.length > ending.length + 2 && key.endsWith(ending)) {
      const stem = key.slice(0, -ending.length);
      if (byKey.has(stem) || byKey.has(stem + "e") || (stem.at(-1) === stem.at(-2) && byKey.has(stem.slice(0, -1)))) return true;
    }
  }
  return false;
}

/**
 * Build a speller from a list of known display words.
 * suggest(raw) returns a display word only when we are confident: the input is
 * unknown, it is not a plural or inflection of a known word, exactly one known
 * word is the closest match, and the difference is a typical slip (one slip for
 * shorter words; two slips, keeping the first two letters, for 8+ letters).
 */
export function createSpeller(words) {
  const byKey = new Map();
  for (const word of words) {
    const key = wordKey(word);
    if (key.length >= 2 && !byKey.has(key)) byKey.set(key, word);
  }
  const byLength = new Map();
  for (const key of byKey.keys()) {
    if (!byLength.has(key.length)) byLength.set(key.length, []);
    byLength.get(key.length).push(key);
  }
  return {
    has(raw) { return byKey.has(wordKey(raw)); },
    suggest(raw) {
      const key = wordKey(raw);
      if (key.length < 3 || byKey.has(key)) return null;
      // Simple plurals, inflections and accent-free spellings of known words are fine as typed.
      if (isPluralOfKnown(key, byKey) || isInflectionOfKnown(key, byKey)) return null;
      const limit = key.length >= 8 ? 2 : 1;
      let best = limit + 1, found = [];
      for (let length = key.length - limit; length <= key.length + limit; length++) {
        for (const candidate of byLength.get(length) || []) {
          const distance = editDistance(key, candidate, Math.min(limit, best));
          if (distance < best) { best = distance; found = [candidate]; }
          else if (distance === best) found.push(candidate);
        }
      }
      if (best > limit || found.length !== 1) return null;
      const match = found[0];
      if (best === 1 && !isTypicalSlip(key, match)) return null;
      if (best === 2 && match.slice(0, 2) !== key.slice(0, 2)) return null;
      return byKey.get(match);
    }
  };
}
