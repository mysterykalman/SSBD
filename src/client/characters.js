// The Solo characters: who the player chose to play with. Presentation only.
// Every character plays with the same word engine (src/shared/bot.js): same rules, same
// strength, same choices for the same game. A character only changes the name, the portrait
// and what they say around the word. Nothing here reads or changes game state or scoring,
// and nothing here makes network calls. Copy lives in i18n.js under the keys below.

/**
 * A line is [key, when]: typed before the character's word ("sigh" … STORY) or after it.
 * Match lines are two short phrases with a beat between them ("..." then "fine. you win this one").
 * @typedef {{
 *   id: string, name: string, title: string, tagline: string, personality: string,
 *   voiceId: string | null, voiceStyle: string, art: string,
 *   intro: {kicker: string, lines: string[], aside: string, cta: string}, meetAgain: string, copy: Record<string, string>,
 *   results: Partial<Record<Strength, string>>, resultAvoid: Partial<Record<Strength, string[]>>,
 *   lines: {
 *     mismatch: Record<string, [string, string][]>, close: [string, string][], strange: [string, string][],
 *     middle: string[], nearEnd: string[], earlyMatch: string[][], lateMatch: string[][], win: string[][],
 *     rematch: string[], gameOver: [string, string]
 *   }
 * }} Character
 * @typedef {"opening" | "strong" | "good" | "weak" | "veryWeak"} Strength
 */

/** @type {Record<string, Character>} */
export const CHARACTERS = {
  gary: {
    id: "gary",
    name: "garyName",
    title: "garyTitle",
    tagline: "garyTagline",
    personality: "dry",
    voiceId: null, // no recorded voice yet
    voiceStyle: "flat, tired, deadpan; short sighs",
    art: "gary",
    intro: {kicker: "garyMeet", lines: ["garyIntro1", "garyIntro2", "garyIntro3"], aside: "garyIntroSigh", cta: "garyIntroCta"},
    meetAgain: "garyMeetAgain",
    // Shared Solo copy in this character's own words (anything not listed uses the shared key).
    copy: {firstSolo: "garyFirstSolo", botReady: "garyBotReady", revealLoose: "garyRevealLoose", revealNextStarts: "garyRevealNextStarts", gameOverAww: "garyGameOverAww", gameOverCopy: "garyGameOverCopy"},
    // The reveal result, by how well the player's word fits the two words in play (see connectionStrength).
    results: {opening: "garyResultStart", strong: "garyResultStrong", good: "garyResultGood", weak: "garyResultWeak", veryWeak: "garyResultVeryWeak"},
    // Remarks not to make right after a given result (the same joke twice in one reveal).
    resultAvoid: {strong: ["garyAnnoyinglyGood"]},
    lines: {
      mismatch: {
        resigned: [["garySigh", "before"], ["garyFine", "before"], ["garyApparently", "before"], ["garyThisAgain", "before"], ["garyOkayThen", "before"], ["garyThere", "after"]],
        competitive: [["garyObject", "after"], ["garyRude", "after"], ["garyWasGoingTo", "after"], ["garyAnnoyinglyGood", "after"], ["garyPleased", "after"]],
        dramatic: [["garyNeedMinute", "after"], ["garyConcerns", "after"], ["garyUnnecessary", "after"], ["garyDoneNow", "after"], ["garyHappy", "after"]],
        minimal: [["garyUgh", "before"], ["garyReally", "before"], ["garyWow", "after"], ["garyNoted", "after"]]
      },
      close: [["garyClose", "after"], ["garyNearlyAgree", "after"], ["garyAlmost", "after"]],
      strange: [["garyBold", "after"], ["garyAllowIt", "after"], ["garyForTheFile", "after"]],
      middle: ["garyStillDoing"],
      nearEnd: ["garyToldEnding"],
      earlyMatch: [["garyDots", "garyAlready"]],
      lateMatch: [["garyDots", "garyEventually"]],
      win: [["garyDots", "garyInconvenient"], ["garyDots", "garyYouWin"], ["garyDots", "garyImpressive"]],
      rematch: ["garyRematch1", "garyRematch2"],
      gameOver: ["garyFinally", "garySameTime"]
    }
  },
  milo: {
    id: "milo",
    name: "miloName",
    title: "miloTitle",
    tagline: "miloTagline",
    personality: "bouncy",
    voiceId: null, // no recorded voice yet
    voiceStyle: "bright, fast, excited; lots of exclamation marks",
    art: "milo",
    intro: {kicker: "miloMeet", lines: ["miloIntro1", "miloIntro2", "miloIntro3"], aside: "miloIntroAside", cta: "miloIntroCta"},
    meetAgain: "miloMeetAgain",
    copy: {
      firstSolo: "miloFirstSolo", botReady: "miloBotReady", revealLoose: "miloRevealLoose", revealNice: "miloRevealNice",
      revealNextStarts: "miloRevealNextStarts", keepPlaying: "miloKeepPlaying", gameOverAww: "miloGameOverAww", gameOverCopy: "miloGameOverCopy"
    },
    results: {}, // one cheerful result line whatever the connection (copy.revealNice)
    resultAvoid: {},
    lines: {
      mismatch: {
        bouncy: [["miloOoh", "before"], ["miloGotOne", "before"], ["miloBoing", "after"], ["miloAgainAgain", "after"]],
        hype: [["miloNextOne", "after"], ["miloLetsGo", "after"], ["miloWiggle", "after"], ["miloLoveThat", "after"]],
        silly: [["miloHat", "before"], ["miloSocks", "after"], ["miloSnack", "before"], ["miloSpin", "after"]],
        minimal: [["miloHmm", "before"], ["miloWhee", "after"], ["miloNice", "after"]]
      },
      close: [["miloSoClose", "after"], ["miloTwins", "after"], ["miloWavelength", "after"]],
      strange: [["miloWhoa", "after"], ["miloSurprise", "after"], ["miloTwist", "after"]],
      middle: ["miloStillGoing"],
      nearEnd: ["miloWeCan"],
      earlyMatch: [["miloWhat", "miloAlreadyWow"]],
      lateMatch: [["miloPhew", "miloNeverGaveUp"]],
      win: [["miloYay", "miloSameWord"], ["miloYay", "miloBestDay"]],
      rematch: ["miloRematch1", "miloRematch2"],
      gameOver: ["miloFun", "miloAgainTomorrow"]
    }
  }
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);
export const DEFAULT_CHARACTER = "gary";

/** A known character id, or Gary (games saved before characters existed are Gary's). */
export const characterId = id => (Object.hasOwn(CHARACTERS, String(id)) ? String(id) : DEFAULT_CHARACTER);
export const character = id => CHARACTERS[characterId(id)];

export const REACTION_CHANCE = 0.3; // about a third of ordinary reveals
const KIND_CHANCE = 0.45; // close or strange answers get a remark a little more often
const MATCH_CHANCE = 0.7;
const SPECIAL_CHANCE = 0.2;
export const EARLY_MATCH = 3; // matched on move 1–3
export const LATE_MATCH = 12; // matched on move 12 or later

/** Every i18n key a character uses (for tests). */
export function characterKeys(id) {
  const c = character(id);
  const keys = new Set([c.name, c.title, c.tagline, c.intro.kicker, ...c.intro.lines, c.intro.aside, c.intro.cta, c.meetAgain, ...Object.values(c.copy), ...Object.values(c.results)]);
  for (const value of Object.values(c.lines)) {
    const lists = Array.isArray(value) ? [value] : Object.values(value);
    for (const list of lists) for (const item of list) for (const key of [item].flat()) if (key !== "before" && key !== "after") keys.add(key);
  }
  return [...keys];
}

const pickFrom = (list, used, random, keyOf) => {
  const fresh = list.filter(item => !keyOf(item).some(key => used.has(key) && !key.endsWith("Dots") && key !== "miloYay"));
  const pool = fresh.length ? fresh : list;
  return pool[Math.floor(random() * pool.length)];
};

/**
 * Decide whether the character says something on this reveal. Pure: same inputs, same answer.
 * @param {{character?: string, status: string, move: number, kind?: "close" | "strange" | null, recent?: string[], random?: () => number}} options
 *   status: the revealed move's status (REVEALED, MATCHED, EXHAUSTED); kind: how the player's word related
 *   to the round (see revealKind); recent: keys this character used lately in this game.
 * @returns {{when: "before" | "after", keys: string[], pool: string} | null}
 */
export function pickReaction({character: id, status, move, kind = null, recent = [], random = Math.random}) {
  const {lines} = character(id);
  const used = new Set(recent);
  if (status === "MATCHED") {
    if (random() >= MATCH_CHANCE) return null;
    const pool = move <= EARLY_MATCH ? "earlyMatch" : move >= LATE_MATCH ? "lateMatch" : "win";
    return {when: "after", keys: [...pickFrom(lines[pool], used, random, item => item)], pool};
  }
  if (status === "EXHAUSTED") return null; // the game-over beat says goodbye instead
  // Rare one-off lines around the middle and near the end of a long game.
  if (move >= 9 && move <= 11 && !lines.middle.some(key => used.has(key)) && random() < SPECIAL_CHANCE) return {when: "after", keys: [lines.middle[0]], pool: "long"};
  if (move >= 17 && move <= 19 && !lines.nearEnd.some(key => used.has(key)) && random() < SPECIAL_CHANCE) return {when: "after", keys: [lines.nearEnd[0]], pool: "long"};
  if (kind === "close" || kind === "strange") {
    if (random() < KIND_CHANCE) {
      const [key, when] = pickFrom(lines[kind], used, random, ([key]) => [key]);
      return {when: /** @type {"before" | "after"} */ (when), keys: [key], pool: kind};
    }
    return null;
  }
  if (random() >= REACTION_CHANCE) return null;
  const categories = Object.keys(lines.mismatch);
  const category = categories[Math.floor(random() * categories.length)];
  let pool = lines.mismatch[category].filter(([key]) => !used.has(key));
  if (!pool.length) pool = Object.values(lines.mismatch).flat().filter(([key]) => !used.has(key));
  if (!pool.length) pool = lines.mismatch[category];
  const [key, when] = pool[Math.floor(random() * pool.length)];
  return {when: /** @type {"before" | "after"} */ (when), keys: [key], pool: "mismatch"};
}

/** The i18n key for a shared Solo string in this character's own words (or the shared key). */
export const copyKey = (id, key) => character(id).copy[key] ?? key;

/** The reveal result line's key for a connection strength: the character's own, else their usual line. */
export const resultKey = (id, strength) => character(id).results[strength] ?? copyKey(id, "revealNice");
/** Remarks to skip right after that result line. */
export const resultAvoid = (id, strength) => character(id).resultAvoid[strength] ?? [];

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
