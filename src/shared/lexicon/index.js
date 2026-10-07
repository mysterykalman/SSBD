// Turns the curated concept list into a per-language lookup graph.

import {CONCEPTS, PHRASES} from "./data.js";
import {EXTRA_WORDS} from "./vocab.js";
import {wordKey} from "../words.js";

const cache = new Map();
const PLURAL_ENDINGS = {
  en: [["s", ""], ["es", ""], ["ies", "y"], ["ves", "f"]],
  fr: [["s", ""], ["x", ""], ["e", ""], ["es", ""], ["aux", "al"]]
};

export function getLexicon(language = "en") {
  const lang = language === "fr" ? "fr" : "en";
  if (!cache.has(lang)) cache.set(lang, buildLexicon(lang));
  return cache.get(lang);
}

function buildLexicon(lang) {
  const labelIndex = lang === "fr" ? 2 : 1;
  const concepts = new Map();
  for (const [id, en, fr, tags] of CONCEPTS) {
    concepts.set(id, {id, label: lang === "fr" ? fr : en, key: wordKey(lang === "fr" ? fr : en), tags, links: new Set(), phrases: new Set(), near: new Set()});
  }
  // Links are undirected.
  for (const row of CONCEPTS) {
    const [id, , , , links] = row;
    for (const other of links) {
      if (!concepts.has(other) || other === id) continue;
      concepts.get(id).links.add(other);
      concepts.get(other).links.add(id);
    }
  }
  // Phrases and compounds are language-specific ("snow" + "ball" in English,
  // "pomme" + "terre" in French) and undirected.
  for (const [a, b] of PHRASES[lang] || []) {
    if (!concepts.has(a) || !concepts.has(b) || a === b) continue;
    concepts.get(a).phrases.add(b);
    concepts.get(b).phrases.add(a);
  }
  // "near" = linked or phrase partner: used to count shared neighbours.
  for (const concept of concepts.values()) concept.near = new Set([...concept.links, ...concept.phrases]);
  const byKey = new Map();
  for (const concept of concepts.values()) if (!byKey.has(concept.key)) byKey.set(concept.key, concept.id);
  const knownKeys = [...byKey.keys()].sort((x, y) => y.length - x.length);

  function exact(key) {
    if (byKey.has(key)) return byKey.get(key);
    for (const [ending, replacement] of PLURAL_ENDINGS[lang]) {
      if (key.length > ending.length + 2 && key.endsWith(ending)) {
        const stem = key.slice(0, -ending.length) + replacement;
        if (byKey.has(stem)) return byKey.get(stem);
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
  return {language: lang, labelIndex, concepts, byKey, resolve, resolveAll, words};
}
