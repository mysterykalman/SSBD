// Device-first cross-device sync.
// Solo and Mom Mode continue to work from localStorage/offline. When a player identity
// exists (created by Together or recovered on another device), their local progress is
// merged into one small server snapshot and can be restored with the same recovery code.

const PLAYER_KEY = "ssbd_player";
const SOLO_KEY = "ssbd.store";
const MOM_KEY = "ssbd:mom-progress:v1";
const POLL_MS = 2500;

const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const number = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0;
const parse = key => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

function player() {
  const value = parse(PLAYER_KEY);
  return object(value).id ? value : null;
}

function newerGame(a, b) {
  if (!a) return b;
  if (!b) return a;
  const au = String(a.updatedAt || a.createdAt || ""), bu = String(b.updatedAt || b.createdAt || "");
  if (au !== bu) return au > bu ? a : b;
  const am = Array.isArray(a.moves) ? a.moves.length : 0, bm = Array.isArray(b.moves) ? b.moves.length : 0;
  return am >= bm ? a : b;
}

function mergeSolo(aValue, bValue) {
  const a = object(aValue), b = object(bValue), solo = {...object(a.solo)};
  for (const [id, game] of Object.entries(object(b.solo))¶»§q«^