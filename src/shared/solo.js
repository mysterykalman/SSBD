// Solo games run entirely on the device. The bot locks in its word when a
// move opens (before the player types anything), so it cannot react to the
// player's word, and a refresh never changes its choice.

import {chooseOpening, chooseResponse} from "./bot.js";
import {checkWord, createGame, currentMove, isFinished, moveRandom, revealMove, usedKeys} from "./rules.js";
import {wordKey} from "./words.js";

function lockBotWord(game) {
  if (isFinished(game)) return game;
  const move = currentMove(game);
  const rng = moveRandom(game, move.number);
  const excludeKeys = usedKeys(game);
  const pick = move.prompts
    ? chooseResponse({prompts: move.prompts, language: game.language, excludeKeys, rng})
    : chooseOpening({language: game.language, excludeKeys, rng});
  const {hidden, ...rest} = move;
  const locked = {...rest, hidden: {b: pick.word, quality: pick.quality}};
  return {...game, moves: [...game.moves.slice(0, -1), locked]};
}

export function startSoloGame({id, language = "en", seed, now = new Date().toISOString()}) {
  const game = createGame({id, mode: "solo", language, seed: seed ?? Math.floor(Math.random() * 2 ** 32), now});
  return lockBotWord(game);
}

/** Returns {ok:true, game, move} with the revealed move, or {ok:false, code, word}. */
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
  let next = revealMove(game, {a: check.word, b: botWord}, now);
  const revealed = {...next.moves.find(m => m.number === move.number), botQuality: move.hidden.quality};
  delete revealed.hidden;
  next = {...next, moves: next.moves.map(m => (m.number === move.number ? revealed : m))};
  next = lockBotWord(next);
  return {ok: true, game: next, move: revealed};
}

/** Strip the bot's locked word from a move for display. */
export function publicMove(move) {
  if (!move.hidden) return move;
  const {hidden, ...rest} = move;
  return rest;
}
