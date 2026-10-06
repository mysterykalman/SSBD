// Same Same but Different: browser app.
// Solo games run fully on the device (src/shared/solo.js) and work offline.
// Family games use the API in src/server/api.js.

import {MAX_MOVES, checkWord, currentMove, isFinished} from "../shared/rules.js";
import {publicMove, startSoloGame, submitSoloWord} from "../shared/solo.js";
import {getLexicon} from "../shared/lexicon/index.js";
import {createSpeller} from "../shared/words.js";
import {languageName, translator} from "./i18n.js";
import {createStore} from "./store.js";

const store = createStore();
const state = {
  lang: store.language() || ((navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en"),
  player: store.player(),
  online: navigator.onLine !== false,
  screen: "home",
  game: null, // normalized view of the open game
  freshReveal: 0,
  busy: false,
  dashboard: null,
  dismissedSuggestion: null,
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
function toast(message, {kind = "info", timeout = 4500, action} = {}) {
  const box = $("toasts");
  const close = () => { item.classList.add("leaving"); setTimeout(() => item.remove(), 200); };
  // The #toasts container is the live region (set up in ensureLiveRegions), so the
  // items carry no role of their own: one announcement per toast, never two.
  const item = h("div", {class: `toast ${kind}`},
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
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || t("errSERVER"));
    error.code = data.code || "SERVER";
    error.data = data;
    throw error;
  }
  return data;
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
    moves: game.moves
  };
}

const isSoloLike = view => view.kind === "solo" || view.kind === "legacy-solo";
const otherLabel = view => (isSoloLike(view) ? t("bot") : view.otherName || t("friend"));
const sideLabel = (view, side) => (side === view.youSide ? t("you") : otherLabel(view));

// ---------- routing ----------
function navigate(path, replace = false) {
  if (location.pathname !== path) history[replace ? "replaceState" : "pushState"]({}, "", path);
  route();
}

async function route() {
  stopPolling();
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
  if ((match = path.match(/^\/join\/([\w-]+)$/))) {
    history.replaceState({}, "", "/");
    renderHome();
    return ensurePlayer(() => joinDialog(decodeURIComponent(match[1])));
  }
  renderHome();
}

function openView(view) {
  const previous = state.game;
  if (!previous || previous.id !== view.id) state.freshReveal = 0;
  state.game = view;
  state.screen = "game";
  const last = [...view.moves].reverse().find(m => m.words);
  const seen = store.seen(view.id);
  if (last && last.number > seen) {
    // Only animate reveals that happened while this player was watching or since their last visit.
    state.freshReveal = last.number;
    store.markSeen(view.id, last.number);
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
    openView(serverView(data.game));
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

function schedulePoll() {
  stopPolling();
  if (!needsPoll(state.game)) return;
  state.pollTimer = setTimeout(async () => {
    if (document.hidden || !state.online || state.busy || state.screen !== "game") return schedulePoll();
    try {
      const data = await api(`/api/game?id=${encodeURIComponent(state.game.id)}&player_id=${encodeURIComponent(state.player.id)}`);
      if (state.screen === "game" && state.game?.id === data.game.id && JSON.stringify(serverView(data.game)) !== JSON.stringify(state.game)) {
        const wasWaiting = state.game.waitingForPlayer;
        openView(serverView(data.game));
        if (wasWaiting && !state.game.waitingForPlayer) toast(t("statusYourTurn"), {kind: "success"});
        return;
      }
    } catch {}
    schedulePoll();
  }, 3500);
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
  if (pill.textContent !== t("offline")) pill.textContent = t("offline");
  const avatar = $("profileBtn");
  avatar.textContent = state.player?.display_name?.trim().charAt(0).toUpperCase() || "☺";
  avatar.setAttribute("aria-label", state.player ? t("profileButtonNamed", {name: state.player.display_name}) : t("profileButton"));
  avatar.setAttribute("aria-haspopup", "dialog");
}

function rerender() {
  renderChrome();
  if (state.screen === "game" && state.game) renderGame();
  else renderHome();
}

function mount(...nodes) {
  const app = $("app");
  app.replaceChildren(...nodes);
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
  const familyDisabled = !state.online;
  mount(
    h("section", {class: "hero"},
      h("p", {class: "kicker"}, t("heroKicker")),
      h("h1", {}, t("heroTitle")),
      h("p", {class: "lede"}, t("heroCopy"))),
    h("div", {class: "start-grid"},
      h("section", {class: "card start solo-card", "aria-labelledby": "soloTitle"},
        h("div", {class: "start-icon", "aria-hidden": "true"}, "🤖"),
        h("h2", {id: "soloTitle"}, t("soloTitle")),
        h("p", {}, t("soloCopy")),
        h("button", {class: "btn big", type: "button", id: "startSolo", onclick: () => startSolo()}, t("soloStart"))),
      h("section", {class: "card start family-card", "aria-labelledby": "familyTitle"},
        h("div", {class: "start-icon", "aria-hidden": "true"}, "👨‍👩‍👧"),
        h("h2", {id: "familyTitle"}, t("familyTitle")),
        h("p", {}, familyDisabled ? t("familyOffline") : t("familyCopy")),
        h("div", {class: "row"},
          h("button", {class: "btn teal", type: "button", id: "createFamily", disabled: familyDisabled, onclick: () => ensurePlayer(createFamily)}, t("familyCreate")),
          h("button", {class: "btn ghost", type: "button", id: "joinFamily", disabled: familyDisabled, onclick: () => ensurePlayer(() => joinDialog(""))}, t("familyJoin"))))),
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
    icon: "🤖",
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
      icon: g.bot ? "🤖" : "👥",
      createdAt: g.created_at,
      status: g.status,
      move: g.round_number,
      language: g.language,
      yourTurn: g.status === "ACTIVE" && !g.locked,
      theirTurn: g.status === "ACTIVE" && g.locked && !g.bot ? g.opponent_name || t("friend") : null,
      code: !g.bot ? g.join_code : null,
      open: () => navigate(`/games/${g.id}`)
    });
  }
  items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if (!items.length) return [h("li", {class: "empty"}, t("gamesEmpty"))];
  return items.map(item => {
    const finished = item.status === "MATCHED" || item.status === "EXHAUSTED";
    const status = item.status === "MATCHED" ? t("statusMatched")
      : item.status === "EXHAUSTED" ? t("statusExhausted")
      : item.status === "WAITING" ? t("waitingJoin")
      : item.theirTurn ? t("statusTheirTurn", {name: item.theirTurn})
      : item.yourTurn ? t("statusYourTurn") : t("statusActive");
    return h("li", {class: `game-item ${finished ? "finished" : ""} ${item.yourTurn ? "your-turn" : ""}`, "data-key": item.key},
      h("span", {class: "game-icon", "aria-hidden": "true"}, item.icon),
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
    const fresh = (data.notifications || []).filter(n => n.kind === "PLAYER_JOINED" || n.kind === "YOUR_TURN" || n.kind === "READY_TO_REVEAL");
    if (fresh.length) {
      toast(t("familyNews"), {kind: "success"});
    }
    if (data.notifications?.length) api("/api/notifications/read", {player_id: state.player.id, ids: data.notifications.map(n => n.id)}).catch(() => {});
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

function startSolo(language = state.lang) {
  const game = startSoloGame({id: newId(), language, seed: randomSeed()});
  if (!store.saveSolo(game)) toast(t("errSTORAGE"), {kind: "error", timeout: 8000});
  navigate(`/solo/${game.id}`);
  $("word")?.focus(); // Solo renders synchronously; focus now so typing right away is never lost
  setTimeout(() => { if (document.activeElement?.id !== "word") $("word")?.focus(); }, 30);
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
  const view = state.game;
  const keep = captureInput();
  renderChrome();
  const move = view.moves[view.moves.length - 1];
  const finished = view.status === "MATCHED" || view.status === "EXHAUSTED";
  const revealed = [...view.moves].reverse().find(m => m.words);
  const fresh = revealed && revealed.number === state.freshReveal;
  const progressMove = finished ? revealed.number : move.number;

  // Mode lives next to the back button; the board starts with move count + progress on one line.
  const board = h("section", {class: `card board ${finished ? "finished" : ""}`, "aria-labelledby": "boardTitle"},
    h("div", {class: "board-top"},
      h("span", {class: "move-count", id: "moveLabel"}, t("moveOf", {n: progressMove, max: view.maxMoves})),
      h("div", {class: "meter", role: "progressbar", "aria-label": t("progressLabel"), "aria-valuetext": t("moveOf", {n: progressMove, max: view.maxMoves}), "aria-valuemin": "0", "aria-valuemax": String(view.maxMoves), "aria-valuenow": String(progressMove)},
        h("i", {style: `width:${Math.max(5, (progressMove / view.maxMoves) * 100)}%`}))),
    languageNote(view),
    fresh ? revealBanner(view, revealed) : null,
    finished ? endPanel(view, revealed) : playPanel(view, move));

  mount(
    h("div", {class: "game-nav"},
      h("button", {class: "btn ghost small", type: "button", id: "backBtn", onclick: () => navigate("/")}, t("back")),
      h("span", {class: "mode-chip"}, h("span", {"aria-hidden": "true"}, isSoloLike(view) ? "🤖 " : "👥 "), isSoloLike(view) ? t("solo") : view.waitingForPlayer ? t("familyTitle") : t("vs", {name: view.otherName || t("friend")}))),
    board,
    trail(view));
  restoreInput(keep);
  if (fresh && revealed.status === "MATCHED") celebrate();
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
    h("button", {class: "btn small ghost", type: "button", lang: state.lang, onclick: () => (solo ? startSolo(state.lang) : ensurePlayer(() => createFamily(state.lang)))}, t("langNewGame", {ui})));
}

function wordChip(word, label, cls = "") {
  return h("span", {class: `chip ${cls}`}, label ? h("small", {}, label) : null, h("span", {class: "chip-word", lang: state.game?.language}, word));
}

function revealBanner(view, move) {
  const matched = move.status === "MATCHED";
  const outcome = matched ? t("revealMatch") : move.status === "EXHAUSTED" ? t("exhaustedTitle") : t("revealDifferent");
  // Spoken once through the persistent live region; the banner itself is not a live
  // region (it is rebuilt on every render and would be announced twice or not at all).
  announce([t("revealTitle"), t("revealSaid", {name: sideLabel(view, view.youSide), word: move.words[view.youSide].toUpperCase()}),
    t("revealSaid", {name: sideLabel(view, view.otherSide), word: move.words[view.otherSide].toUpperCase()}), outcome].join(" "), `reveal:${view.id}:${move.number}`);
  return h("div", {class: `reveal ${matched ? "match" : ""} ${reducedMotion() ? "" : "animate"}`},
    h("p", {class: "reveal-title"}, t("revealTitle")),
    h("div", {class: "reveal-words"},
      wordChip(move.words.a, sideLabel(view, "a"), `flip ${view.youSide === "a" ? "you" : "other"}`),
      h("span", {class: "join"},
        h("span", {class: "op", "aria-hidden": "true"}, matched ? "=" : "+"),
        wordChip(move.words.b, sideLabel(view, "b"), `flip delay ${view.youSide === "b" ? "you" : "other"}`))),
    h("p", {class: "reveal-copy"}, matched ? t("revealMatch") : move.status === "EXHAUSTED" ? t("exhaustedTitle") : t("revealDifferent")),
    move.botQuality === "loose" && !matched ? h("p", {class: "reveal-note"}, t("revealLoose")) : null);
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
        ? [h("p", {class: "instruction"}, solo ? t("firstSolo") : t("firstFamily", {name: otherName}))]
        : [h("p", {class: "instruction"}, t("promptCopy"))]);
  if (!first) {
    // The "+" is glued to the second word so it never dangles at the end of a line.
    panel.append(h("div", {class: "prompt", id: "prompt", lang: view.language},
      h("span", {class: "tile"}, move.prompts[0]),
      h("span", {class: "join"}, h("span", {class: "op", "aria-hidden": "true"}, "+"), h("span", {class: "tile"}, move.prompts[1]))));
  }

  if (waiting) {
    const link = `${location.origin}/join/${encodeURIComponent(view.joinCode)}`;
    panel.append(h("div", {class: "share"},
      h("h2", {}, t("shareTitle")),
      h("p", {}, t("shareCopy")),
      h("p", {class: "code", id: "joinCode"}, view.joinCode),
      h("button", {class: "btn teal", type: "button", onclick: async () => {
        try { await navigator.clipboard.writeText(link); toast(t("copied"), {kind: "success"}); } catch { toast(link, {timeout: 10000}); }
      }}, t("copyLink"))));
    return panel;
  }

  if (locked) {
    panel.append(h("p", {class: "notice pending", role: "status"}, t("youLocked", {word: move.mine.toUpperCase(), name: otherName})));
    return panel;
  }

  const form = h("form", {class: "word-form", id: "wordForm", novalidate: true, onsubmit: event => { event.preventDefault(); submitWord(); }},
    h("label", {class: "sr-only", for: "word"}, t("placeholder")),
    h("input", {id: "word", name: "word", type: "text", class: "word-input", placeholder: t("placeholder"), autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "true", lang: view.language, maxlength: "40", enterkeyhint: "go", "aria-describedby": first ? "formHelp" : "prompt formHelp", "aria-invalid": "false", oninput: onWordInput}),
    h("button", {class: "btn big", type: "submit", id: "lockBtn"}, t("lockIn")),
    h("div", {id: "suggestion", class: "suggestion", "aria-live": "polite"}),
    h("p", {id: "formHelp", class: "form-help", "aria-live": "polite"}, solo ? t("botReady") : move.otherLocked ? t("otherLocked", {name: otherName}) : t("otherThinking", {name: otherName})));
  panel.append(form);
  return panel;
}

function endPanel(view, last) {
  const matched = view.status === "MATCHED";
  const solo = isSoloLike(view);
  return h("div", {class: `end ${matched ? "win" : "over"}`},
    h("div", {class: "end-icon", "aria-hidden": "true"}, matched ? "🎉" : "🌈"),
    h("h1", {id: "boardTitle", class: "board-title"}, matched ? t("winTitle") : t("exhaustedTitle")),
    h("p", {}, matched ? t("winCopy", {word: last.words.a.toUpperCase(), n: last.number}) : t("exhaustedCopy")),
    h("div", {class: "row center"},
      h("button", {class: "btn big", type: "button", id: "newGameBtn", onclick: () => (solo ? startSolo(state.lang) : ensurePlayer(() => createFamily(state.lang)))}, solo ? t("newSolo") : t("newFamily"))));
}

function trail(view) {
  const revealed = view.moves.filter(m => m.words);
  const header = isSoloLike(view) ? t("solo") : view.waitingForPlayer ? t("familyTitle") : t("vs", {name: view.otherName || t("friend")});
  return h("section", {class: "card trail", "aria-labelledby": "trailTitle"},
    h("div", {class: "trail-head"},
      h("h2", {id: "trailTitle"}, t("trailTitle")),
      h("p", {class: "trail-meta"}, h("strong", {}, header), h("span", {class: "trail-when"}, h("span", {"aria-hidden": "true"}, "· "), when(view.createdAt)))),
    revealed.length
      ? h("ol", {class: "trail-list", reversed: true}, revealed.slice().reverse().map(m =>
        h("li", {class: `trail-row ${m.status === "MATCHED" ? "match" : ""}`},
          h("span", {class: "move-badge"}, h("span", {"aria-hidden": "true"}, m.number), h("span", {class: "sr-only"}, t("moveOf", {n: m.number, max: view.maxMoves}))),
          // WORD 1 + WORD 2 → WORD 3 + WORD 4; each "+" is glued to the word after it so lines break cleanly.
          h("div", {class: "trail-eq"},
            h("span", {class: "trail-in"},
              m.prompts
                ? [h("span", {class: "chip plain", lang: view.language}, m.prompts[0]),
                  h("span", {class: "join"}, h("span", {class: "op", "aria-hidden": "true"}, "+"), h("span", {class: "chip plain", lang: view.language}, m.prompts[1]))]
                : h("span", {class: "start-label"}, t("start"))),
            h("span", {class: "trail-out"},
              h("span", {class: "join"},
                h("span", {class: "arrow", "aria-hidden": "true"}, "→"),
                wordChip(m.words.a, sideLabel(view, "a"), view.youSide === "a" ? "you" : "other")),
              h("span", {class: "join"},
                h("span", {class: "op", "aria-hidden": "true"}, m.status === "MATCHED" ? "=" : "+"),
                wordChip(m.words.b, sideLabel(view, "b"), view.youSide === "b" ? "you" : "other")),
              m.status === "MATCHED" ? h("span", {class: "match-badge"}, t("matchBadge")) : null)))))
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
function onWordInput() {
  setHelp(null);
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(updateSuggestion, 350);
}

function setHelp(message, isError = false) {
  const help = $("formHelp");
  if (!help) return;
  const view = state.game;
  const move = view.moves[view.moves.length - 1];
  const error = Boolean(message && isError);
  const text = message || (isSoloLike(view) ? t("botReady") : move.otherLocked ? t("otherLocked", {name: otherLabel(view)}) : t("otherThinking", {name: otherLabel(view)}));
  help.classList.toggle("error", error);
  // #formHelp is a polite live region and the input's description (aria-describedby).
  // Only touch it when the text really changes, so typing doesn't re-announce the
  // hint on every keystroke; a repeated error is cleared first so it is heard again.
  if (error && help.textContent === text) {
    help.textContent = "";
    setTimeout(() => { if (help.isConnected) help.textContent = text; }, 60);
  } else if (help.textContent !== text) {
    help.textContent = text;
  }
  $("word")?.setAttribute("aria-invalid", String(error));
}

function updateSuggestion() {
  const input = $("word"), box = $("suggestion");
  if (!input || !box) return;
  const value = input.value.trim();
  const suggestion = value && value !== state.dismissedSuggestion ? speller(state.game.language).suggest(value) : null;
  // Same suggestion as already shown: leave the live region alone (no repeat announcement).
  if ((box.dataset.word || null) === (suggestion || null) && box.childElementCount === (suggestion ? 3 : 0)) return;
  box.dataset.word = suggestion || "";
  if (!suggestion) return box.replaceChildren();
  box.replaceChildren(
    h("span", {}, t("didYouMean", {word: suggestion.toUpperCase()})),
    h("button", {class: "btn tiny teal", type: "button", onclick: () => { input.value = suggestion; box.replaceChildren(); input.focus(); }}, t("useSuggestion", {word: suggestion.toUpperCase()})),
    h("button", {class: "btn tiny ghost", type: "button", onclick: () => { state.dismissedSuggestion = value; box.replaceChildren(); input.focus(); }}, t("keepMine")));
}

function rulesGame(view) {
  return {status: view.status === "WAITING" ? "ACTIVE" : view.status, moves: view.moves};
}

async function submitWord() {
  if (state.busy) return;
  const view = state.game, input = $("word");
  if (!input) return;
  const check = checkWord(rulesGame(view), view.youSide, input.value);
  if (!check.ok) {
    setHelp(errorText(check.code, check.word), true);
    input.focus();
    return;
  }
  state.dismissedSuggestion = null;

  if (view.kind === "solo") {
    const game = store.soloGame(view.id);
    const result = submitSoloWord(game, input.value);
    if (!result.ok) { setHelp(errorText(result.code, result.word), true); return; }
    if (!store.saveSolo(result.game)) toast(t("errSTORAGE"), {kind: "error", timeout: 8000});
    input.value = "";
    openView(soloView(result.game));
    focusAfterMove();
    return;
  }

  state.busy = true;
  const button = $("lockBtn");
  input.disabled = true;
  if (button) { button.disabled = true; button.textContent = t("locking"); }
  try {
    const data = await api("/api/submit", {game_id: view.id, player_id: state.player.id, word: check.word, move: view.moves[view.moves.length - 1].number});
    input.value = "";
    state.busy = false;
    openView(serverView(data.game));
    focusAfterMove();
  } catch (error) {
    state.busy = false;
    if (error.data?.game) openView(serverView(error.data.game));
    else { input.disabled = false; if (button) { button.disabled = false; button.textContent = t("lockIn"); } }
    if (error.code === "NETWORK") toast(t("errNETWORK"), {kind: "error"});
    else if ($("formHelp")) setHelp(errorText(error.code, error.data?.word), true);
    else toast(errorText(error.code, error.data?.word), {kind: "error"});
  }
}

function focusAfterMove() {
  const input = $("word");
  // Keep the keyboard up on touch devices; the reveal never blocks typing.
  const target = input || $("newGameBtn");
  target?.focus({preventScroll: true});
  // Only scroll when the next control is off screen, so big screens don't jump around.
  const box = target?.getBoundingClientRect();
  if (!box || box.top < 0 || box.bottom > window.innerHeight) {
    $("app").querySelector(".board")?.scrollIntoView({block: "start", behavior: reducedMotion() ? "auto" : "smooth"});
  }
}

function celebrate() {
  if (reducedMotion()) return;
  const layer = h("div", {class: "confetti", "aria-hidden": "true"});
  const colors = ["#ff6b57", "#ffc93c", "#1fb5a8", "#7b4fc9", "#ff7ab6"];
  for (let i = 0; i < 28; i++) {
    layer.append(h("i", {style: `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.25}s;--drift:${(Math.random() - 0.5) * 160}px`}));
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1800);
}

// ---------- dialogs ----------
function dialog(title, copy, body, actions) {
  const dlg = $("dialog");
  const close = () => { if (dlg.open) dlg.close(); };
  // Native modal <dialog>: focus is trapped, Escape closes, the rest of the page is inert.
  // Remember the opener so focus goes back there when the dialog closes.
  const opener = dlg.open ? null : document.activeElement;
  if (opener) {
    dlg.addEventListener("close", () => {
      if (opener.isConnected && !dlg.open && !dlg.contains(document.activeElement)) opener.focus?.({preventScroll: true});
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
  if (state.player) return next();
  if (!state.online) return toast(t("familyOffline"), {kind: "error"});
  const d = dialog(t("nameTitle"), t("nameCopy"), field("nameInput", t("nameLabel"), {placeholder: t("namePlaceholder"), maxlength: "24", autocomplete: "nickname"}), {
    label: t("continue"),
    submit: async () => {
      const name = $("nameInput").value.trim();
      if (!name) return d.error(t("errUNKNOWN_PLAYER"));
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

function joinDialog(prefill) {
  const d = dialog(t("joinTitle"), t("joinCopy"), field("joinInput", t("joinLabel"), {value: prefill || "", autocapitalize: "characters", maxlength: "60"}), {
    label: t("join"),
    submit: async () => {
      const code = $("joinInput").value.trim().split("/").pop();
      try {
        const data = await api("/api/games/join", {player_id: state.player.id, join_code: code});
        d.close();
        navigate(`/games/${data.id}`);
      } catch (error) {
        d.error(errorText(error.code));
      }
    }
  });
}

function profileDialog() {
  if (!state.player) {
    dialog(t("solo"), t("profileSolo"), null, {cancelLabel: t("close"), extra: h("button", {class: "link", type: "button", onclick: () => recoveryDialog(null)}, t("haveRecovery"))});
    return;
  }
  dialog(t("profileTitle", {name: state.player.display_name}), t("profileCopy"),
    h("div", {}, h("p", {class: "code"}, state.player.recovery_code || "—"), h("p", {class: "muted"}, t("profileSolo"))),
    {cancelLabel: t("close")});
}

// ---------- boot ----------
function setOnline(online) {
  if (online === state.online) return;
  state.online = online;
  toast(online ? t("backOnline") : t("nowOffline"), {kind: online ? "success" : "info"});
  rerender();
  if (online && state.screen === "game" && state.game && !isSoloLike(state.game)) loadFamilyGame(state.game.id);
}

function boot() {
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
  window.addEventListener("online", () => setOnline(true));
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
  route();

  registerServiceWorker();
}

// A new version waits (see sw.js) until the player taps Reload, so a page
// never mixes files from two versions. Tapping Reload lets it take over, and
// the page reloads once it controls this tab.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  let announced = null, reloading = false, requested = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!requested || reloading) return;
    reloading = true;
    location.reload();
  });
  const announce = worker => {
    if (!worker || announced === worker || !navigator.serviceWorker.controller) return;
    announced = worker;
    toast(t("updateReady"), {timeout: 0, action: {label: t("reload"), run: () => {
      requested = true;
      if (worker.state === "redundant" || worker.state === "activated") return location.reload();
      worker.postMessage({type: "SKIP_WAITING"});
    }}});
  };
  navigator.serviceWorker.register("/sw.js", {updateViaCache: "none"}).then(registration => {
    if (registration.waiting) announce(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") announce(registration.waiting || worker);
      });
    });
  }).catch(() => {});
}

boot();
