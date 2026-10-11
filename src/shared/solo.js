// @ts-check
// Solo games run entirely on the device. The bot locks in its word when a
// move opens (before the player types anything), so it cannot react to the
// player's word, and a refresh never changes its choice.

import {buildAssociationContext, associationContextScore} from "./association-context.js";
import {selectBotWord} from "./engine.js";
import {getLexicon} from "./lexicon/index.js";
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
const round3 = value => Math.round(value * 1000) / 1000;

/**
 * Phase 5: use the shared semantic-context layer as a bounded ordering signal among candidates that
 * the core engine has already declared strong and eligible. It never promotes a recovery candidate,
 * never widens the engine's quality window, and never changes how many positions Gary or Milo may
 * vary through. The engine's deterministic ordinal choice is preserved, so character behaviour stays
 * intact; semantic context only changes the ordering inside that already-approved pool.
 *
 * @param {{word: string, quality: string, decision: any}} pick
 * @param {{pair?: string[] | null, history?: {a?: string, b?: string}[], language?: string, character?: string, lex?: any}} input
 */
export function applyAssociationContextToPick(pick, {pair = null, history = [], language = "en", character = "gary", lex = null} = {}) {
  if (!pick?.decision || pick.quality !== "strong" || !Array.isArray(pair) || !history?.length) return pick;
  const decision = pick.decision;
  if (!decision.highQuality || !Array.isArray(decision.pool) || decision.pool.length < 2 || !Array.isArray(decision.candidates)) return pick;

  const lang = language === "fr" ? "fr" : "en";
  const graph = lex || getLexicon(lang);
  const context = buildAssociationContext({pair, history, language: lang, lex: graph, lookback: 4});
  const byWord = new Map(decision.candidates.map(candidate => [candidate.word, candidate]));
  const eligible = decision.pool.map(word => byWord.get(word)).filter(Boolean);
  if (eligible.length < 2) return pick;

  const ordinal = Math.max(0, decision.pool.indexOf(pick.word));
  const weight = character === "milo" ? 0.10 : 0.06;
  const ranked = eligible.map(candidate => {
    const conceptId = graph.resolve(candidate.word);
    const concept = conceptId ? graph.concepts.get(conceptId) : null;
    const semantic = concept ? associationContextScore(graph, concept, context) : 0;
    return {...candidate, semanticContext: semantic, contextualScore: round3((candidate.profileScore ?? candidate.final ?? 0) + weight * semantic)};
  }).sort((a, b) => b.contextualScore - a.contextualScore || (b.profileScore ?? 0) - (a.profileScore ?? 0) || a.word.localeCompare(b.word));

  const selected = ranked[Math.min(ordinal, ranked.length - 1)];
  if (!selected) return pick;
  decision.context = {
    applied: true,
    weight,
    ordinal,
    previous: pick.word,
    selected: selected.word,
    recentWords: context.recentWords,
    dominantTags: context.dominantTags.slice(0, 3),
    dominantCategories: context.dominantCategories.slice(0, 3),
    dominantTraits: context.dominantTraits.slice(0, 4),
    ranking: ranked.map(candidate => ({word: candidate.word, semantic: candidate.semanticContext, profileScore: candidate.profileScore ?? candidate.final ?? 0, contextualScore: candidate.contextualScore}))
  };
  if (decision.selection) decision.selection = {...decision.selection, semanticContextChanged: selected.word !== pick.word, preContextPick: pick.word, pick: selected.word};
  decision.selected = selected.word;
  return {...pick, word: selected.word, decision};
}

/**
 * Core engine selection plus Phase 5 semantic-context ordering. Exported so regression tests and
 * diagnostics can exercise the exact production path without touching game state.
 */
export function selectContextualBotWord(input) {
  const pick = selectBotWord(input);
  return applyAssociationContextToPick(pick, input);
}

/**
 * Lock the bot's word for the open move, before the player answers it. The engine's only input is
 * what both players can already see: the latest revealed pair, every word revealed so far (blocked
 * for both sides, and as the revealed rounds for the style and near-miss tie-breakers), the
 * language, the character (Milo's and Gary's difficulty profiles) and the move's seed. Never the
 * player's word for the open move.
 * @param {GameState} game
 * @returns {GameState}
 */
function lockBotWord(game) {
  if (isFinished(game)) return game;
  const move = currentMove(game);
  const blocked = game.moves.flatMap(m => (m.words ? [m.words.a, m.words.b] : []));
  const history = game.moves.flatMap(m => (m.words ? [{a: m.words.a, b: m.words.b}] : []));
  const started = clock();
  const pick = selectContextualBotWord({pair: move.prompts, blocked, history, language: game.language, character: game.character || "gary", seed: moveSeed(game, move.number)});
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
  // Who the player chose to play with (their difficulty profile and how they talk), and whether
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
