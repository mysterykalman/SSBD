// Solo bot evaluation logs: record shapes (no identifying data), idempotent persistence in
// PostgreSQL, review access control, review flags, exports (safe CSV, JSON with diagnostics) and
// metrics with explicit denominators.
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {ABANDON_AFTER_MS, CSV_COLUMNS, cleanGame, cleanRound, computeMetrics, csvCell, gameRecord, reportedStatus, roundRecord, toCsv} from "../src/shared/gamelog.js";
import {ENGINE_CONFIG, ENGINE_VERSION} from "../src/shared/engine.js";
import {DATASET_VERSION} from "../src/shared/lexicon/index.js";
import {currentMove} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {freshDatabase} from "./support/db.mjs";

const TOKEN = "review-secret-for-tests";
let db, env;
beforeEach(async () => { db = await freshDatabase(); env = {store: db.store, reviewToken: TOKEN}; });
afterEach(() => db.end());

async function api(path, {body, token, method} = {}) {
  const headers = {"content-type": "application/json", ...(token ? {authorization: `Bearer ${token}`} : {})};
  const res = await handleApi(new Request(`http://x${path}`, {method: method || (body ? "POST" : "GET"), headers, body: body ? JSON.stringify(body) : undefined}), env);
  const type = res.headers.get("content-type") || "";
  return {status: res.status, headers: res.headers, data: type.includes("json") ? await res.json() : await res.text()};
}

/** Play a real Solo game and collect what the app logs at each reveal. */
function playLogged(id, words, character = "milo") {
  let game = startSoloGame({id, seed: 9, character, now: "2026-03-01T10:00:00.000Z"});
  const rounds = [];
  for (const w of words) {
    if (game.status !== "ACTIVE") break;
    const r = submitSoloWord(game, w, `2026-03-01T10:0${rounds.length}:30.000Z`);
    if (!r.ok) continue;
    game = r.game;
    rounds.push(roundRecord(game, r.move, r.decision, r.decisionMs));
  }
  const record = gameRecord(game, {appVersion: "test-app", engineVersion: ENGINE_VERSION, datasetVersion: DATASET_VERSION, config: ENGINE_CONFIG});
  return {game, record, rounds};
}

test("records: one per revealed round, the decision committed before the reveal, nothing identifying", () => {
  const {game, record, rounds} = playLogged("log-game-1", ["garden", "violin", "rocket"]);
  assert.equal(rounds.length, 3);
  assert.deepEqual(rounds.map(r => r.round), [1, 2, 3]);
  assert.equal(rounds[0].pair, null);
  assert.deepEqual(rounds[1].pair, game.moves[0].words ? [game.moves[0].words.a, game.moves[0].words.b] : null);
  for (const r of rounds) {
    assert.equal(r.decision.selected, r.bot_word, "the logged decision chose the revealed word");
    assert.ok(r.stage && typeof r.low_quality === "boolean" && Number.isFinite(r.decision_ms));
    assert.equal(r.decision.config, undefined, "the engine configuration is logged once, with the game");
  }
  assert.deepEqual(Object.keys(record).sort(), ["app_version", "character", "config", "dataset_version", "engine_version", "ended_at", "game_id", "language", "last_activity_at", "mode", "player_rating", "rounds", "schema", "seed", "started_at", "status"].sort());
  assert.equal(record.player_rating, null, "no rating unless the player won and rated");
  assert.equal(record.character, "milo");
  assert.equal(record.status, "in_progress");
  assert.equal(record.ended_at, null);
  // No names, player ids, emails or addresses anywhere in what is logged.
  const text = JSON.stringify({record, rounds});
  assert.doesNotMatch(text, /player(?!_rating|_input)|display_name|email|recovery|"ip"|address/i, "the only player-anything is the anonymous star rating and how their word was read");
  // The open (unrevealed) move is never logged.
  assert.ok(!rounds.some(r => r.bot_word === currentMove(game).hidden.b && r.round === currentMove(game).number));
});

test("persistence: every revealed round is stored at once, retries and repeats never duplicate, status only moves forward", async () => {
  const {record, rounds} = playLogged("log-game-2", ["garden", "violin"]);
  assert.equal((await api("/api/log/batch", {body: {games: [record], rounds: [rounds[0]]}})).data.rounds, 1, "round 1 stored before the game ends");
  // Retries, repeats and reordering (e.g. a refresh while a request was in flight).
  for (let i = 0; i < 3; i++) await api("/api/log/batch", {body: {games: [record], rounds: [rounds[1], rounds[0], rounds[1]]}});
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_rounds WHERE game_id = ?", "log-game-2"), 2);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_games WHERE game_id = ?", "log-game-2"), 1);
  // A finished status is final: a late in-progress copy never reopens it.
  await api("/api/log/batch", {body: {games: [{...record, status: "matched", rounds: 2, ended_at: "2026-03-01T10:01:30.000Z"}]}});
  await api("/api/log/batch", {body: {games: [{...record, status: "in_progress", rounds: 1}]}});
  const row = (await db.store.query("SELECT status, rounds, ended_at, engine_version, dataset_version FROM bot_games WHERE game_id = $1", ["log-game-2"])).rows[0];
  assert.deepEqual(row, {status: "matched", rounds: 2, ended_at: "2026-03-01T10:01:30.000Z", engine_version: ENGINE_VERSION, dataset_version: DATASET_VERSION});
  // The stored decision has the per-input connection scores.
  const stored = (await db.store.query("SELECT decision FROM bot_rounds WHERE game_id = $1 AND round = 2", ["log-game-2"])).rows[0].decision;
  assert.ok(stored.candidates.every(c => typeof c.relA === "number" && typeof c.relB === "number"));
});

test("validation: malformed or oversized batches are rejected; rounds need their game", async () => {
  assert.equal((await api("/api/log/batch", {body: {games: Array.from({length: 41}, () => ({}))}})).status, 413);
  const r = await api("/api/log/batch", {body: {games: [{game_id: "x"}, {game_id: "bad id!", status: "matched"}], rounds: [{game_id: "orphan-game", round: 1, user_word: "a", bot_word: "b", revealed_at: "2026-01-01T00:00:00Z"}, {game_id: "log-x", round: 99}]}});
  assert.equal(r.status, 200);
  assert.deepEqual([r.data.games, r.data.rounds, r.data.rejected], [0, 0, 3]);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_rounds"), 0);
});

test("review access: off without a configured token, 401 with a wrong one, and the log endpoint never reads", async () => {
  const {record, rounds} = playLogged("log-game-3", ["garden"]);
  await api("/api/log/batch", {body: {games: [record], rounds}});
  env = {store: db.store}; // no REVIEW_TOKEN configured
  assert.equal((await api("/api/review/games", {token: "anything"})).status, 404);
  env = {store: db.store, reviewToken: TOKEN};
  assert.equal((await api("/api/review/games")).status, 401);
  assert.equal((await api("/api/review/games", {token: "wrong"})).status, 401);
  assert.equal((await api("/api/review/games", {token: `${TOKEN}x`})).status, 401);
  assert.equal((await api("/api/review/export?format=json")).status, 401);
  assert.equal((await api("/api/review/flag", {body: {game_id: "log-game-3", round: 1, flags: ["weak"]}})).status, 401);
  const ok = await api("/api/review/games", {token: TOKEN});
  assert.equal(ok.status, 200);
  assert.equal(ok.data.games.length, 1);
  assert.equal((await api("/api/log/batch")).status, 404, "GET on the log endpoint returns nothing");
});

test("review: list with filters, game detail with diagnostics, human flags and notes kept apart from automated indicators", async () => {
  const a = playLogged("log-game-4", ["garden", "violin", "rocket"], "gary");
  const b = playLogged("log-game-5", ["pencil"], "milo");
  await api("/api/log/batch", {body: {games: [a.record, b.record], rounds: [...a.rounds, ...b.rounds]}});
  const flag = await api("/api/review/flag", {token: TOKEN, body: {game_id: "log-game-4", round: 2, flags: ["one-sided", "weak", "not-a-flag"], note: "only follows the first word"}});
  assert.deepEqual(flag.data.flags, ["one-sided", "weak"]);
  assert.equal((await api("/api/review/flag", {token: TOKEN, body: {game_id: "log-game-4", round: 19, flags: ["weak"]}})).status, 404);
  const gary = await api("/api/review/games?character=gary", {token: TOKEN});
  assert.deepEqual(gary.data.games.map(g => g.game_id), ["log-game-4"]);
  assert.equal(gary.data.games[0].flagged_rounds, 1);
  assert.deepEqual((await api("/api/review/games?flagged=1", {token: TOKEN})).data.games.map(g => g.game_id).includes("log-game-4"), true);
  assert.deepEqual((await api("/api/review/games?language=fr", {token: TOKEN})).data.games, []);
  const detail = await api("/api/review/game?id=log-game-4", {token: TOKEN});
  const rounds = detail.data.game.rounds_list;
  assert.deepEqual(rounds.map(r => r.round), [1, 2, 3], "chronological");
  assert.deepEqual(rounds[1].flags, ["one-sided", "weak"]);
  assert.equal(rounds[1].note, "only follows the first word");
  assert.ok(rounds[1].decision.candidates.length, "diagnostics for each round");
  assert.equal(typeof rounds[1].low_quality, "boolean", "the automated indicator is its own field");
});

test("exports: CSV is escaped safely (quotes, commas, newlines, formulas); JSON carries the diagnostics", async () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(["weak", "one-sided"]), "weak|one-sided");
  const {record, rounds} = playLogged("log-game-6", ["garden", "violin"]);
  await api("/api/log/batch", {body: {games: [record], rounds}});
  await api("/api/review/flag", {token: TOKEN, body: {game_id: "log-game-6", round: 1, flags: ["good"], note: '=cmd "quoted", note\nline 2'}});
  const csv = await api("/api/review/export?format=csv", {token: TOKEN});
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert.match(csv.headers.get("content-disposition"), /attachment; filename="ssbd-bot-rounds-/);
  const lines = csv.data.split("\r\n");
  assert.equal(lines[0], CSV_COLUMNS.join(","));
  assert.ok(csv.data.includes(`"'=cmd ""quoted"", note\nline 2"`), "the note is escaped and neutralised");
  assert.equal(lines.filter(l => l.startsWith("log-game-6,")).length, 2);
  const exported = await api("/api/review/export?format=json", {token: TOKEN});
  assert.ok(exported.data.games[0].rounds_list[0].decision, "JSON export includes the decision record");
  assert.ok(toCsv(exported.data.games).startsWith(CSV_COLUMNS.join(",")));
});

test("metrics: explicit denominators; unfinished games are not losses; automated and human measures separate", async () => {
  const now = Date.parse("2026-03-10T12:00:00.000Z");
  const game = (id, status, rounds, last = "2026-03-10T11:00:00.000Z", extra = {}) => ({game_id: id, status, rounds, last_activity_at: last, language: "en",
    rounds_list: Array.from({length: rounds}, (_, i) => ({round: i + 1, bot_word: `w${id}${i}`, bot_key: `w${id}${i}`, user_word: `u${id}${i}`, stage: i === 0 ? "opening" : "shared-direct", low_quality: false, decision_ms: 2 + i, flags: []})), ...extra});
  const games = [
    game("a", "matched", 3), game("b", "matched", 8), game("c", "exhausted", 20),
    game("d", "in_progress", 2), // recent, unfinished: excluded below 5
    game("e", "in_progress", 4, "2026-03-08T00:00:00.000Z"), // inactive > 24 h: inferred abandoned
    game("f", "ended", 6)
  ];
  games[1].rounds_list[3] = {...games[1].rounds_list[3], stage: "weak-fallback", low_quality: true, flags: ["weak", "one-sided"]};
  games[1].rounds_list[4] = {...games[1].rounds_list[4], flags: ["good"]};
  games[2].rounds_list[5] = {...games[2].rounds_list[5], bot_word: games[2].rounds_list[2].user_word}; // a repeated word
  assert.equal(reportedStatus(games[4], now), "abandoned");
  assert.equal(reportedStatus(games[3], now), "in_progress");
  assert.equal(reportedStatus({status: "in_progress", last_activity_at: new Date(now - ABANDON_AFTER_MS + 1000).toISOString()}, now), "in_progress");
  const m = computeMetrics(games, now);
  // Within 5: known = a, b (reached 5+), c, e (abandoned), f (ended) — d (in progress, 2 rounds) excluded.
  assert.deepEqual(m.matchWithin5, {n: 1, d: 5, rate: 1 / 5});
  // Within 10: known = a, b, c (20 rounds), e, f — d excluded.
  assert.deepEqual(m.matchWithin10, {n: 2, d: 5, rate: 2 / 5});
  assert.deepEqual(m.medianMovesToMatch, {value: 5.5, n: 2});
  assert.deepEqual(m.abandonedByRound, {4: 1, 6: 1});
  assert.deepEqual(m.reviewedWeak, {n: 1, d: 2, rate: 0.5});
  assert.deepEqual(m.reviewedOneSided, {n: 1, d: 2, rate: 0.5});
  assert.equal(m.fallbackRate.n, 1);
  assert.equal(m.fallbackRate.d, 43);
  assert.equal(m.lowQualityRate.n, 1);
  assert.equal(m.repeatedOrInvalid.n, 1);
  assert.equal(m.latencyMs.n, 43);
  assert.equal(m.statuses.abandoned, 1);
  // Through the API, grouped by character and engine version, with sample sizes.
  const {record, rounds} = playLogged("log-game-7", ["garden", "violin"]);
  await api("/api/log/batch", {body: {games: [record], rounds}});
  const api7 = await api("/api/review/metrics", {token: TOKEN});
  assert.equal(api7.data.overall.games, 1);
  assert.deepEqual(api7.data.byCharacter.map(g => [g.key, g.games]), [["milo", 1]]);
  assert.deepEqual(api7.data.byEngine.map(g => [g.key, g.games]), [[ENGINE_VERSION, 1]]);
});

// ---------- player rating (1–5 stars after a Solo win) ----------

/** A won game: the player types the bot's committed word. */
function wonGame(id) {
  let game = startSoloGame({id, seed: 5, character: "gary", now: "2026-03-02T10:00:00.000Z"});
  const r = submitSoloWord(game, currentMove(game).hidden.b, "2026-03-02T10:00:20.000Z");
  game = r.game;
  return {game, round: roundRecord(game, r.move, r.decision, r.decisionMs)};
}
const meta = {appVersion: "test-app", engineVersion: ENGINE_VERSION, datasetVersion: DATASET_VERSION, config: ENGINE_CONFIG};
const ratingOf = async id => (await db.store.query("SELECT player_rating FROM bot_games WHERE game_id = $1", [id])).rows[0]?.player_rating ?? null;

test("rating: part of the won game's own record, 1–5 only, never for an unfinished game", () => {
  const {game} = wonGame("rate-shape");
  assert.equal(game.status, "MATCHED");
  assert.equal(gameRecord(game, meta).player_rating, null);
  assert.equal(gameRecord({...game, playerRating: 4}, meta).player_rating, 4);
  for (const bad of [0, 6, 2.5, "4", null]) assert.equal(gameRecord({...game, playerRating: bad}, meta).player_rating, null, String(bad));
  const playing = startSoloGame({id: "rate-open", seed: 1});
  assert.equal(gameRecord({...playing, playerRating: 5}, meta).player_rating, null, "only a won game carries a rating");
  assert.equal(cleanGame({...gameRecord({...game, playerRating: 3}, meta)}).player_rating, 3);
  assert.equal(cleanGame({...gameRecord({...game, playerRating: 3}, meta), player_rating: 9}).player_rating, null);
  assert.equal(cleanGame({...gameRecord(playing, meta), player_rating: 3}).player_rating, null);
});

test("rating: a game not uploaded yet carries its rating in the same upload; the server confirms it", async () => {
  const {game, round} = wonGame("rate-pending");
  const record = gameRecord({...game, playerRating: 4}, meta);
  const res = await api("/api/log/batch", {body: {games: [record], rounds: [round]}});
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.rated, ["rate-pending"]);
  assert.equal(await ratingOf("rate-pending"), 4);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_rounds WHERE game_id = ?", "rate-pending"), 1);
});

test("rating: a game already uploaded is updated in place (no duplicate game), once", async () => {
  const {game, round} = wonGame("rate-later");
  await api("/api/log/batch", {body: {games: [gameRecord(game, meta)], rounds: [round]}});
  assert.equal(await ratingOf("rate-later"), null);
  const res = await api("/api/log/batch", {body: {games: [gameRecord({...game, playerRating: 2}, meta)]}});
  assert.deepEqual(res.data.rated, ["rate-later"]);
  assert.equal(await ratingOf("rate-later"), 2);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_games WHERE game_id = ?", "rate-later"), 1);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_rounds WHERE game_id = ?", "rate-later"), 1);
  // A rating is given once: a later, different value never replaces it (but is still confirmed).
  const again = await api("/api/log/batch", {body: {games: [gameRecord({...game, playerRating: 5}, meta)]}});
  assert.deepEqual(again.data.rated, ["rate-later"]);
  assert.equal(await ratingOf("rate-later"), 2);
});

test("rating: without the rating column (migration not applied) games and rounds still log; the rating is not confirmed", async () => {
  await db.store.query("ALTER TABLE bot_games DROP COLUMN player_rating");
  const {game, round} = wonGame("rate-nocol");
  const res = await api("/api/log/batch", {body: {games: [gameRecord({...game, playerRating: 5}, meta)], rounds: [round]}});
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.rated, [], "not confirmed, so the device keeps it queued");
  assert.equal(res.data.ratingUnavailable, true);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_games WHERE game_id = ?", "rate-nocol"), 1, "the game is stored");
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM bot_rounds WHERE game_id = ?", "rate-nocol"), 1, "and its round");
});

test("rating: review shows it on the game, in JSON and CSV exports (last column), and in the metrics", async () => {
  const {game, round} = wonGame("rate-review");
  await api("/api/log/batch", {body: {games: [gameRecord({...game, playerRating: 4}, meta)], rounds: [round]}});
  const list = await api("/api/review/games", {token: TOKEN});
  assert.equal(list.data.games.find(g => g.game_id === "rate-review").player_rating, 4);
  const detail = await api("/api/review/game?id=rate-review", {token: TOKEN});
  assert.equal(detail.data.game.player_rating, 4);
  const json = await api("/api/review/export?format=json", {token: TOKEN});
  assert.equal(json.data.games.find(g => g.game_id === "rate-review").player_rating, 4);
  const csv = await api("/api/review/export?format=csv", {token: TOKEN});
  const [header, ...rows] = csv.data.trim().split("\r\n");
  assert.equal(header.split(",").at(-1), "player_rating");
  assert.deepEqual(header.split(",").slice(0, CSV_COLUMNS.length - 1), CSV_COLUMNS.slice(0, -1), "older columns keep their positions");
  assert.equal(rows.find(r => r.startsWith("rate-review,")).split(",").at(-1), "4");
  const metrics = await api("/api/review/metrics", {token: TOKEN});
  assert.deepEqual({mean: metrics.data.overall.playerRating.mean, n: metrics.data.overall.playerRating.n}, {mean: 4, n: 1});
});

test("player input diagnostics: how the word was read is logged with the round (short known fields only) and kept on the server", async () => {
  const {game, round} = wonGame("input-log");
  const input = {original: "chikcen", submitted: "chicken", normalized: "chicken", understood_as: "chicken", method: "exact", confidence: "certain",
    fuzzy: false, spacing: false, morphology: false, unresolved: false, suggestion: "chicken", suggestion_confidence: "high", suggestion_accepted: true,
    email: "nobody@example.com", extra: "x".repeat(500)};
  const record = {...round, player_input: input};
  const clean = cleanRound(record).player_input;
  assert.equal(clean.original, "chikcen");
  assert.equal(clean.suggestion_accepted, true);
  assert.equal(clean.email, undefined, "unknown fields are dropped");
  assert.equal(clean.extra, undefined);
  await api("/api/log/batch", {body: {games: [gameRecord(game, meta)], rounds: [record]}});
  const stored = (await db.store.query("SELECT decision FROM bot_rounds WHERE game_id = $1", ["input-log"])).rows[0].decision;
  assert.equal(stored.playerInput.original, "chikcen");
  assert.equal(stored.playerInput.suggestion_accepted, true);
  assert.equal(stored.selected, round.bot_word, "the bot's decision record is unchanged");
});
