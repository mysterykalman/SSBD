// Turns the curated concept list into a per-language lookup graph.

import {CATEGORIES, CONCEPTS, PHRASES} from "./data.js";
import {ADDED_CONCEPTS, ADDED_LINKS, ADDED_PHRASES, ALIASES} from "./additions.js";
import {ADDED_CONCEPTS_3, ADDED_LINKS_3, ADDED_MEMBERS_3, ADDED_PHRASES_3, ALIASES_3, DATASET_VERSION as DATASET_3} from "./additions3.js";
import {ADDED_CONCEPTS_4, ADDED_LINKS_4, ADDED_MEMBERS_4, ADDED_PHRASES_4, ALIASES_4, DATASET_VERSION as DATASET_4, EXTRA_WORDS_4} from "./additions4.js";
import {ADDED_CONCEPTS_5, ADDED_LINKS_5, ADDED_PHRASES_5, ALIASES_5, DATASET_VERSION, EXTRA_WORDS_5} from "./additions5.js";
import {EXTRA_WORDS} from "./vocab.js";
import {wordKey} from "../words.js";

const cache = new Map();
const PLURAL_ENDINGS = {
  en: [["s", ""], ["es", ""], ["ies", "y"], ["ves", "f"]],
  fr: [["s", ""], ["x", ""], ["e", ""], ["es", ""], ["aux", "al"]]
};

const DERIVATIONAL = ["y", "ie", "ish", "ly", "ful", "less", "ness"];

/** The original curated graph, kept so older engine decisions can be replayed on the data they used. */
export const BASE_DATASET = "lexicon-1";
/** Every dataset version that can be loaded, oldest first (each one adds to the previous). */
export const DATASETS = [BASE_DATASET, "lexicon-2", DATASET_3, DATASET_4, DATASET_VERSION];
export {DATASET_VERSION};

/**
 * The lookup graph for a language. `dataset` picks the data version (default: the current one);
 * "lexicon-1" is the original graph, "lexicon-2" adds the first additions, "lexicon-3" the second,
 * "lexicon-4" the engine-2.3 vocabulary audit, "lexicon-5" the engine-2.5 everyday-word audit.
 */
export function getLexicon(language = "en", dataset = DATASET_VERSION) {
  const lang = language === "fr" ? "fr" : "en";
  const version = DATASETS.includes(dataset) ? dataset : DATASET_VERSION;
  const key = `${lang}:${version}`;
  if (!cache.has(key)) cache.set(key, buildLexicon(lang, version));
  return cache.get(key);
}

function buildLexicon(lang, version) {
  const labelIndex = lang === "fr" ? 2 : 1;
  const level = DATASETS.indexOf(version);
  const extended = level >= 1, third = level >= 2, fourth = level >= 3, fifth = level >= 4;
  const rows = [...CONCEPTS, ...(extended ? ADDED_CONCEPTS : []), ...(third ? ADDED_CONCEPTS_3 : []), ...(fourth ? ADDED_CONCEPTS_4 : []), ...(fifth ? ADDED_CONCEPTS_5 : [])];
  const concepts = new Map();
  for (const [id, en, fr, tags] of rows) {
    concepts.set(id, {id, label: lang === "fr" ? fr : en, key: wordKey(lang === "fr" ? fr : en), tags, links: new Set(), phrases: new Set(), near: new Set(), out: new Map(), kinds: new Map(), members: new Set()});
  }
  // Links are undirected.
  for (const row of rows) {
    const [id, , , , links] = row;
    // `out` keeps the curator's own ordered list for this concept: the words a person is most
    // likely to think of first when they see it (used as the bot's "human likelihood").
    /** @type {string[]} */ (links).forEach((other, rank) => { if (concepts.has(other) && other !== id) concepts.get(id).out.set(other, rank); });
    for (const other of links) {
      if (!concepts.has(other) || other === id) continue;
      concepts.get(id).links.add(other);
      concepts.get(other).links.add(id);
    }
  }
  if (extended) {
    for (const [a, b] of [...ADDED_LINKS, ...(third ? ADDED_LINKS_3 : []), ...(fourth ? ADDED_LINKS_4 : []), ...(fifth ? ADDED_LINKS_5 : [])]) {
      if (!concepts.has(a) || !concepts.has(b) || a === b) continue;
      concepts.get(a).links.add(b);
      concepts.get(b).links.add(a);
    }
  }
  // Phrases and compounds are language-specific ("snow" + "ball" in English,
  // "pomme" + "terre" in French) and undirected.
  for (const [a, b] of [...(PHRASES[lang] || []), ...(extended ? ADDED_PHRASES[lang] || [] : []), ...(third ? ADDED_PHRASES_3[lang] || [] : []), ...(fourth ? ADDED_PHRASES_4[lang] || [] : []), ...(fifth ? ADDED_PHRASES_5[lang] || [] : [])]) {
    if (!concepts.has(a) || !concepts.has(b) || a === b) continue;
    concepts.get(a).phrases.add(b);
    concepts.get(b).phrases.add(a);
  }
  // "Is a kind of": `kinds` maps a concept to the categories it belongs to (with their weight),
  // `members` lists a category's members. Category and member also count as linked.
  const weights = new Map(CATEGORIES.map(([category, weight]) => [category, weight]));
  const added = [...(third ? ADDED_MEMBERS_3 : []), ...(fourth ? ADDED_MEMBERS_4 : [])];
  const categoryRows = [...CATEGORIES, ...added.map(([category, members]) => [category, weights.get(category) ?? 0.8, members])];
  for (const row of categoryRows) {
    const [category, weight, members] = /** @type {[string, number, string[]]} */ (row);
    if (!concepts.has(category)) continue;
    for (const member of members) {
      if (!concepts.has(member) || member === category) continue;
      concepts.get(member).kinds.set(category, weight);
      concepts.get(category).members.add(member);
      concepts.get(member).links.add(category);
      concepts.get(category).links.add(member);
    }
  }
  // "near" = linked or phrase partner: used to count shared neighbours.
  for (const concept of concepts.values()) concept.near = new Set([...concept.links, ...concept.phrases]);
  const byKey = new Map();
  for (const concept of concepts.values()) if (!byKey.has(concept.key)) byKey.set(concept.key, concept.id);
  // Synonyms and variants: only where no concept already has that spelling.
  const aliases = new Map();
  const aliasRows = [...(extended ? Object.entries(ALIASES[lang] || {}) : []), ...(third ? Object.entries(ALIASES_3[lang] || {}) : []), ...(fourth ? Object.entries(ALIASES_4[lang] || {}) : []), ...(fifth ? Object.entries(ALIASES_5[lang] || {}) : [])];
  const aliasWords = new Map(); // key → the alias as written ("surfing"), for "Did you mean?"
  for (const [word, id] of aliasRows) {
    const k = wordKey(word.replace(/_/g, " "));
    if (concepts.has(id) && !byKey.has(k) && !aliases.has(k)) { aliases.set(k, id); aliasWords.set(k, word.replace(/_/g, " ")); }
  }
  // Real words the speller knows (graph labels and the everyday vocabulary): never split into
  // pieces or matched by a prefix ("carpet" is not car + pet, "sandal" is not sand).
  const vocabulary = new Set([...byKey.keys(), ...(EXTRA_WORDS[lang] || []).map(w => wordKey(w)), ...(fourth ? [...aliases.keys(), ...(EXTRA_WORDS_4[lang] || []).map(w => wordKey(w))] : []), ...(fifth ? (EXTRA_WORDS_5[lang] || []).map(w => wordKey(w)) : [])]);
  const knownKeys = [...byKey.keys()].sort((x, y) => y.length - x.length);

  function exact(key) {
    if (byKey.has(key)) return byKey.get(key);
    if (aliases.has(key)) return aliases.get(key);
    for (const [ending, replacement] of PLURAL_ENDINGS[lang]) {
      if (key.length > ending.length + 2 && key.endsWith(ending)) {
        const stem = key.slice(0, -ending.length) + replacement;
        if (byKey.has(stem)) return byKey.get(stem);
        if (aliases.has(stem)) return aliases.get(stem);
      }
    }
    return null;
  }

  /**
   * Map a typed word to the concept ids it stands for: one id for a known
   * word or plural; both parts for a compound of two known words ("firetruck",
   * "catfish"); the main part when it covers most of the word ("snowy").
   * Unknown words ("zorblax", one letter, "velvet") give an empty list rather
   * than a far-fetched guess.
   */
  function resolveAll(raw) {
    const key = wordKey(raw);
    if (!key) return [];
    const id = exact(key);
    if (id) return [id];
    // Plural phrases: "pommes de terre", "ice creams".
    const parts = String(raw).trim().toLowerCase().split(/[\s-]+/);
    if (parts.length > 1) {
      const singular = exact(wordKey(parts.map(part => part.length > 3 ? part.replace(/[sx]$/, "") : part).join(" ")));
      if (singular) return [singular];
    }
    if (key.length < 5) return [];
    // A real word is never split into pieces or matched by a piece of it ("carpet" is not car + pet),
    // except a known word plus a derivational ending ("snowy" → snow).
    const real = third && vocabulary.has(key);
    if (!real) {
      for (let cut = key.length - 3; cut >= 3; cut--) {
        const head = exact(key.slice(0, cut)), tail = exact(key.slice(cut));
        if (head && tail && head !== tail) return [head, tail];
      }
    }
    for (const known of knownKeys) {
      if (known.length < 3 || known.length >= key.length || known.length / key.length < 0.6) continue;
      if (real) {
        // A known word plus a derivational ending, also with the final consonant doubled (sunny → sun, foggy → fog).
        const rest = key.slice(known.length);
        const doubled = fourth && rest.length >= 2 && rest[0] === known[known.length - 1] && !"aeiou".includes(rest[0]) ? rest.slice(1) : null;
        if (key.startsWith(known) && (DERIVATIONAL.includes(rest) || (doubled && DERIVATIONAL.includes(doubled)))) return [byKey.get(known)];
      } else if (fourth ? known.length / key.length >= 0.7 && (key.startsWith(known) || key.endsWith(known)) : key.startsWith(known) || key.endsWith(known)) return [byKey.get(known)];
    }
    return [];
  }

  /** The single best concept id for a typed word, or null. */
  function resolve(raw) {
    return resolveAll(raw)[0] ?? null;
  }

  const words = [...concepts.values()].map(c => c.label).concat(EXTRA_WORDS[lang] || [], fourth ? EXTRA_WORDS_4[lang] || [] : [], fifth ? EXTRA_WORDS_5[lang] || [] : []);
  return {language: lang, dataset: version, labelIndex, concepts, byKey, aliases, aliasWords, vocabulary, exact, resolve, resolveAll, words};
}
