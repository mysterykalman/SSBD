// Same-device Pam/Mom Mode review panel. The Mom page writes a compact question/answer trace to
// localStorage; this developer-only hook exposes it at /review without changing Solo's server log.
const MOM_LOG_KEY = "ssbd.mom.gamelog.v1";
const MOM_PROGRESS_KEY = "ssbd:mom-progress:v1";

/** Pam's score, streak and best round for this device (hidden in Mom Mode itself, shown here). */
function loadMomProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(MOM_PROGRESS_KEY) || "null") || {};
    const num = v => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : 0);
    return {totalPoints: num(raw.totalPoints), games: num(raw.games), streak: num(raw.streak), bestStreak: num(raw.bestStreak), bestRound: num(raw.bestRound), updatedAt: raw.updatedAt || ""};
  } catch { return {totalPoints: 0, games: 0, streak: 0, bestStreak: 0, bestRound: 0, updatedAt: ""}; }
}

function loadMomGames() {
  try {
    const data = JSON.parse(localStorage.getItem(MOM_LOG_KEY) || "null");
    return data?.v === 1 && Array.isArray(data.games) ? data.games : [];
  } catch { return []; }
}

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat()) if (child != null && child !== false) node.append(child instanceof Node ? child : String(child));
  return node;
};

function n(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function downloadMomLog(games) {
  const body = JSON.stringify({exportedAt: new Date().toISOString(), games}, null, 2);
  const url = URL.createObjectURL(new Blob([body], {type: "application/json"}));
  const a = el("a", {href: url, download: `ssbd-pam-review-${new Date().toISOString().slice(0, 10)}.json`});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function questionTable(game) {
  const questions = (game.events || []).filter(event => event.kind === "question");
  if (!questions.length) return el("p", {class: "rv-note"}, "No questions recorded for this game.");
  return el("table", {class: "rv-rounds"},
    el("thead", {}, el("tr", {}, ...["#", "Question", "Answer", "Source", "Gain", "Known", "Semantic", "Confidence", "Top candidates"].map(label => el("th", {scope: "col"}, label)))),
    el("tbody", {}, ...questions.map(q => el("tr", {},
      el("td", {}, String(q.number ?? "")),
      el("td", {}, q.text || ""),
      el("td", {class: "rv-human"}, q.answer || "—"),
      el("td", {class: "rv-auto"}, q.source || "—"),
      el("td", {class: "rv-auto"}, n(q.gain)),
      el("td", {class: "rv-auto"}, n(q.knownCoverage)),
      el("td", {class: "rv-auto"}, n(q.semanticCoverage)),
      el("td", {class: "rv-auto"}, n(q.confidence)),
      el("td", {class: "rv-auto"}, (q.topCandidates || []).map(c => `${c.name} ${(100 * Number(c.p || 0)).toFixed(1)}%`).join(" · ") || "—")))));
}

function summary(game) {
  const questions = (game.events || []).filter(event => event.kind === "question");
  const final = [...(game.events || [])].reverse().find(event => event.kind === "result" || event.kind === "guess" || event.kind === "hunch");
  const outcome = game.result?.stumped ? "Pam stumped" : game.result?.correct === true ? "Pam correct" : game.result?.correct === false ? "Pam wrong" : final?.kind || "unfinished";
  return `${new Date(game.startedAt).toLocaleString()} · answer: ${game.secretWord || "—"} · ${questions.length} questions · ${outcome}`;
}

function statsTable(p) {
  const rows = [["Score", p.totalPoints.toLocaleString()], ["Rounds played", p.games], ["Current streak", p.streak], ["Best streak", p.bestStreak], ["Best round", p.bestRound], ["Last updated", p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"]];
  return el("table", {class: "rv-metrics", id: "rvPamStats"},
    el("caption", {}, "Stats on this device"),
    el("tbody", {}, ...rows.map(([label, value]) => el("tr", {}, el("th", {scope: "row"}, label), el("td", {}, String(value))))));
}

function renderMomReview() {
  if (location.pathname !== "/review") return false;
  const review = document.querySelector(".review");
  if (!review || review.querySelector("#rvPam")) return Boolean(review);
  const games = loadMomGames().slice().sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  const section = el("section", {class: "card rv-section", "aria-labelledby": "rvPam"},
    el("h2", {id: "rvPam"}, "Pam / Don’t Tell Me"),
    el("p", {class: "rv-note"}, `Question-and-answer traces from this browser: ${games.length}. These logs include the locked answer, question ranking diagnostics and Pam's top candidates so late-game drift can be reviewed directly.`),
    statsTable(loadMomProgress()),
    el("div", {class: "rv-filters"},
      el("button", {type: "button", class: "btn small ghost", onclick: () => downloadMomLog(games)}, "Export Pam JSON")));
  if (!games.length) section.append(el("p", {}, "No Pam games have been logged on this device yet."));
  for (const game of games.slice(0, 30)) {
    section.append(el("details", {class: "rv-device-game"},
      el("summary", {}, summary(game)),
      el("p", {class: "rv-auto"}, `Runtime: ${game.runtime?.concepts ?? "—"} concepts · ${game.runtime?.questions ?? "—"} questions · ${game.runtime?.sourceHash || "—"}`),
      questionTable(game)));
  }
  const firstDevice = review.querySelector("#rvDevice")?.closest("section");
  if (firstDevice) review.insertBefore(section, firstDevice);
  else review.append(section);
  return true;
}

if (location.pathname === "/review") {
  if (!renderMomReview()) {
    const observer = new MutationObserver(() => { if (renderMomReview()) observer.disconnect(); });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    setTimeout(() => observer.disconnect(), 10000);
  }
}
