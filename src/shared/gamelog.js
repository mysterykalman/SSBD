// @ts-check
// Solo game logs for bot evaluation: record shapes, validation, metrics and CSV export.
// Pure functions shared by the browser (local durable queue), the server (validation) and tests.
//
// One game record per Solo game and one round record per REVEALED round (never an unrevealed word).
// Nothing identifies the player: no name, email, player id or IP address; the key is the game's own
// random id. Game id + round number make every write idempotent.

import {wordKey} from "./words.js";
import {lemmaKeys} from "./morph.js";

export const LOG_SCHEMA = 1;
/** A game in progress with no activity for this long is reported as abandoned (inferred, never stored). */
export const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000;
export const REVIEW_FLAGS = ["weak", "one-sided", "obscure", "generic", "good"];
export const FLAG_LABELS = {weak: "Weak connection", "one-sided": "One-sided association", obscure: "Too obscure", generic: "Too generic", good: "Good connection"};
const FINAL = new Set(["matched", "exhausted", "ended"]);
const MAX_WORD = 60;

/** @param {{status: string}} game */
export function gameStatus(game) {
  return game.status === "MATCHED" ? "matched" : game.status === "EXHAUSTED" ? "exhausted" : "in_progress";
}

/**
 * The game-level record.
 * @param {any} game a Solo game (src/shared/solo.js)
 * @param {{appVersion?: string, engineVersion?: string, datasetVersion?: string, config?: object, now?: string, status?: string, endedAt?: string | null}} meta
 */
export function gameRecord(game, meta = {}) {
  const revealed = game.moves.filter(m => m.words);
  const status = meta.status || gameStatus(game);
  const last = revealed[revealed.length - 1];
  return {
    schema: LOG_SCHEMA,
    game_id: String(game.id),
    mode: "solo",
    character: String(game.character || "gary"),
    language: game.language === "fr" ? "fr" : "en",
    started_at: game.createdAt,
    last_activity_at: meta.now || last?.revealedAt || game.updatedAt || game.createdAt,
    ended_at: meta.endedAt ?? (FINAL.has(status) ? (last?.revealedAt || meta.now || null) : null),
    status,
    rounds: revealed.length,
    app_version: meta.appVersion || null,
    engine_version: meta.engineVersion || null,
    dataset_version: meta.datasetVersion || null,
    config: meta.config || null,
    seed: Number.isFinite(game.seed) ? game.seed : null
  };
}

/**
 * The round record for one revealed move, written as soon as it is revealed.
 * @param {any} game
 * @param {any} move the revealed move (words set)
 * @param {any} decision the engine decision committed before the reveal (or null for older games)
 * @param {number | null} decisionMs
 */
export function roundRecord(game, move, decision, decisionMs) {
  const {config: _config, ...compact} = decision || {};
  return {
    schema: LOG_SCHEMA,
    game_id: String(game.id),
    round: move.number,
    pair: move.prompts ? [String(move.prompts[0]), String(move.prompts[1])] : null,
    user_word: String(move.words.a),
    bot_word: String(move.words.b),
    user_key: wordKey(move.words.a),
    bot_key: wordKey(move.words.b),
    matched: move.status === "MATCHED",
    revealed_at: move.revealedAt,
    decision_ms: Number.isFinite(decisionMs) ? decisionMs : null,
    stage: decision?.stage ?? null,
    low_quality: decision ? Boolean(decision.lowQuality) : null,
    decision: decision ? compact : null
  };
}

/** Reported status: a game still in progress after ABANDON_AFTER_MS of inactivity is "abandoned" (inferred). */
export function reportedStatus(game, now = Date.now()) {
  if (game.status !== "in_progress") return game.status;
  const last = Date.parse(game.last_activity_at);
  return Number.isFinite(last) && now - last >= ABANDON_AFTER_MS ? "abandoned" : "in_progress";
}

// ---------- validation (server side) ----------
const isIso = v => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));
const word = v => typeof v === "string" && v.trim().length > 0 && v.length <= MAX_WORD;

/** A clean game record, or null when it doesn't look like one. */
export function cleanGame(g) {
  if (!g || typeof g !== "object") return null;
  const status = ["in_progress", "matched", "exhausted", "ended"].includes(g.status) ? g.status : null;
  if (typeof g.game_id !== "string" || !/^[\w-]{6,80}$/.test(g.game_id) || !status) return null;
  if (!isIso(g.started_at) || !isIso(g.last_activity_at)) return null;
  const config = g.config && typeof g.config === "object" && JSON.stringify(g.config).length <= 4000 ? g.config : null;
  return {
    game_id: g.game_id, mode: "solo", character: ["gary", "milo"].includes(g.character) ? g.character : "gary",
    language: g.language === "fr" ? "fr" : "en", started_at: g.started_at, last_activity_at: g.last_activity_at,
    ended_at: isIso(g.ended_at) ? g.ended_at : null, status, rounds: Math.max(0, Math.min(20, Number(g.rounds) || 0)),
    app_version: typeof g.app_version === "string" ? g.app_version.slice(0, 40) : null,
    engine_version: typeof g.engine_version === "string" ? g.engine_version.slice(0, 40) : null,
    dataset_version: typeof g.dataset_version === "string" ? g.dataset_version.slice(0, 40) : null,
    config, seed: Number.isSafeInteger(g.seed) ? g.seed : null
  };
}

/** A clean round record, or null. */
export function cleanRound(r) {
  if (!r || typeof r !== "object" || typeof r.game_id !== "string" || !/^[\w-]{6,80}$/.test(r.game_id)) return null;
  const round = Number(r.round);
  if (!Number.isInteger(round) || round < 1 || round > 20 || !word(r.user_word) || !word(r.bot_word) || !isIso(r.revealed_at)) return null;
  const pair = Array.isArray(r.pair) && r.pair.length === 2 && r.pair.every(word) ? r.pair : null;
  const decision = r.decision && typeof r.decision === "object" && JSON.stringify(r.decision).length <= 20000 ? r.decision : null;
  return {
    game_id: r.game_id, round, pair_a: pair ? pair[0] : null, pair_b: pair ? pair[1] : null,
    user_word: r.user_word.trim(), bot_word: r.bot_word.trim(), user_key: wordKey(r.user_word), bot_key: wordKey(r.bot_word),
    matched: r.matched === true, revealed_at: r.revealed_at,
    decision_ms: Number.isFinite(r.decision_ms) && r.decision_ms >= 0 && r.decision_ms < 60000 ? r.decision_ms : null,
    stage: typeof r.stage === "string" ? r.stage.slice(0, 40) : null, low_quality: typeof r.low_quality === "boolean" ? r.low_quality : null,
    decision
  };
}

// ---------- metrics ----------
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const percentile = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)];
};
const rate = (n, d) => ({n, d, rate: d ? n / d : null});
const GOOD_STAGES = new Set(["opening", "shared-direct", "direct-plus-indirect", "indirect-both"]);

/**
 * Quality metrics for a set of games (each with `rounds_list`: its round rows, with any review
 * `flags`/`note` merged in), with explicit
 * numerators and denominators. Automated proxies and human review are reported separately.
 *  matchWithin5 / matchWithin10  denominator: games whose outcome by move N is known (matched at any
 *     move, reached N rounds, or finished: exhausted, ended or abandoned). In-progress games with fewer
 *     than N rounds are excluded, never counted as losses.
 *  medianMovesToMatch  matched games only.
 *  abandonedByRound    ended + inferred-abandoned games, by their last completed round.
 *  reviewedWeak / reviewedOneSided  denominator: rounds a human reviewed (any flag).
 *  fallbackRate (automated)  rounds whose engine stage is a fallback (weak-fallback and below,
 *     unknown/no-known input); denominator: rounds with a decision record.
 *  lowQualityRate (automated)  rounds the engine itself flagged low quality; same denominator.
 *  repeatedOrInvalid  bot words that repeat (or vary) a word revealed earlier in the game, or are empty.
 *  latency  decision_ms median and 95th percentile over rounds that recorded it.
 * @param {any[]} games
 * @param {number} [now]
 */
export function computeMetrics(games, now = Date.now()) {
  const withStatus = games.map(g => ({...g, reported: reportedStatus(g, now)}));
  const known = n => withStatus.filter(g => g.reported === "matched" || g.rounds >= n || g.reported !== "in_progress");
  const matchedBy = n => g => g.reported === "matched" && g.rounds <= n;
  const k5 = known(5), k10 = known(10);
  const matched = withStatus.filter(g => g.reported === "matched");
  const quit = withStatus.filter(g => g.reported === "ended" || g.reported === "abandoned");
  const byRound = {};
  for (const g of quit) byRound[g.rounds] = (byRound[g.rounds] || 0) + 1;
  const rounds = withStatus.flatMap(g => (g.rounds_list || []).map(r => ({...r, game: g})));
  const decided = rounds.filter(r => r.stage);
  const fallback = decided.filter(r => !GOOD_STAGES.has(r.stage));
  const low = decided.filter(r => r.low_quality === true);
  let repeated = 0;
  for (const g of withStatus) {
    const seen = new Set();
    for (const r of [...(g.rounds_list || [])].sort((a, b) => a.round - b.round)) {
      const keys = lemmaKeys(r.bot_word, g.language);
      if (!r.bot_key || [...keys].some(k => seen.has(k))) repeated++;
      for (const w of [r.user_word, r.bot_word]) for (const k of lemmaKeys(w, g.language)) seen.add(k);
    }
  }
  const reviewed = rounds.filter(r => (r.flags || []).length);
  const latency = rounds.map(r => r.decision_ms).filter(x => Number.isFinite(x));
  return {
    games: withStatus.length,
    statuses: Object.fromEntries(["in_progress", "matched", "exhausted", "ended", "abandoned"].map(s => [s, withStatus.filter(g => g.reported === s).length])),
    matchWithin5: rate(k5.filter(matchedBy(5)).length, k5.length),
    matchWithin10: rate(k10.filter(matchedBy(10)).length, k10.length),
    medianMovesToMatch: {value: median(matched.map(g => g.rounds)), n: matched.length},
    abandonedByRound: byRound,
    rounds: rounds.length,
    reviewedRounds: reviewed.length,
    reviewedWeak: rate(reviewed.filter(r => r.flags.includes("weak")).length, reviewed.length),
    reviewedOneSided: rate(reviewed.filter(r => r.flags.includes("one-sided")).length, reviewed.length),
    reviewedGood: rate(reviewed.filter(r => r.flags.includes("good")).length, reviewed.length),
    fallbackRate: rate(fallback.length, decided.length),
    lowQualityRate: rate(low.length, decided.length),
    repeatedOrInvalid: rate(repeated, rounds.length),
    latencyMs: {median: median(latency), p95: percentile(latency, 0.95), n: latency.length}
  };
}

/** Metrics per group (e.g. character + engine version), each with its own sample size. */
export function metricsBy(games, keyOf, now = Date.now()) {
  const groups = new Map();
  for (const g of games) {
    const key = keyOf(g);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }
  return [...groups].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([key, list]) => ({key, ...computeMetrics(list, now)}));
}

// ---------- CSV ----------
/**
 * One CSV cell: quoted when needed, quotes doubled, and a leading = + - @ (or tab/CR) neutralised
 * with an apostrophe so a spreadsheet never runs it as a formula.
 */
export function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = Array.isArray(value) ? value.join("|") : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_COLUMNS = ["game_id", "character", "language", "status", "started_at", "engine_version", "dataset_version", "app_version",
  "round", "pair_a", "pair_b", "user_word", "bot_word", "matched", "revealed_at", "decision_ms", "stage", "low_quality", "review_flags", "review_note"];

/** Games (each with rounds and reviews) → CSV, one line per round. */
export function toCsv(games, now = Date.now()) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const g of games) {
    for (const r of [...(g.rounds_list || [])].sort((a, b) => a.round - b.round)) {
      const row = {...g, status: reportedStatus(g, now), ...r, review_flags: r.flags || [], review_note: r.note || ""};
      lines.push(CSV_COLUMNS.map(c => csvCell(row[c])).join(","));
    }
  }
  return lines.join("\r\n") + "\r\n";
}
