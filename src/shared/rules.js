// @ts-check
// Game rules and the move state machine shared by Solo (in the browser) and
// family games (on the server).
//
// A game is a list of moves. Each move is:
//   OPEN      -> waiting for both sides' words (prompts are the previous reveal)
//   REVEALED  -> both words shown, they differ; the next move opens with them
//   MATCHED   -> both words shown and they are the same; the game ends
//   EXHAUSTED -> move 20 revealed without a match; the game ends
// The game status mirrors the last move: ACTIVE while a move is OPEN,
// otherwise MATCHED or EXHAUSTED.

import {lemmaKeys, sameUnderlyingWord} from "./morph.js";
import {validateWord, wordKey} from "./words.js";

/**
 * @typedef {import("./types.js").GameState} GameState
 * @typedef {import("./types.js").GameStatus} GameStatus
 * @typedef {import("./types.js").Language} Language
 * @typedef {import("./types.js").Move} Move
 * @typedef {import("./types.js").MoveStatus} MoveStatus
 * @typedef {import("./types.js").Reveal} Reveal
 * @typedef {import("./types.js").RulesGame} RulesGame
 * @typedef {import("./types.js").Side} Side
 * @typedef {import("./types.js").WordCheck} WordCheck
 */

export const MAX_MOVES = 20;
export const SCHEMA_VERSION = 2;
/** @type {readonly Side[]} */
export const SIDES = ["a", "b"];
/** @type {ReadonlySet<string>} */
export const FINISHED = new Set(["MATCHED", "EXHAUSTED"]);

/**
 * The status a move gets when it is revealed with these two words.
 * Same underlying word (identical, or an ordinary inflection: CAR/CARS, RUN/RAN) is a match
 * and ends the game; synonyms and related words are different and the game goes on.
 * @param {number} number
 * @param {string} wordA
 * @param {string} wordB
 * @param {string} [language]
 * @returns {Exclude<MoveStatus, "OPEN">}
 */
export function moveOutcome(number, wordA, wordB, language = "en") {
  if (sameUnderlyingWord(wordA, wordB, language)) return "MATCHED";
  return number >= MAX_MOVES ? "EXHAUSTED" : "REVEALED";
}

/**
 * @param {{id: string, mode?: "solo" | "family", language?: string, seed?: number, now?: string}} options
 * @returns {GameState}
 */
export function createGame({id, mode = "solo", language = "en", seed = 0, now = new Date().toISOString()}) {
  return {
    schema: SCHEMA_VERSION,
    id,
    mode,
    language: language === "fr" ? "fr" : "en",
    seed,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    revealSeen: 0,
    moves: [openMove(1, null, now)]
  };
}

/**
 * @param {number} number
 * @param {[string, string] | null} prompts
 * @param {string} now
 * @returns {Move}
 */
function openMove(number, prompts, now) {
  return {number, prompts, words: null, status: "OPEN", openedAt: now, revealedAt: null};
}

/**
 * @template {{moves: any[]}} G
 * @param {G} game
 * @returns {G["moves"][number]}
 */
export function currentMove(game) {
  return game.moves[game.moves.length - 1];
}

/**
 * @param {{status: string}} game
 * @returns {boolean}
 */
export function isFinished(game) {
  return FINISHED.has(game.status);
}

/**
 * Keys of every word revealed so far, optionally for one side only.
 * @param {{moves: Array<{words: Reveal | null}>}} game
 * @param {Side} [side]
 * @returns {Set<string>}
 */
export function usedKeys(game, side) {
  const keys = new Set();
  for (const move of game.moves) {
    if (!move.words) continue;
    for (const s of side ? [side] : SIDES) keys.add(wordKey(move.words[s]));
  }
  return keys;
}

/**
 * Check a word for one side before it is locked in.
 * Errors: GAME_OVER, plus validateWord codes, plus
 *   SAME_AS_LAST  - the side's own previous word, typed again
 *   ALREADY_USED  - anyone (either player, Gary or Milo) already played this word in the game
 * Only revealed words count: the open move's words are never compared here, so two players
 * typing the same word in the same move is still a match.
 * @param {RulesGame} game
 * @param {Side} side
 * @param {unknown} raw
 * @returns {WordCheck}
 */
export function checkWord(game, side, raw) {
  if (isFinished(game)) return {ok: false, code: "GAME_OVER"};
  const valid = validateWord(raw);
  if (!valid.ok) return valid;
  // The same underlying word counts as a repeat too ("car" then "cars").
  const language = game.language || "en";
  const forms = lemmaKeys(valid.word, language);
  const overlaps = set => [...set].some(key => forms.has(key));
  const revealed = game.moves.flatMap(m => (m.words ? [m.words] : []));
  const last = revealed[revealed.length - 1];
  if (last && overlaps(lemmaKeys(last[side], language))) return {ok: false, code: "SAME_AS_LAST", word: valid.word};
  // A word is used up for everyone once anyone has played it (both sides of every revealed move).
  if (revealed.some(words => SIDES.some(s => overlaps(lemmaKeys(words[s], language))))) return {ok: false, code: "ALREADY_USED", word: valid.word};
  return valid;
}

/**
 * Reveal the open move with both sides' words. Returns a new game; the input is untouched.
 * Both words must already have passed checkWord.
 * @param {GameState} game
 * @param {Partial<Reveal> | undefined} words
 * @param {string} [now]
 * @returns {GameState}
 */
export function revealMove(game, words, now = new Date().toISOString()) {
  if (isFinished(game)) throw new Error("Game is already finished");
  const move = currentMove(game);
  if (!move || move.status !== "OPEN") throw new Error("Move is not open");
  const a = words?.a, b = words?.b;
  if (!a || !b || !wordKey(a) || !wordKey(b)) throw new Error("Both words are needed to reveal a move");
  const status = moveOutcome(move.number, a, b, game.language);
  /** @type {Move} */
  const closed = {...move, words: {a, b}, status, revealedAt: now};
  const moves = [...game.moves.slice(0, -1), closed];
  if (status === "REVEALED") moves.push(openMove(move.number + 1, [a, b], now));
  return {...game, moves, status: status === "REVEALED" ? "ACTIVE" : status, updatedAt: now};
}

/**
 * Small, fast, seedable PRNG (mulberry32).
 * @param {number} seed
 * @returns {() => number} values in [0, 1)
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} text
 * @returns {number} unsigned 32-bit FNV-1a hash
 */
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Deterministic per game and move, so a refresh never re-rolls the bot.
 * @param {{seed: number, id: string}} game
 * @param {number} number
 * @returns {() => number}
 */
export function moveRandom(game, number) {
  return seededRandom(hashString(`${game.seed}:${game.id}:${number}`));
}
