// Turns the curated concept list into a per-language lookup graph.

import {CONCEPTS} from "./data.js";
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
    concepts.set(id, {id, label: lang === "fr" ? fr : en, key: wordKey(lang === "fr" ? fr : en), tags, links: new Set()});
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
  const byKey = new Map();
  for (const concept of concepts.values()) if (!byKey.has(concept.key)) byKey.set(concept.key, concept.id);
  const knownKeys = [...byKey.keys()].sort((x, y) => y.length - x.length);

  /** Map a typed word to a concept id, trying plurals and compound parts. */
  function resolve(raw) {
    const key = wordKey(raw);
    if (!key) return null;
    if (byKey.has(key)) return byKey.get(key);
    for (const [ending, replacement] of PLURAL_ENDINGS[lang]) {
      if (key.length > ending.length + 2 && key.endsWith(ending)) {
        const stem = key.slice(0, -ending.length) + replacement;
        if (byKey.has(stem)) return byKey.get(stem);
      }
    }
    // Compounds such as "sunflower" or "nightmare": use the longest known start or end.
    for (const known of knownKeys) {
      if (known.length < 3 || known.length >= key.length) continue;
      if (key.startsWith(known) || key.endsWith(known)) return byKey.get(known);
    }
    return null;
  }

  const words = [...concepts.values()].map(c => c.label).concat(EXTRA_WORDS[lang] || []);
  return {language: lang, labelIndex, concepts, byKey, resolve, words};
}
