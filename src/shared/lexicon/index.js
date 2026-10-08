// Turns the curated concept list into a per-language lookup graph.

import {CATEGORIES, CONCEPTS, PHRASES} from "./data.js";
import {ADDED_CONCEPTS, ADDED_LINKS, ADDED_PHRASES, ALIASES, DATASET_VERSION} from "./additions.js";
import {EXTRA_WORDS} from "./vocab.js";
import {wordKey} from "../words.js";

const cache = new Map();
const PLURAL_ENDINGS = {
  en: [["s", ""], ["es", ""], ["ies", "y"], ["ves", "f"]],
  fr: [["s", ""], ["x", ""], ["e", ""], ["es", ""], ["aux", "al"]]
};

/** The original curated graph, kept so older engine decisions can be replayed on the data they used. */
export const BASE_DATASET = "lexicon-1";
export {DATASET_VERSION};

/**
 * The lookup graph for a language. `dataset` picks the data version (default: the current one);
 * "lexicon-1" is the original graph without the dataset-2 additions.
 */
export function getLexicon(language = "en", dataset = DATASET_VERSION) {
  const lang = language === "fr" ? "fr" : "en";
  const version = dataset === BASE_DATASET ? BASE_DATASET : DATASET_VERSION;
  const key = `${lang}:${version}`;
  if (!cache.has(key)) cache.set(key, buildLexicon(lang, version));
  return cache.get(key);
}

function buildLexicon(lang, version) {
  const labelIndex = lang === "fr" ? 2 : 1;
  const extended = version !== BASE_DATASET;
  const rows = extended ? [...CONCEPTS, ...ADDED_CONCEPTS] : CONCEPTS;
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
    for (const [a, b] of ADDED_LINKS) {
      if (!concepts.has(a) || !concepts.has(b) || a === b) continue;
      concepts.get(a).links.add(b);
      concepts.get(b).links.add(a);
    }
  }
  // Phrases and compounds are language-specific ("snow" + "ball" in English,
  // "pomme" + "terre" in French) and undirected.
  for (const [a, b] of [...(PHRASES[lang] || []), ...(extended ? ADDED_PHRASES[lang] || [] : [])]) {
    if (!concepts.has(a) || !concepts.has(b) || a === b) continue;
    concepts.get(a).phrases.add(b);
    concepts.get(b).phrases.add(a);
  }
  // "Is a kind of": `kinds` maps a concept to the categories it belongs to (with their weight),
  // `members` lists a category's members. Category and member also count as linked.
  for (const row of CATEGORIES) {
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
  if (extended) for (const [word, id] of Object.entries(ALIASES[lang] || {})) if (concepts.has(id) && !byKey.has(wordKey(word))) aliases.set(wordKey(word), id);
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
    for (let cut = key.length - 3; cut >= 3; cut--) {
      const head = exact(key.slice(0, cut)), tail = exact(key.slice(cut));
      if (head && tail && head !== tail) return [head, tail];
    }
    for (const known of knownKeys) {
      if (known.length < 3 || known.length >= key.length || known.length / key.length < 0.6) continue;
      if (key.startsWith(known) || key.endsWith(known)) return [byKey.get(known)];
    }
    return [];
  }

  /** The single best concept id for a typed word, or null. */
  function resolve(raw) {
    return resolveAll(raw)[0] ?? null;
  }

  const words = [...concepts.values()].map(c => c.label).concat(EXTRA_WORDS[lang] || []);
  return {language: lang, dataset: version, labelIndex, concepts, byKey, aliases, resolve, resolveAll, words};
}
