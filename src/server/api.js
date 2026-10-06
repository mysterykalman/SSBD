// Family-game API backed by D1. The schema is unchanged from earlier
// releases so existing players, games and rounds keep working. Solo games
// are played on the device and never call this API; Solo games created by
// older releases (a "BOT" member in D1) are still playable here.

import {chooseOpening, chooseResponse} from "../shared/bot.js";
import {MAX_MOVES, checkWord, hashString, moveOutcome, seededRandom} from "../shared/rules.js";
import {wordKey} from "../shared/words.js";

const BOT = "BOT";
const FINISHED = new Set(["MATCHED", "EXHAUSTED", "COMPLETE"]);

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}
});
const fail = (status, code, error, extra = {}) => json({error, code, ...extra}, status);
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const joinCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out + "-" + Math.floor(10 + Math.random() * 90);
};

async function all(db, sql, args = []) {
  return (await db.prepare(sql).bind(...args).all()).results || [];
}
async function first(db, sql, args = []) {
  return (await all(db, sql, args))[0] || null;
}

let ready = null;
export function ensureSchema(db) {
  ready ??= (async () => {
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)"),
      db.prepare("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
      db.prepare("CREATE TABLE IF NOT EXISTS game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot))"),
      db.prepare("CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, round_number INTEGER NOT NULL, previous_a TEXT, previous_b TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, revealed_at TEXT, UNIQUE(game_id, round_number))"),
      db.prepare("CREATE TABLE IF NOT EXISTS submissions (round_id TEXT NOT NULL, player_id TEXT NOT NULL, word TEXT NOT NULL, submitted_at TEXT NOT NULL, PRIMARY KEY(round_id, player_id))"),
      db.prepare("CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, game_id TEXT, kind TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL)")
    ]).catch(() => {});
    // Columns added by earlier releases; these fail harmlessly once present.
    for (const sql of [
      "ALTER TABLE games ADD COLUMN language TEXT DEFAULT 'en'",
      "ALTER TABLE rounds ADD COLUMN bot_quality TEXT DEFAULT NULL",
      "ALTER TABLE rounds ADD COLUMN bot_reason TEXT DEFAULT NULL"
    ]) {
      try { await db.prepare(sql).run(); } catch {}
    }
  })().catch(error => { ready = null; throw error; });
  return ready;
}

/** Load everything about one game and shape it as a rules-style game. */
async function loadGame(db, gameId) {
  const game = await first(db, "SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) return null;
  const members = await all(db, "SELECT gp.player_id, gp.slot, p.display_name FROM game_players gp LEFT JOIN players p ON p.id = gp.player_id WHERE gp.game_id = ? ORDER BY gp.slot", [gameId]);
  const rounds = await all(db, "SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number", [gameId]);
  const submissions = await all(db, "SELECT s.round_id, s.player_id, s.word, s.submitted_at FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = ?", [gameId]);
  const slotOf = new Map(members.map(m => [m.player_id, m.slot === 1 ? "a" : "b"]));
  const moves = rounds.map(round => {
    const played = submissions.filter(s => s.round_id === round.id);
    const bySide = {};
    for (const s of played) if (slotOf.has(s.player_id)) bySide[slotOf.get(s.player_id)] = s;
    const revealed = round.status !== "OPEN";
    return {
      id: round.id,
      number: round.round_number,
      prompts: round.previous_a || round.previous_b ? [round.previous_a, round.previous_b] : null,
      status: round.status,
      openedAt: round.created_at,
      revealedAt: round.revealed_at,
      words: revealed && bySide.a && bySide.b ? {a: bySide.a.word, b: bySide.b.word} : null,
      submitted: bySide,
      botQuality: round.bot_quality || null
    };
  });
  return {row: game, members, moves, slotOf, rules: {status: FINISHED.has(game.status) ? (game.status === "COMPLETE" ? "MATCHED" : game.status) : "ACTIVE", moves}};
}

/** The game as one player is allowed to see it: the other side's word stays hidden until reveal. */
function viewFor(loaded, playerId) {
  const {row, members, moves, slotOf} = loaded;
  const side = slotOf.get(playerId);
  const otherSide = side === "a" ? "b" : "a";
  const other = members.find(m => m.player_id !== playerId);
  const bot = members.some(m => m.player_id === BOT);
  const status = row.status === "COMPLETE" ? "MATCHED" : row.status;
  return {
    kind: bot ? "legacy-solo" : "family",
    id: row.id,
    joinCode: row.join_code,
    language: row.language === "fr" ? "fr" : "en",
    status,
    waitingForPlayer: status === "WAITING",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    maxMoves: MAX_MOVES,
    you: {side, name: members.find(m => m.player_id === playerId)?.display_name || null},
    opponent: {side: otherSide, bot, name: bot ? null : other?.display_name || null, joined: Boolean(other)},
    moves: moves.map(move => ({
      number: move.number,
      prompts: move.prompts,
      status: move.status,
      openedAt: move.openedAt,
      revealedAt: move.revealedAt,
      words: move.words,
      botQuality: move.botQuality,
      mine: move.status === "OPEN" ? move.submitted[side]?.word || null : null,
      otherLocked: move.status === "OPEN" ? Boolean(move.submitted[otherSide]) : false
    }))
  };
}

const notify = (db, playerId, gameId, kind, message, key, at) =>
  db.prepare("INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,?)").bind(`${gameId}:${key}:${playerId}`, playerId, gameId, kind, message, null, at);

/** Reveal the open round once every member has a word. Safe to run twice concurrently. */
async function revealIfReady(db, loaded) {
  const {row, members, moves} = loaded;
  const move = moves[moves.length - 1];
  if (!move || move.status !== "OPEN" || !move.submitted.a || !move.submitted.b) return false;
  const a = move.submitted.a.word, b = move.submitted.b.word, at = now();
  const outcome = moveOutcome(move.number, a, b);
  const humans = members.filter(m => m.player_id !== BOT);
  const statements = [
    db.prepare("UPDATE rounds SET status = ?, revealed_at = ? WHERE id = ? AND status = 'OPEN'").bind(outcome, at, move.id)
  ];
  if (outcome === "REVEALED") {
    statements.push(
      db.prepare("UPDATE games SET round_number = ?, status = 'ACTIVE', updated_at = ? WHERE id = ? AND round_number = ?").bind(move.number + 1, at, row.id, move.number),
      db.prepare("INSERT OR IGNORE INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(`${row.id}:${move.number + 1}`, row.id, move.number + 1, a, b, "OPEN", at, null),
      ...humans.map(m => notify(db, m.player_id, row.id, "READY_TO_REVEAL", "New move ready! Find the next connection!", `reveal-${move.number}`, at))
    );
  } else {
    statements.push(
      db.prepare("UPDATE games SET status = ?, updated_at = ? WHERE id = ? AND status = 'ACTIVE'").bind(outcome, at, row.id),
      ...humans.map(m => notify(db, m.player_id, row.id, outcome === "MATCHED" ? "GAME_COMPLETE" : "GAME_EXHAUSTED", outcome === "MATCHED" ? "You matched! Same thing!" : "20 moves used. Try a rematch!", `end`, at))
    );
  }
  await db.batch(statements);
  return true;
}

/** Older Solo games stored in D1: the bot picks from the prompts and earlier words only. */
function legacyBotWord(loaded) {
  const move = loaded.moves[loaded.moves.length - 1];
  const excludeKeys = new Set();
  for (const m of loaded.moves) for (const s of Object.values(m.submitted)) if (m !== move) excludeKeys.add(wordKey(s.word));
  const rng = seededRandom(hashString(`${loaded.row.id}:${move.number}`));
  const language = loaded.row.language === "fr" ? "fr" : "en";
  return move.prompts
    ? chooseResponse({prompts: move.prompts, language, excludeKeys, rng})
    : chooseOpening({language, excludeKeys, rng});
}

const MESSAGES = {
  EMPTY: "Add a word first, then lock it in.",
  TOO_LONG: "That word is a bit long. Try a shorter one.",
  INVALID_CHARACTERS: "Use letters only (spaces, hyphens and apostrophes are fine).",
  TOO_SHORT: "Try a word with at least two letters.",
  TOO_MANY_WORDS: "Try one word (or a short phrase of up to three words).",
  SAME_AS_LAST: "You just played that word. Try a different one!",
  ALREADY_USED: "You already used that word in this game. Try a new one!",
  GAME_OVER: "This game is over. Start a new game to play again."
};

async function submit(db, body) {
  const playerId = String(body.player_id || "");
  const loaded = await loadGame(db, String(body.game_id || ""));
  if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
  if (!loaded.slotOf.has(playerId)) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
  const side = loaded.slotOf.get(playerId);
  const current = loaded.moves[loaded.moves.length - 1];
  const asked = Number(body.move) || current.number;

  // A retry for a move that is already locked or revealed: answer with the current state.
  const askedMove = loaded.moves.find(m => m.number === asked);
  if (askedMove && askedMove.submitted[side]) {
    if (askedMove.status === "OPEN" && wordKey(askedMove.submitted[side].word) !== wordKey(body.word)) {
      return fail(409, "ALREADY_LOCKED", "Your word for this move is already locked in.", {game: viewFor(loaded, playerId)});
    }
    return json({ok: true, duplicate: true, game: viewFor(loaded, playerId)});
  }
  if (loaded.row.status === "WAITING") return fail(409, "WAITING_FOR_PLAYER", "Waiting for the other player to join.");
  if (FINISHED.has(loaded.row.status)) return fail(409, "GAME_OVER", MESSAGES.GAME_OVER, {game: viewFor(loaded, playerId)});
  if (asked !== current.number || current.status !== "OPEN") return fail(409, "STALE_MOVE", "This move already finished. Here is the latest.", {game: viewFor(loaded, playerId)});

  const check = checkWord(loaded.rules, side, body.word);
  if (!check.ok) return fail(400, check.code, MESSAGES[check.code] || "That word can't be used.", {word: check.word});

  const at = now();
  const statements = [db.prepare("INSERT OR IGNORE INTO submissions VALUES(?,?,?,?)").bind(current.id, playerId, check.word, at)];
  const botMember = loaded.members.find(m => m.player_id === BOT);
  if (botMember && !current.submitted[loaded.slotOf.get(BOT)]) {
    const pick = legacyBotWord(loaded);
    statements.push(
      db.prepare("INSERT OR IGNORE INTO submissions VALUES(?,?,?,?)").bind(current.id, BOT, pick.word, at),
      db.prepare("UPDATE rounds SET bot_quality = ?, bot_reason = NULL WHERE id = ?").bind(pick.quality, current.id)
    );
  }
  await db.batch(statements);

  let fresh = await loadGame(db, loaded.row.id);
  const mine = fresh.moves.find(m => m.number === current.number).submitted[side];
  if (wordKey(mine.word) !== check.key) return fail(409, "ALREADY_LOCKED", "Your word for this move is already locked in.", {game: viewFor(fresh, playerId)});
  if (await revealIfReady(db, fresh)) fresh = await loadGame(db, loaded.row.id);
  else {
    const other = fresh.members.find(m => m.player_id !== playerId && m.player_id !== BOT);
    if (other) await notify(db, other.player_id, loaded.row.id, "YOUR_TURN", "Your friend played. Your turn!", `turn-${current.number}`, at).run();
  }
  return json({ok: true, game: viewFor(fresh, playerId)});
}

export async function handleApi(request, env) {
  const db = env.DB;
  if (!db) return fail(503, "NO_DATABASE", "Database is not configured");
  await ensureSchema(db);
  const url = new URL(request.url);
  const path = url.pathname;
  let body = {};
  if (request.method !== "GET") {
    try { body = await request.json(); } catch {}
  }

  if (path === "/api/health") return json({ok: true});

  if (path === "/api/player" && request.method === "POST") {
    const created = now(), playerId = uuid();
    const displayName = String(body.display_name || "").replace(/\s+/g, " ").trim().slice(0, 24) || "Player";
    const base = displayName.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "PLAYER";
    for (let attempt = 0; attempt < 5; attempt++) {
      const recoveryCode = base + "-" + Math.floor(1000 + Math.random() * 9000);
      try {
        await db.prepare("INSERT INTO players VALUES(?,?,?,?,?)").bind(playerId, displayName, recoveryCode, created, created).run();
        return json({id: playerId, display_name: displayName, recovery_code: recoveryCode});
      } catch {}
    }
    return fail(500, "PLAYER_CREATE_FAILED", "Could not create a player right now. Please try again.");
  }

  if (path === "/api/player/recover" && request.method === "POST") {
    const found = await first(db, "SELECT id, display_name, recovery_code FROM players WHERE recovery_code = ?", [String(body.recovery_code || "").toUpperCase().trim()]);
    return found ? json(found) : fail(404, "RECOVERY_NOT_FOUND", "Recovery code not found");
  }

  if (path === "/api/games" && request.method === "POST") {
    const player = await first(db, "SELECT id FROM players WHERE id = ?", [String(body.player_id || "")]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const created = now(), gameId = uuid(), solo = Boolean(body.solo);
    const language = body.language === "fr" ? "fr" : "en";
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = joinCode();
      try {
        await db.batch([
          db.prepare("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES(?,?,?,?,?,?,?)").bind(gameId, code, solo ? "ACTIVE" : "WAITING", 1, created, created, language),
          db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(gameId, player.id, 1, created),
          ...(solo ? [db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(gameId, BOT, 2, created)] : []),
          db.prepare("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(`${gameId}:1`, gameId, 1, null, null, "OPEN", created, null)
        ]);
        return json({id: gameId, join_code: code, language});
      } catch {}
    }
    return fail(500, "GAME_CREATE_FAILED", "Could not create a game right now. Please try again.");
  }

  if (path === "/api/games/join" && request.method === "POST") {
    const playerId = String(body.player_id || "");
    const player = await first(db, "SELECT id, display_name FROM players WHERE id = ?", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const code = String(body.join_code || "").toUpperCase().replace(/\s+/g, "").trim();
    const game = await first(db, "SELECT * FROM games WHERE join_code = ?", [code]);
    if (!game) return fail(404, "GAME_NOT_FOUND", "We couldn't find a game with that code.");
    const members = await all(db, "SELECT player_id, slot FROM game_players WHERE game_id = ?", [game.id]);
    if (members.some(m => m.player_id === playerId)) return json({id: game.id, join_code: game.join_code});
    if (members.length >= 2) return fail(409, "GAME_FULL", "That game already has two players.");
    const joined = now();
    try {
      await db.batch([
        db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(game.id, playerId, 2, joined),
        db.prepare("UPDATE games SET status = 'ACTIVE', updated_at = ? WHERE id = ? AND status = 'WAITING'").bind(joined, game.id),
        ...members.map(m => notify(db, m.player_id, game.id, "PLAYER_JOINED", `${player.display_name} joined your game!`, "joined", joined))
      ]);
    } catch {
      return fail(409, "GAME_FULL", "That game already has two players.");
    }
    return json({id: game.id, join_code: game.join_code});
  }

  if (path === "/api/dashboard" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const player = await first(db, "SELECT id, display_name FROM players WHERE id = ?", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    await db.prepare("UPDATE players SET last_seen_at = ? WHERE id = ?").bind(now(), playerId).run();
    const games = await all(db, `SELECT g.id, g.join_code, g.status, g.round_number, g.created_at, g.updated_at, g.language,
      EXISTS(SELECT 1 FROM game_players b WHERE b.game_id = g.id AND b.player_id = 'BOT') AS bot,
      (SELECT p2.display_name FROM game_players o JOIN players p2 ON p2.id = o.player_id WHERE o.game_id = g.id AND o.player_id != ? LIMIT 1) AS opponent_name,
      EXISTS(SELECT 1 FROM rounds r JOIN submissions s ON s.round_id = r.id WHERE r.game_id = g.id AND r.round_number = g.round_number AND s.player_id = ?) AS locked
      FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE gp.player_id = ? ORDER BY g.updated_at DESC LIMIT 50`, [playerId, playerId, playerId]);
    const notes = await all(db, "SELECT id, game_id, kind, message, created_at FROM notifications WHERE player_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 10", [playerId]);
    return json({
      player,
      games: games.map(g => ({...g, bot: Boolean(g.bot), locked: Boolean(g.locked), status: g.status === "COMPLETE" ? "MATCHED" : g.status})),
      notifications: notes,
      max_moves: MAX_MOVES
    });
  }

  if (path === "/api/notifications/read" && request.method === "POST") {
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 50).map(String) : [];
    const at = now();
    if (ids.length) await db.batch(ids.map(nid => db.prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND player_id = ?").bind(at, nid, String(body.player_id || ""))));
    return json({ok: true});
  }

  if (path === "/api/game" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const loaded = await loadGame(db, url.searchParams.get("id") || "");
    if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
    if (!loaded.slotOf.has(playerId)) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
    return json({ok: true, game: viewFor(loaded, playerId)});
  }

  if (path === "/api/submit" && request.method === "POST") return submit(db, body);

  return fail(404, "NOT_FOUND", "Not found");
}
