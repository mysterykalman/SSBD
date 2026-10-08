// Private review screen for Solo bot decisions (/review). Developer tool, English only, kept apart
// from the player-facing game and word trail.
//
// Server data needs the review token (the server-side REVIEW_TOKEN): it is typed here, kept for this
// tab only (sessionStorage) and sent as a bearer header; without it the server answers 401/404 and
// nothing is shown. The "This device" section reads only this browser's own local log (no token):
// it is the export path when central review is not set up.

import {CSV_COLUMNS, FLAG_LABELS, REVIEW_FLAGS, computeMetrics, reportedStatus} from "../shared/gamelog.js";
import {decisionView} from "./decision-view.js";
import {localCsv, localGames, localPendingCount, syncNow} from "./gamelog.js";

const TOKEN_KEY = "ssbd.reviewToken";
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const child of children.flat()) if (child != null && child !== false) node.append(child instanceof Node ? child : String(child));
  return node;
};
const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
const setToken = value => { try { if (value) sessionStorage.setItem(TOKEN_KEY, value); else sessionStorage.removeItem(TOKEN_KEY); } catch {} };
const pct = r => (r && r.rate !== null ? `${(100 * r.rate).toFixed(1)}% (${r.n}/${r.d})` : `— (0/${r?.d ?? 0})`);
const characterName = id => (id === "milo" ? "Milo" : "Gary");
/** A player rating as stars (★★★★☆), or "" when the game was not rated. */
export const ratingStars = n => (Number.isInteger(n) && n >= 1 && n <= 5 ? `${"★".repeat(n)}${"☆".repeat(5 - n)}` : "");
const STATUS_LABELS = {in_progress: "in progress", matched: "matched", exhausted: "20 moves, no match", ended: "ended by player", abandoned: "abandoned (inferred)"};

async function reviewFetch(path, options = {}) {
  const res = await fetch(path, {...options, cache: "no-store", headers: {...(options.headers || {}), authorization: `Bearer ${token()}`}});
  if (res.status === 401 || res.status === 404) {
    const error = new Error(res.status === 404 ? "Review is not enabled on this server (no REVIEW_TOKEN configured)." : "That review token was not accepted.");
    error.status = res.status;
    throw error;
  }
  if (!res.ok) throw new Error(`The server answered ${res.status}.`);
  return res;
}

function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = el("a", {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The metrics block, with denominators and sample sizes; automated proxies and human review apart. */
function metricsView(m, title) {
  const row = (label, value, note = "") => el("tr", {}, el("th", {scope: "row"}, label), el("td", {}, value), el("td", {class: "rv-note"}, note));
  return el("table", {class: "rv-metrics"},
    el("caption", {}, `${title} · ${m.games} games, ${m.rounds} rounds`),
    el("tbody", {},
      row("Match within 5 moves", pct(m.matchWithin5), "of games whose outcome by move 5 is known (unfinished games under 5 moves excluded)"),
      row("Match within 10 moves", pct(m.matchWithin10), "same rule at move 10"),
      row("Median moves to match", m.medianMovesToMatch.value ?? "—", `matched games only (n=${m.medianMovesToMatch.n})`),
      row("Ended / abandoned by round", Object.entries(m.abandonedByRound).map(([r, n]) => `${r}: ${n}`).join(", ") || "—", "last completed round; abandoned = no activity for 24 h"),
      row("Human: weak connection", pct(m.reviewedWeak), "of rounds a reviewer flagged"),
      row("Human: one-sided", pct(m.reviewedOneSided), "of rounds a reviewer flagged"),
      row("Human: good connection", pct(m.reviewedGood), "of rounds a reviewer flagged"),
      row("Automated: fallback stage", pct(m.fallbackRate), "weak-fallback or lower, or an unknown input"),
      row("Automated: low quality", pct(m.lowQualityRate), "the engine's own indicator"),
      row("Repeated or invalid bot word", pct(m.repeatedOrInvalid), "should always be 0"),
      row("Player rating (wins)", m.playerRating?.n ? `${m.playerRating.mean} / 5 (${m.playerRating.n}/${m.playerRating.d} rated)` : `— (0/${m.playerRating?.d ?? 0} rated)`,
        m.playerRating?.n ? [5, 4, 3, 2, 1].map(n => `${n}★ ${m.playerRating.stars[n]}`).join(" · ") : "asked once after each Solo win"),
      row("Decision time", m.latencyMs.n ? `median ${m.latencyMs.median} ms · p95 ${m.latencyMs.p95} ms` : "—", `n=${m.latencyMs.n}`)));
}

/** How the player's word was read: what they typed, any spelling suggestion and what they did, and how it was understood. */
function playerInputView(p) {
  if (!p) return null;
  const parts = [`typed "${p.original ?? p.submitted}"`];
  if (p.suggestion) parts.push(`suggested "${p.suggestion}" (${p.suggestion_confidence || "?"}) — ${p.suggestion_accepted === true ? "accepted" : p.suggestion_accepted === false ? "kept the original" : "no answer"}`);
  parts.push(`played "${p.submitted}"`);
  parts.push(p.unresolved ? "NOT UNDERSTOOD" : `understood as ${String(p.understood_as || "?").toUpperCase()} (${p.method}${p.fuzzy ? ", spelling" : ""}${p.spacing ? ", spacing" : ""}${p.morphology ? ", inflection" : ""})`);
  return el("p", {class: "rv-auto rv-input"}, `Player input: ${parts.join(" · ")}`);
}

/** One game's rounds: Round | Previous pair | User | Gary/Milo | Match | Flags, each expandable. */
function roundsTable(game, {editable}) {
  const bot = characterName(game.character);
  const rows = [];
  for (const r of game.rounds_list) {
    const flags = el("div", {class: "rv-flags"});
    const flagged = new Set(r.flags || []);
    if (editable) {
      const note = el("input", {type: "text", class: "rv-note-input", value: r.note || "", placeholder: "Reviewer note (optional)", "aria-label": `Reviewer note, round ${r.round}`});
      const boxes = REVIEW_FLAGS.map(f => el("label", {class: "rv-flag"}, el("input", {type: "checkbox", value: f, checked: flagged.has(f)}), ` ${FLAG_LABELS[f]}`));
      const status = el("span", {class: "rv-saved", role: "status"});
      const save = el("button", {type: "button", class: "btn small", onclick: async () => {
        const chosen = boxes.map(b => b.querySelector("input")).filter(i => i.checked).map(i => i.value);
        status.textContent = "Saving…";
        try {
          await reviewFetch("/api/review/flag", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({game_id: game.game_id, round: r.round, flags: chosen, note: note.value})});
          r.flags = chosen; r.note = note.value;
          status.textContent = "Saved.";
          flagCell.textContent = chosen.map(f => FLAG_LABELS[f]).join(", ") || "—";
        } catch (error) { status.textContent = error.message; }
      }}, "Save review");
      flags.append(el("p", {class: "rv-flags-title"}, "Human review"), ...boxes, note, save, status);
    } else {
      flags.append(el("p", {class: "rv-flags-title"}, "Human review: ", (r.flags || []).map(f => FLAG_LABELS[f]).join(", ") || "none"));
    }
    const flagCell = el("td", {class: "rv-human"}, (r.flags || []).map(f => FLAG_LABELS[f]).join(", ") || "—");
    const detail = el("tr", {class: "rv-detail", hidden: true}, el("td", {colspan: "7"},
      el("p", {class: "rv-auto"}, `Automated indicator: ${r.low_quality ? "LOW QUALITY" : "ok"} · stage ${r.stage || "—"} · ${r.decision_ms ?? "—"} ms`),
      playerInputView(r.player_input || r.decision?.playerInput),
      decisionView(r.decision, {selected: r.bot_word, character: game.character}), flags));
    const toggle = el("button", {type: "button", class: "link rv-expand", "aria-expanded": "false", onclick: () => {
      detail.hidden = !detail.hidden;
      toggle.setAttribute("aria-expanded", String(!detail.hidden));
    }}, `Round ${r.round}`);
    rows.push(el("tr", {class: `rv-round ${r.low_quality ? "rv-low" : ""}`},
      el("td", {}, toggle),
      el("td", {}, r.pair_a ? `${r.pair_a} + ${r.pair_b}` : "Start"),
      el("td", {}, r.user_word), el("td", {}, r.bot_word), el("td", {}, r.matched ? "MATCH" : ""),
      el("td", {class: "rv-auto-cell"}, r.low_quality ? "low (auto)" : ""), flagCell), detail);
  }
  return el("table", {class: "rv-rounds"},
    el("thead", {}, el("tr", {}, ...["Round", "Previous pair", "User", bot, "Match", "Automated", "Human flags"].map(x => el("th", {scope: "col"}, x)))),
    el("tbody", {}, ...rows));
}

function gameHeader(g) {
  const status = reportedStatus(g);
  const rating = ratingStars(g.player_rating);
  return `${new Date(g.started_at).toLocaleString()} · ${characterName(g.character)} · ${g.language.toUpperCase()} · ${STATUS_LABELS[status] || status} · ${g.rounds} rounds · ${g.engine_version || "engine ?"}${rating ? ` · Player rating: ${rating} (${g.player_rating}/5)` : ""}`;
}

/** Render the review screen into `root`. */
export function renderReview(root, {onHome} = {}) {
  document.title = "Review · Same Same but Different";
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) { robots = el("meta", {name: "robots", content: "noindex, nofollow"}); document.head.append(robots); }
  const main = el("div", {class: "review", lang: "en"});
  root.replaceChildren(main);
  const header = el("div", {class: "rv-head"},
    el("h1", {}, "Bot review"),
    el("p", {class: "rv-sub"}, "Private evaluation of Gary and Milo's word choices. Not part of the game."),
    el("button", {type: "button", class: "btn ghost small", onclick: () => onHome?.()}, "← Back to the game"));
  const server = el("section", {class: "card rv-section", "aria-labelledby": "rvServer"});
  const device = el("section", {class: "card rv-section", "aria-labelledby": "rvDevice"});
  main.append(header, server, device);
  renderServer(server);
  renderDevice(device);
}

function renderServer(section) {
  section.replaceChildren(el("h2", {id: "rvServer"}, "All games (server)"));
  if (!token()) {
    const input = el("input", {type: "password", id: "reviewToken", class: "text-input", autocomplete: "off", "aria-label": "Review token"});
    // Rendered only while it has a message (an empty one would show as a blank red bar).
    const error = el("p", {class: "form-help error", id: "reviewTokenError", role: "alert", hidden: true});
    const showError = message => { error.textContent = message; error.hidden = !message; };
    section.append(el("form", {class: "rv-token", onsubmit: async event => {
      event.preventDefault();
      showError("");
      setToken(input.value.trim());
      try { await reviewFetch("/api/review/games?limit=1"); renderServer(section); }
      catch (e) { setToken(""); showError(e.message); }
    }}, el("label", {for: "reviewToken"}, "Review token"), input, el("button", {type: "submit", class: "btn small"}, "Open"), error,
    el("p", {class: "rv-note"}, "The token is the server's REVIEW_TOKEN setting. It is kept for this tab only.")));
    return;
  }
  const filters = {character: "", language: "", status: "", engine: "", from: "", to: "", flagged: ""};
  const select = (name, label, options) => el("label", {class: "rv-filter"}, `${label} `, el("select", {name, onchange: e => { filters[name] = e.target.value; load(); }},
    ...options.map(([v, t]) => el("option", {value: v}, t))));
  const date = (name, label) => el("label", {class: "rv-filter"}, `${label} `, el("input", {type: "date", name, onchange: e => { filters[name] = e.target.value; load(); }}));
  const bar = el("div", {class: "rv-filters"},
    select("character", "Character", [["", "All"], ["gary", "Gary"], ["milo", "Milo"]]),
    select("language", "Language", [["", "All"], ["en", "English"], ["fr", "French"]]),
    select("status", "Outcome", [["", "All"], ...Object.entries(STATUS_LABELS)]),
    el("label", {class: "rv-filter"}, "Engine ", el("input", {type: "text", name: "engine", placeholder: "engine-2.1", size: "10", onchange: e => { filters.engine = e.target.value.trim(); load(); }})),
    date("from", "From"), date("to", "To"),
    select("flagged", "Flags", [["", "All games"], ["1", "Flagged or low quality"]]),
    el("button", {type: "button", class: "btn small ghost", onclick: () => exportAs("csv")}, "Export CSV"),
    el("button", {type: "button", class: "btn small ghost", onclick: () => exportAs("json")}, "Export JSON"),
    el("button", {type: "button", class: "btn small ghost", onclick: () => { setToken(""); renderServer(section); }}, "Forget token"));
  const status = el("p", {class: "rv-status", role: "status"});
  const metrics = el("div", {class: "rv-metrics-wrap"});
  const list = el("div", {class: "rv-list"});
  section.append(bar, status, metrics, list);
  const query = () => new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  async function exportAs(format) {
    try {
      const res = await reviewFetch(`/api/review/export?format=${format}&${query()}`);
      download(`ssbd-bot-${format === "csv" ? "rounds" : "games"}-${new Date().toISOString().slice(0, 10)}.${format}`, format === "csv" ? "text/csv" : "application/json", await res.text());
    } catch (e) { status.textContent = e.message; }
  }
  async function load() {
    status.textContent = "Loading…";
    try {
      const [{games}, m] = await Promise.all([reviewFetch(`/api/review/games?${query()}`).then(r => r.json()), reviewFetch(`/api/review/metrics?${query()}`).then(r => r.json())]);
      status.textContent = `${games.length} games`;
      metrics.replaceChildren(metricsView(m.overall, "All filtered games"),
        ...m.byCharacterAndEngine.map(g => metricsView(g, g.key)),
        el("p", {class: "rv-note"}, "Small samples: compare groups only with enough games, and never on match rate alone."));
      list.replaceChildren(gamesTable(games));
    } catch (e) {
      status.textContent = e.message;
      if (e.status === 401) { setToken(""); renderServer(section); }
    }
  }
  function gamesTable(games) {
    if (!games.length) return el("p", {}, "No games match these filters.");
    return el("table", {class: "rv-games"},
      el("thead", {}, el("tr", {}, ...["Date", "Character", "Language", "Outcome", "Rounds", "Engine", "Rating", "Flags", ""].map(x => el("th", {scope: "col"}, x)))),
      el("tbody", {}, ...games.map(g => {
        const holder = el("tr", {class: "rv-game-detail", hidden: true}, el("td", {colspan: "9"}));
        const open = el("button", {type: "button", class: "btn small", onclick: async () => {
          holder.hidden = !holder.hidden;
          if (!holder.hidden && !holder.dataset.loaded) {
            try {
              const {game} = await reviewFetch(`/api/review/game?id=${encodeURIComponent(g.game_id)}`).then(r => r.json());
              holder.firstChild.replaceChildren(el("p", {class: "rv-sub"}, gameHeader(game)), roundsTable(game, {editable: true}));
              holder.dataset.loaded = "1";
            } catch (e) { holder.firstChild.textContent = e.message; }
          }
        }}, "Rounds");
        return [el("tr", {}, el("td", {}, new Date(g.started_at).toLocaleString()), el("td", {}, characterName(g.character)), el("td", {}, g.language.toUpperCase()),
          el("td", {}, STATUS_LABELS[g.reported_status] || g.reported_status), el("td", {}, String(g.rounds)), el("td", {}, g.engine_version || "—"),
          el("td", {class: "rv-rating", "aria-label": g.player_rating ? `${g.player_rating} out of 5` : "not rated"}, ratingStars(g.player_rating) || "—"),
          el("td", {}, [g.flagged_rounds ? `${g.flagged_rounds} reviewed` : "", g.low_quality_rounds ? `${g.low_quality_rounds} low (auto)` : ""].filter(Boolean).join(" · ") || "—"), el("td", {}, open)), holder];
      }).flat()));
  }
  load();
}

function renderDevice(section) {
  const games = localGames();
  const pending = localPendingCount();
  section.replaceChildren(
    el("h2", {id: "rvDevice"}, "This device"),
    el("p", {class: "rv-note"}, `Solo games logged in this browser: ${games.length}. Waiting to upload: ${pending}. This list is only this device's data; the server section above is the central log.`),
    el("div", {class: "rv-filters"},
      el("button", {type: "button", class: "btn small ghost", onclick: () => download(`ssbd-device-rounds-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", localCsv())}, "Export device CSV"),
      el("button", {type: "button", class: "btn small ghost", onclick: () => download(`ssbd-device-games-${new Date().toISOString().slice(0, 10)}.json`, "application/json", JSON.stringify({exported_at: new Date().toISOString(), columns: CSV_COLUMNS, games}, null, 2))}, "Export device JSON"),
      el("button", {type: "button", class: "btn small ghost", onclick: async () => { await syncNow(); renderDevice(section); }}, "Upload now")),
    // Native replaceChildren() would print a null child as the text "null": spread, never pass null.
    ...(games.length ? [metricsView(computeMetrics(games), "This device")] : []),
    ...games.slice(0, 20).map(g => el("details", {class: "rv-device-game"}, el("summary", {}, gameHeader(g)), roundsTable(g, {editable: false}))));
}
