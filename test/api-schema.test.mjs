// Databases that already hold tables (for example with columns added by an earlier release):
// every INSERT names its columns, so extra columns never break play, and the migration only
// adds what is missing. Real database failures are reported as such instead of being retried
// away and turned into a generic error. Runs against a real PostgreSQL.
import {test} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {caller, freshDatabase} from "./support/db.mjs";

/** A database where `sql` ran first and the migrations second. */
async function setup(sql, codes) {
  const db = await freshDatabase({blank: true});
  if (sql) await db.exec(sql);
  await db.migrate();
  const env = {store: db.store, codes};
  return {call: caller(handleApi, () => env), env, db};
}

// Tables shaped like an older database: same columns plus extras.
const EXTRA_COLUMNS = `
  CREATE TABLE players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, avatar TEXT, pin TEXT DEFAULT NULL);
  CREATE TABLE games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, colour TEXT, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot));
  CREATE TABLE submissions (round_id TEXT NOT NULL, player_id TEXT NOT NULL, word TEXT NOT NULL, submitted_at TEXT NOT NULL, client TEXT, PRIMARY KEY(round_id, player_id));
  CREATE TABLE notifications (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, game_id TEXT, kind TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL, channel TEXT);`;

test("names save, and family create, join, play and notifications work on tables with extra columns", async () => {
  const {call} = await setup(EXTRA_COLUMNS);
  for (const name of ["Sam", "Élodie", "李雷", "O’Brien"]) {
    const player = await call("/api/player", {display_name: name});
    assert.equal(player.status, 200, `${name}: ${player.error}`);
    assert.equal(player.display_name, name);
    assert.match(player.recovery_code, /-\d{4}$/);
  }
  const ana = await call("/api/player", {display_name: "Ana"}), ben = await call("/api/player", {display_name: "Ben"});
  const game = await call("/api/games", {player_id: ana.id, solo: false, language: "en"});
  assert.equal(game.status, 200);
  const joined = await call("/api/games/join", {player_id: ben.id, join_code: game.join_code});
  assert.equal(joined.status, 200);
  assert.equal((await call("/api/submit", {game_id: game.id, player_id: ana.id, word: "rocket", move: 1})).ok, true);
  const reveal = await call("/api/submit", {game_id: game.id, player_id: ben.id, word: "planet", move: 1});
  assert.equal(reveal.game.moves[0].status, "REVEALED");
  const notes = await call(`/api/notifications?player_id=${ana.id}`);
  assert.ok(notes.notifications.some(n => n.kind === "PLAYER_JOINED"));
  assert.equal((await call("/api/player/recover", {recovery_code: ana.recovery_code})).id, ana.id, "recovery codes still work");
});

test("a real database failure is reported with its own code, not retried into a generic error", async () => {
  // players table missing a column the app writes: not a collision, so no retry loop.
  const broken = await setup("CREATE TABLE players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL)");
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const player = await broken.call("/api/player", {display_name: "Sam"});
    assert.equal(player.status, 500);
    assert.equal(player.code, "PLAYER_CREATE_FAILED");
    assert.ok(errors.some(e => /player create failed/.test(e)), "the real error is logged");
  } finally {
    console.error = original;
  }
  // A create that fails for a reason other than a code collision is reported as such.
  const join = await setup("CREATE TABLE games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, required_extra TEXT NOT NULL, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot))");
  const host = await join.call("/api/player", {display_name: "Host"});
  console.error = () => {};
  try {
    const created = await join.call("/api/games", {player_id: host.id, solo: false});
    assert.equal(created.status, 500);
    assert.equal(created.code, "GAME_CREATE_FAILED");
    assert.equal(await join.db.count("SELECT COUNT(*) AS n FROM games"), 0, "the failed create left nothing behind");
  } finally {
    console.error = original;
  }
});

test("recovery-code collisions are retried with a new code", async () => {
  const digits = [1001, 1002, 1003, 4242];
  const {call, db} = await setup(null, {recoveryDigits: () => digits.shift() ?? 4242});
  // Every SAM-xxxx code but one is taken, so the server has to retry until it finds the free one.
  await db.exec("INSERT INTO players (id,display_name,recovery_code,created_at,last_seen_at) SELECT 'p' || n, 'Sam', 'SAM-' || n, 't', 't' FROM generate_series(1000, 9999) AS n WHERE n <> 4242");
  const player = await call("/api/player", {display_name: "Sam"});
  assert.equal(player.status, 200);
  assert.equal(player.recovery_code, "SAM-4242");
  assert.equal(digits.length, 0, "three collisions, then the free code");
  // When every attempt collides, the request fails cleanly instead of looping.
  const full = await setup(null, {recoveryDigits: () => 1000});
  await full.db.exec("INSERT INTO players (id,display_name,recovery_code,created_at,last_seen_at) VALUES('x','Sam','SAM-1000','t','t')");
  assert.equal((await full.call("/api/player", {display_name: "Sam"})).code, "PLAYER_CREATE_FAILED");
});

test("join-code collisions are retried with a new code (create and rematch)", async () => {
  const codes = ["TAKE-11", "TAKE-11", "FREE-22", "TAKE-11", "FREE-33"];
  const {call, db} = await setup(null, {joinCode: () => codes.shift() ?? "LAST-99"});
  const ana = await call("/api/player", {display_name: "Ana"}), ben = await call("/api/player", {display_name: "Ben"});
  const first = await call("/api/games", {player_id: ana.id, solo: false});
  assert.equal(first.join_code, "TAKE-11");
  const second = await call("/api/games", {player_id: ana.id, solo: false});
  assert.equal(second.join_code, "FREE-22", "the taken code was skipped");
  await call("/api/games/join", {player_id: ben.id, join_code: second.join_code});
  await call("/api/submit", {game_id: second.id, player_id: ana.id, word: "tea", move: 1});
  await call("/api/submit", {game_id: second.id, player_id: ben.id, word: "tea", move: 1});
  const r = await call("/api/games/rematch", {player_id: ben.id, game_id: second.id});
  assert.equal(r.status, 200);
  assert.equal(r.join_code, "FREE-33");
  assert.equal(r.existing, false);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM games"), 3);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds"), 3, "no half-created game from the collided attempts");
});
