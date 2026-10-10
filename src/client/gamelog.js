// Durable, on-device log of Solo games for bot evaluation, synchronised to the server when online.
//
// Each revealed round is written to localStorage immediately (synchronously, before anything else
// happens), together with its game record, and queued for upload. The queue survives refreshes,
// reconnects and app restarts; uploads retry with backoff and whenever the browser comes back
// online. Game id + round number make every upload idempotent on the server. Logging never blocks
// or breaks play: every failure here is swallowed.
//
// Nothing identifying is stored or sent: no name, player id or email (see src/shared/gamelog.js).

import {gameRecord, roundRecord, toCsv} from "../shared/gamelog.js";
import {roundAnalysis} from "../shared/round-analysis.js";
import {ENGINE_CONFIG, ENGINE_VERSION} from "../shared/engine.js";
import {DATASET_VERSION} from "../shared/lexicon/index.js";

export const LOG_KEY = "ssbd.gamelog";
const KEEP_GAMES = 60; // synced games kept on the device for the local review/export
const MAX_BATCH_ROUNDS = 150;
let timer = null, backoff = 0, inFlight = false;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(LOG_KEY) || "null");
    if (data && data.v === 1 && data.games && data.rounds && data.pending) {
      data.pending.ratings ??= []; // logs saved before ratings existed
      return data;
    }
  } catch {}
  return {v: 1, games: {}, rounds: {}, pending: {games: [], rounds: [], ratings: []}};
}
function save(data) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
const appVersion = () => {
  try { return document.querySelector('meta[name="app-version"]')?.content || null; } catch { return null; }
};
const meta = extra => ({appVersion: appVersion(), engineVersion: ENGINE_VERSION, datasetVersion: DATASET_VERSION, config: ENGINE_CONFIG, ...extra});
const queue = (list, key) => { if (!list.includes(key)) list.push(key); };

/** Drop the oldest fully synced games beyond KEEP_GAMES (never anything still waiting to upload). */
function prune(data) {
  const waiting = new Set([...data.pending.games, ...data.pending.ratings, ...data.pending.rounds.map(k => k.split("#")[0])]);
  const ids = Object.keys(data.games).filter(id => !waiting.has(id))
    .sort((a, b) => String(data.games[b].last_activity_at).localeCompare(String(data.games[a].last_activity_at)));
  for (const id of ids.slice(KEEP_GAMES)) {
    delete data.games[id];
    for (const key of Object.keys(data.rounds)) if (key.startsWith(`${id}#`)) delete data.rounds[key];
  }
}

/**
 * Log one revealed Solo round (call right after the reveal is saved). Idempotent.
 * @param {any} game the game after the reveal
 * @param {any} move the revealed move
 * @param {any} decision the engine decision committed before the reveal
 * @param {number | null} ms how long the decision took
 * @param {object | null} [input] how the player's word was read (spelling suggestion, spacing, inflection)
 */
export function logRound(game, move, decision, ms, input = null) {
  try {
    const data = load();
    const key = `${game.id}#${move.number}`;
    if (!data.rounds[key]) {
      let analysis = null;
      try { analysis = roundAnalysis(move, decision, game.language); } catch {}
      data.rounds[key] = roundRecord(game, move, decision, ms, input, analysis);
      queue(data.pending.rounds, key);
    }
    data.games[game.id] = gameRecord(game, meta());
    queue(data.pending.games, game.id);
    prune(data);
    save(data);
  } catch {}
  syncSoon();
}

/**
 * The player started another game while these Solo games were unfinished: they ended them on
 * purpose (as opposed to an abandonment, which is only ever inferred later from inactivity).
 * @param {string[]} keepIds games that are not being left (e.g. the new one)
 */
export function endUnfinished(keepIds = []) {
  try {
    const data = load();
    const at = new Date().toISOString();
    let changed = false;
    for (const g of Object.values(data.games)) {
      if (g.status !== "in_progress" || keepIds.includes(g.game_id)) continue;
      g.status = "ended";
      g.ended_at = at;
      g.last_activity_at = at;
      queue(data.pending.games, g.game_id);
      changed = true;
    }
    if (changed) { save(data); syncSoon(); }
  } catch {}
}

/**
 * The player quit this Solo game ("Quit game"): it is logged as "ended" (never a win or a loss),
 * like any game left unfinished on purpose.
 * @param {string} gameId
 */
export function endGame(gameId) {
  try {
    const data = load();
    const g = data.games[gameId];
    if (g && g.status === "in_progress") {
      const at = new Date().toISOString();
      g.status = "ended";
      g.ended_at = at;
      g.last_activity_at = at;
      queue(data.pending.games, g.game_id);
      save(data);
      syncSoon();
    }
  } catch {}
}

/**
 * The player rated a won game (1–5 stars). Updates the same game record (never a new one) and keeps
 * the rating queued until the server confirms it, whether or not the game itself was already
 * uploaded. A failure here never touches the rest of the log.
 * @param {any} game the won game, with playerRating set
 * @returns {boolean} whether the rating is stored on this device
 */
export function logRating(game) {
  let stored = false;
  try {
    const data = load();
    const previous = data.games[game.id];
    const record = gameRecord(game, meta({status: previous?.status === "matched" || !previous ? undefined : previous.status}));
    if (record.player_rating) {
      data.games[game.id] = previous ? {...previous, player_rating: record.player_rating} : record;
      queue(data.pending.games, game.id);
      queue(data.pending.ratings, game.id);
      stored = save(data);
    }
  } catch {}
  syncSoon(200);
  return stored;
}

/** Upload what is waiting (soon, once; with backoff after a failure). */
export function syncSoon(delay = 400) {
  if (typeof window === "undefined") return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

/** Upload the queue now. Resolves to true when everything waiting was accepted. */
export async function syncNow() {
  if (inFlight) return false;
  let data = load();
  if (!data.pending.games.length && !data.pending.rounds.length && !data.pending.ratings.length) return true;
  try { if (navigator.onLine === false) return false; } catch {}
  inFlight = true;
  try {
    const roundKeys = data.pending.rounds.slice(0, MAX_BATCH_ROUNDS);
    // Every round travels with its game record, so the server can always attach it.
    const gameIds = [...new Set([...data.pending.games, ...data.pending.ratings, ...roundKeys.map(k => k.split("#")[0])])].filter(id => data.games[id]).slice(0, 40);
    const body = {games: gameIds.map(id => data.games[id]), rounds: roundKeys.map(k => data.rounds[k]).filter(Boolean)};
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 10000);
    let ok = false, reply = null;
    try {
      const res = await fetch("/api/log/batch", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body), cache: "no-store", signal: controller.signal});
      ok = res.ok;
      reply = ok ? await res.json().catch(() => null) : null;
    } finally {
      clearTimeout(abort);
    }
    if (!ok) throw new Error("log upload refused");
    // Re-read: more rounds may have been logged while the request was in flight.
    data = load();
    // A game stays queued if its record changed while the request was in flight.
    const sent = new Map(body.games.map(g => [g.game_id, JSON.stringify(g)]));
    const sentRounds = new Set(roundKeys);
    data.pending.games = data.pending.games.filter(id => data.games[id] && (!sent.has(id) || JSON.stringify(data.games[id]) !== sent.get(id)));
    data.pending.rounds = data.pending.rounds.filter(k => !sentRounds.has(k) && data.rounds[k]);
    // A rating stays queued until the server says it holds it (e.g. its column may not exist yet).
    const rated = new Set(Array.isArray(reply?.rated) ? reply.rated : []);
    data.pending.ratings = data.pending.ratings.filter(id => data.games[id]?.player_rating && !rated.has(id));
    prune(data);
    save(data);
    if (data.pending.ratings.length && !data.pending.games.length && !data.pending.rounds.length) {
      // Only unconfirmed ratings are left: retry later, with backoff, without blocking anything else.
      backoff = Math.min(backoff ? backoff * 2 : 60000, 30 * 60 * 1000);
      syncSoon(backoff);
      return false;
    }
    backoff = 0;
    if (data.pending.games.length || data.pending.rounds.length) syncSoon(200);
    return !data.pending.games.length && !data.pending.rounds.length && !data.pending.ratings.length;
  } catch {
    backoff = Math.min(backoff ? backoff * 2 : 15000, 5 * 60 * 1000);
    syncSoon(backoff);
    return false;
  } finally {
    inFlight = false;
  }
}

/** Start background sync: on boot, when the browser comes back online, and when the tab is shown again. */
export function startLogSync() {
  try {
    window.addEventListener("online", () => syncSoon(100));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) syncSoon(500); });
  } catch {}
  syncSoon(1500);
}

/** This device's log, for the local review/export (games with their rounds, newest first). */
export function localGames() {
  const data = load();
  const pendingRounds = new Set(data.pending.rounds);
  return Object.values(data.games)
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))
    .map(g => ({...g, rounds_list: Object.entries(data.rounds).filter(([k]) => k.startsWith(`${g.game_id}#`)).map(([k, r]) => ({...r, pair_a: r.pair?.[0] ?? null, pair_b: r.pair?.[1] ?? null, pending: pendingRounds.has(k)})).sort((x, y) => x.round - y.round)}));
}
export const localPendingCount = () => { const d = load(); return d.pending.rounds.length + d.pending.games.length + d.pending.ratings.length; };
export const localCsv = () => toCsv(localGames());
