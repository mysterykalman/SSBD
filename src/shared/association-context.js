// @ts-check
// Shared semantic context for Solo (Gary/Milo).
//
// This intentionally sits above the curated association graph instead of replacing it. The current
// lexicon provides links, categories and topic tags; the same API can also consume richer traits
// generated from the Mom/Pam knowledge pipeline by attaching `semanticTraits` to a concept. That
// gives Solo one stable context layer now and lets the broader knowledge work improve it later.

import {getLexicon} from "./lexicon/index.js";
import {understandWord} from "./understand.js";

const DIRECT = new Set(["curated", "compound", "category", "member", "link"]);

const clamp01 = value => Math.max(0, Math.min(1, value));
const round3 = value => Math.round(value * 1000) / 1000;

function semanticTraits(concept) {
  const traits = concept?.semanticTraits;
  return Array.isArray(traits) ? traits.filter(Boolean).map(String) : [];
}

function relationBetween(lex, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return {kind: "same", strength: fromId === toId ? 1 : 0};
  const from = lex.concepts.get(fromId), to = lex.concepts.get(toId);
  if (!from || !to) return {kind: "none", strength: 0};
  if (from.out.has(toId)) return {kind: "curated", strength: Math.max(0.72, 0.94 - 0.02 * from.out.get(toId))};
  if (from.phrases.has(toId)) return {kind: "compound", strength: 0.92};
  if (from.kinds.has(toId)) return {kind: "category", strength: 0.9};
  if (from.members.has(toId)) return {kind: "member", strength: 0.86};
  if (from.links.has(toId)) return {kind: "link", strength: 0.78};

  let shared = 0;
  for (const id of from.near) if (to.near.has(id)) shared++;
  if (shared >= 3) return {kind: "shared-3", strength: 0.5};
  if (shared === 2) return {kind: "shared-2", strength: 0.36};
  if (shared === 1) return {kind: "shared-1", strength: 0.2};

  const tags = from.tags.filter(tag => to.tags.includes(tag)).length;
  if (tags) return {kind: "tag", strength: Math.min(0.2, 0.08 + tags * 0.04)};
  const traitsA = new Set(semanticTraits(from));
  const traitOverlap = semanticTraits(to).filter(t => traitsA.has(t)).length;
  if (traitOverlap) return {kind: "trait", strength: Math.min(0.45, 0.16 + 0.08 * traitOverlap)};
  return {kind: "none", strength: 0};
}

function addCounts(map, values, weight = 1) {
  for (const value of values || []) if (value) map.set(value, (map.get(value) || 0) + weight);
}

function rankedCounts(map, limit = 5) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit);
}

function resolveOne(word, language, lex) {
  const u = understandWord(String(word ?? ""), language, lex);
  return u?.ids?.[0] || null;
}

/**
 * Build a rolling semantic description of the revealed game. This uses only revealed words, so it
 * does not change Solo's fairness model.
 *
 * @param {{pair?: string[] | null, history?: {a?: string, b?: string}[], language?: string, lex?: any, lookback?: number}} input
 */
export function buildAssociationContext({pair = null, history = [], language = "en", lex = null, lookback = 4} = {}) {
  const lang = language === "fr" ? "fr" : "en";
  const graph = lex || getLexicon(lang);
  const revealed = [];
  for (const round of history || []) {
    if (round?.a) revealed.push(String(round.a));
    if (round?.b) revealed.push(String(round.b));
  }
  for (const word of Array.isArray(pair) ? pair : []) if (word) revealed.push(String(word));
  const words = revealed.slice(-Math.max(2, lookback * 2));
  const ids = words.map(word => resolveOne(word, lang, graph)).filter(Boolean);

  const tagCounts = new Map(), categoryCounts = new Map(), traitCounts = new Map(), relationCounts = new Map();
  ids.forEach((id, index) => {
    const concept = graph.concepts.get(id);
    const recency = 0.55 + 0.45 * ((index + 1) / Math.max(1, ids.length));
    addCounts(tagCounts, concept?.tags, recency);
    addCounts(categoryCounts, concept?.kinds ? [...concept.kinds.keys()] : [], recency);
    addCounts(traitCounts, semanticTraits(concept), recency);
  });
  for (let i = 1; i < ids.length; i++) {
    const rel = relationBetween(graph, ids[i - 1], ids[i]);
    if (rel.kind !== "none" && rel.kind !== "same") relationCounts.set(rel.kind, (relationCounts.get(rel.kind) || 0) + 1);
  }

  return {
    recentWords: words,
    recentIds: ids,
    dominantTags: rankedCounts(tagCounts, 5),
    dominantCategories: rankedCounts(categoryCounts, 5),
    dominantTraits: rankedCounts(traitCounts, 8),
    relationshipTypes: rankedCounts(relationCounts, 5),
    unresolved: words.length - ids.length
  };
}

function overlapScore(values, ranked) {
  if (!values?.length || !ranked?.length) return 0;
  const weights = new Map(ranked);
  const max = ranked.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  let hit = 0;
  for (const value of new Set(values)) hit += weights.get(value) || 0;
  return clamp01(hit / Math.min(max, ranked.slice(0, 3).reduce((sum, [, weight]) => sum + weight, 0) || max));
}

/**
 * Score how well a candidate continues the semantic direction of the revealed round, 0..1.
 * Direct fit to the current pair must still dominate in engine.js; this is intended as a modest
 * ranking signal among already-plausible candidates.
 *
 * @param {any} lex
 * @param {any} candidate
 * @param {ReturnType<typeof buildAssociationContext>} context
 */
export function associationContextScore(lex, candidate, context) {
  if (!candidate || !context) return 0;
  const tags = overlapScore(candidate.tags || [], context.dominantTags || []);
  const categories = overlapScore(candidate.kinds ? [...candidate.kinds.keys()] : [], context.dominantCategories || []);
  const traits = overlapScore(semanticTraits(candidate), context.dominantTraits || []);

  const recent = (context.recentIds || []).slice(-4);
  let direct = 0, directCount = 0;
  for (const id of recent) {
    if (id === candidate.id) continue;
    const rel = relationBetween(lex, id, candidate.id);
    direct += rel.strength;
    directCount++;
  }
  const recentFit = directCount ? direct / directCount : 0;

  // Traits matter more once the Mom knowledge layer starts supplying them. Until then, tags,
  // categories and graph relationships provide the same interface with less detail.
  const hasTraits = semanticTraits(candidate).length > 0 && (context.dominantTraits || []).length > 0;
  const score = hasTraits
    ? 0.28 * recentFit + 0.22 * tags + 0.18 * categories + 0.32 * traits
    : 0.46 * recentFit + 0.32 * tags + 0.22 * categories;
  return round3(clamp01(score));
}

/** Exposed for diagnostics/tests, not intended as a second association engine. */
export function describeAssociation(lex, fromId, toId) {
  return relationBetween(lex, fromId, toId);
}

export function isDirectAssociationKind(kind) {
  return DIRECT.has(kind);
}
