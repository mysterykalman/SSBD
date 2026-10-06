// Word cleaning, comparison and validation shared by the server, the browser
// and the Solo bot. The "display" form keeps what the player typed (minus
// stray punctuation); the "key" form is what we compare.

export const MAX_WORD_LENGTH = 24;
export const MAX_WORD_PARTS = 3;

const EDGE_PUNCTUATION = /^[\s"'“”‘’«»`.,!?¿¡;:()[\]{}*_~-]+|[\s"'“”‘’«»`.,!?¿¡;:()[\]{}*_~-]+$/gu;
const ALLOWED = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;

/** Friendly display form: trimmed, single spaces, straight apostrophes, no edge punctuation. */
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

/** Comparison key: case, accents, spaces, hyphens and apostrophes do not matter. */
export function wordKey(raw) {
  return cleanWord(raw)
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s'\-]+/g, "");
}

export function sameWord(a, b) {
  const left = wordKey(a);
  return left !== "" && left === wordKey(b);
}

/**
 * Validate one submitted word.
 * Returns {ok:true, word, key} or {ok:false, code, word}.
 * Codes: EMPTY, TOO_LONG, INVALID_CHARACTERS, TOO_SHORT, TOO_MANY_WORDS.
 */
export function validateWord(raw) {
  const word = cleanWord(raw);
  if (!word) return {ok: false, code: "EMPTY", word};
  if (word.length > MAX_WORD_LENGTH) return {ok: false, code: "TOO_LONG", word};
  if (!ALLOWED.test(word)) return {ok: false, code: "INVALID_CHARACTERS", word};
  const key = wordKey(word);
  if (key.length < 2) return {ok: false, code: "TOO_SHORT", word};
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

/**
 * Build a speller from a list of known display words.
 * suggest(raw) returns a display word only when we are confident:
 * the input is unknown, and exactly one known word is closest within the
 * allowed distance (1 edit, or 2 edits for words of 7+ letters).
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
      // Simple plurals and accent-free spellings of known words are fine as typed.
      if (isPluralOfKnown(key, byKey)) return null;
      const limit = key.length >= 7 ? 2 : 1;
      let best = limit + 1, found = [];
      for (let length = key.length - limit; length <= key.length + limit; length++) {
        for (const candidate of byLength.get(length) || []) {
          const distance = editDistance(key, candidate, Math.min(limit, best));
          if (distance < best) { best = distance; found = [candidate]; }
          else if (distance === best) found.push(candidate);
        }
      }
      if (best > limit || found.length !== 1) return null;
      // Two-edit suggestions must keep the first letter; that is where kids rarely slip.
      if (best === 2 && found[0][0] !== key[0]) return null;
      return byKey.get(found[0]);
    }
  };
}
