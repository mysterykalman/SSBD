// Device-local persistence. Solo games live only here; they never touch D1.
// Everything is wrapped so a blocked or full storage never breaks play.

import {SCHEMA_VERSION} from "../shared/rules.js";

const KEY = "ssbd.store";
const LANGUAGE_KEY = "ssbd_language"; // same key as earlier releases
const PLAYER_KEY = "ssbd_player"; // same key as earlier releases
const MAX_SOLO_GAMES = 30;

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function emptyStore() {
  return {schema: SCHEMA_VERSION, solo: {}, seen: {}, last: null};
}

/** Bring any stored shape up to the current schema. Unknown future versions are backed up, not destroyed. */
export function migrate(data) {
  if (!data || typeof data !== "object") return emptyStore();
  if (data.schema > SCHEMA_VERSION) {
    write(`${KEY}.backup.v${data.schema}`, JSON.stringify(data));
    return emptyStore();
  }
  const out = {...emptyStore(), ...data, schema: SCHEMA_VERSION};
  out.solo = {};
  for (const [id, game] of Object.entries(data.solo || {})) {
    if (game && Array.isArray(game.moves) && game.moves.length && game.schema === SCHEMA_VERSION) out.solo[id] = game;
  }
  out.seen = data.seen && typeof data.seen === "object" ? data.seen : {};
  return out;
}

export function createStore() {
  let data;
  try { data = migrate(JSON.parse(read(KEY) || "null")); } catch { data = emptyStore(); }
  let healthy = write(KEY, JSON.stringify(data));

  function save() {
    const ids = Object.keys(data.solo).sort((a, b) => String(data.solo[b].updatedAt).localeCompare(String(data.solo[a].updatedAt)));
    for (const id of ids.slice(MAX_SOLO_GAMES)) delete data.solo[id];
    healthy = write(KEY, JSON.stringify(data));
    return healthy;
  }

  return {
    get healthy() { return healthy; },
    language() { return read(LANGUAGE_KEY) === "fr" ? "fr" : read(LANGUAGE_KEY) === "en" ? "en" : null; },
    setLanguage(lang) { write(LANGUAGE_KEY, lang); },
    player() { try { return JSON.parse(read(PLAYER_KEY) || "null"); } catch { return null; } },
    setPlayer(player) { write(PLAYER_KEY, JSON.stringify(player)); },
    soloGames() { return Object.values(data.solo); },
    soloGame(id) { return data.solo[id] || null; },
    saveSolo(game) { data.solo[game.id] = game; return save(); },
    seen(gameId) { return data.seen[gameId] || 0; },
    markSeen(gameId, number) { data.seen[gameId] = Math.max(number, data.seen[gameId] || 0); save(); },
    last() { return data.last; },
    setLast(last) { data.last = last; save(); }
  };
}
