// The Solo characters: who the player chose to play with. Presentation only.
// Every character plays with the same word engine (src/shared/bot.js): same rules, same
// strength, same choices for the same game. A character only changes the name, the portrait
// and what they say around the word. Nothing here reads or changes game state or scoring,
// and nothing here makes network calls. Copy lives in i18n.js under the keys below.

import {BRANCHES, ONE_OFF, oneOffKeys, pairKeys, pairsOf} from "./gary-narrative.js";

/**
 * A line is [key, when]: typed before the character's word ("sigh" … STORY) or after it.
 * Match lines are two short phrases with a beat between them ("..." then "fine. you win this one").
 * @typedef {{
 *   id: string, name: string, title: string, card: string[], personality: string,
 *   voiceId: string | null, voiceStyle: string, art: string,
 *   intro: {kicker: string, lines: string[], aside: string, cta: string} | null, meetAgain: string | null, rating: string[], copy: Record<string, string>,
 *   script?: MiloScript, pools?: Record<string, string[]>, narrative?: boolean,
 *   results: Partial<Record<Strength, string[]>>, resultAvoid: Partial<Record<Strength, string[]>>,
 *   lines: {
 *     mismatch: Record<string, [string, string][]>, close: [string, string][], strange: [string, string][],
 *     middle: string[], nearEnd: string[], earlyMatch: string[][], lateMatch: string[][], win: string[][],
 *     rematch: string[], gameOver: [string, string]
 *   }
 * }} Character
 * @typedef {"opening" | "strong" | "good" | "weak" | "veryWeak"} Strength
 * A scripted character's milestone moments are one fixed line each (keys below). Ordinary moments
 * (result lines, the occasional remark) rotate through `pools` (see rotate).
 * @typedef {{
 *   start: string, firstTurn: string, normalMiss: string, farApart: string, strong: string, confident: string,
 *   alreadyUsed: string, cantUse: string, takingWhile: string, severalMisses: string, longTrail: string,
 *   clever: string, oddGuess: string, win: string, postWin: string, fastWin: string, longWin: string, encourage: string
 * }} MiloScript
 */

/** @type {Record<string, Character>} */
export const CHARACTERS = {
  gary: {
    id: "gary",
    name: "garyName",
    title: "garyTitle",
    card: ["garyCard1", "garyCard2"], // the character picker card
    personality: "dry",
    voiceId: null, // no recorded voice yet
    voiceStyle: "flat, tired, deadpan; short sighs",
    art: "gary",
    intro: {kicker: "garyMeet", lines: ["garyIntro1", "garyIntro2", "garyIntro3"], aside: "garyIntroSigh", cta: "garyIntroCta"},
    meetAgain: "garyMeetAgain",
    rating: ["garyRate1", "garyRate2"], // the 1–5 star question on the win card
    // Shared Solo copy in this character's own words (anything not listed uses the shared key).
    copy: {firstSolo: "garyFirstSolo", botReady: "garyBotReady", revealLoose: "garyRevealLoose", revealNextStarts: "garyRevealNextStarts", gameOverAww: "garyGameOverAww", gameOverCopy: "garyGameOverCopy"},
    // Gary speaks through his branching narrative (src/client/gary-narrative.js): one paired
    // before/after beat per move, chosen from the direction of the game. No random remarks.
    narrative: true,
    results: {},
    resultAvoid: {},
    lines: {mismatch: {}, close: [], strange: [], middle: [], nearEnd: [], earlyMatch: [], lateMatch: [], win: [], rematch: oneOffKeys("rematch"), gameOver: []}
  },
  milo: {
    id: "milo",
    name: "miloName",
    title: "miloName",
    card: ["miloCard1", "miloCard2"], // the character picker card ("character select")
    personality: "bouncy",
    voiceId: null, // no recorded voice yet
    voiceStyle: "bright, warm, a little impatient to play",
    art: "milo",
    intro: null, // the picker card is his introduction; "Okay, I'm ready." opens each game
    meetAgain: null,
    rating: ["miloRate1", "miloRate2"], // the 1–5 star question on the win card
    copy: {revealLoose: "miloOddGuess", errALREADY_USED: "miloAlreadyUsed", errSAME_AS_LAST: "miloAlreadyUsed"},
    results: {},
    resultAvoid: {},
    // Milo's whole script: one line per moment (see scriptedResult / scriptedReaction / scriptedHelp).
    script: {
      start: "miloStart", firstTurn: "miloFirstTurn", normalMiss: "miloNormalMiss", farApart: "miloFarApart",
      strong: "miloStrong", confident: "miloConfident", alreadyUsed: "miloAlreadyUsed", cantUse: "miloCantUse",
      takingWhile: "miloTakingWhile", severalMisses: "miloSeveralMisses", longTrail: "miloLongTrail", clever: "miloClever",
      oddGuess: "miloOddGuess", win: "miloWin", postWin: "miloPostWin", fastWin: "miloFastWin", longWin: "miloLongWin",
      encourage: "miloEncourage"
    },
    // Ordinary moments rotate (milestones above stay fixed). Result pools start with the original line.
    pools: {
      strong: ["miloStrong", "miloStrong2", "miloStrong3"],
      good: ["miloNormalMiss", "miloGood2", "miloGood3"],
      weak: ["miloWeird", "miloNormalMiss"],
      farApart: ["miloFarApart", "miloWeird"],
      general: ["miloWorkWith", "miloSeeIt", "miloNotMyBrain", "miloInteresting", "miloIdea"]
    },
    lines: {mismatch: {}, close: [], strange: [], middle: [], nearEnd: [], earlyMatch: [], lateMatch: [], win: [], rematch: [], gameOver: ["miloPostWin"]}
  }
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);
export const DEFAULT_CHARACTER = "gary";

/** A known character id, or Gary (games saved before characters existed are Gary's). */
export const characterId = id => (Object.hasOwn(CHARACTERS, String(id)) ? String(id) : DEFAULT_CHARACTER);
export const character = id => CHARACTERS[characterId(id)];

export const REACTION_CHANCE = 0.3; // about a third of ordinary reveals
export const EARLY_MATCH = 3; // matched on move 1–3
export const LATE_MATCH = 12; // matched on move 12 or later

/** Every i18n key a character uses (for tests). */
export function characterKeys(id) {
  const c = character(id);
  const keys = new Set([c.name, c.title, ...c.card, ...c.rating, ...(c.intro ? [c.intro.kicker, ...c.intro.lines, c.intro.aside, c.intro.cta] : []), ...(c.meetAgain ? [c.meetAgain] : []),
    ...Object.values(c.copy), ...Object.values(c.results).flat(), ...Object.values(c.script || {}), ...Object.values(c.pools || {}).flat()]);
  if (c.narrative) {
    for (const branch of BRANCHES) for (const pair of pairsOf(branch)) for (const key of Object.values(pairKeys(branch, pair))) keys.add(key);
    for (const kind of ONE_OFF) for (const key of oneOffKeys(kind)) keys.add(key);
  }
  for (const value of Object.values(c.lines)) {
    const lists = Array.isArray(value) ? [value] : Object.values(value);
    for (const list of lists) for (const item of list) for (const key of [item].flat()) if (key !== "before" && key !== "after") keys.add(key);
  }
  return [...keys];
}

// ---------- rotating line pools ----------

/** Small stable string hash (FNV-1a), so each game starts every pool at its own offset. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/**
 * The `index`-th line of a rotating pool for one game. The game (`seed`) fixes a starting offset,
 * then the pool cycles in order: no line repeats before the whole pool has been used, the same
 * line never comes twice in a row (also across a wrap, since the cycle order never changes), and
 * different games start at different lines. Lines in `avoid` are skipped when anything else is left.
 * @template T
 * @param {T[]} list
 * @param {{seed?: string, index?: number, avoid?: Iterable<string>, keyOf?: (item: T) => string[]}} [options]
 * @returns {T | null}
 */
export function rotate(list, {seed = "", index = 0, avoid = [], keyOf = item => [item].flat().map(String)} = {}) {
  if (!list.length) return null;
  const skip = new Set(avoid);
  const offset = hash(seed) % list.length;
  for (let step = 0; step < list.length; step++) {
    const item = list[(offset + index + step) % list.length];
    if (!keyOf(item).some(key => skip.has(key) && !key.endsWith("Dots"))) return item;
  }
  return list[(offset + index) % list.length];
}

/** The i18n key for a shared Solo string in this character's own words (or the shared key). */
export const copyKey = (id, key) => character(id).copy[key] ?? key;

/**
 * The reveal result line's key for a connection strength: the next line of the character's own
 * pool for it (rotated per game, see resultLines), else their usual line.
 * @param {string} id
 * @param {Strength} strength
 * @param {{seed?: string, index?: number, avoid?: string[]}} [rotation]
 */
export const resultKey = (id, strength, rotation = {}) => {
  const list = character(id).results[strength];
  return list?.length ? rotate(list, {...rotation, seed: `${rotation.seed || ""}:${characterId(id)}:${strength}`}) : copyKey(id, "revealNice");
};

/**
 * How well the player's word fits the two words in play, for the reveal result line only:
 * "strong" (directly linked to both), "good" (linked to one, near the other), "weak" (some link),
 * "veryWeak" (unknown, or no link to either), "opening" on move 1 (nothing to connect yet).
 * @param {{resolve: (word: string) => string | null, concepts: Map<string, {near: Set<string>}>}} lex
 * @param {{prompts: string[] | null, mine: string}} round
 * @returns {Strength}
 */
export function connectionStrength(lex, {prompts, mine}) {
  if (!prompts) return "opening";
  const id = lex.resolve(mine);
  const concept = id ? lex.concepts.get(id) : null;
  if (!concept) return "veryWeak";
  const fit = prompts.map(word => {
    const other = lex.resolve(word);
    if (!other) return 0;
    if (other === id || concept.near.has(other)) return 1;
    const near = lex.concepts.get(other)?.near;
    return near && [...concept.near].some(n => near.has(n)) ? 0.5 : 0;
  });
  const total = fit[0] + fit[1];
  return total >= 2 ? "strong" : total >= 1.5 ? "good" : total > 0 ? "weak" : "veryWeak";
}

/** The line a character greets a rematch with (Play again keeps the same character). A scripted character always opens with their start line. */
export function rematchLine(id, random = Math.random) {
  const c = character(id);
  if (c.script) return c.script.start;
  const list = c.lines.rematch;
  return list[Math.floor(random() * list.length)];
}

// ---------- scripted characters (Milo): fixed milestone lines, rotating ordinary ones ----------

export const SEVERAL_MISSES_AT = 9; // "several misses": said once, on move 9
export const LONG_TRAIL_AT = 17; // "long word trail": said once, on move 17
export const TAKING_A_WHILE_MS = 20000; // the player has been thinking this long without playing

/**
 * Whether the player's word bridges both words in play only indirectly (one step away from each):
 * the "particularly clever connection" for scripted characters.
 * @param {{resolve: (word: string) => string | null, concepts: Map<string, {near: Set<string>}>}} lex
 * @param {{prompts: string[] | null, mine: string}} round
 */
export function cleverBridge(lex, {prompts, mine}) {
  if (!prompts) return false;
  const id = lex.resolve(mine);
  const concept = id ? lex.concepts.get(id) : null;
  if (!concept) return false;
  return prompts.every(word => {
    const other = lex.resolve(word);
    if (!other || other === id || concept.near.has(other)) return false;
    const near = lex.concepts.get(other)?.near;
    return Boolean(near && [...concept.near].some(n => near.has(n)));
  });
}

/**
 * Which result pool a scripted character uses for a move that didn't match: farApart (unknown or
 * unrelated), strong, confident (strong and close to the character's word: a fixed milestone line),
 * clever (fixed), good, or weak.
 * @param {{strength: Strength, close: boolean, clever: boolean}} round
 */
export function scriptedResultPool({strength, close, clever}) {
  if (strength === "veryWeak") return "farApart";
  if (strength === "strong") return close ? "confident" : "strong";
  if (clever) return "clever";
  return strength === "weak" ? "weak" : "good";
}

/**
 * A scripted character's reveal result line for a move that didn't match: a fixed line for the
 * milestone pools (confident, clever), else the next line of that pool's rotation for this game.
 * @param {MiloScript} script
 * @param {{strength: Strength, close: boolean, clever: boolean}} round
 * @param {{seed?: string, index?: number, avoid?: string[], pools?: Record<string, string[]>}} [rotation]
 */
export function scriptedResult(script, round, {seed = "", index = 0, avoid = [], pools = CHARACTERS.milo.pools} = {}) {
  const pool = scriptedResultPool(round);
  if (pool === "confident") return script.confident;
  if (pool === "clever") return script.clever;
  const list = pools?.[pool];
  if (!list?.length) return pool === "farApart" ? script.farApart : pool === "strong" ? script.strong : script.normalMiss;
  return rotate(list, {seed: `${seed}:result:${pool}`, index, avoid});
}

/**
 * The result line of every revealed, non-matching move of a game, in order (pure, so a reload shows
 * the same lines). Each pool rotates separately and a line is never the same as the line before it.
 * @param {string} id the character
 * @param {string} gameId
 * @param {{strength: Strength, close: boolean, clever: boolean}[]} rounds
 * @returns {string[]}
 */
export function resultLines(id, gameId, rounds) {
  const c = character(id);
  const counts = new Map();
  const out = [];
  for (const round of rounds) {
    const pool = c.script ? scriptedResultPool(round) : round.strength;
    const index = counts.get(pool) || 0;
    counts.set(pool, index + 1);
    const avoid = out.length ? [out[out.length - 1]] : [];
    out.push(c.script ? scriptedResult(c.script, round, {seed: gameId, index, avoid, pools: c.pools}) : resultKey(id, round.strength, {seed: gameId, index, avoid}));
  }
  return out;
}

/**
 * A scripted character's speech bubble on a reveal, or null. Milestones (wins, a used word, several
 * misses, a long trail) are fixed lines; an ordinary reveal sometimes gets the next general line.
 * @param {MiloScript} script
 * @param {{status: string, move: number, cantUse?: boolean, recent?: string[], random?: () => number, gameId?: string,
 *   turn?: (pool: string) => number, pools?: Record<string, string[]>}} round
 *   cantUse: the word the character would have chosen had already been played.
 * @returns {{when: "after", keys: string[], pool: string} | null}
 */
export function scriptedReaction(script, {status, move, cantUse = false, recent = [], random = () => 1, gameId = "", turn = () => 0, pools = CHARACTERS.milo.pools}) {
  if (status === "MATCHED") {
    const key = move <= EARLY_MATCH ? script.fastWin : move >= LATE_MATCH ? script.longWin : script.win;
    return {when: "after", keys: [key], pool: "match"};
  }
  if (status !== "REVEALED") return null;
  if (cantUse) return {when: "after", keys: [script.cantUse], pool: "cantUse"};
  if (move === SEVERAL_MISSES_AT && !recent.includes(script.severalMisses)) return {when: "after", keys: [script.severalMisses], pool: "long"};
  if (move === LONG_TRAIL_AT && !recent.includes(script.longTrail)) return {when: "after", keys: [script.longTrail], pool: "long"};
  // An ordinary reveal: now and then, the next line of the general pool.
  if (!pools?.general?.length || random() >= REACTION_CHANCE) return null;
  return {when: "after", keys: [rotate(pools.general, {seed: `${gameId}:general`, index: turn("general"), avoid: recent})], pool: "general"};
}

/**
 * A scripted character's line above the word box while the player thinks.
 * @param {MiloScript} script
 * @param {{move: number, idle?: boolean}} turn
 */
export function scriptedHelp(script, {move, idle = false}) {
  if (idle) return script.takingWhile;
  return move <= 1 ? script.firstTurn : script.encourage;
}

/**
 * How the player's word related to the round, for the character's remark only:
 * "close" when the two revealed words are directly connected, "strange" when the player's word is
 * unknown or unrelated to both prompts, otherwise null. Takes the lexicon so this file stays free
 * of game code. Move 1 has no prompts, so it is never "strange".
 * @param {{resolve: (word: string) => string | null, concepts: Map<string, {near: Set<string>, kinds: Map<string, number>}>}} lex
 * @param {{prompts: string[] | null, mine: string, theirs: string}} round
 */
export function revealKind(lex, {prompts, mine, theirs}) {
  if (!prompts) return null;
  const a = lex.resolve(mine), b = lex.resolve(theirs);
  const concept = a ? lex.concepts.get(a) : null;
  if (!concept) return "strange";
  if (b && (concept.near.has(b) || [...concept.kinds.keys()].some(kind => lex.concepts.get(b)?.kinds.has(kind)))) return "close";
  const ids = prompts.map(word => lex.resolve(word));
  if (ids.every(id => !id || (id !== a && !concept.near.has(id)))) return "strange";
  return null;
}
