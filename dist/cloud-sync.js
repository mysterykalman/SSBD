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
  for (const [id, game] of Object.entries(object(b.solo))) solo[id] = newerGame(solo[id], game);
  const seen = {...object(a.seen)};
  for (const [id, value] of Object.entries(object(b.seen))) seen[id] = Math.max(number(seen[id]), number(value));
  const la = object(a.last), lb = object(b.last);
  const last = String(lb.at || "") > String(la.at || "") ? lb : la;
  return {schema: Math.max(number(a.schema), number(b.schema)), solo, seen, last: Object.keys(last).length ? last : null};
}

function mergeMom(aValue, bValue) {
  const a = object(aValue), b = object(bValue);
  const newer = String(b.updatedAt || "") >= String(a.updatedAt || "") ? b : a;
  return {
    totalPoints: Math.max(number(a.totalPoints), number(b.totalPoints)),
    games: Math.max(number(a.games), number(b.games)),
    streak: number(newer.streak),
    bestStreak: Math.max(number(a.bestStreak), number(b.bestStreak)),
    bestRound: Math.max(number(a.bestRound), number(b.bestRound)),
    updatedAt: String(newer.updatedAt || new Date().toISOString())
  };
}

function localProgress() {
  return {
    version: 1,
    soloStore: object(parse(SOLO_KEY)),
    mom: object(parse(MOM_KEY)),
    updatedAt: new Date().toISOString()
  };
}

function mergeProgress(localValue, cloudValue) {
  const local = object(localValue), cloud = object(cloudValue);
  return {
    version: 1,
    soloStore: mergeSolo(local.soloStore, cloud.soloStore),
    mom: mergeMom(local.mom, cloud.mom),
    updatedAt: new Date().toISOString()
  };
}

function stable(value) {
  const copy = structuredClone(value);
  delete copy.updatedAt;
  if (copy.mom) delete copy.mom.updatedAt;
  return JSON.stringify(copy);
}

function applyLocal(progress) {
  const beforeSolo = object(parse(SOLO_KEY)), beforeMom = object(parse(MOM_KEY));
  const nextSolo = mergeSolo(beforeSolo, progress.soloStore), nextMom = mergeMom(beforeMom, progress.mom);
  const changed = stable({soloStore: beforeSolo, mom: beforeMom}) !== stable({soloStore: nextSolo, mom: nextMom});
  write(SOLO_KEY, nextSolo);
  write(MOM_KEY, nextMom);
  if (changed) window.dispatchEvent(new CustomEvent("ssbd:cloud-restored", {detail: {solo: nextSolo, mom: nextMom}}));
  return changed;
}

let busy = false;
let lastPlayerId = null;
let lastSent = "";

async function sync({allowReload = false} = {}) {
  const p = player();
  if (!p?.id || !navigator.onLine || busy) return;
  busy = true;
  try {
    const response = await fetch(`/api/player/progress?player_id=${encodeURIComponent(p.id)}`, {cache: "no-store"});
    if (!response.ok) return;
    const data = await response.json();
    const merged = mergeProgress(localProgress(), data.progress);
    const changed = applyLocal(merged);
    const payload = stable(merged);
    if (payload !== lastSent) {
      const saved = await fetch("/api/player/progress", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({player_id: p.id, progress: merged})});
      if (saved.ok) lastSent = payload;
    }
    // Main game state is held in memory after boot. When recovery imports Solo history on a
    // different device, reload once so the dashboard reflects it immediately. Mom Mode listens
    // for ssbd:cloud-restored and refreshes its score without a reload.
    if (changed && allowReload && !location.pathname.startsWith("/mom")) {
      const key = `ssbd:cloud-reloaded:${p.id}`;
      if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, "1"); location.reload(); }
    }
  } catch {
    // Device-first means a failed sync is never allowed to interrupt play.
  } finally {
    busy = false;
  }
}

function watchPlayer() {
  const id = player()?.id || null;
  const changed = id && id !== lastPlayerId;
  if (id !== lastPlayerId) { lastPlayerId = id; lastSent = ""; }
  if (id) sync({allowReload: Boolean(changed)});
}

window.addEventListener("online", () => sync({allowReload: true}));
window.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
window.addEventListener("storage", event => { if ([PLAYER_KEY, SOLO_KEY, MOM_KEY].includes(event.key)) watchPlayer(); });
window.addEventListener("ssbd:progress-changed", () => sync());

watchPlayer();
setInterval(watchPlayer, POLL_MS);
