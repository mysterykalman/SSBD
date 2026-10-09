// The Solo characters: who the player chose to play with. Presentation only here: the name, the
// portrait and what they say around the word (each speaks through a branching narrative:
// src/client/gary-narrative.js, src/client/milo-narrative.js). Their difficulty profiles live in
// the engine (src/shared/engine.js: same rules and fairness for both; Milo easier, Gary harder).
// Nothing here reads or changes game state or scoring, and nothing here makes network calls.
// Copy lives in i18n.js under the keys below.

import {GARY_NARRATIVE} from "./gary-narrative.js";
import {MILO_NARRATIVE} from "./milo-narrative.js";

/**
 * A line is [key, when]: typed before the character's word ("sigh" … STORY) or after it.
 * Match lines are two short phrases with a beat between them ("..." then "fine. you win this one").
 * @typedef {{
 *   id: string, name: string, title: string, card: string[], personality: string,
 *   voiceId: string | null, voiceStyle: string, art: string,
 *   intro: {kicker: string, lines: string[], aside: string, cta: string} | null,
 *   replay: {kicker: string, lines: string[], aside: string | null, cta: string} | null, meetAgain: string | null, rating: string[], copy: Record<string, string>,
 *   narrative: Narrative,
 *   results: Partial<Record<Strength, string[]>>, resultAvoid: Partial<Record<Strength, string[]>>,
 *   lines: {
 *     mismatch: Record<string, [string, string][]>, close: [string, string][], strange: [string, string][],
 *     middle: string[], nearEnd: string[], earlyMatch: string[][], lateMatch: string[][], win: string[][],
 *     rematch: string[], gameOver: [string, string]
 *   }
 * }} Character
 * @typedef {"opening" | "strong" | "good" | "weak" | "veryWeak"} Strength
 * @typedef {ReturnType<typeof import("./narrative.js").createNarrative>} Narrative
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
    replay: null, // "Meet Gary again" replays his intro
    meetAgain: "garyMeetAgain",
    rating: ["garyRate1", "garyRate2"], // the 1–5 star question on the win card
    // Shared Solo copy in this character's own words (anything not listed uses the shared key).
    copy: {firstSolo: "garyFirstSolo", botReady: "garyBotReady"},
    // Gary speaks through his branching narrative (src/client/gary-narrative.js): one paired
    // before/after beat per move, chosen from the direction of the game. No random remarks.
    narrative: GARY_NARRATIVE,
    results: {},
    resultAvoid: {},
    lines: {mismatch: {}, close: [], strange: [], middle: [], nearEnd: [], earlyMatch: [], lateMatch: [], win: [], rematch: GARY_NARRATIVE.oneOffKeys("rematch"), gameOver: []}
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
    intro: null, // the picker card is his introduction (no first-game intro)
    // "Meet Milo again" (from the profile badge) replays his picker card lines in the intro dialog.
    replay: {kicker: "miloMeet", lines: ["miloCard1", "miloCard2"], aside: null, cta: "miloMeetCta"},
    meetAgain: "miloMeetAgain",
    rating: ["miloRate1", "miloRate2"], // the 1–5 star question on the win card
    copy: {},
    // Milo speaks through his branching narrative (src/client/milo-narrative.js): the same branches
    // and precedence as Gary's, in his own voice. No random remarks.
    narrative: MILO_NARRATIVE,
    results: {},
    resultAvoid: {},
    lines: {mismatch: {}, close: [], strange: [], middle: [], nearEnd: [], earlyMatch: [], lateMatch: [], win: [], rematch: MILO_NARRATIVE.oneOffKeys("rematch"), gameOver: []}
  }
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);
export const DEFAULT_CHARACTER = "gary";

/** A known character id, or Gary (games saved before characters existed are Gary's). */
export const characterId = id => (Object.hasOwn(CHARACTERS, String(id)) ? String(id) : DEFAULT_CHARACTER);
export const character = id => CHARACTERS[characterId(id)];


/** Every i18n key a character uses (for tests). */
export function characterKeys(id) {
  const c = character(id);
  const keys = new Set([c.name, c.title, ...c.card, ...c.rating, ...(c.intro ? [c.intro.kicker, ...c.intro.lines, c.intro.aside, c.intro.cta] : []),
    ...(c.replay ? [c.replay.kicker, ...c.replay.lines, ...(c.replay.aside ? [c.replay.aside] : []), c.replay.cta] : []), ...(c.meetAgain ? [c.meetAgain] : []),
    ...Object.values(c.copy), ...Object.values(c.results).flat()]);
  const n = c.narrative;
  for (const branch of n.BRANCHES) for (const pair of n.pairsOf(branch)) for (const key of Object.values(n.pairKeys(branch, pair))) keys.add(key);
  for (const kind of n.ONE_OFF) for (const key of n.oneOffKeys(kind)) keys.add(key);
  for (const value of Object.values(c.lines)) {
    const lists = Array.isArray(value) ? [value] : Object.values(value);
    for (const list of lists) for (const item of list) for (const key of [item].flat()) if (key !== "before" && key !== "after") keys.add(key);
  }
  return [...keys];
}

/** The i18n key for a shared Solo string in this character's own words (or the shared key). */
export const copyKey = (id, key) => character(id).copy[key] ?? key;

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

/** The line a character greets a rematch with (Play again keeps the same character). */
export function rematchLine(id, random = Math.random) {
  const list = character(id).lines.rematch;
  return list[Math.floor(random() * list.length)];
}

export const TAKING_A_WHILE_MS = 20000; // the player has been thinking this long without playing

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
