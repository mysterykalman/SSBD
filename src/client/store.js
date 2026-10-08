// Device-local persistence. Solo games live only here; they never touch the server.
// Everything is wrapped so a blocked or full storage never breaks play: the
// in-memory copy keeps working and `healthy` reports whether saves stick.
//
// Several tabs may share the same storage, so every read and write first
// merges what is on disk with what this tab holds (games only ever move
// forward, so "more moves, then newer updatedAt" wins). That way one tab
// never erases a game another tab just played.

import {SCHEMA_VERSION, isFinished} from "../shared/rules.js";

export const KEY = "ssbd.store";
export const LANGUAGE_KEY = "ssbd_language"; // same key as earlier releases
export const PLAYER_KEY = "ssbd_player"; // same key as earlier releases
export const CHARACTER_KEY = "ssbd_character"; // who the player last chose to play Solo with
export const MAX_SOLO_GAMES = 30;
const MOVE_STATUSES = new Set(["OPEN", "REVEALED", "MATCHED", "EXHAUSTED"]);

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
const isObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function emptyStore() {
  return {schema: SCHEMA_VERSION, solo: {}, seen: {}, last: null};
}

/** A saved game in the current shape, an older game upgraded to it, or null if it cannot be trusted. */
function upgradeGame(id, game) {
  if (!isObject(game) || !Array.isArray(game.moves) || !game.moves.length) return null;
  if (game.schema === SCHEMA_VERSION) return game.id === id ? game : {...game, id};
  if (typeof game.schema === "number" && game.schema > SCHEMA_VERSION) return null;
  // Older games: keep them only if every move already has the current shape.
  const movesOk = game.moves.every((m, i) => isObject(m) && m.number === i + 1 && MOVE_STATUSES.has(m.status)
    && (m.words === null || m.words === undefined || (isObject(m.words) && typeof m.words.a === "string" && typeof m.words.b === "string")));
  if (!movesOk) return null;
  const last = game.moves[game.moves.length - 1];
  const status = last.status === "OPEN" || last.status === "REVEALED" ? "ACTIVE" : last.status;
  const now = game.updatedAt || game.createdAt || new Date(0).toISOString();
  return {
    mode: "solo", seed: 0, revealSeen: 0, createdAt: now,
    ...game,
    schema: SCHEMA_VERSION, id, status, updatedAt: now,
    language: game.language === "fr" ? "fr" : "en",
    moves: game.moves.map(m => ({prompts: null, openedAt: null, revealedAt: null, ...m, words: m.words || null}))
  };
}

function validLast(last) {
  return isObject(last) && (last.kind === "solo" || last.kind === "family") && typeof last.id === "string" && last.id ? last : null;
}

/** Bring any stored shape up to the current schema. Data that cannot be kept is backed up, never silently destroyed. */
export function migrate(data) {
  if (!isObject(data)) return emptyStore();
  if (typeof data.schema === "number" && data.schema > SCHEMA_VERSION) {
    write(`${KEY}.backup.v${data.schema}`, JSON.stringify(data));
    return emptyStore();
  }
  const out = emptyStore();
  const dropped = {};
  for (const [id, game] of Object.entries(isObject(data.solo) ? data.solo : {})) {
    const kept = upgradeGame(id, game);
    if (kept) out.solo[id] = kept;
    else if (game != null) dropped[id] = game;
  }
  if (Object.keys(dropped).length) write(`${KEY}.backup.v${Number(data.schema) || 0}`, JSON.stringify({schema: data.schema, solo: dropped}));
  if (isObject(data.seen)) {
    for (const [id, n] of Object.entries(data.seen)) if (Number.isFinite(n)) out.seen[id] = n;
  }
  out.last = validLast(data.last);
  return out;
}

const progress = game => [game.moves.length, game.moves.filter(m => m.words).length, String(game.updatedAt || "")];
function newerGame(a, b) {
  const pa = progress(a), pb = progress(b);
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] > pb[i]) return a;
    if (pa[i] < pb[i]) return b;
  }
  // Same progress: a rating given after the win (in another tab, say) is never lost.
  if (!a.playerRating && b.playerRating) return b;
  return a;
}

/** Combine two migrated stores without losing progress from either. `mine` wins ties. */
function merge(mine, disk) {
  const out = {...mine, solo: {...disk.solo}, seen: {...disk.seen}};
  for (const [id, game] of Object.entries(mine.solo)) out.solo[id] = out.solo[id] ? newerGame(game, out.solo[id]) : game;
  for (const [id, n] of Object.entries(mine.seen)) out.seen[id] = Math.max(n, out.seen[id] || 0);
  const a = mine.last, b = disk.last;
  out.last = !a ? b : !b ? a : String(b.at || "") > String(a.at || "") ? b : a;
  return out;
}

export function createStore() {
  let data;
  try { data = migrate(JSON.parse(read(KEY) || "null")); } catch { data = emptyStore(); }
  let healthy = write(KEY, JSON.stringify(data));

  // Pull in anything another tab saved. If storage is unreadable, keep what we have.
  function refresh() {
    const raw = read(KEY);
    if (raw == null) return;
    let disk;
    try { disk = JSON.parse(raw); } catch { return; }
    if (isObject(disk) && typeof disk.schema === "number" && disk.schema > SCHEMA_VERSION) return; // a newer app version owns it
    data = merge(data, migrate(disk));
  }

  function prune(limit, protect) {
    const ids = Object.keys(data.solo).filter(id => !protect.has(id));
    // Drop finished games before unfinished ones, oldest first.
    ids.sort((a, b) => {
      const fa = isFinished(data.solo[a]) ? 1 : 0, fb = isFinished(data.solo[b]) ? 1 : 0;
      if (fa !== fb) return fa - fb;
      return String(data.solo[b].updatedAt || "").localeCompare(String(data.solo[a].updatedAt || ""));
    });
    const room = Math.max(0, limit - protect.size);
    for (const id of ids.slice(room)) delete data.solo[id];
  }

  function save(activeId) {
    const protect = new Set();
    if (activeId) protect.add(activeId);
    if (data.last?.kind === "solo") protect.add(data.last.id);
    prune(MAX_SOLO_GAMES, protect);
    healthy = write(KEY, JSON.stringify(data));
    // Storage full: make room by dropping old games (never the active one) and retry.
    let limit = Object.keys(data.solo).length;
    while (!healthy && limit > protect.size) {
      limit = Math.max(protect.size, Math.floor(limit / 2));
      prune(limit, protect);
      healthy = write(KEY, JSON.stringify(data));
    }
    return healthy;
  }

  return {
    get healthy() { return healthy; },
    language() { const lang = read(LANGUAGE_KEY); return lang === "fr" || lang === "en" ? lang : null; },
    setLanguage(lang) { return write(LANGUAGE_KEY, lang === "fr" ? "fr" : "en"); },
    /** The last chosen Solo character id (validated by the caller), or null. */
    character() { const id = read(CHARACTER_KEY); return id && /^[a-z]{1,20}$/.test(id) ? id : null; },
    setCharacter(id) { return write(CHARACTER_KEY, String(id)); },
    player() { try { const p = JSON.parse(read(PLAYER_KEY) || "null"); return isObject(p) ? p : null; } catch { return null; } },
    setPlayer(player) { return write(PLAYER_KEY, JSON.stringify(player)); },
    soloGames() { refresh(); return Object.values(data.solo); },
    soloGame(id) { refresh(); return data.solo[id] || null; },
    saveSolo(game) {
      refresh();
      data.solo[game.id] = data.solo[game.id] ? newerGame(game, data.solo[game.id]) : game;
      return save(game.id);
    },
    seen(gameId) { refresh(); return data.seen[gameId] || 0; },
    markSeen(gameId, number) { refresh(); data.seen[gameId] = Math.max(number, data.seen[gameId] || 0); return save(); },
    last() { refresh(); return data.last; },
    setLast(last) {
      refresh();
      const value = validLast(last);
      data.last = value && {kind: value.kind, id: value.id, at: new Date().toISOString()};
      return save(value?.kind === "solo" ? value.id : null);
    }
  };
}
