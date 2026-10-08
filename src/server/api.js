// @ts-check
// Family-game API backed by Postgres (Supabase in production). Request and
// response shapes are unchanged from the D1 releases, and rows written by
// them read back the same. Solo games are played on the device and never
// call this API; Solo games created by older releases (a "BOT" member) are
// still playable here.
//
// Concurrency and idempotency (Postgres runs requests truly in parallel):
// * Every multi-statement write is one transaction (store.tx): all of it or none of it.
// * Duplicate-safe writes use deterministic keys with ON CONFLICT DO NOTHING:
//   one submission per player per round, round `${game}:${n}`, notification
//   `${game}:${key}:${player}`, rematch id derived from the finished game's id.
// * A submission is committed on its own, and only then is the game re-read
//   (as one consistent snapshot). Whichever of two simultaneous submissions
//   commits second therefore always sees both words and reveals. Never put
//   "save + read + reveal" in one transaction: each would see only its own word.
// * Reveal progress is gated on `UPDATE rounds … WHERE status = 'OPEN' RETURNING`:
//   only the request that closes the round opens the next one and notifies.
// * Joins lock the game row (SELECT … FOR UPDATE), so racing joiners take turns.
// * Join and recovery code collisions use ON CONFLICT DO NOTHING RETURNING and
//   retry with a new code, so a collision never aborts the transaction.

import {chooseOpening, chooseResponse} from "../shared/bot.js";
import {MAX_MOVES, checkWord, hashString, moveOutcome, seededRandom} from "../shared/rules.js";
import {wordKey} from "../shared/words.js";
import {isSchemaMissing, isUnavailable, isUniqueViolation} from "./db.js";
import {isJoinCode, looksLikeRoomCode, normalizeJoinCode, randomJoinCode} from "../shared/codes.js";
import {logBatch, reviewRoute} from "./logs.js";

/**
 * @typedef {import("../shared/types.js").Store} Store
 * @typedef {import("../shared/types.js").Queryable} Queryable
 * @typedef {import("../shared/types.js").GameView} GameView
 * @typedef {import("../shared/types.js").GameStatus} GameStatus
 * @typedef {import("../shared/types.js").Move} Move
 * @typedef {import("../shared/types.js").MoveStatus} MoveStatus
 * @typedef {import("../shared/types.js").NotificationKind} NotificationKind
 * @typedef {import("../shared/types.js").Side} Side
 * @typedef {import("../shared/types.js").Submission} Submission
 *
 * @typedef {{id: string, join_code: string, status: string, round_number: number, created_at: string, updated_at: string, language?: string | null, rematch_of?: string | null}} GameRow
 * @typedef {{player_id: string, slot: number, display_name: string | null}} MemberRow
 * @typedef {{id: string, number: number, prompts: [string, string] | null, status: MoveStatus, openedAt: string, revealedAt: string | null, words: {a: string, b: string} | null, submitted: Partial<Record<Side, Submission>>, botQuality: any}} LoadedMove
 * @typedef {{row: GameRow, members: MemberRow[], moves: LoadedMove[], slotOf: Map<string, Side>, rematchId: string | null, stayed: string | null, rules: {status: GameStatus, language: string, moves: LoadedMove[]}}} LoadedGame
 *   stayed: in a game someone left (ENDED), the player who was told (the one who did not leave)
 * @typedef {{joinCode: () => string, recoveryDigits: () => number}} Codes
 * @typedef {{store?: Store | null, codes?: Partial<Codes>, reviewToken?: string}} ApiEnv
 */

const BOT = "BOT";
/** Finished game statuses, including COMPLETE from earlier releases (read as MATCHED). */
const FINISHED = new Set(["MATCHED", "EXHAUSTED", "COMPLETE", "ENDED"]);
/** @param {GameRow} row */
const isPlayable = row => row.status !== "WAITING" && !FINISHED.has(row.status);
/** Notification kinds the API creates (family games only). */
export const NOTIFICATION_KINDS = ["YOUR_TURN", "READY_TO_REVEAL", "PLAYER_JOINED", "GAME_COMPLETE", "GAME_EXHAUSTED", "REMATCH"];
const NOTIFICATION_LIMIT = 50;
/** Tables the API needs; /api/health reports SCHEMA_MISSING until all exist. */
export const TABLES = ["players", "games", "game_players", "rounds", "submissions", "notifications"];
const CODE_ATTEMPTS = 5;
/** Room codes are short (67,600 in all), so allow more attempts to find one no active room uses. */
const JOIN_CODE_ATTEMPTS = 25;
/** Rooms whose code is in use: waiting for a friend, or being played. Finished rooms free their code. */
const ACTIVE_ROOM = "status IN ('WAITING', 'ACTIVE')";
/**
 * Whether an active room already uses this code (checked inside the creating transaction; a racing
 * insert of the same code is still caught by the database's unique index and retried).
 * @param {Queryable} q
 * @param {string} code
 */
const codeInUse = async (q, code) => Boolean(await first(q, `SELECT 1 AS used FROM games WHERE join_code = $1 AND ${ACTIVE_ROOM} LIMIT 1`, [code]));

/** @param {unknown} data @param {number} [status] */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}
});
/** @param {number} status @param {string} code @param {string} error @param {object} [extra] */
const fail = (status, code, error, extra = {}) => json({error, code, ...extra}, status);
const uuid = () => crypto.randomUUID();
/** @param {unknown} error */
const reason = error => (error instanceof Error ? error.message : String(error));
const now = () => new Date().toISOString();
/** @type {Codes} */
const RANDOM_CODES = {
  joinCode: () => randomJoinCode(),
  recoveryDigits: () => Math.floor(1000 + Math.random() * 9000)
};

/**
 * @param {Queryable} q
 * @param {string} sql
 * @param {unknown[]} [args]
 * @returns {Promise<any[]>}
 */
async function all(q, sql, args = []) {
  return (await q.query(sql, args)).rows;
}
/**
 * @param {Queryable} q
 * @param {string} sql
 * @param {unknown[]} [args]
 * @returns {Promise<any>}
 */
async function first(q, sql, args = []) {
  return (await all(q, sql, args))[0] || null;
}

/**
 * The id of the rematch started from a game. Deterministic, so two players (or
 * a retry) asking at the same time can only ever create one rematch: the
 * second insert hits the primary key.
 * @param {string} gameId
 * @returns {Promise<string>}
 */
export async function rematchIdFor(gameId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rematch:${gameId}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // UUID version 5 layout (name-based, SHA)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Load everything about one game and shape it as a rules-style game. All reads
 * come from one snapshot, so a reveal committing halfway through can never
 * produce a mixed view (rounds from before it, submissions from after it).
 * @param {Store} db
 * @param {string} gameId
 * @returns {Promise<LoadedGame | null>}
 */
async function loadGame(db, gameId) {
  if (!gameId) return null;
  const raw = await db.snapshot(async q => {
    /** @type {GameRow | null} */
    const game = await first(q, "SELECT * FROM games WHERE id = $1", [gameId]);
    if (!game) return null;
    const members = await all(q, "SELECT gp.player_id, gp.slot, p.display_name FROM game_players gp LEFT JOIN players p ON p.id = gp.player_id WHERE gp.game_id = $1 ORDER BY gp.slot", [gameId]);
    const rounds = await all(q, "SELECT * FROM rounds WHERE game_id = $1 ORDER BY round_number", [gameId]);
    const submissions = await all(q, "SELECT s.round_id, s.player_id, s.word, s.submitted_at FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = $1", [gameId]);
    /** @type {{id: string} | null} */
    let linked = null;
    if (FINISHED.has(game.status)) linked = await first(q, "SELECT id FROM games WHERE id = $1 AND rematch_of = $2", [await rematchIdFor(game.id), game.id]);
    // A game someone left: the player who stayed is the one the PLAYER_LEFT notification went to.
    const stayed = game.status === "ENDED" ? await first(q, "SELECT player_id FROM notifications WHERE game_id = $1 AND kind = 'PLAYER_LEFT' LIMIT 1", [gameId]) : null;
    return {game, members, rounds, submissions, linked, stayed};
  });
  if (!raw) return null;
  const {game, members, rounds, submissions, linked, stayed} = raw;
  /** @type {Map<string, Side>} */
  const slotOf = new Map(members.map(m => [m.player_id, m.slot === 1 ? "a" : "b"]));
  /** @type {LoadedMove[]} */
  const moves = rounds.map(round => {
    const played = submissions.filter(s => s.round_id === round.id);
    /** @type {Partial<Record<Side, Submission>>} */
    const bySide = {};
    for (const s of played) {
      const side = slotOf.get(s.player_id);
      if (side) bySide[side] = s;
    }
    const status = round.status === "COMPLETE" ? "MATCHED" : round.status;
    const revealed = status !== "OPEN";
    return {
      id: round.id,
      number: round.round_number,
      prompts: round.previous_a || round.previous_b ? [round.previous_a, round.previous_b] : null,
      status,
      openedAt: round.created_at,
      revealedAt: round.revealed_at,
      words: revealed && bySide.a && bySide.b ? {a: bySide.a.word, b: bySide.b.word} : null,
      submitted: bySide,
      botQuality: round.bot_quality || null
    };
  });
  /** @type {GameStatus} */
  const status = game.status === "COMPLETE" ? "MATCHED" : game.status === "MATCHED" || game.status === "EXHAUSTED" || game.status === "ENDED" ? game.status : "ACTIVE";
  return {row: game, members, moves, slotOf, rematchId: linked ? linked.id : null, stayed: stayed ? stayed.player_id : null, rules: {status, language: game.language === "fr" ? "fr" : "en", moves}};
}

/**
 * A game is a legacy Solo game exactly when the BOT is one of its members.
 * @param {{members: Array<{player_id: string}>}} loaded
 */
const isLegacySolo = loaded => loaded.members.some(m => m.player_id === BOT);

/**
 * The game as one player is allowed to see it: the other side's word stays hidden until reveal.
 * @param {LoadedGame} loaded
 * @param {string} playerId
 * @returns {GameView}
 */
function viewFor(loaded, playerId) {
  const {row, members, moves, slotOf} = loaded;
  const side = slotOf.get(playerId);
  const otherSide = side === "a" ? "b" : "a";
  const other = members.find(m => m.player_id !== playerId);
  const bot = isLegacySolo(loaded);
  const status = /** @type {GameView["status"]} */ (row.status === "COMPLETE" ? "MATCHED" : row.status);
  return {
    kind: bot ? "legacy-solo" : "family",
    id: row.id,
    joinCode: row.join_code,
    language: row.language === "fr" ? "fr" : "en",
    status,
    waitingForPlayer: status === "WAITING",
    // Someone left: "other" for the player who stayed (they are told), "you" for the one who left.
    leftBy: status === "ENDED" ? (loaded.stayed === playerId ? "other" : "you") : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    maxMoves: MAX_MOVES,
    you: {side, name: members.find(m => m.player_id === playerId)?.display_name || null},
    opponent: {side: otherSide, bot, name: bot ? null : other?.display_name || null, joined: Boolean(other)},
    rematchId: bot ? null : loaded.rematchId,
    moves: moves.map(move => ({
      number: move.number,
      prompts: move.prompts,
      status: move.status,
      openedAt: move.openedAt,
      revealedAt: move.revealedAt,
      words: move.words,
      botQuality: move.botQuality,
      mine: move.status === "OPEN" && side ? move.submitted[side]?.word || null : null,
      otherLocked: move.status === "OPEN" ? Boolean(move.submitted[otherSide]) : false
    }))
  };
}

/**
 * A player leaves a game (Together "Leave game"): it ends for both (status ENDED, never a win or a
 * loss), and the other player is told (PLAYER_LEFT), so nobody is left waiting. Works before anyone
 * joined, mid-round, after a reveal, and again after a reload: leaving a game that already ended
 * changes nothing.
 * @param {Store} db
 * @param {any} body {player_id, game_id}
 */
async function leave(db, body) {
  const playerId = String(body.player_id || ""), gameId = String(body.game_id || "");
  const player = await first(db, "SELECT id, display_name FROM players WHERE id = $1", [playerId]);
  if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
  const result = await db.tx(async q => {
    // Lock the game row: a reveal or a second leave waits, then sees the game as it now is.
    const game = await first(q, "SELECT * FROM games WHERE id = $1 FOR UPDATE", [gameId]);
    if (!game) return "missing";
    const members = await all(q, "SELECT player_id FROM game_players WHERE game_id = $1", [gameId]);
    if (!members.some(m => m.player_id === playerId)) return "stranger";
    if (game.status !== "WAITING" && game.status !== "ACTIVE") return "done";
    const at = now();
    await q.query("UPDATE games SET status = 'ENDED', updated_at = $1 WHERE id = $2", [at, gameId]);
    for (const m of members) {
      if (m.player_id !== playerId && m.player_id !== BOT) await notify(q, m.player_id, gameId, "PLAYER_LEFT", `${player.display_name} left the game.`, "left", at);
    }
    return "left";
  });
  if (result === "missing") return fail(404, "GAME_NOT_FOUND", "Game not found");
  if (result === "stranger") return fail(403, "NOT_A_MEMBER", "You are not part of this game");
  const loaded = await loadGame(db, gameId);
  if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
  return json({ok: true, left: result === "left", game: viewFor(loaded, playerId)});
}

/**
 * One notification row. The id is deterministic (`${gameId}:${key}:${playerId}`)
 * and the insert does nothing if it already exists, so retries and races never
 * duplicate it. Only call this for family games.
 * @param {Queryable} q
 * @param {string} playerId
 * @param {string} gameId
 * @param {NotificationKind} kind
 * @param {string} message
 * @param {string} key
 * @param {string} at
 */
const notify = (q, playerId, gameId, kind, message, key, at) =>
  q.query("INSERT INTO notifications (id,player_id,game_id,kind,message,read_at,created_at) VALUES($1,$2,$3,$4,$5,NULL,$6) ON CONFLICT (id) DO NOTHING", [`${gameId}:${key}:${playerId}`, playerId, gameId, kind, message, at]);

/**
 * Reveal the open round once every member has a word. Safe to run any number of
 * times concurrently: closing the round (`… WHERE status = 'OPEN' RETURNING`) locks
 * it, and only the transaction that actually closed it opens the next round,
 * moves the game on and notifies. A second request waits for the first, finds the
 * round already closed and changes nothing. All of it commits or none of it does.
 * @param {Store} db
 * @param {LoadedGame} loaded
 * @returns {Promise<boolean>} whether a reveal was attempted (the caller re-reads either way)
 */
async function revealIfReady(db, loaded) {
  const {row, members, moves} = loaded;
  const move = moves[moves.length - 1];
  if (!isPlayable(row) || !move || move.status !== "OPEN" || !move.submitted.a || !move.submitted.b) return false;
  const a = move.submitted.a.word, b = move.submitted.b.word, at = now();
  const outcome = moveOutcome(move.number, a, b, row.language === "fr" ? "fr" : "en");
  // Notifications are for family games only; legacy Solo games never get any.
  const humans = isLegacySolo(loaded) ? [] : members;
  await db.tx(async q => {
    const closed = await q.query("UPDATE rounds SET status = $1, revealed_at = $2 WHERE id = $3 AND status = 'OPEN' RETURNING id", [outcome, at, move.id]);
    if (closed.rowCount !== 1) return; // another request revealed this move first
    if (outcome === "REVEALED") {
      await q.query("UPDATE games SET round_number = $1, status = 'ACTIVE', updated_at = $2 WHERE id = $3 AND round_number = $4", [move.number + 1, at, row.id, move.number]);
      await q.query("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES($1,$2,$3,$4,$5,'OPEN',$6,NULL) ON CONFLICT DO NOTHING", [`${row.id}:${move.number + 1}`, row.id, move.number + 1, a, b, at]);
      for (const m of humans) await notify(q, m.player_id, row.id, "READY_TO_REVEAL", "New move ready! Find the next connection!", `reveal-${move.number}`, at);
    } else {
      await q.query("UPDATE games SET status = $1, updated_at = $2 WHERE id = $3 AND status = 'ACTIVE'", [outcome, at, row.id]);
      for (const m of humans) await notify(q, m.player_id, row.id, outcome === "MATCHED" ? "GAME_COMPLETE" : "GAME_EXHAUSTED", outcome === "MATCHED" ? "You matched! Same thing!" : "That one got away from us. Try a rematch!", "end", at);
    }
  });
  return true;
}

/**
 * Older server-side Solo games: the bot picks from the prompts and earlier words only.
 * @param {LoadedGame} loaded
 */
function legacyBotWord(loaded) {
  const move = loaded.moves[loaded.moves.length - 1];
  const excludeKeys = new Set();
  for (const m of loaded.moves) for (const s of Object.values(m.submitted)) if (m !== move) excludeKeys.add(wordKey(s.word));
  const rng = seededRandom(hashString(`${loaded.row.id}:${move.number}`));
  const language = loaded.row.language === "fr" ? "fr" : "en";
  return move.prompts
    ? chooseResponse({prompts: move.prompts, language, excludeKeys, rng, history: loaded.moves.flatMap(m => (m.words ? [[m.words.a, m.words.b]] : []))})
    : chooseOpening({language, excludeKeys, rng});
}

/**
 * Finish any work an earlier request left half-done (for example a function
 * that stopped between storing a word and revealing): a legacy Solo bot that
 * has not played yet plays now, and a move with both words is revealed.
 * Idempotent. Returns the (re)loaded game.
 * @param {Store} db
 * @param {LoadedGame} loaded
 * @returns {Promise<LoadedGame>}
 */
async function settle(db, loaded) {
  const move = loaded.moves[loaded.moves.length - 1];
  if (!isPlayable(loaded.row) || !move || move.status !== "OPEN") return loaded;
  const botSide = loaded.slotOf.get(BOT);
  let changed = false;
  if (botSide && !move.submitted[botSide] && Object.keys(move.submitted).length) {
    const pick = legacyBotWord(loaded);
    const at = now();
    await db.tx(async q => {
      await q.query("INSERT INTO submissions (round_id,player_id,word,submitted_at) VALUES($1,$2,$3,$4) ON CONFLICT (round_id, player_id) DO NOTHING", [move.id, BOT, pick.word, at]);
      await q.query("UPDATE rounds SET bot_quality = $1, bot_reason = NULL WHERE id = $2 AND status = 'OPEN'", [pick.quality, move.id]);
    });
    changed = true;
  }
  if (changed) loaded = await reload(db, loaded);
  if (await revealIfReady(db, loaded)) changed = true;
  return changed ? reload(db, loaded) : loaded;
}

/**
 * Re-read a game that is known to exist (games are never deleted).
 * @param {Store} db
 * @param {LoadedGame} loaded
 * @returns {Promise<LoadedGame>}
 */
async function reload(db, loaded) {
  const fresh = await loadGame(db, loaded.row.id);
  if (!fresh) throw new Error(`Game ${loaded.row.id} disappeared`);
  return fresh;
}

/** @type {Record<string, string>} */
/** A display name as stored: single spaces, trimmed, at most 24 characters. */
const cleanName = raw => String(raw || "").replace(/\s+/g, " ").trim().slice(0, 24);

const MESSAGES = {
  EMPTY: "Add a word first, then lock it in.",
  TOO_LONG: "That word is a bit long. Try a shorter one.",
  INVALID_CHARACTERS: "Use letters only (spaces, hyphens and apostrophes are fine).",
  TOO_SHORT: "Try a word with at least two letters.", // retired: one-letter words are allowed
  TOO_MANY_WORDS: "Try one word (or a short phrase of up to three words).",
  SAME_AS_LAST: "You just played that word. Try a different one!",
  ALREADY_USED: "That word has already been played.",
  GAME_OVER: "This game is over. Start a new game to play again."
};

/**
 * @param {Store} db
 * @param {any} body
 */
async function submit(db, body) {
  const playerId = String(body.player_id || "");
  const loaded = await loadGame(db, String(body.game_id || ""));
  if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
  const side = loaded.slotOf.get(playerId);
  if (!side) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
  const current = loaded.moves[loaded.moves.length - 1];
  const asked = Number(body.move) || current.number;

  // A retry for a move that is already locked or revealed: answer with the current state.
  const askedMove = loaded.moves.find(m => m.number === asked);
  if (askedMove && askedMove.submitted[side]) {
    if (askedMove.status === "OPEN" && wordKey(askedMove.submitted[side].word) !== wordKey(body.word)) {
      return fail(409, "ALREADY_LOCKED", "Your word for this move is already locked in.", {game: viewFor(loaded, playerId)});
    }
    return json({ok: true, duplicate: true, game: viewFor(await settle(db, loaded), playerId)});
  }
  if (loaded.row.status === "WAITING") return fail(409, "WAITING_FOR_PLAYER", "Waiting for the other player to join.");
  if (FINISHED.has(loaded.row.status)) return fail(409, "GAME_OVER", MESSAGES.GAME_OVER, {game: viewFor(loaded, playerId)});
  if (asked !== current.number || current.status !== "OPEN") return fail(409, "STALE_MOVE", "This move already finished. Here is the latest.", {game: viewFor(loaded, playerId)});

  const check = checkWord(loaded.rules, side, body.word);
  if (!check.ok) return fail(400, check.code, MESSAGES[check.code] || "That word can't be used.", {word: check.word});

  // Step 1: store the word and commit it on its own (with a legacy Solo bot's word in the same
  // transaction). One row per player per round: a retry or a racing second request does nothing.
  const at = now();
  const botSide = loaded.slotOf.get(BOT);
  const bot = botSide && !current.submitted[botSide] ? legacyBotWord(loaded) : null;
  await db.tx(async q => {
    await q.query("INSERT INTO submissions (round_id,player_id,word,submitted_at) VALUES($1,$2,$3,$4) ON CONFLICT (round_id, player_id) DO NOTHING", [current.id, playerId, check.word, at]);
    if (bot) {
      await q.query("INSERT INTO submissions (round_id,player_id,word,submitted_at) VALUES($1,$2,$3,$4) ON CONFLICT (round_id, player_id) DO NOTHING", [current.id, BOT, bot.word, at]);
      await q.query("UPDATE rounds SET bot_quality = $1, bot_reason = NULL WHERE id = $2", [bot.quality, current.id]);
    }
  });

  // Step 2, only after that commit: re-read. If the other player submitted at the same
  // moment, whichever commit landed second sees both words here, so the move is revealed.
  // Never report success unless the stored row is confirmed.
  let fresh = await reload(db, loaded);
  const mine = fresh.moves.find(m => m.number === current.number)?.submitted[side];
  if (!mine) return fail(503, "NOT_SAVED", "We couldn't save your word. Please try again.");
  if (wordKey(mine.word) !== check.key) return fail(409, "ALREADY_LOCKED", "Your word for this move is already locked in.", {game: viewFor(fresh, playerId)});
  if (await revealIfReady(db, fresh)) fresh = await reload(db, fresh);
  else if (!isLegacySolo(fresh)) {
    const other = fresh.members.find(m => m.player_id !== playerId);
    // Best effort: the word is already saved, so a failed notification must not turn into an error.
    if (other) await notify(db, other.player_id, loaded.row.id, "YOUR_TURN", "Your friend played. Your turn!", `turn-${current.number}`, at).catch(error => console.error("YOUR_TURN notification failed", reason(error)));
  }
  return json({ok: true, game: viewFor(fresh, playerId)});
}

/**
 * Start (or return) the rematch of a finished family game: same players in
 * the same slots, same language, a fresh round 1. Idempotent for both players:
 * the rematch id is derived from the finished game's id, so every request
 * (both players, retries, races) aims at the same row and only one can create it.
 * @param {Store} db
 * @param {any} body
 * @param {Codes} codes
 */
async function rematch(db, body, codes) {
  const playerId = String(body.player_id || "");
  const player = await first(db, "SELECT id, display_name FROM players WHERE id = $1", [playerId]);
  if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
  const loaded = await loadGame(db, String(body.game_id || ""));
  if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
  if (!loaded.slotOf.has(playerId)) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
  if (isLegacySolo(loaded)) return fail(409, "NOT_FAMILY_GAME", "Rematches are for family games.");
  if (!FINISHED.has(loaded.row.status) || loaded.row.status === "ENDED" || loaded.members.length !== 2) return fail(409, "GAME_NOT_FINISHED", "Finish this game first, then start a rematch.");

  const id = await rematchIdFor(loaded.row.id);
  /** @returns {Promise<{id: string, join_code: string} | null>} */
  const existing = () => first(db, "SELECT id, join_code FROM games WHERE id = $1", [id]);
  const found = await existing();
  if (found) return json({id: found.id, join_code: found.join_code, existing: true});

  const created = now();
  const language = loaded.row.language === "fr" ? "fr" : "en";
  const others = loaded.members.filter(m => m.player_id !== playerId);
  try {
    for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt++) {
      const code = codes.joinCode();
      const outcome = await db.tx(async q => {
        if (await codeInUse(q, code)) return (await first(q, "SELECT 1 AS ok FROM games WHERE id = $1", [id])) ? "exists" : "collision";
        // DO NOTHING on either key: a racing request already created this rematch (same id), or the code is taken.
        // If the other request is still in flight, this insert waits for it to commit or roll back.
        const inserted = await q.query("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language,rematch_of) VALUES($1,$2,'ACTIVE',1,$3,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id", [id, code, created, language, loaded.row.id]);
        if (inserted.rowCount !== 1) return (await first(q, "SELECT 1 AS ok FROM games WHERE id = $1", [id])) ? "exists" : "collision";
        for (const m of loaded.members) await q.query("INSERT INTO game_players (game_id,player_id,slot,joined_at) VALUES($1,$2,$3,$4)", [id, m.player_id, m.slot, created]);
        await q.query("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES($1,$2,1,NULL,NULL,'OPEN',$3,NULL)", [`${id}:1`, id, created]);
        for (const m of others) await notify(q, m.player_id, id, "REMATCH", `${player.display_name} wants a rematch!`, "rematch", created);
        return "created";
      });
      if (outcome === "created") return json({id, join_code: code, existing: false});
      if (outcome === "exists") break;
    }
  } catch (error) {
    if (isUnavailable(error)) throw error;
    console.error("rematch create failed", error);
  }
  // Lost a race with the other player (or a retry): the rematch exists now.
  const raced = await existing();
  if (raced) return json({id: raced.id, join_code: raced.join_code, existing: true});
  return fail(500, "GAME_CREATE_FAILED", "Could not create a game right now. Please try again.");
}

/** Notifications for family games only: never for legacy Solo (BOT) games. `$1` is the player id. */
const FAMILY_NOTIFICATION = "n.player_id = $1 AND n.game_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM game_players b WHERE b.game_id = n.game_id AND b.player_id = 'BOT')";

/**
 * @param {Store} db
 * @param {string} playerId
 * @returns {Promise<number>}
 */
async function unreadCount(db, playerId) {
  const row = await first(db, `SELECT COUNT(*)::int AS n FROM notifications n WHERE ${FAMILY_NOTIFICATION} AND n.read_at IS NULL`, [playerId]);
  return Number(row?.n || 0);
}

/**
 * Newest first; `seq` (insertion order) breaks ties between equal timestamps.
 * @param {Store} db
 * @param {string} playerId
 * @returns {Promise<import("../shared/types.js").Notification[]>}
 */
async function listNotifications(db, playerId) {
  return all(db, `SELECT n.id, n.kind, n.game_id, n.created_at, n.read_at,
    (SELECT p.display_name FROM game_players o JOIN players p ON p.id = o.player_id WHERE o.game_id = n.game_id AND o.player_id <> n.player_id LIMIT 1) AS opponent_name
    FROM notifications n WHERE ${FAMILY_NOTIFICATION}
    ORDER BY n.created_at DESC, n.seq DESC LIMIT $2`, [playerId, NOTIFICATION_LIMIT]);
}

/**
 * Whether the database is reachable and migrated.
 * @param {Store} db
 */
async function health(db) {
  try {
    const row = await first(db, "SELECT COUNT(*)::int AS n FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])", [TABLES]);
    if (Number(row?.n) !== TABLES.length) return fail(503, "SCHEMA_MISSING", "The database has not been set up yet.", {ok: false, db: true});
    return json({ok: true, db: true});
  } catch (error) {
    console.error("health check failed", reason(error));
    return fail(503, "DB_UNAVAILABLE", "The database is not reachable right now.", {ok: false, db: false});
  }
}

/**
 * Handle one /api/* request. Database outages and a missing schema come back as
 * JSON 503s with their own codes, so the app can say "unavailable" instead of
 * showing a generic error.
 * @param {Request} request
 * @param {ApiEnv} env
 * @returns {Promise<Response>}
 */
export async function handleApi(request, env) {
  const db = env.store;
  if (!db) return fail(503, "NO_DATABASE", "Database is not configured", {ok: false, db: false});
  try {
    return await route(request, db, {...RANDOM_CODES, ...env.codes}, env.reviewToken);
  } catch (error) {
    if (isUnavailable(error)) {
      console.error("database unavailable", reason(error));
      return fail(503, "DB_UNAVAILABLE", "The database is not reachable right now.");
    }
    if (isSchemaMissing(error)) {
      console.error("database schema missing", reason(error));
      return fail(503, "SCHEMA_MISSING", "The database has not been set up yet.");
    }
    throw error;
  }
}

/**
 * @param {Request} request
 * @param {Store} db
 * @param {Codes} codes
 * @param {string} [reviewToken] the server-side REVIEW_TOKEN (review endpoints are off without it)
 * @returns {Promise<Response>}
 */
async function route(request, db, codes, reviewToken) {
  const url = new URL(request.url);
  const path = url.pathname;
  /** @type {any} */
  let body = {};
  if (request.method !== "GET" && request.method !== "HEAD") {
    try { body = await request.json(); } catch {}
  }

  if (path === "/api/health") return health(db);

  // Solo bot evaluation logs (anonymous, write-only) and the token-protected review endpoints.
  if (path === "/api/log/batch" && request.method === "POST") return logBatch(db, body);
  const review = await reviewRoute(request, db, reviewToken, body);
  if (review) return review;

  if (path === "/api/player" && request.method === "POST") {
    const created = now(), playerId = uuid();
    const displayName = cleanName(body.display_name) || "Player";
    if (looksLikeRoomCode(displayName)) return fail(400, "BAD_NAME", "That looks like a game code. Please type your name.");
    const base = displayName.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "PLAYER";
    try {
      for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
        const recoveryCode = base + "-" + codes.recoveryDigits();
        // A recovery-code collision inserts nothing (no error), so just try another code.
        const inserted = await db.query("INSERT INTO players (id,display_name,recovery_code,created_at,last_seen_at) VALUES($1,$2,$3,$4,$4) ON CONFLICT (recovery_code) DO NOTHING RETURNING id", [playerId, displayName, recoveryCode, created]);
        if (inserted.rowCount === 1) return json({id: playerId, display_name: displayName, recovery_code: recoveryCode});
      }
    } catch (error) {
      if (isUnavailable(error) || isSchemaMissing(error)) throw error;
      // Anything else is a real failure to report, not a collision to retry.
      console.error("player create failed", error);
    }
    return fail(500, "PLAYER_CREATE_FAILED", "Could not create a player right now. Please try again.");
  }

  // A player's own name, typed again when they join a game (they may change it).
  if (path === "/api/player/name" && request.method === "POST") {
    const displayName = cleanName(body.display_name);
    if (!displayName) return fail(400, "EMPTY_NAME", "Please type your name.");
    if (looksLikeRoomCode(displayName)) return fail(400, "BAD_NAME", "That looks like a game code. Please type your name.");
    const updated = await first(db, "UPDATE players SET display_name = $1, last_seen_at = $2 WHERE id = $3 RETURNING id, display_name, recovery_code", [displayName, now(), String(body.player_id || "")]);
    return updated ? json(updated) : fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
  }

  // Is there an open room with this code? Checked before asking a joining player for their name.
  if (path === "/api/games/lookup" && request.method === "GET") {
    const code = normalizeJoinCode(url.searchParams.get("code"));
    if (!isJoinCode(code)) return fail(400, "BAD_JOIN_CODE", "Game codes are two letters and two numbers, like AB12.");
    const game = await first(db, `SELECT id FROM games WHERE join_code = $1 AND ${ACTIVE_ROOM} ORDER BY created_at DESC LIMIT 1`, [code]);
    if (!game) return fail(404, "GAME_NOT_FOUND", "We couldn't find a game with that code.");
    const members = await all(db, "SELECT player_id FROM game_players WHERE game_id = $1", [game.id]);
    const member = members.some(m => m.player_id === String(url.searchParams.get("player_id") || ""));
    if (!member && members.length >= 2) return fail(409, "GAME_FULL", "That game already has two players.");
    return json({ok: true, join_code: code, member});
  }

  if (path === "/api/player/recover" && request.method === "POST") {
    const found = await first(db, "SELECT id, display_name, recovery_code FROM players WHERE recovery_code = $1", [String(body.recovery_code || "").toUpperCase().trim()]);
    return found ? json(found) : fail(404, "RECOVERY_NOT_FOUND", "Recovery code not found");
  }

  if (path === "/api/games" && request.method === "POST") {
    const player = await first(db, "SELECT id FROM players WHERE id = $1", [String(body.player_id || "")]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    // Only an explicit `solo: true` creates a legacy Solo game, so a family game is never mislabelled.
    const created = now(), gameId = uuid(), solo = body.solo === true;
    const language = body.language === "fr" ? "fr" : "en";
    try {
      for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt++) {
        const code = codes.joinCode();
        const made = await db.tx(async q => {
          // A code an active room already uses is never reused (that would send a friend to the wrong game).
          if (await codeInUse(q, code)) return false;
          // A racing insert of the same code inserts nothing (no error, the transaction stays usable): try another code.
          const inserted = await q.query("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES($1,$2,$3,1,$4,$4,$5) ON CONFLICT DO NOTHING RETURNING id", [gameId, code, solo ? "ACTIVE" : "WAITING", created, language]);
          if (inserted.rowCount !== 1) return false;
          await q.query("INSERT INTO game_players (game_id,player_id,slot,joined_at) VALUES($1,$2,1,$3)", [gameId, player.id, created]);
          if (solo) await q.query("INSERT INTO game_players (game_id,player_id,slot,joined_at) VALUES($1,$2,2,$3)", [gameId, BOT, created]);
          await q.query("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES($1,$2,1,NULL,NULL,'OPEN',$3,NULL)", [`${gameId}:1`, gameId, created]);
          return true;
        });
        if (made) return json({id: gameId, join_code: code, language});
      }
    } catch (error) {
      if (isUnavailable(error) || isSchemaMissing(error)) throw error;
      console.error("game create failed", error);
    }
    return fail(500, "GAME_CREATE_FAILED", "Could not create a game right now. Please try again.");
  }

  if (path === "/api/games/join" && request.method === "POST") {
    const playerId = String(body.player_id || "");
    const player = await first(db, "SELECT id, display_name FROM players WHERE id = $1", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const code = normalizeJoinCode(body.join_code);
    // Only the current format: two letters and two digits ("AB12").
    if (!isJoinCode(code)) return fail(400, "BAD_JOIN_CODE", "Game codes are two letters and two numbers, like AB12.");
    /** @type {{status: "missing" | "member" | "full" | "joined", game?: GameRow}} */
    let result;
    try {
      result = await db.tx(async q => {
        // Lock the game row: concurrent joins of one game take turns, and each sees the seats the previous one took.
        /** @type {GameRow | null} */
        // Codes are only unique among active rooms: never join a finished game that once had this code.
        const game = await first(q, `SELECT * FROM games WHERE join_code = $1 AND ${ACTIVE_ROOM} ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [code]);
        if (!game) return {status: "missing"};
        const members = await all(q, "SELECT player_id, slot FROM game_players WHERE game_id = $1", [game.id]);
        if (members.some(m => m.player_id === playerId)) return {status: "member", game};
        if (members.length >= 2) return {status: "full"};
        const joined = now();
        await q.query("INSERT INTO game_players (game_id,player_id,slot,joined_at) VALUES($1,$2,2,$3)", [game.id, playerId, joined]);
        await q.query("UPDATE games SET status = 'ACTIVE', updated_at = $1 WHERE id = $2 AND status = 'WAITING'", [joined, game.id]);
        for (const m of members) await notify(q, m.player_id, game.id, "PLAYER_JOINED", `${player.display_name} joined your game!`, "joined", joined);
        return {status: "joined", game};
      });
    } catch (error) {
      if (isUnavailable(error) || isSchemaMissing(error)) throw error;
      if (!isUniqueViolation(error)) {
        console.error("game join failed", error);
        return fail(500, "GAME_JOIN_FAILED", "Could not join the game right now. Please try again.");
      }
      // Backstop (the row lock should make this unreachable): the seat was taken by this player's other request, or by someone else.
      const member = await first(db, "SELECT g.id, g.join_code FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE g.join_code = $1 AND g.status IN ('WAITING', 'ACTIVE') AND gp.player_id = $2", [code, playerId]);
      if (member) return json({id: member.id, join_code: member.join_code});
      return fail(409, "GAME_FULL", "That game already has two players.");
    }
    if (result.status === "missing") return fail(404, "GAME_NOT_FOUND", "We couldn't find a game with that code.");
    if (result.status === "full" || !result.game) return fail(409, "GAME_FULL", "That game already has two players.");
    return json({id: result.game.id, join_code: result.game.join_code});
  }

  if (path === "/api/dashboard" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const player = await first(db, "SELECT id, display_name FROM players WHERE id = $1", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    await db.query("UPDATE players SET last_seen_at = $1 WHERE id = $2", [now(), playerId]);
    const games = await all(db, `SELECT g.id, g.join_code, g.status, g.round_number, g.created_at, g.updated_at, g.language,
      EXISTS(SELECT 1 FROM game_players b WHERE b.game_id = g.id AND b.player_id = 'BOT') AS bot,
      (SELECT p2.display_name FROM game_players o JOIN players p2 ON p2.id = o.player_id WHERE o.game_id = g.id AND o.player_id <> $1 LIMIT 1) AS opponent_name,
      EXISTS(SELECT 1 FROM rounds r JOIN submissions s ON s.round_id = r.id WHERE r.game_id = g.id AND r.round_number = g.round_number AND s.player_id = $1) AS locked
      FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE gp.player_id = $1 ORDER BY g.updated_at DESC LIMIT 50`, [playerId]);
    // Unread family-game notifications, for older clients. Reading the dashboard never marks anything read.
    const notes = await all(db, `SELECT n.id, n.game_id, n.kind, n.message, n.created_at FROM notifications n WHERE ${FAMILY_NOTIFICATION} AND n.read_at IS NULL ORDER BY n.created_at DESC, n.seq DESC LIMIT 10`, [playerId]);
    return json({
      player,
      games: games.map(g => ({...g, bot: Boolean(g.bot), locked: Boolean(g.locked), status: g.status === "COMPLETE" ? "MATCHED" : g.status})),
      notifications: notes,
      max_moves: MAX_MOVES
    });
  }

  if (path === "/api/notifications" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const player = await first(db, "SELECT id FROM players WHERE id = $1", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    return json({notifications: await listNotifications(db, playerId), unread: await unreadCount(db, playerId)});
  }

  if (path === "/api/notifications/read" && request.method === "POST") {
    const playerId = String(body.player_id || "");
    const player = await first(db, "SELECT id FROM players WHERE id = $1", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const at = now();
    // Only the owner's rows, and the first read time is kept: a concurrent request waits for the
    // row lock, then finds read_at already set and leaves it alone.
    if (body.all === true) {
      await db.query("UPDATE notifications SET read_at = $1 WHERE player_id = $2 AND read_at IS NULL", [at, playerId]);
    } else if (Array.isArray(body.ids)) {
      const ids = [...new Set(body.ids.slice(0, 200).map(String))];
      if (ids.length) await db.query("UPDATE notifications SET read_at = $1 WHERE player_id = $2 AND read_at IS NULL AND id = ANY($3::text[])", [at, playerId, ids]);
    }
    return json({ok: true, unread: await unreadCount(db, playerId)});
  }

  if (path === "/api/games/rematch" && request.method === "POST") return rematch(db, body, codes);

  if (path === "/api/games/leave" && request.method === "POST") return leave(db, body);

  if (path === "/api/game" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const loaded = await loadGame(db, url.searchParams.get("id") || "");
    if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
    if (!loaded.slotOf.has(playerId)) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
    return json({ok: true, game: viewFor(await settle(db, loaded), playerId)});
  }

  if (path === "/api/submit" && request.method === "POST") return submit(db, body);

  return fail(404, "NOT_FOUND", "Not found");
}
