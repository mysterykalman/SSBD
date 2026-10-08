// @ts-check
// Solo games run entirely on the device. The bot locks in its word when a
// move opens (before the player types anything), so it cannot react to the
// player's word, and a refresh never changes its choice.

import {selectBotWord} from "./engine.js";
import {checkWord, createGame, currentMove, hashString, isFinished, revealMove, usedKeys} from "./rules.js";
import {wordKey} from "./words.js";

/**
 * @typedef {import("./types.js").GameState} GameState
 * @typedef {import("./types.js").BotQuality} BotQuality
 * @typedef {import("./types.js").Move} Move
 * @typedef {import("./types.js").WordError} WordError
 * @typedef {{ok: true, game: GameState, move: Move, decision?: object | null, decisionMs?: number | null}} SoloSubmitOk
 * @typedef {WordError | {ok: false, code: "BOT_NOT_READY"}} SoloSubmitError
 */

let explainDecisions = false;
/**
 * Developer diagnostics: also keep the engine's full decision on each revealed move (for the
 * ?debug=gary panel). Off by default. Every decision is always handed to the game log on reveal.
 * @param {boolean} on
 */
export function setGaryDiagnostics(on) {
  explainDecisions = Boolean(on);
}

/** The engine seed for one move of one game (fixed per game and move, so a reload gets the same word). */
export const moveSeed = (game, number) => hashString(`${game.seed}:${game.id}:${number}`);

const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Lock the bot's word for the open move, before the player answers it. The engine's only input is
 * what both players can already see: the latest revealed pair, every word revealed so far (blocked
 * for both sides), the language, the character and the move's seed. Never the player's word.
 * @param {GameState} game
 * @returns {GameState}
 */
function lockBotWord(game) {
  if (isFinished(game)) return game;
  const move = currentMove(game);
  const blocked = game.moves.flatMap(m => (m.words ? [m.words.a, m.words.b] : []));
  const started = clock();
  const pick = selectBotWord({pair: move.prompts, blocked, language: game.language, character: game.character || "gary", seed: moveSeed(game, move.number)});
  const ms = Math.round((clock() - started) * 10) / 10;
  const {hidden: _previous, ...rest} = move;
  /** @type {Move} */
  const locked = {...rest, hidden: {b: pick.word, quality: /** @type {BotQuality} */ (pick.quality), decision: pick.decision, ms}};
  return {...game, moves: [...game.moves.slice(0, -1), locked]};
}

/**
 * @param {{id: string, language?: string, seed?: number, character?: string, rematch?: boolean, now?: string}} options
 * @returns {GameState} a fresh game whose first move already holds the bot's hidden word
 */
export function startSoloGame({id, language = "en", seed, character, rematch = false, now = new Date().toISOString()}) {
  const game = createGame({id, mode: "solo", language, seed: seed ?? Math.floor(Math.random() * 2 ** 32), now});
  // Who the player chose to play with (presentation only: the engine never reads it), and whether
  // this game is a "Play again" of the previous one. Older games have neither, and are Gary's.
  return lockBotWord({...game, ...(character ? {character: String(character)} : {}), ...(rematch ? {rematch: true} : {})});
}

/**
 * Returns {ok:true, game, move} with the revealed move, or {ok:false, code, word}.
 * @param {GameState} game
 * @param {unknown} raw the player's word as typed
 * @param {string} [now]
 * @returns {SoloSubmitOk | SoloSubmitError}
 */
export function submitSoloWord(game, raw, now = new Date().toISOString()) {
  const check = checkWord(game, "a", raw);
  if (!check.ok) return check;
  // A game saved without a locked bot word (or with one that is no longer
  // allowed) gets one now. lockBotWord only looks at revealed words, never at
  // the word being submitted, so the bot still cannot react to the player.
  const pending = currentMove(game).hidden?.b;
  if (!pending || usedKeys(game).has(wordKey(pending))) game = lockBotWord(game);
  const move = currentMove(game);
  const botWord = move.hidden?.b;
  if (!botWord) return {ok: false, code: "BOT_NOT_READY"};
  const quality = move.hidden?.quality ?? "loose";
  let next = revealMove(game, {a: check.word, b: botWord}, now);
  const closed = next.moves.find(m => m.number === move.number);
  if (!closed) return {ok: false, code: "BOT_NOT_READY"};
  /** @type {Move} */
  const revealed = {...closed, botQuality: quality, ...(explainDecisions && move.hidden?.decision ? {garyDecision: move.hidden.decision} : {})};
  delete revealed.hidden;
  next = {...next, moves: next.moves.map(m => (m.number === move.number ? revealed : m))};
  next = lockBotWord(next);
  // The decision that produced this move's word (for the game log), committed before the reveal.
  return {ok: true, game: next, move: revealed, decision: move.hidden?.decision ?? null, decisionMs: move.hidden?.ms ?? null};
}

/**
 * Strip the bot's locked word from a move for display.
 * @param {Move} move
 * @returns {Move}
 */
export function publicMove(move) {
  if (!move.hidden) return move;
  const {hidden: _hidden, ...rest} = move;
  return rest;
}
