// @ts-check
// Solo bot engine (Gary and Milo). Local, non-generative and inspectable: it ranks words from the
// curated association graph (src/shared/lexicon) and returns a structured record of how it chose.
//
// Fair play: the only input is what both players can already see. `selectBotWord` takes the latest
// revealed pair, the words blocked by earlier revealed rounds, the earlier revealed rounds
// themselves (for the player-style and near-miss tie-breakers), the language, the character and a
// seed. It never receives the player's word for the round it is choosing for, and the game commits
// its choice before the round is revealed (src/shared/solo.js).
//
// Goal (engine-2.3): human first. Each answer should be a word another ordinary person could
// plausibly blurt out within a few seconds for BOTH words, so the player almost always sees why it
// was said. Difficulty comes from how predictable the character is, never from worse or stranger
// words: DIFFICULTY MUST NEVER BE CREATED BY CHOOSING IMPLAUSIBLE WORDS.
//
// 1. Understanding the inputs (src/shared/understand.js): spelling slips, spacing (sea horse /
//    seahorse, birdnest), plurals, inflections and derived words resolve to the intended concept.
// 2. Scoring (heuristic scores, not probabilities):
//   relation(input, candidate) ∈ [0, 1]  how directly the candidate is associated with ONE input:
//     1.00 the input's category (DOG → PET), or a compound/phrase that is also a link
//     0.90 → 0.70 named in the input's curated association list (by rank: 0.90 − 0.02 × rank, ≥ 0.70)
//     0.75 a kind of the input (FRUIT → APPLE)
//     0.70 any other direct link
//     0.45 only the other half of a compound (SEA → HORSE because of "seahorse")
//     0.40 / 0.30 / 0.12 no direct link, but 3+ / 2 / 1 shared neighbours (indirect)
//     0.05 only a common topic tag;  0 nothing
//   Each input's relation is scaled by how sure we are of that input (exact 1, likely slip 0.9,
//   guessed head word 0.75).
//   weak = min(relA, relB), strong = max(relA, relB)
//   connection   = 0.65 × weak + 0.35 × strong                         (the weaker side counts most)
//   plausibility = from the KIND of link on each side (category 1, compound 1, curated 0.95,
//                  member 0.85, link 0.8, shared-3 0.45, shared-2 0.35, compound part 0.3,
//                  shared-1 0.15, tag 0.05): 0.6 × weaker side + 0.4 × stronger side, − 0.10 when
//                  neither side is a direct link, − 0.10 for a generic word
//   final = 0.60 × connection + 0.15 × plausibility + 0.10 × familiarity + 0.15 × cue
//           − oneSided − generic − piece
// 3. The quality floor. A candidate is HIGH QUALITY only when BOTH sides are direct links (the weak
//    side matters as much as the strong one), its plausibility is ≥ 0.78 (a generic word is marked
//    down, so it rarely passes), and it is not a piece of an input. Shared-neighbour hops,
//    half-compounds, tag matches and two-step paths never pass, however strong the other side is.
// 4. Character profiles (same lexicon, same scoring, same fairness rules):
//    Milo (easier)  ranks by the score plus a small bonus for familiar, concrete, first-thought
//                   words, and only varies between answers that are virtually equal (≤ 0.02 apart;
//                   80 % the top one). He converges fast because he is predictable, not because he
//                   helps: he never sees the player's word.
//    Gary (harder)  a slightly wider near-best range (≤ 0.15 apart, up to 3; 45/35/20 %), so he
//                   sometimes plays the second or third genuinely strong reading. The range only
//                   ever holds high-quality candidates, so he is never given a weaker word to
//                   make the game longer.
//    Anchored (below the threshold, not recovery): when nothing is high quality, a first-thought word
//    for one input that is clearly tied to the other (3+ shared neighbours: DESSERT + EGG → CAKE),
//    the single best one, logged as `anchored`.
// 5. Recovery mode. When no candidate is high quality or anchored (or an input is not understood), the bot
//    deliberately plays a simple, broad, familiar, concrete hub word tied to both inputs (never a
//    narrow word for only one of them) and the decision is marked `recovery`. engine-2.4: the hub
//    must be a DIRECT link of at least one of the two latest words, so the player can always see
//    where it came from without reconstructing the trail (no hub reached only through shared
//    neighbours: DESSERT + PENCIL → HOME is gone). With no hub left, the broadest familiar direct
//    word of the stronger side.
// 6. Tie-breakers (light, only among the candidates already in the near-best range, and only from
//    rounds that have been revealed): the player's style (what kind of words they have played) and
//    near-miss momentum (when the last two revealed words were closely related, favour candidates
//    tied strongly to both). They reorder near-equal answers; they never add a weaker one.
// 7. Openings come from a derived pool of familiar, bridgeable, child-friendly words.

import {getLexicon, DATASET_VERSION} from "./lexicon/index.js";
import {lemmaKeys} from "./morph.js";
import {understandWord} from "./understand.js";
import {wordKey} from "./words.js";
import {hashString, seededRandom} from "./rules.js";

export const ENGINE_VERSION = "engine-2.4";

/** Everything that shapes a decision (logged with it, so a decision can be replayed exactly). */
export const ENGINE_CONFIG = Object.freeze({
  weights: {connection: 0.60, plausibility: 0.15, familiarity: 0.10, cue: 0.15},
  connection: {weak: 0.65, strong: 0.35},
  oneSided: {gap: 0.45, factor: 0.30},
  genericPenalty: 0.10,
  piecePenalty: 0.10,
  compoundPart: 0.45,
  stages: {sharedDirect: 0.70, indirect: 0.30, strongSide: 0.70, weak: 0.12},
  plausibility: {
    kinds: {category: 1, compound: 1, curated: 0.95, member: 0.85, link: 0.8, "shared-3": 0.45, "shared-2": 0.35, "compound-part": 0.3, "shared-1": 0.15, tag: 0.05, none: 0},
    indirectPenalty: 0.10,
    genericPenalty: 0.10
  },
  // The human-first quality floor: both sides direct, plausible, weak side not much weaker.
  floor: {plausibility: 0.78, weak: 0.6},
  // Selection profiles. `bias` is added to the score for ranking (familiar, concrete, first-thought
  // words); `window` is the near-best range; `weights` how often each place in it is played.
  profiles: {
    milo: {difficulty: "easier", bias: {familiarity: 0.04, concrete: 0.03, cue: 0.05}, window: {margin: 0.02, plausibility: 0.05, size: 2}, weights: [0.8, 0.2]},
    gary: {difficulty: "harder", bias: {familiarity: 0, concrete: 0, cue: 0}, window: {margin: 0.15, plausibility: 0.12, size: 3}, weights: [0.45, 0.35, 0.2]}
  },
  // Recovery: a broad, familiar, concrete hub tied to both inputs.
  // `anchored`: a bonus for a hub directly tied to one word and clearly (2+ shared neighbours) to the other.
  // `direct`: a bonus for a hub that is a direct link of at least one of the two words.
  // `direct` is now required (engine-2.4): a hub must be a direct link of at least one of the two words.
  recovery: {breadth: 0.20, familiarity: 0.20, connection: 0.35, concrete: 0.10, plausibility: 0.15, anchored: 0.15, direct: 0.10, minWeak: 0.12},
  // Tie-breakers among near-equal candidates (from revealed rounds only).
  // style: bonus × the share of the candidate's word class among the player's earlier words;
  // nearMatch: bonus × how much more than the floor the candidate ties to the WEAKER word.
  tieBreak: {style: 0.05, styleMinRounds: 2, nearMatch: 0.15, nearMatchRelation: 0.7},
  // How sure we are of each input, by how it was understood (src/shared/understand.js).
  inputConfidence: {certain: 1, high: 1, medium: 0.9, low: 0.75},
  // One input still not understood: prefer broad, familiar words of the other input.
  unknown: {relation: 0.5, familiarity: 0.2, breadth: 0.3},
  opening: {minLinks: 12, maxLength: 7, minBridges: 8},
  logCandidates: 8
});

/** The single strongest answer for either profile (a near-best range of one): used by replay and tests. */
export const STRONGEST_CONFIG = Object.freeze({...ENGINE_CONFIG, window: {size: 1}});

/** Broad words: fine when nothing better connects, but a more specific shared bridge should win. */
const GENERIC = new Set(["food", "thing", "stuff", "animal", "people", "person", "place", "fun", "good", "nice", "big", "small", "color", "toy", "eat", "drink", "happy", "new", "time"]);
/** Too vague to be a readable answer even in recovery. */
const VAGUE = new Set(["thing", "stuff", "good", "nice", "new", "old", "big", "small", "happy", "sad", "fun", "people", "person", "place", "time", "word", "pair"]);
const GLOOMY = new Set(["nightmare", "scary", "fear", "ghost", "monster", "haunted_house", "skeleton", "zombie", "witch", "spider", "snake", "shark", "sad", "angry", "cry", "storm", "volcano", "dark", "war", "fight", "army", "soldier", "tank", "sewer", "trash",
  "hurt", "sick", "medicine", "hospital", "bite", "sting", "punch", "hit", "danger", "lonely", "nervous", "broken", "dirty", "smell", "rat", "mosquito", "wasp", "scorpion", "vampire", "cauldron", "potion", "skunk", "hurricane", "tornado"]);
/** Openings people reach for first. Always in the pool when the dataset has them (the pool itself is derived). */
const OPENING_SEEDS = ["dog", "school", "beach", "pizza", "music", "car", "rain", "movie", "home", "game", "book", "summer", "food", "family", "park", "water", "party", "night", "tree", "snow"];
/** Vetting: derived words that are poor first words (a verb or colour with nothing to latch onto, a utensil, a narrow word). */
const OPENING_EXCLUDE = new Set(["play", "write", "green", "plate", "tuna", "feather", "bake", "cold", "hot", "light", "read", "draw", "run", "jump", "eat", "drink", "fall"]);
const DIRECT_KINDS = new Set(["category", "compound", "curated", "member", "link"]);
const round3 = x => Math.round(x * 1000) / 1000;

// ---------- word classes (player style) ----------

/** What kind of word a concept is, from its topic tags (first match wins). */
/** @type {[string, string[]][]} */
const CLASS_RULES = [
  ["animal", ["animal"]], ["food", ["food", "sweet", "drink", "fruit"]], ["event", ["holiday", "celebration"]],
  ["people", ["family", "job"]], ["activity", ["sport", "game", "music", "art"]], ["place", ["city"]],
  ["object", ["home", "kitchen", "clothes", "tech", "toy", "school", "transport", "book"]],
  ["nature", ["nature", "plant", "sky", "space", "weather", "ocean", "water", "cold", "hot", "fire", "light", "season", "farm"]],
  ["abstract", ["feeling", "time", "science", "magic", "story", "adventure", "sound", "shape", "color", "body", "night", "travel", "pet"]]
];
export const WORD_CLASSES = [...CLASS_RULES.map(([name]) => name), "descriptive"];
const CONCRETE = new Set(["animal", "food", "object", "place", "nature", "people", "event"]);
const OPENING_CLASSES = new Set(["animal", "food", "object", "place", "nature", "event", "activity"]);
/**
 * @param {{tags: string[]}} concept
 * @returns {string}
 */
export function wordClass(concept) {
  for (const [name, tags] of CLASS_RULES) if (concept.tags.some(t => tags.includes(t))) return name;
  return "descriptive";
}
const isConcrete = concept => (CONCRETE.has(wordClass(concept)) ? 1 : 0);

/**
 * The player's style from the rounds already revealed: the share of each word class among the
 * player's own earlier words that the graph understands. Never the current round.
 * @param {{a: string, b: string}[]} history revealed rounds, oldest first
 */
export function playerStyle(history, language = "en", lex = getLexicon(language)) {
  /** @type {Record<string, number>} */
  const counts = {};
  let n = 0;
  for (const round of history || []) {
    const ids = understandWord(round?.a ?? "", language, lex).ids;
    const concept = ids.length ? lex.concepts.get(ids[0]) : null;
    if (!concept) continue;
    const cls = wordClass(concept);
    counts[cls] = (counts[cls] || 0) + 1;
    n++;
  }
  /** @type {Record<string, number>} */
  const shares = {};
  for (const [cls, c] of Object.entries(counts)) shares[cls] = round3(c / n);
  return {rounds: n, shares};
}

// ---------- scoring ----------

/**
 * How directly a candidate is associated with one input (which may stand for two concepts, e.g. both
 * halves of "firetruck"). Returns the score and the kind of link (see the scale above).
 */
export function relation(lex, inputIds, candidate, config = ENGINE_CONFIG) {
  let best = {score: 0, kind: "none"};
  for (const id of inputIds) {
    const input = lex.concepts.get(id);
    if (!input || input.id === candidate.id) continue;
    let score, kind;
    const rank = input.out.get(candidate.id);
    if (input.kinds.has(candidate.id)) { score = 1; kind = "category"; }
    else if (input.phrases.has(candidate.id) && input.links.has(candidate.id)) { score = 1; kind = "compound"; }
    else if (rank !== undefined) { score = Math.max(0.7, 0.9 - 0.02 * rank); kind = "curated"; }
    else if (candidate.kinds.has(input.id)) { score = 0.75; kind = "member"; }
    else if (input.links.has(candidate.id)) { score = 0.7; kind = "link"; }
    else if (input.phrases.has(candidate.id)) { score = config.compoundPart; kind = "compound-part"; }
    else {
      let shared = 0;
      for (const n of candidate.near) if (input.near.has(n)) shared++;
      if (shared >= 3) { score = 0.4; kind = "shared-3"; }
      else if (shared === 2) { score = 0.3; kind = "shared-2"; }
      else if (shared === 1) { score = 0.12; kind = "shared-1"; }
      else if (candidate.tags.some(tag => input.tags.includes(tag))) { score = 0.05; kind = "tag"; }
      else { score = 0; kind = "none"; }
    }
    if (score > best.score) best = {score, kind};
  }
  return best;
}

/**
 * How easy the link is for a person to see (0..1), from the kind of link on each side. A graph-only
 * path (no direct link on either side) and a generic word are marked down.
 */
export function plausibility(kindA, kindB, generic, config = ENGINE_CONFIG) {
  const k = config.plausibility.kinds;
  const pa = k[kindA] ?? 0, pb = k[kindB] ?? 0;
  let p = 0.6 * Math.min(pa, pb) + 0.4 * Math.max(pa, pb);
  if (!DIRECT_KINDS.has(kindA) && !DIRECT_KINDS.has(kindB)) p -= config.plausibility.indirectPenalty;
  if (generic) p -= config.plausibility.genericPenalty;
  return Math.max(0, Math.min(1, p));
}

function familiarity(concept) {
  const short = !concept.label.includes(" ") && concept.label.length <= 10 ? 1 : 0;
  return 0.7 * Math.min(1, concept.links.size / 12) + 0.3 * short;
}
const breadthOf = concept => (concept.members.size ? 1 : Math.min(1, concept.links.size / 15));

function cueFrom(lex, inputIds, candidate) {
  let best = 0;
  for (const id of inputIds) {
    const rank = lex.concepts.get(id)?.out.get(candidate.id);
    if (rank !== undefined) best = Math.max(best, 1 / (1 + 0.25 * rank));
  }
  return best;
}

/** The game's normalisation for "already used": case, spacing, accents and singular/plural forms. */
function blockedKeys(words, language) {
  const keys = new Set();
  for (const word of words) for (const key of lemmaKeys(word, language)) keys.add(key);
  return keys;
}
function isBlocked(label, blocked, language) {
  for (const key of lemmaKeys(label, language)) if (blocked.has(key)) return true;
  return false;
}
/** The candidate is a piece of an input, or an input is a piece of it (SAND + SANDBOX → BOX). */
function pieceOf(candidateKey, inputKeys) {
  return inputKeys.some(k => k && k.length >= 3 && candidateKey.length >= 3 && k !== candidateKey && (k.includes(candidateKey) || candidateKey.includes(k)));
}

function stageOf(weak, strong, cfg) {
  if (weak >= cfg.stages.sharedDirect) return 1;
  if (weak >= cfg.stages.indirect && strong >= cfg.stages.strongSide) return 2;
  if (weak >= cfg.stages.indirect) return 3;
  if (weak >= cfg.stages.weak) return 4;
  if (weak > 0) return 5;
  return 6;
}
export const STAGE_NAMES = {1: "shared-direct", 2: "direct-plus-indirect", 3: "indirect-both", 4: "weak-fallback", 5: "best-available", 6: "one-input-only"};

/** One side a first-thought word (category, compound or curated, ≥ 0.8), the other 3+ shared neighbours. */
export function isAnchored(s, config = ENGINE_CONFIG) {
  const strongSide = (kind, rel) => ["category", "compound", "curated"].includes(kind) && rel >= 0.8;
  return ((strongSide(s.kindA, s.relA) && s.kindB === "shared-3") || (strongSide(s.kindB, s.relB) && s.kindA === "shared-3")) && !s.generic && !s.piece
    && !VAGUE.has(s.word.toLowerCase()) && s.weak >= config.stages.indirect;
}

/** The human-first quality floor (see the header). */
export function passesFloor(s, config = ENGINE_CONFIG) {
  // A word built from an input passes only when it is directly tied to both (RAIN + BOW → RAINBOW).
  // A generic word (BIG, FOOD) is only marked down: its plausibility penalty usually keeps it under
  // the floor unless both of its links are first-thought ones (TALL + BEAR → BIG).
  return DIRECT_KINDS.has(s.kindA) && DIRECT_KINDS.has(s.kindB) && s.plausibility >= config.floor.plausibility && s.weak >= config.floor.weak
    && (!s.piece || s.weak >= config.stages.sharedDirect);
}

// ---------- openings ----------

const openingCache = new Map();
/**
 * The opening pool: familiar, highly bridgeable, child-friendly words (a single short word with many
 * links, most of them to other well-connected words; nothing gloomy, generic or descriptive), plus
 * the everyday seeds people reach for first. Derived from the dataset, not a fixed list.
 */
export function openingPool(language = "en", config = ENGINE_CONFIG) {
  const lex = getLexicon(language);
  const key = `${lex.language}:${lex.dataset}`;
  if (openingCache.has(key)) return openingCache.get(key);
  const o = config.opening;
  const seeds = new Set(OPENING_SEEDS);
  const pool = [...lex.concepts.values()].filter(c => {
    if (seeds.has(c.id)) return true;
    if (GLOOMY.has(c.id) || GENERIC.has(c.id) || VAGUE.has(c.id) || OPENING_EXCLUDE.has(c.id) || c.tags.includes("job")) return false;
    if (c.label.includes(" ") || c.label.length > o.maxLength || c.links.size < o.minLinks) return false;
    if (!OPENING_CLASSES.has(wordClass(c))) return false;
    // Bridgeable: many of its links are themselves well-connected words.
    let bridges = 0;
    for (const n of c.links) if ((lex.concepts.get(n)?.links.size || 0) >= o.minLinks) bridges++;
    return bridges >= o.minBridges;
  }).map(c => c.id).sort();
  openingCache.set(key, pool);
  return pool;
}

/**
 * @typedef {{word: string, rank: number, stage: number, sources: string[], relA: number, relB: number, kindA: string, kindB: string,
 *   weak: number, strong: number, connection: number, plausibility: number, familiarity: number, cue: number, oneSided: number,
 *   generic: number, piece: number, final: number, highQuality?: boolean, profileScore?: number, tie?: number}} ScoredWord
 * @typedef {{word: string, ids: string[], known: boolean, method: string, confidence: string | null, via: string | null,
 *   spacing: boolean, morphology: boolean, fuzzy: boolean}} EngineInput
 * @typedef {{margin: number, plausibilityMargin: number, topFinal: number, minFinal: number, topPlausibility: number, minPlausibility: number, size: number}} QualityWindow
 * @typedef {{engine: string, dataset: string, config: typeof ENGINE_CONFIG, seed: number, language: string, character: string, profile: string,
 *   pair: string[] | null, inputs: EngineInput[], unresolvedInputs: number, blockedCount: number, stage: string, lowQuality: boolean, recovery: boolean,
 *   recoveryReason?: string, highQuality: boolean, candidates: ScoredWord[], rejected: {word: string, reason: string}[], pool: string[], selected: string,
 *   quality: string, generated: number, pickRank: number | null, pickPlausibility: number | null, pickWeak: number | null,
 *   window?: QualityWindow, fallback?: string, style?: {rounds: number, shares: Record<string, number>, applied: boolean},
 *   nearMatch?: {words: string[], applied: boolean} | null, tieBreak?: {used: boolean, changed: boolean}}} EngineDecision
 */

/**
 * Choose the bot's word. Pure and deterministic for the same input.
 * @param {{pair: [string, string] | string[] | null, blocked?: Iterable<string>, history?: {a: string, b: string}[], language?: string, character?: string, seed?: number, config?: any}} input
 *   pair: the latest revealed pair (null for the first move); blocked: every word revealed in earlier
 *   rounds; history: the earlier revealed rounds (player word a, bot word b), oldest first.
 * @returns {{word: string, quality: "strong" | "loose" | "opening", decision: EngineDecision}}
 */
export function selectBotWord({pair, blocked = [], history = [], language = "en", character = "gary", seed = 0, config = ENGINE_CONFIG}) {
  const lang = language === "fr" ? "fr" : "en";
  const lex = getLexicon(lang);
  const who = character === "milo" ? "milo" : "gary";
  const base = (config.profiles || ENGINE_CONFIG.profiles)[who];
  const profile = {...base, window: {...base.window, ...(config.window || {})}};
  const inputs = Array.isArray(pair) ? pair.slice(0, 2).map(w => String(w ?? "")) : [];
  const blockedWords = [...blocked, ...inputs];
  const blockedSet = blockedKeys(blockedWords, lang);
  const rng = seededRandom(hashString(`${seed}:${inputs.join("+")}:${[...blockedSet].sort().join(",")}`));
  // What each input stands for (spelling slips, spacing and inflections resolved first).
  /** @type {EngineInput[]} */
  const resolved = inputs.map(word => {
    const u = understandWord(word, lang, lex);
    return {word, ids: u.ids, known: !u.unresolved, method: u.method, confidence: u.confidence, via: u.via, spacing: u.spacing, morphology: u.morphology, fuzzy: u.fuzzy};
  });
  const sure = r => (r?.known ? config.inputConfidence[r.confidence || "certain"] ?? 1 : 0);
  /** @type {EngineDecision} */
  const decision = {engine: ENGINE_VERSION, dataset: DATASET_VERSION, config, seed, language: lang, character: who, profile: profile.difficulty, pair: inputs.length ? inputs : null,
    inputs: resolved, unresolvedInputs: resolved.filter(r => !r.known).length, blockedCount: new Set(blockedWords.map(wordKey)).size, stage: "", lowQuality: false, recovery: false,
    highQuality: false, candidates: [], rejected: [], pool: [], selected: "", quality: "", generated: 0, pickRank: null, pickPlausibility: null, pickWeak: null};

  const valid = concept => !isBlocked(concept.label, blockedSet, lang);
  const friendly = concept => concept.links.size >= 7 && !concept.label.includes(" ") && !GLOOMY.has(concept.id);
  const finish = (word, quality, stage, lowQuality) => {
    decision.selected = word; decision.quality = quality; decision.stage = stage; decision.lowQuality = lowQuality;
    return {word, quality, decision};
  };

  // First move: a word from the opening pool. Neither input understood: a friendly familiar word
  // (recovery: there is nothing to connect to).
  const known = resolved.filter(r => r.known);
  if (!inputs.length || !known.length) {
    const opening = inputs.length ? [] : openingPool(lang, config).map(id => lex.concepts.get(id)).filter(valid);
    const pool = opening.length ? opening : [...lex.concepts.values()].filter(c => friendly(c) && valid(c));
    const list = pool.length ? pool : [...lex.concepts.values()].filter(valid);
    if (!list.length) throw new Error("No words left for the bot");
    const pick = list[Math.floor(rng() * list.length)];
    decision.pool = [pick.label];
    if (inputs.length) { decision.recovery = true; decision.recoveryReason = "no input understood"; }
    return finish(pick.label, inputs.length ? "loose" : "opening", inputs.length ? "no-known-input" : "opening", Boolean(inputs.length));
  }

  // Candidates: the direct associations of each input (curated links, compounds, categories).
  const inputIds = new Set(known.flatMap(r => r.ids));
  const inputKeys = [...inputs.map(wordKey), ...[...inputIds].map(id => lex.concepts.get(id).key)];
  const sources = new Map();
  const add = (id, source) => { if (inputIds.has(id)) return; if (!sources.has(id)) sources.set(id, new Set()); sources.get(id).add(source); };
  resolved.forEach((r, i) => {
    for (const id of r.ids) {
      const c = lex.concepts.get(id);
      for (const n of c.links) add(n, `assoc-${"AB"[i]}`);
      for (const n of c.phrases) add(n, `compound-${"AB"[i]}`);
      for (const n of c.kinds.keys()) add(n, `category-${"AB"[i]}`);
    }
  });
  const score = (id, extraSource) => {
    const c = lex.concepts.get(id);
    const a = relation(lex, resolved[0]?.ids || [], c, config), b = relation(lex, resolved[1]?.ids || [], c, config);
    const relA = round3(a.score * sure(resolved[0])), relB = round3(b.score * sure(resolved[1]));
    const weak = Math.min(relA, relB), strong = Math.max(relA, relB);
    const connection = config.connection.weak * weak + config.connection.strong * strong;
    const oneSided = config.oneSided.factor * Math.max(0, strong - weak - config.oneSided.gap);
    const fam = familiarity(c), cue = cueFrom(lex, [...inputIds], c);
    const generic = GENERIC.has(c.id) ? config.genericPenalty : 0;
    const piece = pieceOf(c.key, inputKeys) ? config.piecePenalty : 0;
    const plaus = plausibility(a.kind, b.kind, generic > 0, config);
    const final = config.weights.connection * connection + config.weights.plausibility * plaus + config.weights.familiarity * fam + config.weights.cue * cue - oneSided - generic - piece;
    /** @type {ScoredWord & {concept: any}} */
    const s = {concept: c, word: c.label, rank: 0, stage: stageOf(weak, strong, config), sources: [...(sources.get(id) || []), ...(extraSource ? [extraSource] : [])].sort(),
      relA, relB, kindA: a.kind, kindB: b.kind, weak, strong, connection: round3(connection), plausibility: round3(plaus), familiarity: round3(fam), cue: round3(cue),
      oneSided: round3(oneSided), generic, piece, final: round3(final)};
    s.highQuality = resolved.length === 2 && passesFloor(s, config);
    s.profileScore = round3(s.final + profile.bias.familiarity * fam + profile.bias.concrete * isConcrete(c) + profile.bias.cue * cue);
    return s;
  };
  /** @type {{word: string, reason: string, final: number}[]} */
  const rejected = [];
  const judge = scored => {
    if (!valid(scored.concept)) { rejected.push({word: scored.word, reason: "already played (blocked)", final: scored.final}); return false; }
    if (scored.piece && Math.min(scored.relA, scored.relB) < config.stages.sharedDirect) { rejected.push({word: scored.word, reason: "a piece of an input word (lazy compound split)", final: scored.final}); return false; }
    return true;
  };
  let pool = [...sources.keys()].map(id => score(id)).filter(judge);

  // Controlled broadening (recovery only): when nothing is high quality, add two-step neighbours
  // (a neighbour of a neighbour of each input), never deeper.
  if (resolved.length === 2 && resolved.every(r => r.known) && !pool.some(s => s.highQuality)) {
    const ring = ids => { const out = new Set(); for (const id of ids) for (const n of lex.concepts.get(id).near) for (const m of lex.concepts.get(n)?.near || []) out.add(m); return out; };
    const ringA = ring(resolved[0].ids), ringB = ring(resolved[1].ids);
    for (const id of ringA) if (ringB.has(id) && !sources.has(id) && !inputIds.has(id)) { sources.set(id, new Set(["two-step"])); const s = score(id); if (judge(s)) pool.push(s); }
  }
  decision.generated = sources.size;

  // One input still not understood after spelling, spacing and inflection checks. A narrow word for
  // the other input would ignore the player, so this is recovery: a BROAD answer, the known word's
  // category or a familiar hub word directly tied to it (BARN → FARM, SHELL → SEA).
  if (resolved.length === 2 && resolved.some(r => !r.known)) {
    const knownIndex = resolved[0].known ? 0 : 1;
    const u = config.unknown;
    pool = pool.filter(s => DIRECT_KINDS.has(knownIndex === 0 ? s.kindA : s.kindB) && !VAGUE.has(s.concept.id)).map(s => {
      const rel = knownIndex === 0 ? s.relA : s.relB;
      const v = round3(u.relation * rel + u.familiarity * s.familiarity + u.breadth * breadthOf(s.concept) - s.piece);
      return {...s, final: v, profileScore: v};
    });
    decision.fallback = "broad-known-side";
    decision.recovery = true;
    decision.recoveryReason = "an input was not understood";
    return choose(pool, "unknown-input", true, {recovery: true});
  }

  const high = pool.filter(s => s.highQuality);
  if (high.length) return choose(pool, STAGE_NAMES[1], false, {recovery: false});

  // Anchored: no answer is direct on both sides, but one is a first-thought word for one input and
  // clearly tied to the other (3+ shared neighbours: DESSERT + EGG → CAKE). Below the high-quality
  // threshold (logged as such), still a real shared answer, so not recovery. The single best one.
  const anchored = pool.filter(s => isAnchored(s, config)).map(s => ({...s, profileScore: s.final}));
  if (anchored.length) return choose(anchored, "anchored", false, {recovery: false, single: true, all: pool});

  // Recovery: nothing clears the floor. A broad, familiar, concrete hub tied to both inputs.
  const r = config.recovery;
  const bothDirect = s => DIRECT_KINDS.has(s.kindA) && DIRECT_KINDS.has(s.kindB);
  const oneDirect = s => DIRECT_KINDS.has(s.kindA) || DIRECT_KINDS.has(s.kindB);
  const hubs = pool.filter(s => s.weak >= r.minWeak && oneDirect(s) && (!VAGUE.has(s.concept.id) || bothDirect(s)) && !GLOOMY.has(s.concept.id)).map(s => {
    const anchored = s.weak >= config.stages.indirect ? 1 : 0;
    const v = round3(r.breadth * breadthOf(s.concept) + r.familiarity * s.familiarity + r.connection * s.connection + r.concrete * isConcrete(s.concept) + r.plausibility * s.plausibility
      + r.anchored * anchored + r.direct - s.piece);
    return {...s, final: v, profileScore: v};
  });
  decision.recovery = true;
  if (hubs.length) {
    decision.recoveryReason = "no high-quality shared answer";
    return choose(hubs, "recovery", true, {recovery: true, all: pool});
  }
  // Nothing ties to both: the broadest familiar word of the stronger side (its category or a hub).
  decision.recoveryReason = "nothing connects both words";
  const broad = pool.filter(s => Math.max(s.relA, s.relB) >= 0.7 && !VAGUE.has(s.concept.id) && !GLOOMY.has(s.concept.id)).map(s => {
    // Still prefer a word with some tie (a shared neighbour or topic) to the other word.
    const v = round3(0.4 * breadthOf(s.concept) + 0.3 * s.familiarity + 0.3 * s.strong + 0.3 * Math.min(1, s.weak / r.minWeak));
    return {...s, final: v, profileScore: v};
  });
  return choose(broad, "one-input-only", true, {recovery: true, all: pool});

  function choose(ranked, stage, lowQuality, {recovery, single = false, all = ranked}) {
    const everything = ranked.slice().sort((x, y) => (recovery || single ? 0 : Number(Boolean(y.highQuality)) - Number(Boolean(x.highQuality))) || y.profileScore - x.profileScore || y.final - x.final || x.word.localeCompare(y.word));
    everything.forEach((s, i) => { s.rank = i + 1; });
    const eligibleBase = recovery || single ? everything : everything.filter(s => s.highQuality);
    if (!eligibleBase.length) {
      // Tight constraints: nothing connected is left. Fall back to any familiar unblocked word.
      const spare = [...lex.concepts.values()].filter(c => friendly(c) && valid(c));
      const list = spare.length ? spare : [...lex.concepts.values()].filter(valid);
      if (!list.length) throw new Error("No words left for the bot");
      const pick = list[Math.floor(rng() * list.length)];
      decision.rejected = rejected.slice(0, 6).map(({word, reason}) => ({word, reason}));
      decision.pool = [pick.label];
      decision.recovery = true;
      decision.recoveryReason = decision.recoveryReason || "nothing connected is left";
      return finish(pick.label, "loose", "no-candidates", true);
    }
    // The near-best range: the top answer, and only answers as good as it for this character.
    // Recovery is always the single most readable hub (no variety where clarity matters most).
    const top = eligibleBase[0];
    const w = recovery || single ? {margin: 0, plausibility: 0, size: 1} : profile.window;
    const minFinal = round3(top.profileScore - (w.margin ?? 0)), minPlausibility = round3(top.plausibility - (w.plausibility ?? 0));
    let eligible = eligibleBase.filter(s => s === top || (s.profileScore >= minFinal && s.plausibility >= minPlausibility && !s.generic && !s.piece)).slice(0, Math.max(1, w.size ?? 1));
    // Tie-breakers among the near-equal answers only (revealed rounds only).
    const style = playerStyle(history, lang, lex);
    const near = nearMatchOf(history, lang, lex, config);
    decision.style = {...style, applied: false};
    decision.nearMatch = near ? {words: near, applied: false} : null;
    const before = eligible.map(s => s.word);
    if (eligible.length > 1) {
      const t = config.tieBreak;
      for (const s of eligible) {
        let tie = 0;
        if (style.rounds >= t.styleMinRounds) tie += t.style * (style.shares[wordClass(s.concept)] || 0);
        if (near) tie += t.nearMatch * Math.max(0, Math.min(s.relA, s.relB) - config.floor.weak);
        s.tie = round3(tie);
      }
      eligible = eligible.slice().sort((x, y) => (y.profileScore + (y.tie || 0)) - (x.profileScore + (x.tie || 0)) || x.word.localeCompare(y.word));
      if (style.rounds >= t.styleMinRounds) decision.style.applied = true;
      if (near && decision.nearMatch) decision.nearMatch.applied = true;
    }
    decision.tieBreak = {used: eligible.length > 1 && (decision.style.applied || Boolean(decision.nearMatch?.applied)), changed: eligible.map(s => s.word).join() !== before.join()};
    const weights = recovery || single ? [1] : profile.weights;
    let roll = rng() * eligible.reduce((sum, _, i) => sum + (weights[i] ?? 0), 0), index = 0;
    for (; index < eligible.length - 1; index++) { roll -= weights[index] ?? 0; if (roll < 0) break; }
    const pick = eligible[index];
    decision.window = {margin: w.margin ?? 0, plausibilityMargin: w.plausibility ?? 0, topFinal: top.profileScore, minFinal, topPlausibility: top.plausibility, minPlausibility, size: eligible.length};
    decision.candidates = everything.slice(0, config.logCandidates).map(({concept: _c, ...rest}) => rest);
    decision.highQuality = Boolean(pick.highQuality) && !recovery;
    decision.pickRank = pick.rank;
    decision.pickPlausibility = pick.plausibility;
    decision.pickWeak = pick.weak;
    // Notable rejections: blocked or lazy words that would otherwise have ranked near the top.
    decision.rejected = rejected.filter(x => x.final >= top.final - 0.15).sort((x, y) => y.final - x.final).slice(0, 6).map(({word, reason}) => ({word, reason}));
    // Strong one-sided words that lost to the floor (why the obvious word was not chosen).
    for (const s of all.filter(s => !s.highQuality && s.strong >= 0.85).sort((x, y) => y.strong - x.strong).slice(0, 3)) {
      const why = s.kindA === "compound-part" || s.kindB === "compound-part" ? "only half of a compound on one word" : s.weak < config.stages.weak ? "one-sided" : "below the quality floor on one word";
      decision.rejected.push({word: s.word, reason: `${why}: ${round3(s.relA)} / ${round3(s.relB)}`});
    }
    decision.pool = eligible.map(s => s.word);
    return finish(pick.word, lowQuality ? "loose" : "strong", stage, lowQuality);
  }
}

/**
 * Near-miss state from the last revealed round: when the player's word and the bot's word were
 * closely related (a direct link either way: WARM / HOT), the two words. Otherwise null.
 * @param {{a: string, b: string}[]} history
 */
export function nearMatchOf(history, language = "en", lex = getLexicon(language), config = ENGINE_CONFIG) {
  const last = history?.[history.length - 1];
  if (!last?.a || !last?.b) return null;
  const a = understandWord(last.a, language, lex).ids, b = understandWord(last.b, language, lex).ids;
  if (!a.length || !b.length || a.some(id => b.includes(id))) return null;
  let best = 0;
  for (const id of b) { const c = lex.concepts.get(id); if (c) best = Math.max(best, relation(lex, a, c, config).score); }
  for (const id of a) { const c = lex.concepts.get(id); if (c) best = Math.max(best, relation(lex, b, c, config).score); }
  return best >= config.tieBreak.nearMatchRelation ? [last.a, last.b] : null;
}
