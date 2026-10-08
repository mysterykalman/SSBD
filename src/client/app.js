// Same Same but Different: browser app.
// Solo games run fully on the device (src/shared/solo.js) and work offline.
// Family games use the API in src/server/api.js.

import {MAX_MOVES, checkWord, currentMove, isFinished} from "../shared/rules.js";
import {publicMove, setGaryDiagnostics, startSoloGame, submitSoloWord} from "../shared/solo.js";
import {ENGINE_CONFIG, selectBotWord} from "../shared/engine.js";
import {isJoinCode, looksLikeRoomCode, normalizeJoinCode} from "../shared/codes.js";
import {getLexicon} from "../shared/lexicon/index.js";
import {cleanWord, createSpeller, wordKey} from "../shared/words.js";
import {correctionFor, understandWord} from "../shared/understand.js";
import {garyDiagnosticsEnabled, logGaryDecision, trace} from "./diagnostics.js";
import {languageName, translator} from "./i18n.js";
import {createStore} from "./store.js";
import {garyRandom, hasMet, markMet, poolTurn, recentLines, rememberLines, typeInto} from "./gary.js";
import {CHARACTER_IDS, TAKING_A_WHILE_MS, character, characterId, cleverBridge, connectionStrength, copyKey, rematchLine, resultLines, revealKind, scriptedHelp, scriptedReaction} from "./characters.js";
import {garyBeats, oneOffLine} from "./gary-narrative.js";
import {characterArt} from "./gary-art.js";
import {decisionView} from "./decision-view.js";
import {endUnfinished, logRating, logRound, startLogSync} from "./gamelog.js";
import {renderReview} from "./review.js";

const store = createStore();
const state = {
  lang: store.language() || ((navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en"),
  player: store.player(),
  online: navigator.onLine !== false,
  apiDown: false, // the Family-mode API is unreachable or not answering with JSON (Solo is unaffected)
  screen: "home",
  game: null, // normalized view of the open game
  // Reveal sequence (see "reveal sequence" below). While `reveal` is set, the board shows the
  // game as it was before that reveal; `justContinued` marks the move the player just continued from.
  reveal: null,
  justContinued: 0,
  idle: null, // {gameId, move, index}: the player has been thinking a while on this Solo move (Milo's line, or one of Gary's waiting lines)
  /** Gary's occasional note on a spelling correction the player just accepted: {gameId, key}. */
  typoAside: null,
  busy: false,
  dashboard: null,
  dismissedSuggestion: null,
  /** The word the "Did you mean?" box last asked about on lock-in (asked once per word). */
  confirmFor: null,
  /** What the player did with a spelling suggestion for the word about to be played (for the log). */
  inputNote: null,
  pollTimer: null
};
const t = translator(() => state.lang);
const $ = id => document.getElementById(id);
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const spellers = {};
const speller = lang => (spellers[lang] ??= createSpeller(getLexicon(lang).words));

// ---------- tiny DOM helper ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "text") el.textContent = value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function when(iso) {
  try {
    return new Intl.DateTimeFormat(state.lang === "fr" ? "fr-CA" : "en-CA", {dateStyle: "medium", timeStyle: "short"}).format(new Date(iso));
  } catch {
    return "";
  }
}

// ---------- toasts ----------
function toast(message, {kind = "info", timeout = 4500, action, key} = {}) {
  const box = $("toasts");
  // A toast with a key replaces the previous one with the same key (e.g. offline/online flapping).
  if (key) for (const old of box.querySelectorAll(`[data-key="${key}"]`)) old.remove();
  const close = () => { item.classList.add("leaving"); setTimeout(() => item.remove(), 200); };
  // The #toasts container is the live region (set up in ensureLiveRegions), so the
  // items carry no role of their own: one announcement per toast, never two.
  const item = h("div", {class: `toast ${kind}`, "data-key": key || null},
    h("span", {class: "toast-text"}, message),
    action && h("button", {class: "toast-action", type: "button", onclick: () => { action.run(); close(); }}, action.label),
    h("button", {class: "toast-close", type: "button", "aria-label": t("dismiss"), onclick: close}, h("span", {"aria-hidden": "true"}, "×")));
  ensureLiveRegions();
  box.append(item);
  while (box.children.length > 3) box.firstChild.remove();
  if (timeout) setTimeout(close, timeout);
}

// ---------- screen-reader announcements ----------
// Live regions must exist before their text changes, so they live outside #app
// (which is re-rendered) and are created once.
function ensureLiveRegions() {
  const box = $("toasts");
  if (box && !box.hasAttribute("aria-live")) {
    box.setAttribute("aria-live", "polite");
    box.setAttribute("aria-relevant", "additions");
  }
  if (!$("srAnnounce")) document.body.append(h("div", {id: "srAnnounce", class: "sr-only", "aria-live": "polite", "aria-atomic": "true"}));
}

let lastAnnounced = null;
/** Speak `text` once per `key` (re-renders and language switches don't repeat it). */
function announce(text, key = text) {
  if (key === lastAnnounced) return;
  lastAnnounced = key;
  ensureLiveRegions();
  const region = $("srAnnounce");
  region.textContent = "";
  // Let focus moves (e.g. back into the word box) settle first so they don't cut this off.
  setTimeout(() => { region.textContent = text; }, 150);
}

// ---------- network ----------
async function api(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? {"content-type": "application/json"} : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal
    });
  } catch {
    const error = new Error(t("errNETWORK"));
    error.code = "NETWORK";
    throw error;
  } finally {
    clearTimeout(timer);
  }
  /** @type {any} */
  let data = null;
  if (/json/i.test(response.headers.get("content-type") || "")) {
    try { data = await response.json(); } catch {}
  }
  // No JSON at all (e.g. a host's HTML error page), or the server saying its database is down:
  // Family mode is unavailable, which is different from an error in this one request.
  if (!data || UNAVAILABLE_CODES.has(data.code)) {
    setApiDown(true);
    const error = new Error(t("errUNAVAILABLE"));
    error.code = "UNAVAILABLE";
    error.data = data || {};
    throw error;
  }
  if (!response.ok) {
    const error = new Error(data.error || t("errSERVER"));
    error.code = data.code || "SERVER";
    error.data = data;
    throw error;
  }
  setApiDown(false);
  return data;
}

const UNAVAILABLE_CODES = new Set(["NO_DATABASE", "DB_UNAVAILABLE", "SCHEMA_MISSING"]);

/** Ask the API whether Family mode can work right now (only when the device is online). */
async function checkApi() {
  if (!state.online) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/health", {cache: "no-store", signal: controller.signal});
    const data = /json/i.test(response.headers.get("content-type") || "") ? await response.json() : null;
    setApiDown(!(data && data.ok === true));
  } catch {
    // Offline is handled separately; online but unreachable means the API is down.
    if (state.online) setApiDown(true);
  } finally {
    clearTimeout(timer);
  }
}

function setApiDown(down) {
  if (down === state.apiDown) return;
  state.apiDown = down;
  if (state.screen === "home") rerender();
}

function errorText(code, word) {
  const key = `err${code}`;
  return t(key, {word: word ? word.toUpperCase() : ""}) === key ? t("errSERVER") : t(key, {word: word ? word.toUpperCase() : ""});
}

// ---------- views ----------
function soloView(game) {
  return {
    kind: "solo",
    id: game.id,
    language: game.language,
    status: game.status,
    createdAt: game.createdAt,
    maxMoves: MAX_MOVES,
    youSide: "a",
    otherSide: "b",
    otherName: null,
    character: characterId(game.character),
    rematch: Boolean(game.rematch),
    moves: game.moves.map(m => ({...publicMove(m), mine: null, otherLocked: m.status === "OPEN"}))
  };
}

function serverView(game) {
  return {
    kind: game.kind,
    id: game.id,
    joinCode: game.joinCode,
    language: game.language,
    status: game.status,
    waitingForPlayer: game.waitingForPlayer,
    createdAt: game.createdAt,
    maxMoves: game.maxMoves || MAX_MOVES,
    youSide: game.you.side,
    otherSide: game.opponent.side,
    otherName: game.opponent.name,
    rematchId: game.rematchId || null,
    moves: game.moves
  };
}

/**
 * How far a family game has got, as seen by this player. Games only ever move forward (a friend
 * joins, words are locked, moves are revealed, the game ends), so a smaller value is an older state.
 */
function progressOf(view) {
  const open = view.moves[view.moves.length - 1];
  const revealed = view.moves.filter(m => m.words).length;
  return [revealed, isFinished(view) ? 1 : 0, view.waitingForPlayer ? 0 : 1, open?.mine ? 1 : 0, open?.otherLocked ? 1 : 0];
}
function isOlderView(next, current) {
  if (!current || current.id !== next.id || isSoloLike(current)) return false;
  const a = progressOf(next), b = progressOf(current);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/**
 * Show the server's state of a family game, unless it is older than what is already on screen.
 * Responses can arrive out of order (a poll sent just before this player's own submit, a slow
 * network): an older one must never undo a locked word, a reveal or the win. Returns whether it was shown.
 */
function applyServerGame(game) {
  const view = serverView(game);
  if (isOlderView(view, state.game)) { trace("stale", {id: view.id, got: progressOf(view), have: progressOf(state.game)}); return false; }
  openView(view);
  return true;
}

const isSoloLike = view => view.kind === "solo" || view.kind === "legacy-solo";
/** The Solo character the player chose for this game (older and server-side Solo games: Gary). */
const soloCharacter = view => character(view?.character);
const characterName = view => t(soloCharacter(view).name);
/** Shared Solo copy in the chosen character's own words (family games: the shared copy). */
const ct = (view, key, vars) => t(isSoloLike(view) ? copyKey(view.character, key) : key, vars);
// The Solo teammate is the chosen character; family players keep their own names.
const otherLabel = view => (isSoloLike(view) ? characterName(view) : view.otherName || t("friend"));
const sideLabel = (view, side) => (side === view.youSide ? t("you") : otherLabel(view));

// ---------- player badges ----------
// Players are shown as a round badge with the first letter of their name (never a picture).
function initialOf(name) {
  const text = String(name || "").trim().normalize("NFC");
  if (!text) return "?";
  let first = [...text][0];
  try { first = new Intl.Segmenter(state.lang, {granularity: "grapheme"}).segment(text)[Symbol.iterator]().next().value.segment; } catch {}
  return first.toLocaleUpperCase(state.lang);
}
/** Decorative badge; the name is always written next to it, so it is hidden from screen readers. */
function badge(name, {bot = false, who = "gary", cls = ""} = {}) {
  if (bot) return h("span", {class: `badge gary ${cls}`, "aria-hidden": "true"}, characterArt(characterId(who), "meh", "badge-art"));
  return h("span", {class: `badge ${cls}`, "aria-hidden": "true"}, initialOf(name));
}
const otherBadge = (view, cls) => badge(view.otherName, {bot: isSoloLike(view), who: view.character, cls});

// ---------- routing ----------
function navigate(path, replace = false) {
  if (location.pathname !== path) history[replace ? "replaceState" : "pushState"]({}, "", path);
  route();
}

async function route() {
  stopPolling();
  closeReveal();
  const path = location.pathname;
  let match;
  if ((match = path.match(/^\/solo\/([\w-]+)$/))) {
    const game = store.soloGame(match[1]);
    if (!game) return navigate("/", true);
    openView(soloView(game));
    store.setLast({kind: "solo", id: game.id});
    return;
  }
  if ((match = path.match(/^\/games\/([\w-]+)$/))) {
    if (!state.player) { toast(t("errUNKNOWN_PLAYER"), {kind: "error"}); return navigate("/", true); }
    return loadFamilyGame(match[1]);
  }
  if (path === "/review") {
    // Private bot review (developer tool); server data needs the review token.
    state.screen = "review";
    state.game = null;
    return renderReview($("app"), {onHome: () => navigate("/")});
  }
  if ((match = path.match(/^\/join\/([\w-]+)$/))) {
    history.replaceState({}, "", "/");
    renderHome();
    return joinDialog(decodeURIComponent(match[1]));
  }
  renderHome();
}

function openView(view) {
  if (state.game?.id !== view.id) { closeReveal(); state.justContinued = 0; }
  state.game = view;
  state.screen = "game";
  // A reveal the player hasn't seen yet (just played, or happened since their last visit) starts
  // the reveal sequence; the board keeps showing the pre-reveal turn until they press Keep playing.
  if (!state.reveal) {
    const last = latestRevealed(view);
    if (last && last.number > store.seen(view.id)) startReveal(view, last);
  }
  renderGame();
  schedulePoll();
}

async function loadFamilyGame(id) {
  state.screen = "game";
  if (!state.game || state.game.id !== id) renderLoading();
  try {
    const data = await api(`/api/game?id=${encodeURIComponent(id)}&player_id=${encodeURIComponent(state.player.id)}`);
    store.setLast({kind: "family", id});
    if (!applyServerGame(data.game)) renderGame();
  } catch (error) {
    if (error.code === "NETWORK") {
      renderMessage(t("errNETWORK"), () => loadFamilyGame(id));
    } else {
      toast(errorText(error.code), {kind: "error"});
      navigate("/", true);
    }
  }
}

// ---------- polling (family games only) ----------
function stopPolling() {
  clearTimeout(state.pollTimer);
  state.pollTimer = null;
}

function needsPoll(view) {
  if (!view || isSoloLike(view) || isFinished(view)) return false;
  return true;
}

// How often to check a family game. Fast while this player is waiting on the other one (their
// word, or their joining), so a reveal or a win reaches both players within about a second.
const POLL_WAITING_MS = 1000, POLL_IDLE_MS = 3500;
function pollDelay(view) {
  const open = view.moves[view.moves.length - 1];
  return view.waitingForPlayer || (open?.mine && !open.otherLocked) ? POLL_WAITING_MS : POLL_IDLE_MS;
}

function schedulePoll(delay = pollDelay(state.game || {moves: []})) {
  stopPolling();
  if (!needsPoll(state.game)) return;
  state.pollTimer = setTimeout(async () => {
    if (document.hidden || !state.online || state.busy || state.screen !== "game") return schedulePoll();
    const id = state.game.id;
    try {
      const data = await api(`/api/game?id=${encodeURIComponent(id)}&player_id=${encodeURIComponent(state.player.id)}`);
      if (state.screen === "game" && state.game?.id === data.game.id && JSON.stringify(serverView(data.game)) !== JSON.stringify(state.game)) {
        const wasWaiting = state.game.waitingForPlayer;
        if (applyServerGame(data.game)) {
          refreshNotifications();
          if (wasWaiting && !state.game.waitingForPlayer) toast(t("statusYourTurn"), {kind: "success"});
          return;
        }
      }
    } catch {}
    if (state.game?.id === id) schedulePoll();
  }, delay);
}

/** Check a family game right away (the player came back to the tab, or the network returned). */
function pollNow() {
  if (state.screen === "game" && state.game && needsPoll(state.game) && !state.busy) schedulePoll(0);
}

// ---------- header ----------
function renderChrome() {
  document.documentElement.lang = state.lang;
  document.title = "Same Same but Different";
  ensureLiveRegions();
  // The game's name is English in both languages; say so for screen readers.
  $("brandLink").setAttribute("lang", "en");
  $("brandTop").textContent = t("brandTop");
  $("brandBottom").textContent = t("brandBottom");
  const skip = document.querySelector(".skip");
  if (skip) skip.textContent = t("skip");
  $("langGroup").setAttribute("aria-label", t("langLabel"));
  for (const button of document.querySelectorAll("[data-lang]")) {
    // Each option is named in its own language ("English", "Français") and pronounced that way.
    button.setAttribute("lang", button.dataset.lang);
    button.setAttribute("aria-pressed", String(button.dataset.lang === state.lang));
  }
  const pill = $("offlinePill");
  // Going offline/online is announced once by a toast; the pill is a visible label only.
  pill.removeAttribute("role");
  pill.hidden = state.online;
  if (pill.dataset.textLang !== state.lang) {
    pill.dataset.textLang = state.lang;
    pill.title = t("offline");
    pill.replaceChildren(h("span", {class: "pill-long"}, t("offline")), h("span", {class: "pill-short"}, t("offlineShort")));
  }
  const avatar = $("profileBtn");
  // The header badge shows the player's initial, or a neutral "?" before they pick a name.
  avatar.textContent = state.player?.display_name?.trim() ? initialOf(state.player.display_name) : "?";
  avatar.setAttribute("aria-label", state.player ? t("profileButtonNamed", {name: state.player.display_name}) : t("profileButton"));
  avatar.setAttribute("aria-haspopup", "dialog");
  renderBell();
}

function rerender() {
  renderChrome();
  if (state.screen === "game" && state.game) renderGame();
  else renderHome();
}

function mount(...nodes) {
  const app = $("app");
  // Optional sections (e.g. the developer-only Gary panel) are passed as null/false when absent;
  // replaceChildren would turn those into the visible text "null"/"false", so they are skipped.
  app.replaceChildren(...nodes.flat(Infinity).filter(node => node != null && node !== false && node !== ""));
}

function renderLoading() {
  renderChrome();
  mount(h("section", {class: "card center"}, h("p", {class: "loading"}, h("span", {class: "spinner", "aria-hidden": "true"}), t("loading"))));
}

function renderMessage(message, retry) {
  renderChrome();
  mount(h("section", {class: "card center"},
    h("p", {class: "notice error", role: "alert"}, message),
    h("div", {class: "row center"},
      h("button", {class: "btn ghost", type: "button", onclick: () => navigate("/")}, t("back")),
      retry && h("button", {class: "btn", type: "button", onclick: retry}, t("retry")))));
}

// ---------- home ----------
function renderHome() {
  state.screen = "home";
  state.game = null;
  stopPolling();
  renderChrome();
  const familyDisabled = !state.online || state.apiDown;
  mount(
    h("section", {class: "hero"},
      h("h1", {}, t("heroTitle")),
      h("p", {class: "lede"}, t("heroCopy")),
      h("p", {class: "hero-rules"}, t("heroRules"))),
    h("div", {class: "start-grid"},
      h("section", {class: "card start solo-card", "aria-labelledby": "soloTitle"},
        // Both characters, side by side and the same size: "Choose someone" lets the player pick either.
        h("div", {class: "start-icon pair", id: "soloPair", "aria-hidden": "true"}, ...CHARACTER_IDS.map(id => badge(null, {bot: true, who: id, cls: `pair-${id}`}))),
        h("h2", {id: "soloTitle"}, t("soloTitle")),
        h("div", {class: "start-copy"}, h("p", {}, t("soloBody")), h("p", {}, t("soloBody2"))),
        h("button", {class: "btn big", type: "button", id: "startSolo", "aria-haspopup": "dialog", onclick: () => pickCharacter()}, t("soloStart"))),
      h("section", {class: "card start family-card", "aria-labelledby": "familyTitle"},
        h("div", {class: "start-icon duo", "aria-hidden": "true"}, badge(state.player?.display_name || t("you"), {cls: "you"}), badge(null, {cls: "other"})),
        h("h2", {id: "familyTitle"}, t("togetherTitle")),
        !state.online
          ? h("div", {class: "start-copy"}, h("p", {}, t("familyOffline")))
          : state.apiDown
            ? h("div", {class: "start-copy", id: "familyUnavailable"}, h("p", {}, t("familyUnavailable")),
              h("button", {class: "btn ghost small", type: "button", id: "retryFamily", onclick: () => checkApi()}, t("retry")))
            : h("div", {class: "start-copy"}, h("p", {}, t("togetherCopy1")), h("p", {}, t("togetherCopy2"))),
        h("div", {class: "row"},
          h("button", {class: "btn teal", type: "button", id: "createFamily", disabled: familyDisabled, onclick: () => ensurePlayer(createFamily)}, t("familyCreate")),
          h("button", {class: "btn ghost", type: "button", id: "joinFamily", disabled: familyDisabled, onclick: () => joinDialog("")}, t("familyJoin"))))),
    h("section", {class: "card games", "aria-labelledby": "gamesTitle"},
      h("h2", {id: "gamesTitle"}, t("gamesTitle")),
      h("ul", {class: "game-list", id: "gameList"}, gameListItems())));
  refreshDashboard();
}

function gameListItems() {
  const items = store.soloGames().map(game => ({
    key: `solo:${game.id}`,
    updatedAt: game.updatedAt,
    title: t("solo"),
    badge: badge(null, {bot: true, who: game.character}),
    createdAt: game.createdAt,
    status: game.status,
    move: currentMove(game).number,
    language: game.language,
    yourTurn: game.status === "ACTIVE",
    open: () => navigate(`/solo/${game.id}`)
  }));
  for (const g of state.dashboard?.games || []) {
    const waiting = g.status === "WAITING";
    items.push({
      key: `family:${g.id}`,
      updatedAt: g.updated_at,
      title: g.bot ? t("solo") : waiting ? t("waitingJoin") : t("vs", {name: g.opponent_name || t("friend")}),
      badge: g.bot ? badge(null, {bot: true}) : badge(waiting ? null : g.opponent_name || t("friend"), {cls: "other"}),
      createdAt: g.created_at,
      status: g.status,
      move: g.round_number,
      language: g.language,
      yourTurn: g.status === "ACTIVE" && !g.locked,
      theirTurn: g.status === "ACTIVE" && g.locked && !g.bot ? g.opponent_name || t("friend") : null,
      open: () => navigate(`/games/${g.id}`)
    });
  }
  items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if (!items.length) return [h("li", {class: "empty"}, h("span", {class: "empty-line"}, t("gamesEmpty1")), h("span", {class: "empty-line muted"}, t("gamesEmpty2")))];
  return items.map(item => {
    const finished = item.status === "MATCHED" || item.status === "EXHAUSTED";
    const status = item.status === "MATCHED" ? t("statusMatched")
      : item.status === "EXHAUSTED" ? t("gameOverTitle")
      : item.status === "WAITING" ? t("waitingJoin")
      : item.theirTurn ? t("statusTheirTurn", {name: item.theirTurn})
      : item.yourTurn ? t("statusYourTurn") : t("statusActive");
    return h("li", {class: `game-item ${finished ? "finished" : ""} ${item.yourTurn ? "your-turn" : ""}`, "data-key": item.key},
      h("span", {class: "game-icon", "aria-hidden": "true"}, item.badge),
      h("div", {class: "game-info"},
        h("strong", {}, item.title),
        h("span", {class: "game-meta"}, when(item.createdAt)),
        h("span", {class: "game-meta"}, [status, finished ? null : t("moveOf", {n: item.move, max: MAX_MOVES}), item.language && item.language !== state.lang ? t("gameInLang", {lang: languageName(t, item.language)}) : null].filter(Boolean).join(" · "))),
      h("button", {class: `btn small ${finished ? "ghost" : ""}`, type: "button", onclick: item.open, "aria-label": t("openGame", {action: finished ? t("view") : t("resume"), title: item.title, date: when(item.createdAt)})}, finished ? t("view") : t("resume")));
  });
}

async function refreshDashboard() {
  if (!state.player || !state.online) return;
  try {
    const data = await api(`/api/dashboard?player_id=${encodeURIComponent(state.player.id)}`);
    state.dashboard = data;
    if (state.screen === "home") $("gameList")?.replaceChildren(...gameListItems());
    // News lives in the notifications panel (bell); nothing is marked read until the player opens it.
    refreshNotifications();
  } catch (error) {
    if (error.code === "UNKNOWN_PLAYER") {
      // The server no longer knows this player (e.g. a different database). Keep Solo working.
      state.dashboard = null;
    }
  }
}

// ---------- starting games ----------
function newId() {
  return crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomSeed() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch { return Math.floor(Math.random() * 2 ** 32); }
}

/** The character the player last chose (preselected next time), Gary by default. */
const lastCharacter = () => characterId(store.character());

/**
 * Start a Solo game with a character. Every character plays with the same word engine; the choice
 * is stored with the game (presentation only) and remembered for next time.
 * `rematch`: "Play again" from a finished game (same character, with a greeting).
 */
function startSolo(language = state.lang, {who = lastCharacter(), rematch = false} = {}) {
  const id = characterId(who);
  store.setCharacter(id);
  const game = startSoloGame({id: newId(), language, seed: randomSeed(), character: id, rematch});
  if (!store.saveSolo(game)) toast(t("errSTORAGE"), {kind: "error", timeout: 8000});
  endUnfinished([game.id]); // starting another game ends any unfinished one on purpose (logged as "ended")
  navigate(`/solo/${game.id}`);
  $("word")?.focus(); // Solo renders synchronously; focus now so typing right away is never lost
  if (character(id).intro && !hasMet(id)) showCharacterIntro(id, {onDone: () => $("word")?.focus()});
  // Retry only if focus was lost (e.g. to <body>), never pulling it away from a control the player moved to.
  setTimeout(() => { const active = document.activeElement; if (!active || active === document.body) $("word")?.focus(); }, 30);
}

/**
 * "Who do you want to play with?": the step before a new Solo game from home. Two big cards
 * (radio buttons underneath, so arrows, Tab and screen readers all work), the last choice preselected.
 */
function pickCharacter() {
  $("characterPicker")?.remove();
  let chosen = lastCharacter();
  const close = () => { const dlg = $("characterPicker"); if (dlg) { if (dlg.open) dlg.close(); dlg.remove(); } };
  const startLabel = () => t("pickStart", {name: t(character(chosen).name)});
  const card = id => {
    const c = character(id);
    return h("label", {class: "pick-card", "data-character": id, for: `pick-${id}`},
      h("input", {type: "radio", name: "character", value: id, id: `pick-${id}`, class: "pick-radio", checked: id === chosen,
        "aria-describedby": `pick-${id}-line`, onchange: () => { chosen = id; $("startCharacter").textContent = startLabel(); }}),
      characterArt(id, "meh", "pick-art"),
      h("span", {class: "pick-name"}, t(c.name)),
      h("span", {class: "pick-copy", id: `pick-${id}-line`}, ...c.card.map(key => h("span", {class: "pick-line"}, t(key)))));
  };
  const dlg = h("dialog", {id: "characterPicker", class: "character-picker", "aria-labelledby": "pickTitle", onclose: () => $("characterPicker")?.remove()},
    h("form", {method: "dialog", class: "pick-body", onsubmit: event => { event.preventDefault(); close(); startSolo(state.lang, {who: chosen}); }},
      h("h2", {id: "pickTitle"}, t("pickTitle")),
      h("div", {class: "pick-cards", role: "radiogroup", "aria-labelledby": "pickTitle"}, ...CHARACTER_IDS.map(card)),
      h("div", {class: "row end"},
        h("button", {class: "btn ghost", type: "button", id: "cancelCharacter", onclick: close}, t("cancel")),
        h("button", {class: "btn big", type: "submit", id: "startCharacter"}, startLabel()))));
  const opener = document.activeElement;
  dlg.addEventListener("close", () => { if (opener?.isConnected && state.screen === "home") opener.focus?.({preventScroll: true}); }, {once: true});
  document.body.append(dlg);
  dlg.showModal();
  $(`pick-${chosen}`).focus();
}

async function createFamily(language = state.lang) {
  try {
    const data = await api("/api/games", {player_id: state.player.id, solo: false, language});
    navigate(`/games/${data.id}`);
  } catch (error) {
    toast(errorText(error.code), {kind: "error"});
  }
}

// ---------- game screen ----------
function renderGame() {
  // The board renders what the player is meant to see now: during a reveal, the turn as it was before it.
  const view = boardView(state.game);
  const keep = captureInput();
  renderChrome();
  const move = view.moves[view.moves.length - 1];
  const finished = view.status === "MATCHED" || view.status === "EXHAUSTED";
  const revealed = latestRevealed(view);
  // The turn the player just continued into gets its one-time pop/celebration; re-renders don't repeat it.
  const fresh = Boolean(revealed && !state.reveal && revealed.number === state.justContinued);
  state.justContinued = 0;
  const solo = isSoloLike(view);
  $("app").dataset.phase = state.reveal ? state.reveal.phase : finished ? "gameOver" : "playing";

  // Mode lives next to the back button; the board starts with the progress trail.
  const board = h("section", {class: `card board ${finished ? "finished" : ""}`, "aria-labelledby": "boardTitle"},
    progressTrail(view, move, finished, revealed, fresh),
    languageNote(view),
    finished ? endPanel(view, revealed, fresh) : playPanel(view, move));

  mount(
    h("div", {class: "game-nav"},
      h("button", {class: "btn ghost small", type: "button", id: "backBtn", onclick: () => navigate("/")}, backLabel()),
      h("span", {class: "mode-chip"},
        view.waitingForPlayer && !solo ? null : otherBadge(view, "small"),
        h("span", {}, solo ? t("solo") : view.waitingForPlayer ? t("familyTitle") : t("vs", {name: view.otherName || t("friend")})))),
    board,
    trail(view),
    garyDebugPanel(view));
  restoreInput(keep);
  watchIdle(view);
  if (fresh && revealed.status === "MATCHED") celebrate();
}

/**
 * Developer mode only: how Gary chose his most recently revealed word (never shown to players,
 * never before the reveal). Plain English on purpose: it is a tool, not part of the game.
 */
function garyDebugPanel(view) {
  if (!garyDiagnosticsEnabled() || view.kind !== "solo") return null;
  const move = [...view.moves].reverse().find(m => m.words && m.garyDecision);
  const d = move?.garyDecision;
  const body = !d
    ? [h("p", {}, "No decision recorded yet (diagnostics were off when this move was locked, or nothing has been revealed).")]
    : [decisionView(d, {character: view.character, selected: move.words[view.otherSide]})];
  return h("details", {class: "card gary-debug", id: "garyDebug", lang: "en", open: true},
    h("summary", {}, `${characterName(view)}'s decision${move ? ` · move ${move.number}` : ""} (developer diagnostics)`), ...body);
}

/**
 * 20 stepping stones instead of a bar: played moves carry a check, the current move is
 * bigger (it pops once when you arrive), future moves are outlined. At the end every
 * stone lights up and the last one becomes a trophy (match) or a star (20 moves).
 */
function progressTrail(view, move, finished, revealed, fresh) {
  const max = view.maxMoves;
  const current = finished ? revealed.number : move.number;
  const togo = Math.max(0, max - current);
  const label = t("moveOf", {n: current, max});
  const sub = finished
    ? (view.status === "MATCHED" ? t("progressMatched", {n: current}) : t("progressFinale"))
    : current <= 1 ? t("progressStart") : t("progressToGo", {n: togo});
  const pop = fresh && !finished && !reducedMotion();
  const stones = [];
  for (let n = 1; n <= max; n++) {
    let cls, mark;
    if (finished) {
      cls = n < current ? "done lit" : n === current ? "final lit" : "lit spare";
      mark = n === current ? "★" : n < current ? "✓" : "★";
    } else if (n < current) { cls = "done"; mark = "✓"; }
    else if (n === current) { cls = `now ${pop ? "pop" : ""}`; mark = String(n); }
    else { cls = "todo"; mark = ""; }
    stones.push(h("span", {class: `stone ${cls}`}, mark));
  }
  return h("div", {class: `progress ${finished ? "finale" : ""}`},
    h("p", {class: "progress-labels"},
      h("span", {class: "move-count", id: "moveLabel"}, label),
      h("span", {class: "progress-sub", id: "progressSub"}, sub)),
    h("div", {class: "stones", role: "progressbar", "aria-label": t("progressLabel2"), "aria-valuemin": "0", "aria-valuemax": String(max), "aria-valuenow": String(finished && view.status === "EXHAUSTED" ? max : current), "aria-valuetext": `${label}, ${sub}`}, stones));
}

function languageNote(view) {
  if (view.language === state.lang) return null;
  // The game keeps its own word language; nothing is re-rolled or translated behind the player's back.
  const game = languageName(t, view.language);
  const ui = languageName(t, state.lang);
  const solo = isSoloLike(view);
  return h("div", {class: "notice lang-note", role: "note", id: "langNote"},
    h("strong", {}, t("langNoteTitle", {game})), " ",
    solo ? null : [t("langNoteFamily"), " "],
    t("langNoteCopy", {game, ui}), " ",
    h("button", {class: "btn small ghost", type: "button", lang: state.lang, disabled: !solo && !state.online, onclick: () => (solo ? startSolo(state.lang, {who: view.character}) : ensurePlayer(() => createFamily(state.lang)))}, t("langNewGame", {ui})));
}

// "← Games": the arrow is decoration, so screen readers only hear the word (text still comes from t("back")).
function backLabel() {
  const text = t("back"), arrow = text.match(/^\s*[←⬅]\s*/);
  return arrow ? [h("span", {"aria-hidden": "true"}, arrow[0]), text.slice(arrow[0].length)] : text;
}

function wordChip(word, label, cls = "") {
  return h("span", {class: `chip ${cls}`}, label ? h("small", {}, label) : null, h("span", {class: "chip-word", lang: state.game?.language}, word));
}

function latestRevealed(view) {
  return [...view.moves].reverse().find(m => m.words) || null;
}

// ---------- reveal sequence ----------
// SUBMIT → COUNTDOWN → REVEAL → CONTINUE → NEXT TURN, in one modal (#revealModal).
// Phases (shown on #app[data-phase]): "playing" → "countdown" → "revealing" → "ready" → "playing"/"gameOver".
// The new pair already exists in the game state (and storage), but the board, word trail and
// progress keep rendering boardView(): the turn as it was before the reveal (currentPair), while
// the modal shows the revealed move (pendingNextPair). Only finishReveal() promotes it.

/** The game as the board should show it: during a pending reveal, the revealed move is still the open turn. */
function boardView(view) {
  const pending = state.reveal;
  if (!pending || pending.gameId !== view.id) return view;
  const index = view.moves.findIndex(m => m.number === pending.number);
  if (index < 0) return view;
  const move = view.moves[index];
  const frozen = {...move, words: null, status: "OPEN", revealedAt: null, mine: move.words[view.youSide], otherLocked: true};
  return {...view, status: "ACTIVE", moves: [...view.moves.slice(0, index), frozen]};
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const COUNT_MS = 380, STEP_MS = 190;

function startReveal(view, move) {
  closeReveal();
  const token = Symbol("reveal");
  const solo = isSoloLike(view);
  const script = solo ? soloCharacter(view).script : null;
  // Gary: one paired beat for this move from his narrative (before the reveal, then after it),
  // chosen from the direction of the whole game so far. Flavour only: never fed back into the game.
  const beat = solo && soloCharacter(view).narrative ? garyBeatFor(view, move) : null;
  // Which line of a pool: that pool's next turn in this game (stable for this move on a reload).
  const turn = pool => poolTurn(view.id, pool, move.number);
  const reaction = !solo || beat ? null
    : script ? scriptedReaction(script, {status: move.status, move: move.number, cantUse: move.status === "REVEALED" && wantedUsedWord(view, move), recent: recentLines(view.id), random: garyRandom, gameId: view.id, turn, pools: soloCharacter(view).pools})
    : null;
  if (reaction) rememberLines(view.id, reaction.keys);
  // A spelling correction the player just accepted: Gary sometimes notes it (never mocking).
  const aside = beat && state.typoAside?.gameId === view.id ? state.typoAside.key : null;
  state.typoAside = null;
  state.reveal = {gameId: view.id, number: move.number, phase: "countdown", token, reaction, beat};
  const ended = move.status === "MATCHED" || move.status === "EXHAUSTED";
  const dlg = h("dialog", {id: "revealModal", class: `reveal-modal ${move.status === "MATCHED" ? "match" : ""}`, "aria-labelledby": "revealHeading",
    oncancel: event => { event.preventDefault(); if (state.reveal?.phase === "ready") finishReveal(); }},
    h("div", {class: "rv-body"},
      h("p", {class: "rv-kicker", id: "revealHeading"}, t("revealTitle")),
      aside ? characterLine(view, aside, "garyAside", "gary-aside") : null,
      beat ? garyBefore(view) : null,
      h("div", {class: "rv-count", id: "revealCount", "aria-hidden": "true"}),
      h("div", {class: "rv-result", id: "revealResult", hidden: true},
        h("div", {class: "rv-words"},
          revealWord(t("revealYourWord"), shownWords(view, move)[view.youSide], "you"),
          h("span", {class: "op rv-step", "aria-hidden": "true"}, move.status === "MATCHED" ? "=" : "+"),
          solo ? garyRevealWord(view) : revealWord(t("revealTheirWord", {name: otherLabel(view)}), shownWords(view, move)[view.otherSide], "other")),
        reaction || beat ? garyReaction(view) : null,
        // Gary's AFTER line is his reaction to the result, so he has no separate result line.
        beat && move.status !== "MATCHED" ? null : h("p", {class: "rv-outcome rv-step"}, ...(move.status === "MATCHED"
          ? [h("span", {class: "rv-headline"}, t("revealMatchTitle")), " ", h("span", {class: "rv-subline"}, matchCopy(view, move))]
          : [move.status === "EXHAUSTED" ? ct(view, "gameOverAww") : revealResult(view, move)])),
        move.botQuality === "loose" && move.status !== "MATCHED" ? h("p", {class: "rv-note rv-step"}, ct(view, "revealLoose", {name: characterName(view)})) : null,
        ended ? null : h("p", {class: "rv-next rv-step", id: "revealNext"}, ...nextStartsText(view, move)))));
  document.body.append(dlg);
  dlg.showModal();
  runReveal(view, move, ended, token);
}

/**
 * The two words as THIS player sees them. On a match, both sides show the player's own word:
 * inflections (VEGETABLE / VEGETABLES, RUN / RAN) are an invisible rule, so every match looks like an
 * exact one. Display only; the stored submissions keep the words exactly as typed.
 */
function shownWords(view, move) {
  if (move.status !== "MATCHED" || !move.words) return move.words;
  const mine = move.words[view.youSide];
  return {a: mine, b: mine};
}


/** "Next move starts with A + B", keeping "A + B" together on one line when it fits. */
function nextStartsText(view, move) {
  const pair = `${move.words.a.toUpperCase()} + ${move.words.b.toUpperCase()}`;
  const [before, after = ""] = ct(view, "revealNextStarts", {a: "@@A@@", b: "@@B@@"}).split(/@@A@@\s*\+\s*@@B@@/);
  return [before, h("span", {class: "rv-pair"}, pair), after];
}

/** The character's chip starts empty; the word is typed in once the reveal begins (see runReveal). */
function garyRevealWord(view) {
  return h("div", {class: "rv-word other gary rv-step", "data-gary": "word", "data-character": view.character},
    h("small", {}, characterArt(view.character, "meh", "tiny"), t("revealBotWord", {name: characterName(view)})),
    h("span", {class: "chip-word", id: "garyWord", lang: state.game?.language}));
}

/**
 * Gary's beat for a revealed move: his narrative replayed over the whole game up to that move
 * (src/client/gary-narrative.js), so it is the same beat every time the move is shown.
 */
function garyBeatFor(view, move) {
  const lex = getLexicon(view.language);
  const rounds = [...view.moves.filter(m => m.words && m.number < move.number), move].map(m => {
    const round = {prompts: m.prompts, mine: m.words[view.youSide]};
    return {number: m.number, status: m.status, strength: m.prompts ? connectionStrength(lex, round) : "opening",
      kind: m.prompts && m.status === "REVEALED" ? revealKind(lex, {...round, theirs: m.words[view.otherSide]}) : null};
  });
  return garyBeats(view.id, rounds).at(-1);
}

/** Gary's BEFORE line: said once the player has locked in, before both words are shown. */
function garyBefore(view) {
  return h("div", {class: "gary-reaction gary-before", id: "garyBefore", "data-character": view.character},
    characterArt(view.character, "meh", "gary-reaction-art"),
    h("p", {class: "gary-bubble"}, h("span", {class: "sr-only"}, `${characterName(view)}: `), h("span", {class: "gary-says"})));
}

/**
 * A non-matching reveal's result line: shared in family games, the character's own in Solo. Solo
 * result lines rotate per pool through the game (see resultLines); the whole game so far is replayed,
 * so the same move always shows the same line.
 */
function revealResult(view, move) {
  if (!isSoloLike(view)) return t("revealNice");
  const lex = getLexicon(view.language);
  const earlier = view.moves.filter(m => m.words && m.status === "REVEALED" && m.number < move.number);
  const rounds = [...earlier, move].map(m => {
    const round = {prompts: m.prompts, mine: m.words[view.youSide]};
    return {strength: connectionStrength(lex, round), close: revealKind(lex, {...round, theirs: m.words[view.otherSide]}) === "close", clever: cleverBridge(lex, round)};
  });
  const keys = resultLines(view.character, view.id, rounds);
  return t(keys[keys.length - 1]);
}

/**
 * Whether the word the Solo character would have liked best this move had already been played
 * (so it had to pick another): the same engine, asked again with nothing excluded. Presentation only.
 */
function wantedUsedWord(view, move) {
  if (!move.prompts) return false;
  const before = view.moves.filter(m => m.words && m.number < move.number);
  const used = new Set(before.flatMap(m => [wordKey(m.words.a), wordKey(m.words.b)]));
  if (!used.size) return false;
  try {
    // The engine's single best answer to this pair with nothing blocked (presentation only).
    const free = selectBotWord({pair: move.prompts, blocked: [], language: view.language, config: {...ENGINE_CONFIG, window: {...ENGINE_CONFIG.window, size: 1}}});
    return used.has(wordKey(free.word)) && wordKey(free.word) !== wordKey(move.words[view.otherSide]);
  } catch {
    return false;
  }
}

/**
 * A scripted character notices a long think: after TAKING_A_WHILE_MS on the same move without a
 * word played, their line above the word box becomes "No rush. I'm thinking too." (presentation only).
 */
let idleTimer = null;
const idleCount = new Map(); // game id → long thinks so far (Gary's waiting lines rotate)
function watchIdle(view) {
  clearTimeout(idleTimer);
  const move = view.moves[view.moves.length - 1];
  if (!isSoloLike(view) || !(soloCharacter(view).script || soloCharacter(view).narrative) || isFinished(view) || !$("word")) return;
  if (state.idle && (state.idle.gameId !== view.id || state.idle.move !== move.number)) state.idle = null;
  if (state.idle) return;
  idleTimer = setTimeout(() => {
    const now = state.game;
    if (now?.id !== view.id || state.reveal || !$("word") || now.moves[now.moves.length - 1].number !== move.number) return;
    state.idle = {gameId: view.id, move: move.number, index: idleCount.get(view.id) || 0};
    idleCount.set(view.id, state.idle.index + 1);
    if (!$("formHelp")?.classList.contains("error")) setHelp();
  }, TAKING_A_WHILE_MS);
}

/** The line above the word box in Solo: a scripted character's own (and a gentle nudge after a long think), else the usual one. */
function soloHelp(view, move) {
  const script = soloCharacter(view).script;
  const idle = state.idle?.gameId === view.id && state.idle.move === move.number;
  // Gary after a long think: one of his waiting lines (never pressure); otherwise the usual line.
  if (!script && soloCharacter(view).narrative && idle) return t(oneOffLine("waiting", view.id, state.idle.index));
  if (!script) return ct(view, "botReady", {name: otherLabel(view)});
  return t(scriptedHelp(script, {move: move.number, idle: state.idle?.gameId === view.id && state.idle.move === move.number}));
}

/** "You both said WORD. Your brains did a high five." with the player's own (matched) word. */
function matchCopy(view, move) {
  return t("revealMatchCopy", {word: shownWords(view, move)[view.youSide].toUpperCase()});
}

/**
 * The character's reaction: their avatar with the remark in a speech bubble beside it, so it reads as
 * the character talking, not as a system message. The remark is typed into .gary-says (see garySays).
 */
function garyReaction(view) {
  return h("div", {class: "gary-reaction", id: "garyLine", "data-character": view.character, hidden: true},
    characterArt(view.character, "meh", "gary-reaction-art"),
    h("p", {class: "gary-bubble"}, h("span", {class: "gary-says"})));
}

/** Type Gary's line (one or more short phrases with a beat between them). */
async function garySays(keys, {reduced, alive}) {
  const line = $("garyLine");
  if (!line) return "";
  const target = line.querySelector(".gary-says");
  const phrases = keys.map(key => t(key));
  line.hidden = false;
  if (reduced) { await typeInto(target, phrases.join(" "), {reduced: true}); return phrases.join(" "); }
  for (let i = 0; i < phrases.length; i++) {
    if (i) { await sleep(450); if (!alive()) break; }
    await typeInto(target, phrases[i], {alive, maxTotal: 700});
  }
  return phrases.join(" ");
}

function revealWord(label, word, cls) {
  return h("div", {class: `rv-word ${cls} rv-step`},
    h("small", {}, label),
    h("span", {class: "chip-word", lang: state.game?.language}, word));
}

function setRevealPhase(phase) {
  if (!state.reveal) return;
  state.reveal.phase = phase;
  $("app").dataset.phase = phase;
}

async function runReveal(view, move, ended, token) {
  const alive = () => state.reveal?.token === token && $("revealModal")?.open;
  const count = $("revealCount"), result = $("revealResult");
  const motion = !reducedMotion();
  const beat = state.reveal?.beat;
  // Gary's BEFORE line: he speaks once the player has locked in, before anything is revealed.
  const beforeText = beat ? t(beat.before) : "";
  // (typed while the countdown runs; complete before the words appear)
  const target = beat ? $("garyBefore")?.querySelector(".gary-says") : null;
  const saying = target ? typeInto(target, beforeText, {reduced: !motion, alive, maxTotal: 1400}) : Promise.resolve();
  if (motion) {
    for (const label of ["3", "2", "1", t("sameTime")]) {
      count.textContent = label;
      count.classList.toggle("words", label.length > 1);
      count.classList.remove("bump");
      void count.offsetWidth;
      count.classList.add("bump");
      await sleep(COUNT_MS);
      if (!alive()) return;
    }
  }
  await saying;
  if (!alive()) return;
  count.hidden = true;
  result.hidden = false;
  setRevealPhase("revealing");
  const reaction = state.reveal?.reaction;
  let remark = "";
  for (const step of result.querySelectorAll(".rv-step")) {
    step.classList.add("show");
    if (step.dataset.gary === "word") {
      // Gary begrudgingly types his (already chosen) word, sometimes with a remark before or after.
      if (reaction?.when === "before") { remark = await garySays(reaction.keys, {reduced: !motion, alive}); if (motion) await sleep(350); }
      if (!alive()) return;
      await typeInto(step.querySelector(".chip-word"), shownWords(view, move)[view.otherSide], {reduced: !motion, alive});
      if (!alive()) return;
      if (reaction?.when === "after") { if (motion) await sleep(350); remark = await garySays(reaction.keys, {reduced: !motion, alive}); }
      // Gary's AFTER line: his reaction now that both words are visible.
      if (beat) { if (motion) await sleep(350); remark = await garySays([beat.after], {reduced: !motion, alive}); }
    }
    if (motion) { await sleep(STEP_MS); if (!alive()) return; }
  }
  // One announcement, once everything (including Gary's word and remark) is complete.
  const said = shownWords(view, move);
  announce([t("revealTitle"), beforeText ? t("revealSaid", {name: characterName(view), word: beforeText}) : "", t("revealSaid", {name: sideLabel(view, view.youSide), word: said[view.youSide].toUpperCase()}),
    t("revealSaid", {name: sideLabel(view, view.otherSide), word: said[view.otherSide].toUpperCase()}),
    remark ? t("revealSaid", {name: characterName(view), word: remark}) : "",
    move.status === "MATCHED" ? `${t("revealMatchTitle")} ${matchCopy(view, move)}` : beat ? "" : move.status === "EXHAUSTED" ? ct(view, "gameOverAww") : revealResult(view, move)].filter(Boolean).join(" "), `reveal:${view.id}:${move.number}`);
  const button = h("button", {class: "btn big rv-continue", type: "button", id: "revealContinue", onclick: finishReveal}, ended ? t("revealSeeEnd") : ct(view, "keepPlaying"));
  result.append(button);
  setRevealPhase("ready");
  button.focus();
}

/** Keep playing: the revealed pair becomes the active turn (exactly once), and the modal goes away. */
function finishReveal() {
  const pending = state.reveal;
  if (!pending || pending.phase !== "ready") return;
  store.markSeen(pending.gameId, pending.number);
  closeReveal();
  if (state.screen !== "game" || state.game?.id !== pending.gameId) return;
  state.justContinued = pending.number;
  // A newer reveal that arrived meanwhile (family games) gets its own sequence next.
  const last = latestRevealed(state.game);
  if (last && last.number > store.seen(state.game.id)) { state.justContinued = 0; startReveal(state.game, last); }
  renderGame();
  if (!state.reveal) focusAfterMove();
}

/** Drop any open reveal without marking it seen (leaving the game, switching games). */
function closeReveal() {
  state.reveal = null;
  const dlg = $("revealModal");
  if (dlg) { if (dlg.open) dlg.close(); dlg.remove(); }
}

function playPanel(view, move) {
  const first = !move.prompts;
  const solo = isSoloLike(view);
  const otherName = otherLabel(view);
  const locked = Boolean(move.mine);
  const waiting = view.waitingForPlayer;
  const panel = h("div", {class: "play"});

  // A family game nobody has joined yet only shows the invite (never in Solo: waitingForPlayer is unset there).
  panel.append(
    h("h1", {id: "boardTitle", class: "board-title"}, waiting && !solo ? t("waitingJoin") : first ? t("firstTitle") : t("promptTitle")),
    ...(waiting && !solo) || locked ? []
      : first
        ? [h("p", {class: "instruction"}, solo ? ct(view, "firstSolo", {name: otherName}) : t("firstFamily", {name: otherName})), ...(solo && (view.rematch || soloCharacter(view).script) ? [rematchGreeting(view)] : [])]
        : [h("p", {class: "instruction"}, t("promptCopy"))]);
  if (!first) {
    // The "+" is glued to the second word so it never dangles at the end of a line.
    panel.append(h("div", {class: "prompt", id: "prompt", lang: view.language},
      h("span", {class: "tile"}, move.prompts[0]),
      h("span", {class: "join"}, h("span", {class: "op", "aria-hidden": "true"}, "+"), h("span", {class: "tile"}, move.prompts[1]))));
  }

  if (waiting) {
    // The room code is the whole point of this card: big, centred, easy to read aloud or type.
    panel.append(h("div", {class: "share"},
      h("h2", {}, t("shareTitle")),
      h("p", {}, t("shareCopy")),
      h("p", {class: "code share-code", id: "joinCode"}, view.joinCode)));
    return panel;
  }

  if (locked) {
    // Solo never "waits" for anyone: the bot already has its word.
    panel.append(h("p", {class: "notice pending", role: "status"}, solo ? t("lockedIn", {word: move.mine.toUpperCase()}) : t("youLocked", {word: move.mine.toUpperCase(), name: otherName})));
    return panel;
  }

  // The hint/feedback line and the "Did you mean?" box sit directly ABOVE the input
  // (full-width grid rows), so on phones they stay in view next to the focused input
  // instead of below the button, behind the on-screen keyboard.
  // Enter in the input is noted on keydown: implicit submission reports the button
  // as event.submitter, so it cannot tell Enter from a click on its own.
  const form = h("form", {class: "word-form", id: "wordForm", novalidate: true, onsubmit: event => {
    event.preventDefault();
    const source = submitSource || (event.submitter ? "button" : "form");
    submitSource = null;
    submitWord(source);
  }},
    h("label", {class: "sr-only", for: "word"}, t("placeholder")),
    h("p", {id: "formHelp", class: "form-help", "aria-live": "polite"}, solo ? soloHelp(view, move) : move.otherLocked ? t("otherLocked", {name: otherName}) : t("otherThinking", {name: otherName})),
    h("div", {id: "suggestion", class: "suggestion", "aria-live": "polite"}),
    h("input", {id: "word", name: "word", type: "text", class: "word-input", placeholder: t("placeholder"), autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "true", lang: view.language, maxlength: "40", enterkeyhint: "go", "aria-describedby": first ? "formHelp" : "prompt formHelp", "aria-invalid": "false", oninput: onWordInput,
      onkeydown: event => { submitSource = event.key === "Enter" && !event.isComposing ? "enter" : null; }}),
    h("button", {class: "btn big", type: "submit", id: "lockBtn"}, t("lockIn")));
  panel.append(form);
  return panel;
}

function endPanel(view, last, fresh) {
  const matched = view.status === "MATCHED";
  const solo = isSoloLike(view);
  if (matched && solo) return soloWinCard(view, last, fresh);
  const shownAt = performance.now();
  return h("div", {class: `end ${matched ? "win" : "over"}`},
    matched
      ? h("div", {class: "end-icon win-burst", "aria-hidden": "true"}, h("span", {class: "burst-star"}, "★"))
      : solo ? garyGoodbye(view, fresh && !reducedMotion()) : sleepyToken(fresh && !reducedMotion()),
    h("h1", {id: "boardTitle", class: "board-title"}, matched ? t("winTitle") : t("gameOverTitle")),
    h("p", {}, matched
      ? t("winCopy", {n: last.number})
      : ct(view, "gameOverCopy")),
    endActions(view, shownAt));
}

/** Play again (primary), Return home (secondary), View history (quiet). */
function endActions(view, shownAt) {
  const solo = isSoloLike(view);
  return h("div", {class: "row center end-actions"},
    h("button", {class: "btn big", type: "button", id: "newGameBtn", disabled: !solo && !state.online && !view.rematchId, onclick: event => {
      // A held or doubled Enter from the last word must not skip the game-over screen.
      if (event.detail === 0 && performance.now() - shownAt < 800) return;
      playAgain(view, event.currentTarget);
    }}, solo ? t("playAgainWith", {name: characterName(view)}) : t("rematch")),
    h("button", {class: "btn ghost", type: "button", id: "homeBtn", onclick: () => navigate("/")}, t("returnHome")),
    h("button", {class: "btn ghost", type: "button", id: "historyBtn", onclick: viewHistory}, t("viewHistory")));
}

/**
 * The Solo win: one result card for every character (avatar, headline, the character's own win
 * line in a speech bubble, the 1–5 star question, then Play again / Return home / View history).
 * Characters differ only in tone: Gary's card is calmer (fewer decorations), Milo's brighter.
 */
function soloWinCard(view, last, fresh) {
  const id = characterId(view.character);
  const animate = fresh && !reducedMotion();
  const shownAt = performance.now();
  const decor = h("div", {class: "wc-decor", "aria-hidden": "true"},
    ...["star", "dot", "squiggle", "confetto", "dot small", ...(id === "milo" ? ["star small", "confetto alt"] : [])].map(kind => h("span", {class: `wc-piece ${kind}`})));
  const said = winReactionText(view, last);
  return h("div", {class: `end win win-card ${animate ? "animate" : ""}`, "data-character": id},
    decor,
    characterArt(id, "meh", "wc-avatar"),
    h("h1", {id: "boardTitle", class: "board-title"}, t("winTitle")),
    h("p", {class: "wc-move", id: "winMove"}, t("winCopy", {n: last.number})),
    h("div", {class: "wc-says", id: "winReaction", "data-character": id},
      h("p", {class: "gary-bubble wc-bubble"}, h("span", {class: "sr-only"}, `${characterName(view)}: `), said),
      // A scripted character's post-win line ("That was fun. Again?") stays its own fixed beat.
      postWinLine(view, last) ? h("p", {class: "gary-bubble wc-bubble wc-after", id: "postWinLine"}, h("span", {class: "sr-only"}, `${characterName(view)}: `), postWinLine(view, last)) : null),
    ratingBlock(view),
    h("div", {class: "wc-actions end-actions"},
      h("button", {class: "btn big wc-primary", type: "button", id: "newGameBtn", onclick: event => {
        if (event.detail === 0 && performance.now() - shownAt < 800) return;
        playAgain(view, event.currentTarget);
      }}, t("playAgainWith", {name: characterName(view)})),
      h("div", {class: "wc-more"},
        h("button", {class: "btn ghost wc-secondary", type: "button", id: "homeBtn", onclick: () => navigate("/")}, t("returnHome")),
        h("button", {class: "wc-tertiary", type: "button", id: "historyBtn", onclick: viewHistory}, t("viewHistory")))));
}

/**
 * The character's win line, chosen the same way as on the reveal: Milo's fixed line for a fast,
 * ordinary or long win; Gary's next win line for this game (the same turn as the reveal used).
 */
function winReactionText(view, last) {
  const c = soloCharacter(view);
  if (c.narrative) return t(garyBeatFor(view, last).after);
  return scriptedReaction(c.script, {status: "MATCHED", move: last.number}).keys.map(key => t(key)).join(" ");
}

/** The beat after a win: Gary's POST-WIN line from the same pair, or a scripted character's fixed line. */
function postWinLine(view, last) {
  const c = soloCharacter(view);
  if (c.narrative) { const extra = garyBeatFor(view, last).extra; return extra ? t(extra) : null; }
  return c.script ? t(c.script.postWin) : null;
}

/**
 * The 1–5 star question, inline on the win card: tap a star and it is saved at once (no submit, no
 * comment box). It never blocks the buttons below it, and a rated game is never asked again.
 */
function ratingBlock(view) {
  const [title, sub] = soloCharacter(view).rating;
  const rated = store.soloGame(view.id)?.playerRating;
  // One star shape: filled when on, an outline when off (shape, not just colour; see styles.css).
  const stars = n => [1, 2, 3, 4, 5].map(i => h("span", {class: `wc-star-shape ${i <= n ? "on" : ""}`, "aria-hidden": "true"}, "★"));
  if (rated) {
    return h("div", {class: "wc-rating rated", id: "winRating"},
      h("p", {class: "wc-stars-static", role: "img", "aria-label": t("rateYours", {n: rated})}, ...stars(rated)),
      h("p", {class: "wc-thanks", id: "rateThanks", tabindex: "-1", role: "status"}, t("rateThanks")));
  }
  const buttons = [];
  const preview = n => buttons.forEach((b, i) => b.classList.toggle("lit", i < n));
  const block = h("div", {class: "wc-rating", id: "winRating", role: "group", "aria-labelledby": "rateTitle", "aria-describedby": "rateSub"},
    h("p", {class: "wc-rate-title", id: "rateTitle"}, t(title)),
    h("p", {class: "wc-rate-sub", id: "rateSub"}, t(sub)));
  const row = h("div", {class: "wc-stars", onmouseleave: () => preview(0)});
  for (let n = 1; n <= 5; n++) {
    const button = h("button", {type: "button", class: "wc-star", "data-n": String(n), "aria-label": t("rateStar", {n}),
      onmouseenter: () => preview(n), onfocus: () => preview(n), onblur: () => preview(0),
      onclick: () => rateGame(view, n)}, h("span", {"aria-hidden": "true"}, "★"));
    buttons.push(button);
    row.append(button);
  }
  block.append(row);
  return block;
}

/** Save a rating: on the game itself and in its log record (queued for upload). Never throws. */
function rateGame(view, n) {
  let game = null;
  try {
    game = store.soloGame(view.id);
    if (game && !game.playerRating && game.status === "MATCHED") {
      game = {...game, playerRating: n};
      store.saveSolo(game);
    }
  } catch {}
  try { if (game?.playerRating) logRating(game); } catch {}
  const current = $("winRating");
  if (!current) return;
  const next = ratingBlock(view);
  if (!store.soloGame(view.id)?.playerRating) {
    // Storage failed: say thanks anyway, without pretending it is saved for good.
    next.replaceChildren(h("p", {class: "wc-thanks", id: "rateThanks", tabindex: "-1", role: "status"}, t("rateThanks")));
  }
  current.replaceWith(next);
  $("rateThanks")?.focus({preventScroll: true});
}

/** Solo game over: the character says goodbye (Gary in two beats: "finally", then "...same time tomorrow?"). */
function garyGoodbye(view, animate) {
  // Gary: the FOLLOW-UP of his 20-move beat. Scripted characters: their own game-over lines.
  const last = [...view.moves].reverse().find(m => m.words);
  const followUp = soloCharacter(view).narrative && last ? garyBeatFor(view, last).extra : null;
  const [first, second = ""] = followUp ? [t(followUp)] : soloCharacter(view).lines.gameOver.map(key => t(key));
  const one = h("span", {class: "bye-line", "aria-hidden": "true"});
  const two = h("span", {class: "bye-line later", "aria-hidden": "true"});
  const block = h("div", {class: `gary-end ${animate ? "animate" : ""}`},
    characterArt(view.character, "sleepy", "end-art"),
    h("p", {class: "gary-bye", id: "garyBye"}, one, two, h("span", {class: "sr-only"}, `${characterName(view)}: ${[first, second].filter(Boolean).join(" ")}`)));
  if (!animate) {
    one.textContent = first;
    two.textContent = second;
  } else {
    typeInto(one, first, {maxTotal: 500}).then(() => sleep(1100)).then(() => {
      if (two.isConnected && second) typeInto(two, second, {maxTotal: 900});
    });
  }
  return block;
}

/**
 * "Play again" with the same character: a one-line greeting from them on the first move
 * (avatar + speech bubble, like their reveal remarks).
 */
function rematchGreeting(view) {
  return characterLine(view, rematchLine(view.character, seededPick(view.id)), "rematchLine", "rematch-line");
}

/** The character's avatar saying one line in a speech bubble. */
function characterLine(view, key, id, cls = "") {
  return h("div", {class: `gary-reaction ${cls}`, id, "data-character": view.character},
    characterArt(view.character, "meh", "gary-reaction-art"),
    h("p", {class: "gary-bubble"}, h("span", {class: "sr-only"}, `${characterName(view)}: `), t(key)));
}

/** A stable 0..1 value per game id, so a re-render never swaps the greeting. */
function seededPick(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return () => (hash % 1000) / 1000;
}

/** First Solo game with a character: a short "Meet your rival" / "Say hi to Milo" moment. Shown once per character; can be reopened from the profile badge. */
function showCharacterIntro(id = "gary", {onDone} = {}) {
  const c = character(id);
  $("garyIntro")?.remove();
  const done = () => {
    markMet(c.id);
    const dlg = $("garyIntro");
    if (dlg) { if (dlg.open) dlg.close(); dlg.remove(); }
    onDone?.();
  };
  const dlg = h("dialog", {id: "garyIntro", class: `gary-intro ${reducedMotion() ? "" : "animate"}`, "data-character": c.id, "aria-labelledby": "garyIntroTitle", "aria-describedby": "garyIntroSays",
    oncancel: event => { event.preventDefault(); done(); }},
    h("div", {class: "gi-body"},
      h("p", {class: "rv-kicker"}, t(c.intro.kicker)),
      characterArt(c.id, "meh", "intro-art"),
      h("h2", {class: "gi-title", id: "garyIntroTitle"}, t(c.title)),
      h("div", {class: "gi-says", id: "garyIntroSays"},
        ...c.intro.lines.map((key, i) => h("p", {class: "gi-line", style: `--i:${i}`}, t(key))),
        h("p", {class: "gi-aside", style: `--i:${c.intro.lines.length}`}, t(c.intro.aside))),
      h("button", {class: "btn big", type: "button", id: "garyIntroGo", onclick: done}, t(c.intro.cta))));
  document.body.append(dlg);
  dlg.showModal();
  $("garyIntroGo").focus();
}

/** A round sleepy token: it droops and yawns once, then rests. Purely decorative. */
function sleepyToken(animate) {
  return h("div", {class: `sleepy ${animate ? "animate" : ""}`, "aria-hidden": "true"},
    h("span", {class: "sleepy-face"},
      h("i", {class: "eye left"}), h("i", {class: "eye right"}), h("i", {class: "mouth"})),
    h("span", {class: "zzz"}, h("b", {}, "z"), h("b", {}, "z"), h("b", {}, "Z")));
}

async function playAgain(view, button) {
  // Solo: a new game with the same character (changing character happens from home).
  if (isSoloLike(view)) return startSolo(state.lang, {who: view.character, rematch: true});
  // Family: a rematch with the same friend. The server returns the same rematch if one already exists.
  if (view.rematchId) return navigate(`/games/${view.rematchId}`);
  if (!state.player || !state.online) return toast(t("familyOffline"), {kind: "error"});
  button?.setAttribute("aria-busy", "true");
  if (button) button.disabled = true;
  try {
    const data = await api("/api/games/rematch", {player_id: state.player.id, game_id: view.id});
    toast(t("rematchSent"), {kind: "success"});
    navigate(`/games/${data.id}`);
  } catch (error) {
    if (button?.isConnected) { button.disabled = false; button.removeAttribute("aria-busy"); }
    toast(errorText(error.code), {kind: "error"});
  }
}

function viewHistory() {
  const heading = $("trailTitle");
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  heading.scrollIntoView({block: "start", behavior: reducedMotion() ? "auto" : "smooth"});
  heading.focus({preventScroll: true});
}

function promptChips(view, prompts) {
  return [h("span", {class: "chip plain", lang: view.language}, prompts[0]),
    h("span", {class: "join"}, h("span", {class: "op", "aria-hidden": "true"}, "+"), h("span", {class: "chip plain", lang: view.language}, prompts[1]))];
}

/** The open round, pinned above the finished ones. Only shows your own locked word, never the other side's. */
function activeRow(view) {
  const move = view.moves[view.moves.length - 1];
  if (!move || move.words || view.waitingForPlayer || view.status === "MATCHED" || view.status === "EXHAUSTED") return null;
  const hidden = () => h("span", {class: "chip mystery"}, h("small", {}, otherLabel(view)), h("span", {class: "chip-word"}, h("span", {"aria-hidden": "true"}, "?"), h("span", {class: "sr-only"}, t("hiddenWord"))));
  const yours = move.mine
    ? wordChip(move.mine, t("you"), "you")
    : h("span", {class: "chip mystery you"}, h("small", {}, t("you")), h("span", {class: "chip-word"}, h("span", {"aria-hidden": "true"}, "?"), h("span", {class: "sr-only"}, t("hiddenWord"))));
  const pair = view.youSide === "a" ? [yours, hidden()] : [hidden(), yours];
  return h("div", {class: "trail-now", id: "trailNow"},
    h("p", {class: "now-label"}, h("span", {class: "now-dot", "aria-hidden": "true"}), t("nowPlaying")),
    // Only these two words matter; the rows below are history (once there are two words to match).
    move.prompts ? h("div", {class: "now-hint", id: "nowHint"}, h("p", {class: "now-hint-main"}, t("nowHint")), h("p", {class: "now-hint-sub"}, t("nowHintSub"))) : null,
    h("div", {class: "trail-row-inner"},
      h("span", {class: "move-badge"}, h("span", {"aria-hidden": "true"}, move.number), h("span", {class: "sr-only"}, t("moveOf", {n: move.number, max: view.maxMoves}))),
      h("div", {class: "trail-eq"},
        h("span", {class: "trail-in"}, move.prompts ? promptChips(view, move.prompts) : h("span", {class: "start-label"}, t("start"))),
        h("span", {class: "trail-out"},
          h("span", {class: "join"}, h("span", {class: "arrow", "aria-hidden": "true"}, "→"), pair[0]),
          h("span", {class: "join"}, h("span", {class: "op", "aria-hidden": "true"}, "+"), pair[1])))));
}

function trail(view) {
  const revealed = view.moves.filter(m => m.words);
  const header = isSoloLike(view) ? t("solo") : view.waitingForPlayer ? t("familyTitle") : t("vs", {name: view.otherName || t("friend")});
  const now = activeRow(view);
  // Newest first; one row per revealed move (keyed by move number, rebuilt from the game on every render).
  const rows = [...new Map(revealed.map(m => [m.number, m])).values()].sort((x, y) => y.number - x.number);
  return h("section", {class: "card trail", "aria-labelledby": "trailTitle"},
    h("div", {class: "trail-head"},
      h("h2", {id: "trailTitle"}, t("trailTitle")),
      h("p", {class: "trail-meta"}, h("strong", {}, header), h("span", {class: "trail-when"}, h("span", {"aria-hidden": "true"}, "· "), when(view.createdAt)))),
    now,
    now && rows.length ? h("p", {class: "history-label"}, t("trailEarlier")) : null,
    rows.length
      ? h("ol", {class: "trail-list", reversed: true}, rows.map((m, index) => {
        const ending = m.status === "MATCHED" || m.status === "EXHAUSTED";
        return h("li", {class: `trail-row ${m.status === "MATCHED" ? "match" : ""}`, "data-move": m.number},
          h("span", {class: "move-badge"}, h("span", {"aria-hidden": "true"}, m.number), h("span", {class: "sr-only"}, t("moveOf", {n: m.number, max: view.maxMoves}))),
          // WORD 1 + WORD 2 → WORD 3 + WORD 4; each "+" is glued to the word after it so lines break cleanly.
          h("div", {class: "trail-eq"},
            h("span", {class: "trail-in"},
              m.prompts ? promptChips(view, m.prompts) : h("span", {class: "start-label", title: t("startingPair")}, t("start"))),
            h("span", {class: "trail-out"},
              h("span", {class: "join"},
                h("span", {class: "arrow", "aria-hidden": "true"}, "→"),
                wordChip(shownWords(view, m).a, sideLabel(view, "a"), view.youSide === "a" ? "you" : "other")),
              h("span", {class: "join"},
                h("span", {class: "op", "aria-hidden": "true"}, m.status === "MATCHED" ? "=" : "+"),
                wordChip(shownWords(view, m).b, sideLabel(view, "b"), view.youSide === "b" ? "you" : "other")),
              m.status === "MATCHED" ? h("span", {class: "match-badge"}, t("matchBadge")) : null)),
          // Only the newest finished row points up at the words being played now; older rows are just history.
          ending || index > 0 ? null : h("p", {class: "trail-next"}, h("span", {"aria-hidden": "true"}, "↑ "), t("nextPrompt")));
      }))
      : h("p", {class: "empty"}, t("trailEmpty")));
}

function captureInput() {
  const input = $("word");
  if (!input) return null;
  return {value: input.value, focused: document.activeElement === input, start: input.selectionStart, end: input.selectionEnd};
}

function restoreInput(keep) {
  const input = $("word");
  if (!input || !keep) return;
  input.value = keep.value;
  if (keep.focused) {
    input.focus();
    try { input.setSelectionRange(keep.start, keep.end); } catch {}
  }
  updateSuggestion();
}

let suggestTimer = null;
let submitSource = null; // "enter" when the last key in the input was Enter (see playPanel)
function onWordInput() {
  setHelp(null);
  // A new word: earlier suggestion answers no longer apply to it.
  state.inputNote = null;
  state.confirmFor = null;
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(updateSuggestion, 350);
}

/**
 * Keep the feedback line and the input inside the part of the screen the player can
 * actually see. On phones the on-screen keyboard shrinks the visual viewport, not the
 * layout viewport, so scrollIntoView alone can leave the message behind the keyboard.
 */
function keepFeedbackInView() {
  const help = $("formHelp"), input = $("word");
  if (!help || !input) return;
  const top = Math.min(help.getBoundingClientRect().top, input.getBoundingClientRect().top);
  const bottom = Math.max(help.getBoundingClientRect().bottom, input.getBoundingClientRect().bottom);
  const vv = window.visualViewport;
  const viewTop = vv ? vv.offsetTop : 0;
  const viewBottom = viewTop + (vv ? vv.height : window.innerHeight);
  const margin = 12;
  let delta = 0;
  if (top < viewTop + margin) delta = top - viewTop - margin;
  else if (bottom > viewBottom - margin) delta = Math.min(bottom - viewBottom + margin, top - viewTop - margin);
  if (delta) window.scrollBy({top: delta, behavior: reducedMotion() ? "auto" : "smooth"});
}

// ---------- on-screen keyboard ----------
// Phones cover part of the page with the keyboard. Android (with interactive-widget=resizes-content)
// shrinks the layout viewport; iOS only shrinks the *visual* viewport. Either way, while the word box
// is focused and the visible height drops well below what it was, the keyboard is open: the board
// then drops its decorative parts (html.kb-open) and the play area (the two words to connect, the
// hint or error, the input and the Lock button) is kept inside the part of the screen still visible.
let fullHeight = 0, fullWidth = 0;
function visibleHeight() {
  return window.visualViewport ? window.visualViewport.height : window.innerHeight;
}
/** The visible height in screen terms (pinch-zoom changes CSS pixels, not the screen or the keyboard). */
function screenHeight() {
  const vv = window.visualViewport;
  return vv ? vv.height * (vv.scale || 1) : window.innerHeight;
}
const touchScreen = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;
function keyboardOpen() {
  const typing = document.activeElement?.id === "word";
  // A keyboard only ever changes the height; a new width means the phone turned (start over).
  const width = Math.round(window.visualViewport ? window.visualViewport.width : window.innerWidth);
  if (width !== fullWidth) { fullWidth = width; fullHeight = typing ? 0 : screenHeight(); }
  // The tallest visible height seen at this width while not typing is the screen without a keyboard.
  if (!typing) { fullHeight = Math.max(fullHeight, screenHeight()); return false; }
  // On a touch screen, a drop of more than a quarter of that while typing in the word box is the keyboard.
  return touchScreen() && fullHeight > 0 && screenHeight() < fullHeight * 0.75;
}
function updateKeyboard() {
  const open = keyboardOpen();
  const root = document.documentElement;
  if (root.classList.contains("kb-open") !== open) root.classList.toggle("kb-open", open);
  root.style.setProperty("--visible-height", `${Math.round(visibleHeight())}px`);
  if (open) requestAnimationFrame(keepPlayInView);
}

/** Scroll so the words in play, the hint/error, the input and the button sit in the visible part of the screen. */
function keepPlayInView() {
  const input = $("word");
  if (!input || document.activeElement !== input) return;
  const top = ($("prompt") || $("boardTitle") || input).getBoundingClientRect().top;
  const bottom = ($("lockBtn") || input).getBoundingClientRect().bottom;
  const vv = window.visualViewport;
  const viewTop = vv ? vv.offsetTop : 0;
  const viewBottom = viewTop + visibleHeight();
  const margin = 8;
  let delta = 0;
  if (bottom - top <= viewBottom - viewTop - 2 * margin) {
    // It all fits: show it whole, moving as little as possible.
    if (top < viewTop + margin) delta = top - viewTop - margin;
    else if (bottom > viewBottom - margin) delta = bottom - viewBottom + margin;
  } else {
    // Too tall (a very small screen): the input, its hint and the button win; the words sit just above.
    const help = $("formHelp")?.getBoundingClientRect().top ?? input.getBoundingClientRect().top;
    delta = Math.min(help - viewTop - margin, bottom - viewBottom + margin);
  }
  if (Math.abs(delta) > 1) window.scrollBy({top: delta, behavior: "auto"});
}

function watchKeyboard() {
  const vv = window.visualViewport;
  keyboardOpen(); // note the screen's size before any keyboard
  (vv || window).addEventListener("resize", updateKeyboard);
  document.addEventListener("focusin", event => { if (event.target?.id === "word") setTimeout(updateKeyboard, 50); });
  document.addEventListener("focusout", event => { if (event.target?.id === "word") setTimeout(updateKeyboard, 50); });
}

function setHelp(message, isError = false) {
  const help = $("formHelp");
  if (!help) return;
  const view = state.game;
  const move = view.moves[view.moves.length - 1];
  const error = Boolean(message && isError);
  const text = message || (isSoloLike(view) ? soloHelp(view, move) : move.otherLocked ? t("otherLocked", {name: otherLabel(view)}) : t("otherThinking", {name: otherLabel(view)}));
  help.classList.toggle("error", error);
  const input = $("word");
  // #formHelp is a polite live region and the input's description (aria-describedby).
  // Only touch it when the text really changes, so typing doesn't re-announce the
  // hint on every keystroke; a repeated error is cleared first so it is heard again.
  if (error && help.textContent === text) {
    help.textContent = "";
    setTimeout(() => { if (help.isConnected) { help.textContent = text; keepFeedbackInView(); } }, 60);
  } else if (help.textContent !== text) {
    help.textContent = text;
  }
  if (error && input) {
    // Replay the little nudge on every rejected try, even when the message is the same.
    input.setAttribute("aria-invalid", "false");
    void input.offsetWidth;
    keepFeedbackInView();
  }
  input?.setAttribute("aria-invalid", String(error));
}

const typoCount = new Map(); // game id → accepted spelling corrections (Gary's occasional aside)

/**
 * A spelling suggestion for what is in the word box, with how sure we are:
 * "high" for a typical slip of a known word (battelship → battleship), "medium" for a looser match.
 * Nothing when the word is already understood as typed or no single word is a confident match.
 * @returns {{word: string, confidence: "high" | "medium"} | null}
 */
function spellCheck(value) {
  const lang = state.game.language;
  const known = correctionFor(value, lang);
  if (known) return known;
  const info = speller(lang).suggestInfo(value);
  return info ? {word: info.word, confidence: info.distance === 1 ? "high" : "medium"} : null;
}

/**
 * The "Did you mean?" box above the word. A medium-confidence match is a quiet hint; a high-confidence
 * one is shown clearly (You typed … / Did you mean …? with "Use" as the main button). Nothing is ever
 * changed without the player's say-so; locking in a word with an open high-confidence suggestion asks
 * once first (see submitWord). `confirming` = the player pressed lock and the box asks before going on.
 */
function updateSuggestion({confirming = false} = {}) {
  const input = $("word"), box = $("suggestion");
  if (!input || !box) return;
  const value = input.value.trim();
  const found = value && value !== state.dismissedSuggestion ? spellCheck(value) : null;
  const strong = found?.confidence === "high";
  const signature = found ? `${found.word}|${found.confidence}|${confirming}` : "";
  // Same suggestion as already shown: leave the live region alone (no repeat announcement).
  if ((box.dataset.word || "") === signature && box.childElementCount > 0 === Boolean(found)) return;
  box.dataset.word = signature;
  box.classList.toggle("strong", strong);
  box.classList.toggle("confirming", strong && confirming);
  if (!found) return box.replaceChildren();
  const use = () => {
    state.inputNote = {original: value, suggestion: found.word, confidence: found.confidence, accepted: true};
    input.value = found.word; box.replaceChildren(); box.dataset.word = "";
    // Gary sometimes notes an accepted correction (every other one in a game; never mocking).
    const view = state.game;
    if (view && isSoloLike(view) && soloCharacter(view).narrative) {
      const n = typoCount.get(view.id) || 0;
      typoCount.set(view.id, n + 1);
      state.typoAside = n % 2 === 0 ? {gameId: view.id, key: oneOffLine("typo", view.id, n / 2)} : null;
    }
  };
  const keep = () => { state.inputNote = {original: value, suggestion: found.word, confidence: found.confidence, accepted: false}; state.dismissedSuggestion = value; box.replaceChildren(); box.dataset.word = ""; };
  if (!strong) {
    // A quiet hint: the player can always lock in their own word as typed.
    box.replaceChildren(
      h("span", {}, t("didYouMean", {word: found.word.toUpperCase()})),
      h("button", {class: "btn tiny teal", type: "button", onclick: () => { use(); input.focus(); }}, t("useSuggestion", {word: found.word.toUpperCase()})),
      h("button", {class: "btn tiny ghost", type: "button", onclick: () => { keep(); input.focus(); }}, t("keepMine")));
    return;
  }
  box.replaceChildren(
    h("p", {class: "sg-typed"}, t("youTyped", {word: value})),
    h("p", {class: "sg-question"}, t("didYouMean", {word: found.word.toUpperCase()})),
    h("div", {class: "sg-actions"},
      h("button", {class: "btn small sg-use", type: "button", id: "useSuggestion", onclick: () => { use(); if (confirming) submitWord("suggestion"); else input.focus(); }}, t("useSuggestion", {word: found.word})),
      h("button", {class: "btn small ghost sg-keep", type: "button", id: "keepTyped", onclick: () => { keep(); if (confirming) submitWord("suggestion"); else input.focus(); }}, t("keepTyped", {word: value}))));
}

function rulesGame(view) {
  return {status: view.status === "WAITING" ? "ACTIVE" : view.status, moves: view.moves};
}

/** Show why a word was not taken, right next to the input, and keep the keyboard up. */
/** A rejected word's message; in Solo, the character's own wording where they have one ("already played"). */
const usedCount = new Map(); // game id → how many "already played" lines Gary has said (rotation)
function wordErrorText(view, code, word) {
  // Gary says "already played" his own way, rotating through his lines (functional, kept short).
  if (view && isSoloLike(view) && soloCharacter(view).narrative && code === "ALREADY_USED") {
    const n = usedCount.get(view.id) || 0;
    usedCount.set(view.id, n + 1);
    return t(oneOffLine("alreadyUsed", view.id, n));
  }
  const key = view && isSoloLike(view) ? copyKey(view.character, `err${code}`) : `err${code}`;
  return key === `err${code}` ? errorText(code, word) : t(key, {word: word ? word.toUpperCase() : ""});
}

function rejectWord(code, word, info) {
  const reason = wordErrorText(state.game, code, word);
  trace("rejected", {...info, code, reason});
  setHelp(reason, true);
  $("word")?.focus({preventScroll: true});
}

async function submitWord(source = "direct") {
  const view = state.game, input = $("word");
  const raw = input ? input.value : null;
  const info = {source, raw, trimmed: raw == null ? null : raw.trim(), cleaned: raw == null ? null : cleanWord(raw), key: raw == null ? null : wordKey(raw),
    kind: view?.kind, language: view?.language, buttonDisabled: $("lockBtn")?.disabled ?? null, inputDisabled: input?.disabled ?? null};
  trace("submit", info);
  // A submission is already on its way: the button already says "Locking it in…".
  if (state.busy) { trace("ignored", {...info, reason: "in-flight"}); return; }
  if (!input) { trace("ignored", {...info, reason: "no-input"}); return; }
  const check = checkWord(rulesGame(view), view.youSide, raw);
  Object.assign(info, {
    keyLength: info.key.length,
    minLengthOk: check.code !== "TOO_SHORT" && info.key.length > 0,
    validation: check.ok ? "ok" : check.code,
    duplicate: check.code === "SAME_AS_LAST" || check.code === "ALREADY_USED" ? check.code : false
  });
  trace("checked", info);
  if (!check.ok) return rejectWord(check.code, check.word, info);
  // A likely typo of a known word: ask once before locking it in ("Did you mean battleship?").
  // Use or Keep then locks in straight away; locking in again from the box keeps it as typed.
  const typed = raw.trim();
  const found = typed !== state.dismissedSuggestion && state.confirmFor !== typed ? spellCheck(typed) : null;
  if (found?.confidence === "high") {
    state.confirmFor = typed;
    trace("ignored", {...info, reason: "confirm-spelling", suggestion: found.word});
    clearTimeout(suggestTimer);
    updateSuggestion({confirming: true});
    $("useSuggestion")?.focus({preventScroll: true});
    return;
  }
  if (state.confirmFor === typed && !state.inputNote) state.inputNote = {original: typed, suggestion: spellCheck(typed)?.word ?? null, confidence: "high", accepted: false};
  const note = state.inputNote;
  state.inputNote = null;
  state.confirmFor = null;
  state.dismissedSuggestion = null;
  $("suggestion")?.replaceChildren();

  if (view.kind === "solo") {
    const game = store.soloGame(view.id);
    const result = submitSoloWord(game, raw);
    trace("result", {...info, path: "local", ok: result.ok, code: result.ok ? null : result.code});
    if (!result.ok) return rejectWord(result.code, result.word, info);
    if (!store.saveSolo(result.game)) toast(t("errSTORAGE"), {kind: "error", timeout: 8000});
    // Bot evaluation log: this revealed round, written to the device at once and uploaded when possible.
    logRound(result.game, result.move, result.decision, result.decisionMs, playerInput(check.word, note, view.language));
    logGaryDecision(result.move.garyDecision || result.decision);
    input.value = "";
    openView(soloView(result.game));
    if (!state.reveal) focusAfterMove();
    return;
  }

  state.busy = true;
  const button = $("lockBtn");
  input.disabled = true;
  if (button) { button.disabled = true; button.textContent = t("locking"); }
  try {
    const data = await api("/api/submit", {game_id: view.id, player_id: state.player.id, word: check.word, move: view.moves[view.moves.length - 1].number});
    trace("result", {...info, path: "api", ok: true});
    input.value = "";
    state.busy = false;
    applyServerGame(data.game);
    if (!state.reveal) focusAfterMove();
  } catch (error) {
    trace("result", {...info, path: "api", ok: false, code: error.code || null});
    state.busy = false;
    if (error.data?.game) applyServerGame(error.data.game);
    else { input.disabled = false; if (button) { button.disabled = false; button.textContent = t("lockIn"); } }
    if (error.code === "NETWORK") toast(t("errNETWORK"), {kind: "error"});
    else if ($("formHelp")) rejectWord(error.code, error.data?.word, info);
    else toast(errorText(error.code, error.data?.word), {kind: "error"});
  }
}

/**
 * How the game read the player's word, for the bot-evaluation log (no personal data: the word they
 * played, what they first typed if a suggestion was involved, and how it was understood).
 */
function playerInput(word, note, language) {
  try {
    const u = understandWord(word, language);
    return {original: note?.original ?? word, submitted: word, normalized: u.normalized, understood_as: u.via, method: u.method, confidence: u.confidence,
      fuzzy: u.fuzzy, spacing: u.spacing, morphology: u.morphology, unresolved: u.unresolved,
      suggestion: note?.suggestion ?? null, suggestion_confidence: note?.confidence ?? null, suggestion_accepted: note ? note.accepted : null};
  } catch {
    return null;
  }
}

function focusAfterMove() {
  const input = $("word");
  // Next turn: keep the keyboard up. Game over: land on the heading, not on "Play again",
  // so a doubled Enter can't skip the ending.
  const end = $("app").querySelector(".end .board-title");
  if (end) end.setAttribute("tabindex", "-1");
  const target = input || end || $("newGameBtn");
  target?.focus({preventScroll: true});
  // Only scroll when the next control is off screen, so big screens don't jump around.
  const box = target?.getBoundingClientRect();
  const behavior = reducedMotion() ? "auto" : "smooth";
  if (!box || box.top < 0 || box.bottom > window.innerHeight) {
    $("app").querySelector(".board")?.scrollIntoView({block: "start", behavior});
  }
}

/**
 * Win confetti: two quick waves (about 120 pieces) of dots, squares and streamers in the app's colours.
 * Decorative only: it never catches taps (pointer-events: none), it is skipped under reduced motion,
 * and it cleans itself up after about 3.6 seconds.
 */
const CONFETTI = {pieces: 120, firstWave: 70, waveGap: 0.55, cleanupMs: 3600};
function celebrate() {
  if (reducedMotion()) return;
  document.querySelector(".confetti")?.remove();
  const layer = h("div", {class: "confetti", "aria-hidden": "true"});
  const colors = ["#ff6b57", "#ffc93c", "#1fb5a8", "#7b4fc9", "#ff7ab6", "#fffbf3"];
  const shapes = ["", "dot", "strip"];
  for (let i = 0; i < CONFETTI.pieces; i++) {
    const wave = i < CONFETTI.firstWave ? 0 : 1;
    const delay = wave * CONFETTI.waveGap + Math.random() * 0.45;
    const duration = 1.6 + Math.random() * 1;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720);
    layer.append(h("i", {class: shapes[i % shapes.length], style: [
      `left:${Math.random() * 100}%`, `background:${colors[i % colors.length]}`, `animation-delay:${delay.toFixed(2)}s`,
      `--dur:${duration.toFixed(2)}s`, `--drift:${Math.round((Math.random() - 0.5) * 300)}px`, `--spin:${Math.round(spin)}deg`,
      `--scale:${(0.7 + Math.random() * 0.6).toFixed(2)}`].join(";")}));
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), CONFETTI.cleanupMs);
}

// ---------- notifications (family games only) ----------
// The bell lists news from GET /api/notifications. Entries are keyed by id, so a refresh never
// duplicates them, and nothing is marked read until the player opens one or taps "Mark all as read".
const notifs = {items: new Map(), unread: 0, status: "idle", loadedFor: null, inflight: null};
const NOTIF_TEXT = {YOUR_TURN: "notifYourTurn", READY_TO_REVEAL: "notifReveal", PLAYER_JOINED: "notifJoined", GAME_COMPLETE: "notifMatch", GAME_EXHAUSTED: "notifComplete", REMATCH: "notifRematch"};
const bellAllowed = () => Boolean(state.player?.id && state.player.display_name?.trim() && state.online);

function renderBell() {
  const bell = $("notifBtn");
  if (!bell) return;
  if (!bell.dataset.wired) { bell.dataset.wired = "1"; bell.addEventListener("click", openNotifications); }
  bell.hidden = !bellAllowed();
  if (bell.hidden) return;
  const n = notifs.unread;
  const count = $("notifCount");
  count.hidden = !n;
  count.textContent = n > 99 ? "99+" : String(n);
  bell.setAttribute("aria-label", n ? t("notifButtonUnread", {n}) : t("notifButton"));
  bell.setAttribute("aria-haspopup", "dialog");
  bell.title = t("notifTitle");
  if (notifs.loadedFor !== state.player.id) refreshNotifications();
}

function refreshNotifications() {
  if (!bellAllowed()) return Promise.resolve();
  if (notifs.inflight) return notifs.inflight;
  const playerId = state.player.id;
  if (notifs.loadedFor !== playerId) { notifs.items = new Map(); notifs.unread = 0; notifs.status = "idle"; }
  notifs.loadedFor = playerId;
  if (notifs.status !== "ok") { notifs.status = "loading"; renderNotifPanel(); }
  notifs.inflight = (async () => {
    try {
      const data = await api(`/api/notifications?player_id=${encodeURIComponent(playerId)}`);
      if (state.player?.id !== playerId) return;
      const items = new Map();
      for (const n of data.notifications || []) if (n && n.id != null && !items.has(String(n.id))) items.set(String(n.id), n);
      notifs.items = items;
      notifs.unread = Number.isFinite(data.unread) ? data.unread : [...items.values()].filter(n => !n.read_at).length;
      notifs.status = "ok";
    } catch {
      // Keep showing what we had; only an empty panel turns into the error state.
      if (notifs.status !== "ok") notifs.status = "error";
    } finally {
      notifs.inflight = null;
      renderBell();
      renderNotifPanel();
    }
  })();
  return notifs.inflight;
}

function notifText(n) {
  return t(NOTIF_TEXT[n.kind] || "notifYourTurn", {name: n.opponent_name || t("friend")});
}

function openNotifications() {
  dialog(t("notifTitle"), null, h("div", {class: "notif-panel", id: "notifPanel"}), {cancelLabel: t("close")});
  $("dialog").classList.add("notif-dialog");
  $("dialog").addEventListener("close", () => $("dialog").classList.remove("notif-dialog"), {once: true});
  renderNotifPanel();
  refreshNotifications();
}

function renderNotifPanel() {
  const box = $("notifPanel");
  if (!box || !box.isConnected) return;
  const focusedId = document.activeElement?.closest?.("#notifPanel [data-id]")?.dataset.id;
  const focusedRetry = document.activeElement?.id === "notifRetry";
  const items = [...notifs.items.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const parts = [];
  if (notifs.unread > 0 && items.length) {
    parts.push(h("div", {class: "row end notif-tools"},
      h("button", {class: "btn tiny ghost", type: "button", id: "notifMarkAll", onclick: markAllRead}, t("notifMarkAll"))));
  }
  if (!items.length && notifs.status === "loading") {
    parts.push(h("p", {class: "loading", role: "status"}, h("span", {class: "spinner", "aria-hidden": "true"}), t("notifLoading")));
  } else if (!items.length && notifs.status === "error") {
    parts.push(h("p", {class: "notice error", role: "alert"}, t("notifError")),
      h("div", {class: "row center"}, h("button", {class: "btn small", type: "button", id: "notifRetry", onclick: () => refreshNotifications()}, t("retry"))));
  } else if (!items.length) {
    parts.push(h("p", {class: "empty notif-empty"}, t("notifEmpty")));
  } else {
    parts.push(h("ul", {class: "notif-list", id: "notifList"}, items.map(n => {
      const unread = !n.read_at;
      return h("li", {class: `notif-item ${unread ? "unread" : ""}`},
        h("button", {class: "notif-row", type: "button", "data-id": String(n.id), onclick: () => openNotification(n)},
          badge(n.opponent_name || t("friend"), {cls: "other"}),
          h("span", {class: "notif-body"},
            h("span", {class: "notif-text"}, notifText(n)),
            h("span", {class: "notif-when"}, when(n.created_at))),
          unread ? h("span", {class: "notif-new"}, t("notifNew")) : null));
    })));
  }
  box.replaceChildren(...parts);
  if (focusedId) box.querySelector(`[data-id="${CSS.escape(focusedId)}"]`)?.focus();
  else if (focusedRetry) (box.querySelector(".notif-row") || box.querySelector("#notifRetry"))?.focus();
}

function markRead(body) {
  if (!state.player) return;
  api("/api/notifications/read", {player_id: state.player.id, ...body}).catch(() => {});
}

function openNotification(n) {
  if (!n.read_at) {
    n.read_at = new Date().toISOString();
    notifs.unread = Math.max(0, notifs.unread - 1);
    markRead({ids: [n.id]});
    renderBell();
  }
  if ($("dialog").open) $("dialog").close();
  if (n.game_id) navigate(`/games/${n.game_id}`);
}

function markAllRead() {
  const at = new Date().toISOString();
  for (const n of notifs.items.values()) if (!n.read_at) n.read_at = at;
  notifs.unread = 0;
  markRead({all: true});
  renderBell();
  renderNotifPanel();
  $("notifPanel")?.querySelector(".notif-row")?.focus();
}

// Fresh news when the player comes back to the app.
window.addEventListener("focus", () => { refreshNotifications(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshNotifications(); });

// ---------- dialogs ----------
function dialog(title, copy, body, actions) {
  const dlg = $("dialog");
  const close = () => { if (dlg.open) dlg.close(); };
  // Native modal <dialog>: focus is trapped, Escape closes, the rest of the page is inert.
  // Remember the opener so focus goes back there when the dialog closes.
  const opener = dlg.open ? null : document.activeElement;
  if (opener) {
    dlg.addEventListener("close", () => {
      // Only when focus has nowhere better to be: the browser may already have put it back, and the
      // player (or a keyboard shortcut) may have moved it on before this event arrives. Never steal it.
      const active = document.activeElement;
      const lost = !active || active === document.body || dlg.contains(active);
      if (opener.isConnected && !dlg.open && lost) opener.focus?.({preventScroll: true});
    }, {once: true});
  }
  dlg.replaceChildren(
    h("form", {method: "dialog", class: "dialog-body", onsubmit: event => { event.preventDefault(); actions.submit?.(); }},
      h("h2", {id: "dialogTitle"}, title),
      copy ? h("p", {id: "dialogCopy"}, copy) : null,
      body,
      h("p", {class: "form-help error", id: "dialogError", role: "alert"}),
      h("div", {class: "row end"},
        h("button", {class: "btn ghost", type: "button", onclick: close}, actions.cancelLabel || t("cancel")),
        actions.submit ? h("button", {class: "btn", type: "submit"}, actions.label) : null),
      actions.extra || null));
  dlg.setAttribute("aria-labelledby", "dialogTitle");
  if (copy) dlg.setAttribute("aria-describedby", "dialogCopy");
  else dlg.removeAttribute("aria-describedby");
  if (!dlg.open) dlg.showModal();
  setTimeout(() => dlg.querySelector("input")?.focus(), 20);
  return {close, error: message => {
    const box = $("dialogError"), input = dlg.querySelector("input");
    // role="alert": clear first so the same message is announced again on a second try.
    box.textContent = "";
    setTimeout(() => { box.textContent = message; }, 30);
    input?.setAttribute("aria-invalid", message ? "true" : "false");
    if (message) input?.focus();
  }};
}

function field(id, label, attrs = {}) {
  // The dialog's error line describes the field, so a screen reader reads it with the input.
  return h("div", {class: "field"}, h("label", {for: id}, label), h("input", {id, type: "text", class: "text-input", autocomplete: "off", "aria-describedby": "dialogError", "aria-invalid": "false", ...attrs}));
}

function ensurePlayer(next) {
  // Family features need the internet, even for a player who already has a name.
  if (!state.online) return toast(t("familyOffline"), {kind: "error"});
  if (state.apiDown) return toast(t("familyUnavailable"), {kind: "error"});
  if (state.player) return next();
  const d = dialog(t("nameTitle"), t("nameCopy"), field("nameInput", t("nameLabel"), {placeholder: t("namePlaceholder"), maxlength: "24", autocomplete: "nickname"}), {
    label: t("continue"),
    submit: async () => {
      const name = $("nameInput").value.trim();
      if (!name) return d.error(t("errUNKNOWN_PLAYER"));
      if (looksLikeRoomCode(name)) return d.error(t("errBAD_NAME"));
      try {
        const player = await api("/api/player", {display_name: name});
        state.player = player;
        store.setPlayer(player);
        d.close();
        renderChrome();
        next();
      } catch (error) {
        d.error(errorText(error.code));
      }
    },
    extra: h("button", {class: "link", type: "button", onclick: () => recoveryDialog(next)}, t("haveRecovery"))
  });
}

function recoveryDialog(next) {
  const d = dialog(t("recoveryTitle"), t("recoveryCopy"), field("recoveryInput", t("recoveryLabel"), {autocapitalize: "characters"}), {
    label: t("recover"),
    submit: async () => {
      try {
        const player = await api("/api/player/recover", {recovery_code: $("recoveryInput").value});
        state.player = player;
        store.setPlayer(player);
        d.close();
        renderChrome();
        if (next) next(); else if (state.screen === "home") refreshDashboard();
      } catch (error) {
        d.error(errorText(error.code));
      }
    }
  });
}

/**
 * Joining a family game: the room code first (checked with the server), then the player's own name,
 * then the join. The name is always asked for (prefilled if this device already has one), and is never
 * taken from the code.
 */
function joinDialog(prefill) {
  if (!state.online) return toast(t("familyOffline"), {kind: "error"});
  if (state.apiDown) return toast(t("familyUnavailable"), {kind: "error"});
  const d = dialog(t("joinTitle"), t("joinCopy"), field("joinInput", t("joinLabel"), {value: prefill || "", autocapitalize: "characters", maxlength: "60"}), {
    label: t("join"),
    submit: async () => {
      // A pasted invite link works too: the code is its last part.
      const code = normalizeJoinCode($("joinInput").value.trim().split("/").pop());
      if (!isJoinCode(code)) return d.error(errorText("BAD_JOIN_CODE"));
      try {
        await api(`/api/games/lookup?code=${encodeURIComponent(code)}&player_id=${encodeURIComponent(state.player?.id || "")}`);
      } catch (error) {
        return d.error(errorText(error.code));
      }
      joinNameDialog(code);
    }
  });
}

/** Step two of joining: "What should we call you?", then join the room with that name. */
function joinNameDialog(code) {
  const d = dialog(t("nameTitle"), t("joinNameCopy"), field("nameInput", t("nameLabel"), {placeholder: t("namePlaceholder"), maxlength: "24", autocomplete: "nickname", value: state.player?.display_name || ""}), {
    label: t("join"),
    submit: async () => {
      const name = $("nameInput").value.replace(/\s+/g, " ").trim();
      if (!name) return d.error(t("errUNKNOWN_PLAYER"));
      if (looksLikeRoomCode(name)) return d.error(t("errBAD_NAME"));
      try {
        await savePlayerName(name);
        renderChrome();
        const data = await api("/api/games/join", {player_id: state.player.id, join_code: code});
        d.close();
        navigate(`/games/${data.id}`);
      } catch (error) {
        d.error(errorText(error.code));
      }
    },
    extra: state.player ? null : h("button", {class: "link", type: "button", onclick: () => recoveryDialog(() => joinNameDialog(code))}, t("haveRecovery"))
  });
}

/** Make sure this device's player exists on the server with this name (creating or renaming it). */
async function savePlayerName(name) {
  if (state.player && state.player.display_name === name) return;
  if (state.player) {
    try {
      const updated = await api("/api/player/name", {player_id: state.player.id, display_name: name});
      state.player = {...state.player, ...updated};
      store.setPlayer(state.player);
      return;
    } catch (error) {
      if (error.code !== "UNKNOWN_PLAYER") throw error;
      // The server doesn't know this device's player (e.g. a different database): start a new one.
    }
  }
  state.player = await api("/api/player", {display_name: name});
  store.setPlayer(state.player);
}

function profileDialog() {
  const meetGary = CHARACTER_IDS.filter(id => character(id).intro).map(id => h("button", {class: "link", type: "button", id: `meet${id[0].toUpperCase()}${id.slice(1)}Again`, onclick: () => { $("dialog")?.close(); showCharacterIntro(id); }}, t(character(id).meetAgain)));
  if (!state.player) {
    dialog(t("solo"), t("profileSolo"), null, {cancelLabel: t("close"), extra: [h("button", {class: "link", type: "button", onclick: () => recoveryDialog(null)}, t("haveRecovery")), ...meetGary]});
    return;
  }
  dialog(t("profileTitle", {name: state.player.display_name}), t("profileCopy"),
    h("div", {}, h("p", {class: "code"}, state.player.recovery_code || "—"), h("p", {class: "muted"}, t("profileSolo"))),
    {cancelLabel: t("close"), extra: meetGary});
}

// ---------- boot ----------
function setOnline(online) {
  if (online === state.online) return;
  state.online = online;
  if (online) checkApi();
  toast(online ? t("backOnline") : t("nowOffline"), {kind: online ? "success" : "info", key: "network"});
  rerender();
  // Family dialogs (name, join, recovery) need the server: close them rather than let a submit fail.
  const dlg = $("dialog");
  if (!online && dlg?.open && dlg.querySelector("#joinInput, #nameInput, #recoveryInput")) dlg.close();
  if (online && state.screen === "game" && state.game && !isSoloLike(state.game)) loadFamilyGame(state.game.id);
}

function boot() {
  // Development mode only: record how Gary chooses each word (see garyDebugPanel).
  setGaryDiagnostics(garyDiagnosticsEnabled());
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.addEventListener("click", () => {
      // Only the interface changes. An open game keeps its own word language
      // (languageNote offers an explicit "new game in …" instead).
      const lang = button.dataset.lang === "fr" ? "fr" : "en";
      store.setLanguage(lang);
      if (lang === state.lang) return;
      state.lang = lang;
      rerender();
    });
  }
  $("profileBtn").addEventListener("click", profileDialog);
  $("brandLink").addEventListener("click", event => { event.preventDefault(); navigate("/"); });
  window.addEventListener("popstate", route);
  window.addEventListener("online", () => { setOnline(true); pollNow(); });
  window.addEventListener("focus", pollNow);
  window.addEventListener("pageshow", pollNow);
  window.addEventListener("offline", () => setOnline(false));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.screen === "game" && state.game && !isSoloLike(state.game) && state.online) loadFamilyGame(state.game.id);
  });
  if (!store.healthy) toast(t("errSTORAGE"), {kind: "error", timeout: 8000});

  // Coming back to the bare app: return to the game that was open last.
  const last = store.last();
  let booted = false;
  try { booted = Boolean(sessionStorage.getItem("ssbd.booted")); } catch {}
  if (location.pathname === "/" && last && !booted) {
    if (last.kind === "solo" && store.soloGame(last.id) && !isFinished(store.soloGame(last.id))) history.replaceState({}, "", `/solo/${last.id}`);
  }
  try { sessionStorage.setItem("ssbd.booted", "1"); } catch {}
  // An invite link opened offline: joining needs the internet, so explain instead of offering a join dialog.
  if (!state.online && /^\/join\//.test(location.pathname)) {
    history.replaceState({}, "", "/");
    toast(t("familyOffline"), {kind: "info", key: "network"});
  }
  route();
  checkApi();

  watchKeyboard();
  startLogSync();
  registerServiceWorker();
}

// A new version waits (see sw.js) until the player taps Reload, so a page
// never mixes files from two versions. Tapping Reload lets it take over, and
// the page reloads once it controls this tab.
/** This page's build version (stamped into index.html by scripts/build.mjs). */
const PAGE_VERSION = document.querySelector('meta[name="app-version"]')?.getAttribute("content") || "";
const UPDATE_CHECK_MS = 30 * 60 * 1000;

/**
 * Service worker and updates. A new deployment's worker takes over by itself (see sw.js), and
 * navigations are network-first, so a fresh visit or a reload always shows the newest frontend.
 * What is left for the page: an open tab that is now older than the worker in control offers
 * "A new version is ready" + Reload, and Reload always lands on the new shell (it activates any
 * waiting worker first, then reloads).
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  let offered = false, reloading = false;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  };
  const activateAndReload = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update().catch(() => {});
      const waiting = registration?.waiting;
      if (waiting) {
        // An older-style worker may still be waiting: activate it, then reload under it.
        const switched = new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, {once: true}));
        waiting.postMessage({type: "SKIP_WAITING"});
        await Promise.race([switched, new Promise(resolve => setTimeout(resolve, 3000))]);
      }
    } catch {}
    reload();
  };
  const offer = () => {
    if (offered) return;
    offered = true;
    toast(t("updateReady"), {timeout: 0, action: {label: t("reload"), run: activateAndReload}});
  };
  /** Is the worker in control serving a different build than this page? (Its cache is named after its version.) */
  const pageIsOutdated = async () => {
    if (!PAGE_VERSION || !navigator.serviceWorker.controller) return false;
    try {
      const keys = (await caches.keys()).filter(key => key.startsWith("shell-"));
      return keys.length > 0 && !keys.includes(`shell-${PAGE_VERSION}`);
    } catch {
      return false;
    }
  };
  const check = async () => { if (await pageIsOutdated()) offer(); };
  navigator.serviceWorker.addEventListener("controllerchange", check);
  navigator.serviceWorker.register("/sw.js", {updateViaCache: "none"}).then(registration => {
    if (registration.waiting && navigator.serviceWorker.controller) offer();
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "activated") check();
        // A worker that stays waiting (an older-style one) still gets the Reload offer.
        if (worker.state === "installed" && registration.waiting === worker && navigator.serviceWorker.controller) setTimeout(() => { if (registration.waiting === worker) offer(); }, 1000);
      });
    });
    // Long-lived tabs look for a new deployment when they come back, and every half hour.
    const update = () => registration.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (!document.hidden && state.online) update(); });
    window.addEventListener("online", update);
    setInterval(() => { if (!document.hidden && state.online) update(); }, UPDATE_CHECK_MS);
    check();
  }).catch(() => {});
}

boot();
