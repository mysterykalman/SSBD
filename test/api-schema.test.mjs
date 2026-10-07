// Production D1 databases may carry columns added by earlier releases. Every INSERT names its
// columns, so extra columns never break play; and real database failures are reported as such
// instead of being retried away and turned into a generic error.
import {test} from "node:test";
import assert from "node:assert/strict";
import {createD1} from "../scripts/d1-sqlite.mjs";

/** A fresh API module per database (the schema setup is memoised per module, as in a Worker). */
async function setup(sql) {
  const {handleApi} = await import(`../src/server/api.js?${Math.random()}`);
  const env = {DB: createD1(":memory:")};
  if (sql) env.DB.raw.exec(sql);
  const call = async (path, body) => {
    const res = await handleApi(new Request(`http://x${path}`, body ? {method: "POST", body: JSON.stringify(body), headers: {"content-type": "application/json"}} : {}), env);
    return {status: res.status, ...(await res.json())};
  };
  return {call, env};
}

// Tables shaped like an older production database: same columns plus extras.
const EXTRA_COLUMNS = `
  CREATE TABLE players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, avatar TEXT, pin TEXT DEFAULT NULL);
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
  // A join that fails for a reason other than a race is not mislabelled as "game full".
  const join = await setup("CREATE TABLE game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, required_extra TEXT NOT NULL, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot))");
  const host = await join.call("/api/player", {display_name: "Host"});
  console.error = () => {};
  try {
    const created = await join.call("/api/games", {player_id: host.id, solo: false});
    assert.equal(created.status, 500);
    assert.equal(created.code, "GAME_CREATE_FAILED");
  } finally {
    console.error = original;
  }
});

test("recovery-code collisions are still retried with a new code", async () => {
  const {call, env} = await setup();
  await call("/api/health");
  // Fill every SAM-xxxx code but one, so the server has to retry until it finds the free one.
  const insert = env.DB.raw.prepare("INSERT INTO players (id,display_name,recovery_code,created_at,last_seen_at) VALUES(?,?,?,?,?)");
  for (let n = 1000; n <= 9999; n++) if (n !== 4242) insert.run(`p${n}`, "Sam", `SAM-${n}`, "t", "t");
  const originalRandom = Math.random;
  const sequence = [0.1, 0.2, 0.3, (4242 - 1000) / 9000 + 1e-9];
  Math.random = () => sequence.shift() ?? originalRandom();
  try {
    const player = await call("/api/player", {display_name: "Sam"});
    assert.equal(player.status, 200);
    assert.equal(player.recovery_code, "SAM-4242");
  } finally {
    Math.random = originalRandom;
  }
});
