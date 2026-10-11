// @ts-check
// Vercel Function for every /api/* request (vercel.json rewrites them here).
// Together mode uses normalized server state. Solo and Mom Mode remain device-first,
// with a small cloud snapshot tied to the same player account.

import {handleApi} from "../src/server/api.js";
import {handleAccountApi} from "../src/server/account.js";
import {storeFromEnv} from "../src/server/db.js";

/**
 * vercel.json rewrites /api/<path> to /api?__path=<path>; put the original path back
 * (and leave a request that already carries its original path alone).
 * @param {Request} request
 * @returns {Promise<Request>}
 */
async function restorePath(request) {
  const url = new URL(request.url);
  const rewritten = url.searchParams.get("__path");
  if (rewritten === null) return request;
  url.searchParams.delete("__path");
  url.pathname = rewritten ? `/api/${rewritten.replace(/^\/+/, "")}` : "/api";
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  return new Request(url, {method: request.method, headers: request.headers, body});
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const n = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0;

function newerGame(a, b) {
  if (!a) return b;
  if (!b) return a;
  const au = String(a.updatedAt || a.createdAt || ""), bu = String(b.updatedAt || b.createdAt || "");
  if (au !== bu) return au > bu ? a : b;
  const am = Array.isArray(a.moves) ? a.moves.length : 0, bm = Array.isArray(b.moves) ? b.moves.length : 0;
  return am >= bm ? a : b;
}

function mergeCloud(serverValue, incomingValue) {
  const server = object(serverValue), incoming = object(incomingValue);
  const sa = object(server.soloStore), sb = object(incoming.soloStore);
  const soloA = object(sa.solo), soloB = object(sb.solo), solo = {...soloA};
  for (const [id, game] of Object.entries(soloB)) solo[id] = newerGame(solo[id], game);
  const seen = {...object(sa.seen)};
  for (const [id, value] of Object.entries(object(sb.seen))) seen[id] = Math.max(n(seen[id]), n(value));
  const lastA = object(sa.last), lastB = object(sb.last);
  const last = String(lastB.at || "") > String(lastA.at || "") ? lastB : lastA;

  const ma = object(server.mom), mb = object(incoming.mom);
  const newerMom = String(mb.updatedAt || "") >= String(ma.updatedAt || "") ? mb : ma;
  const mom = {
    totalPoints: Math.max(n(ma.totalPoints), n(mb.totalPoints)),
    games: Math.max(n(ma.games), n(mb.games)),
    streak: n(newerMom.streak),
    bestStreak: Math.max(n(ma.bestStreak), n(mb.bestStreak)),
    bestRound: Math.max(n(ma.bestRound), n(mb.bestRound)),
    updatedAt: String(newerMom.updatedAt || new Date().toISOString())
  };

  return {
    version: 1,
    soloStore: {schema: Math.max(n(sa.schema), n(sb.schema)), solo, seen, last: Object.keys(last).length ? last : null},
    mom,
    updatedAt: new Date().toISOString()
  };
}

async function progressRoute(request, store) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/player/progress") return null;
  if (!store) return json({error: "Database is not configured", code: "NO_DATABASE"}, 503);
  if (request.method === "GET") {
    const playerId = String(url.searchParams.get("player_id") || "");
    const result = await store.query("SELECT id, display_name, username, cloud_progress FROM players WHERE id = $1", [playerId]);
    const player = result.rows[0];
    return player ? json({player: {id: player.id, display_name: player.display_name, username: player.username}, progress: object(player.cloud_progress)}) : json({error: "Player not found", code: "UNKNOWN_PLAYER"}, 404);
  }
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch {}
    const playerId = String(body.player_id || "");
    const found = await store.query("SELECT cloud_progress FROM players WHERE id = $1", [playerId]);
    if (!found.rows[0]) return json({error: "Player not found", code: "UNKNOWN_PLAYER"}, 404);
    const merged = mergeCloud(found.rows[0].cloud_progress, body.progress);
    const result = await store.query("UPDATE players SET cloud_progress = $1::jsonb, last_seen_at = $2 WHERE id = $3 RETURNING id", [JSON.stringify(merged), new Date().toISOString(), playerId]);
    return result.rowCount === 1 ? json({ok: true, progress: merged}) : json({error: "Progress was not saved", code: "NOT_SAVED"}, 500);
  }
  return json({error: "Method not allowed", code: "METHOD_NOT_ALLOWED"}, 405);
}

/**
 * @param {Request} request
 * @param {import("../src/server/api.js").ApiEnv} [env]
 * @returns {Promise<Response>}
 */
export async function handle(request, env) {
  try {
    const restored = await restorePath(request);
    const runtime = env || {store: storeFromEnv(), reviewToken: process.env.REVIEW_TOKEN || undefined};
    const account = await handleAccountApi(restored, runtime.store);
    if (account) return account;
    const progress = await progressRoute(restored, runtime.store);
    if (progress) return progress;
    // REVIEW_TOKEN (server-side only) unlocks the private bot-review endpoints; without it they are off.
    return await handleApi(restored, runtime);
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({error: "Something went wrong. Please try again.", code: "SERVER_ERROR"}), {status: 500, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});
  }
}

/** @param {Request} request */
const fromVercel = request => handle(request);
export {fromVercel as GET, fromVercel as POST, fromVercel as PUT, fromVercel as PATCH, fromVercel as DELETE, fromVercel as HEAD, fromVercel as OPTIONS};
