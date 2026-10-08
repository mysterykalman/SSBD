// @ts-check
// Solo bot evaluation logs on the server: an anonymous write-only endpoint for game/round records,
// and token-protected review endpoints (list, detail, flags, exports, metrics).
//
//   POST /api/log/batch            {games: [...], rounds: [...]}   anyone (the app); idempotent
//   GET  /api/review/games          ?character&language&status&engine&from&to&flagged   review token
//   GET  /api/review/game?id=       one game with its rounds, decisions and review flags    review token
//   POST /api/review/flag           {game_id, round, flags: [...], note}                   review token
//   GET  /api/review/export?format=csv|json (+ the same filters)                           review token
//   GET  /api/review/metrics        (+ filters) grouped by character and engine version    review token
//
// The review token is the server-side REVIEW_TOKEN environment variable. When it is not set, the
// review endpoints do not exist (404). It is never sent to the browser by the server.

import {timingSafeEqual} from "node:crypto";
import {REVIEW_FLAGS, cleanGame, cleanRound, computeMetrics, metricsBy, reportedStatus, toCsv} from "../shared/gamelog.js";

const MAX_GAMES = 40, MAX_ROUNDS = 200;
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers}});
const fail = (status, code, error) => json({error, code}, status);
const now = () => new Date().toISOString();

/**
 * Store a batch of game and round records. Games only move forward (a finished status is final,
 * counts and times only grow); a round already stored is never changed (game id + round number).
 * @param {import("./db.js").Store} db
 * @param {any} body
 */
export async function logBatch(db, body) {
  const rawGames = Array.isArray(body?.games) ? body.games : [], rawRounds = Array.isArray(body?.rounds) ? body.rounds : [];
  if (rawGames.length > MAX_GAMES || rawRounds.length > MAX_ROUNDS) return fail(413, "TOO_MANY", "Too many records in one batch.");
  const games = rawGames.map(cleanGame).filter(Boolean);
  const rounds = rawRounds.map(cleanRound).filter(Boolean);
  const received = now();
  const known = new Set();
  await db.tx(async q => {
    for (const g of games) {
      await q.query(`INSERT INTO bot_games (game_id, mode, character, language, started_at, last_activity_at, ended_at, status, rounds, app_version, engine_version, dataset_version, config, seed, received_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (game_id) DO UPDATE SET
          last_activity_at = GREATEST(bot_games.last_activity_at, EXCLUDED.last_activity_at),
          rounds = GREATEST(bot_games.rounds, EXCLUDED.rounds),
          status = CASE WHEN bot_games.status = 'in_progress' THEN EXCLUDED.status ELSE bot_games.status END,
          ended_at = COALESCE(bot_games.ended_at, EXCLUDED.ended_at),
          app_version = COALESCE(bot_games.app_version, EXCLUDED.app_version),
          engine_version = COALESCE(bot_games.engine_version, EXCLUDED.engine_version),
          dataset_version = COALESCE(bot_games.dataset_version, EXCLUDED.dataset_version),
          config = COALESCE(bot_games.config, EXCLUDED.config),
          received_at = EXCLUDED.received_at`,
      [g.game_id, g.mode, g.character, g.language, g.started_at, g.last_activity_at, g.ended_at, g.status, g.rounds, g.app_version, g.engine_version, g.dataset_version, g.config && JSON.stringify(g.config), g.seed, received]);
      known.add(g.game_id);
    }
    const missing = [...new Set(rounds.map(r => r.game_id).filter(id => !known.has(id)))];
    if (missing.length) for (const row of (await q.query("SELECT game_id FROM bot_games WHERE game_id = ANY($1)", [missing])).rows) known.add(row.game_id);
    for (const r of rounds) {
      if (!known.has(r.game_id)) continue; // a round always travels with (or after) its game record
      await q.query(`INSERT INTO bot_rounds (game_id, round, pair_a, pair_b, user_word, bot_word, user_key, bot_key, matched, revealed_at, decision_ms, stage, low_quality, decision, received_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (game_id, round) DO NOTHING`,
      [r.game_id, r.round, r.pair_a, r.pair_b, r.user_word, r.bot_word, r.user_key, r.bot_key, r.matched, r.revealed_at, r.decision_ms, r.stage, r.low_quality, r.decision && JSON.stringify(r.decision), received]);
    }
  });
  return json({ok: true, games: games.length, rounds: rounds.filter(r => known.has(r.game_id)).length, rejected: rawGames.length - games.length + rawRounds.length - rounds.length});
}

/** Constant-time comparison of the request's bearer token with the configured review token. */
export function reviewAllowed(request, token) {
  if (!token) return false;
  const given = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "")?.[1] || "";
  const a = Buffer.from(given), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Load games (with rounds and review flags) matching the review filters. */
async function loadGames(db, params, {decisions = false} = {}) {
  const where = [], args = [];
  const add = (sql, value) => { args.push(value); where.push(sql.replace("?", `$${args.length}`)); };
  if (params.get("id")) add("g.game_id = ?", params.get("id"));
  if (params.get("character")) add("g.character = ?", params.get("character"));
  if (params.get("language")) add("g.language = ?", params.get("language"));
  if (params.get("engine")) add("g.engine_version = ?", params.get("engine"));
  if (params.get("from")) add("g.started_at >= ?", params.get("from"));
  if (params.get("to")) add("g.started_at <= ?", `${params.get("to")}\uffff`);
  const games = (await db.query(`SELECT g.* FROM bot_games g ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY g.started_at DESC LIMIT 2000`, args)).rows;
  if (!games.length) return [];
  const ids = games.map(g => g.game_id);
  const rounds = (await db.query(`SELECT r.game_id, r.round, r.pair_a, r.pair_b, r.user_word, r.bot_word, r.user_key, r.bot_key, r.matched, r.revealed_at, r.decision_ms, r.stage, r.low_quality${decisions ? ", r.decision" : ""},
      v.flags, v.note FROM bot_rounds r LEFT JOIN bot_reviews v ON v.game_id = r.game_id AND v.round = r.round WHERE r.game_id = ANY($1) ORDER BY r.game_id, r.round`, [ids])).rows;
  const byGame = new Map(ids.map(id => [id, []]));
  for (const r of rounds) byGame.get(r.game_id).push({...r, flags: r.flags || [], decision_ms: r.decision_ms === null ? null : Number(r.decision_ms)});
  const at = Date.now();
  let list = games.map(g => ({...g, seed: g.seed === null ? null : Number(g.seed), rounds_list: byGame.get(g.game_id), reported_status: reportedStatus(g, at)}));
  if (params.get("status")) list = list.filter(g => g.reported_status === params.get("status"));
  if (params.get("flagged") === "1") list = list.filter(g => g.rounds_list.some(r => r.flags.length || r.low_quality));
  return list;
}

/**
 * The review routes. Returns null when the path is not a review path.
 * @param {Request} request
 * @param {import("./db.js").Store} db
 * @param {string | undefined} token
 * @param {any} body the request's JSON body (already read by the router)
 */
export async function reviewRoute(request, db, token, body = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/review/")) return null;
  if (!token) return fail(404, "REVIEW_DISABLED", "Not found.");
  if (!reviewAllowed(request, token)) return fail(401, "REVIEW_UNAUTHORIZED", "A valid review token is required.");
  const params = url.searchParams;
  const path = url.pathname;
  if (path === "/api/review/games" && request.method === "GET") {
    const list = await loadGames(db, params);
    return json({games: list.map(({rounds_list, config: _c, ...g}) => ({...g,
      flagged_rounds: rounds_list.filter(r => r.flags.length).length, low_quality_rounds: rounds_list.filter(r => r.low_quality).length}))});
  }
  if (path === "/api/review/game" && request.method === "GET") {
    const [game] = await loadGames(db, new URLSearchParams({id: params.get("id") || ""}), {decisions: true});
    return game ? json({game}) : fail(404, "NOT_FOUND", "No such game.");
  }
  if (path === "/api/review/flag" && request.method === "POST") {
    const flags = Array.isArray(body.flags) ? [...new Set(body.flags.filter(f => REVIEW_FLAGS.includes(f)))] : [];
    const note = typeof body.note === "string" ? body.note.slice(0, 2000) : null;
    const round = Number(body.round);
    const exists = (await db.query("SELECT 1 FROM bot_rounds WHERE game_id = $1 AND round = $2", [String(body.game_id || ""), round])).rowCount;
    if (!exists) return fail(404, "NOT_FOUND", "No such round.");
    await db.query(`INSERT INTO bot_reviews (game_id, round, flags, note, reviewed_at) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (game_id, round) DO UPDATE SET flags = EXCLUDED.flags, note = EXCLUDED.note, reviewed_at = EXCLUDED.reviewed_at`, [String(body.game_id), round, flags, note || null, now()]);
    return json({ok: true, flags, note: note || null});
  }
  if (path === "/api/review/export" && request.method === "GET") {
    const format = params.get("format") === "csv" ? "csv" : "json";
    const list = await loadGames(db, params, {decisions: format === "json"});
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      return new Response(toCsv(list), {headers: {"content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "content-disposition": `attachment; filename="ssbd-bot-rounds-${stamp}.csv"`}});
    }
    return json({exported_at: now(), games: list}, 200, {"content-disposition": `attachment; filename="ssbd-bot-games-${stamp}.json"`});
  }
  if (path === "/api/review/metrics" && request.method === "GET") {
    const list = await loadGames(db, params);
    return json({
      overall: computeMetrics(list),
      byCharacter: metricsBy(list, g => g.character),
      byEngine: metricsBy(list, g => g.engine_version || "unknown"),
      byCharacterAndEngine: metricsBy(list, g => `${g.character} · ${g.engine_version || "unknown"}`)
    });
  }
  return fail(404, "NOT_FOUND", "Not found.");
}
