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

import {validateWord, wordKey} from "./words.js";

export const MAX_MOVES = 20;
export const SCHEMA_VERSION = 2;
export const SIDES = ["a", "b"];
export const FINISHED = new Set(["MATCHED", "EXHAUSTED"]);

export function moveOutcome(number, wordA, wordB) {
  if (wordKey(wordA) === wordKey(wordB)) return "MATCHED";
  return number >= MAX_MOVES ? "EXHAUSTED" : "REVEALED";
}

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

function openMove(number, prompts, now) {
  return {number, prompts, words: null, status: "OPEN", openedAt: now, revealedAt: null};
}

export function currentMove(game) {
  return game.moves[game.moves.length - 1];
}

export function isFinished(game) {
  return FINISHED.has(game.status);
}

/** Keys of every word revealed so far, optionally for one side only. */
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
 *   SAME_AS_LAST  - the side's previous word, typed again
 *   ALREADY_USED  - the side used this word earlier in the game
 */
export function checkWord(game, side, raw) {
  if (isFinished(game)) return {ok: false, code: "GAME_OVER"};
  const valid = validateWord(raw);
  if (!valid.ok) return valid;
  const own = game.moves.filter(m => m.words).map(m => wordKey(m.words[side]));
  if (own.length && own[own.length - 1] === valid.key) return {ok: false, code: "SAME_AS_LAST", word: valid.word};
  if (own.includes(valid.key)) return {ok: false, code: "ALREADY_USED", word: valid.word};
  return valid;
}

/**
 * Reveal the open move with both sides' words. Returns a new game; the input is untouched.
 * Both words must already have passed checkWord.
 */
export function revealMove(game, words, now = new Date().toISOString()) {
  if (isFinished(game)) throw new Error("Game is already finished");
  const move = currentMove(game);
  if (move.status !== "OPEN") throw new Error("Move is not open");
  const status = moveOutcome(move.number, words.a, words.b);
  const closed = {...move, words: {a: words.a, b: words.b}, status, revealedAt: now};
  const moves = [...game.moves.slice(0, -1), closed];
  if (status === "REVEALED") moves.push(openMove(move.number + 1, [words.a, words.b], now));
  return {...game, moves, status: status === "REVEALED" ? "ACTIVE" : status, updatedAt: now};
}

/** Small, fast, seedable PRNG (mulberry32). */
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

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic per game and move, so a refresh never re-rolls the bot. */
export function moveRandom(game, number) {
  return seededRandom(hashString(`${game.seed}:${game.id}:${number}`));
}
