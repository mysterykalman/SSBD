import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {createD1} from "../scripts/d1-sqlite.mjs";

let handleApi, env;
beforeEach(async () => {
  ({handleApi} = await import(`../src/server/api.js?${Math.random()}`));
  env = {DB: createD1(":memory:")};
});

async function call(path, body) {
  const res = await handleApi(new Request(`http://x${path}`, body ? {method: "POST", body: JSON.stringify(body), headers: {"content-type": "application/json"}} : {}), env);
  return {status: res.status, ...(await res.json())};
}
const player = async name => call("/api/player", {display_name: name});
const view = (gameId, playerId) => call(`/api/game?id=${gameId}&player_id=${playerId}`);

async function familyGame() {
  const ana = await player("Ana"), ben = await player("Ben");
  const created = await call("/api/games", {player_id: ana.id, solo: false, language: "en"});
  return {ana, ben, created};
}

test("create, join, private submissions, simultaneous reveal and next prompt", async () => {
  const {ana, ben, created} = await familyGame();
  let a = await view(created.id, ana.id);
  assert.equal(a.game.status, "WAITING");
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "sun", move: 1})).code, "WAITING_FOR_PLAYER");

  const joined = await call("/api/games/join", {player_id: ben.id, join_code: created.join_code.toLowerCase()});
  assert.equal(joined.id, created.id);
  assert.equal((await call("/api/games/join", {player_id: ben.id, join_code: created.join_code})).id, created.id, "re-joining is idempotent");
  const carl = await player("Carl");
  assert.equal((await call("/api/games/join", {player_id: carl.id, join_code: created.join_code})).code, "GAME_FULL");
  assert.equal((await view(created.id, carl.id)).status, 403);

  const s1 = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "Sun", move: 1});
  assert.equal(s1.ok, true);
  assert.equal(s1.game.moves[0].mine, "Sun");
  assert.equal(s1.game.moves[0].words, null);

  // Before reveal, Ben must not see Ana's word anywhere.
  const b = await view(created.id, ben.id);
  assert.equal(b.game.moves[0].otherLocked, true);
  assert.equal(b.game.moves[0].mine, null);
  assert.ok(!JSON.stringify(b).toLowerCase().includes("sun"), "Ana's word leaked to Ben before reveal");

  const s2 = await call("/api/submit", {game_id: created.id, player_id: ben.id, word: "Moon", move: 1});
  assert.equal(s2.game.moves[0].status, "REVEALED");
  assert.deepEqual(s2.game.moves[0].words, {a: "Sun", b: "Moon"});
  assert.deepEqual(s2.game.moves[1].prompts, ["Sun", "Moon"], "next prompt is exactly the reveal, in slot order");
  a = await view(created.id, ana.id);
  assert.deepEqual(a.game.moves[1].prompts, ["Sun", "Moon"]);
  assert.equal(a.game.you.side, "a");
  assert.equal(s2.game.you.side, "b");
});

test("duplicate and retried submissions are idempotent", async () => {
  const {ana, ben, created} = await familyGame();
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  const first = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "star", move: 1});
  const retry = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "STAR", move: 1});
  assert.equal(retry.ok, true);
  assert.equal(retry.duplicate, true);
  const changed = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "planet", move: 1});
  assert.equal(changed.code, "ALREADY_LOCKED");
  await call("/api/submit", {game_id: created.id, player_id: ben.id, word: "sky", move: 1});
  // A late retry of move 1 after the reveal returns the current state instead of failing.
  const late = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "star", move: 1});
  assert.equal(late.ok, true);
  assert.equal(late.game.moves.length, 2);
  assert.ok(first.ok);
});

test("concurrent final submissions reveal exactly once", async () => {
  const {ana, ben, created} = await familyGame();
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  const [x, y] = await Promise.all([
    call("/api/submit", {game_id: created.id, player_id: ana.id, word: "rain", move: 1}),
    call("/api/submit", {game_id: created.id, player_id: ben.id, word: "cloud", move: 1})
  ]);
  assert.ok(x.ok && y.ok);
  const final = await view(created.id, ana.id);
  assert.equal(final.game.moves.length, 2);
  assert.deepEqual(final.game.moves[1].prompts, ["rain", "cloud"]);
  const rounds = env.DB.raw.prepare("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?").get(created.id);
  assert.equal(rounds.n, 2);
});

test("word rules: invalid input and repeated words are rejected with codes", async () => {
  const {ana, ben, created} = await familyGame();
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "   ", move: 1})).code, "EMPTY");
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "!!!", move: 1})).code, "EMPTY");
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "x".repeat(30), move: 1})).code, "TOO_LONG");
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "abc1", move: 1})).code, "INVALID_CHARACTERS");
  await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "dog", move: 1});
  await call("/api/submit", {game_id: created.id, player_id: ben.id, word: "cat", move: 1});
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "Dog", move: 2})).code, "SAME_AS_LAST");
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "cat", move: 2})).ok, true, "the other side's word is allowed");
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ben.id, word: "pet", move: 1})).ok, true, "stale move retry returns state");
});

test("a match ends the game and further submissions are refused", async () => {
  const {ana, ben, created} = await familyGame();
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "Pizza", move: 1});
  const r = await call("/api/submit", {game_id: created.id, player_id: ben.id, word: "pizza!", move: 1});
  assert.equal(r.game.status, "MATCHED");
  assert.equal(r.game.moves.length, 1);
  assert.equal((await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "cheese", move: 2})).code, "GAME_OVER");
});

test("20 moves without a match exhausts the game", async () => {
  const {ana, ben, created} = await familyGame();
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  let last;
  for (let move = 1; move <= 20; move++) {
    await call("/api/submit", {game_id: created.id, player_id: ana.id, word: `aa${String.fromCharCode(96 + move)}`, move});
    last = await call("/api/submit", {game_id: created.id, player_id: ben.id, word: `bb${String.fromCharCode(96 + move)}`, move});
  }
  assert.equal(last.game.status, "EXHAUSTED");
  assert.equal(last.game.moves.length, 20);
});

test("legacy D1 Solo games still play, and the bot never sees the player's word", async () => {
  const ana = await player("Ana");
  const created = await call("/api/games", {player_id: ana.id, solo: true, language: "en"});
  const r = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "sun", move: 1});
  assert.equal(r.game.kind, "legacy-solo");
  assert.equal(r.game.moves[0].status === "OPEN", false);
  const used = new Set(["sun", r.game.moves[0].words.b.toLowerCase()]);
  if (r.game.status === "ACTIVE") {
    const r2 = await call("/api/submit", {game_id: created.id, player_id: ana.id, word: "sky", move: 2});
    assert.ok(!used.has(r2.game.moves[1].words.b.toLowerCase()), "bot reused a game word");
  }
});

test("existing rows from earlier releases (uppercase words, uuid round ids) still load", async () => {
  const db = env.DB.raw;
  await call("/api/health");
  db.exec(`INSERT INTO players VALUES('p1','Old','OLD-1111','2025-01-01','2025-01-01');
    INSERT INTO players VALUES('p2','Timer','TIM-2222','2025-01-01','2025-01-01');
    INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES('g1','ABCD-12','ACTIVE',2,'2025-01-01','2025-01-01','en');
    INSERT INTO game_players VALUES('g1','p1',1,'2025-01-01'); INSERT INTO game_players VALUES('g1','p2',2,'2025-01-01');
    INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES('r-uuid-1','g1',1,NULL,NULL,'REVEALED','2025-01-01','2025-01-01');
    INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES('r-uuid-2','g1',2,'SUN','MOON','OPEN','2025-01-01',NULL);
    INSERT INTO submissions VALUES('r-uuid-1','p1','SUN','2025-01-01'); INSERT INTO submissions VALUES('r-uuid-1','p2','MOON','2025-01-01');`);
  const v = await view("g1", "p1");
  assert.deepEqual(v.game.moves[1].prompts, ["SUN", "MOON"]);
  assert.equal((await call("/api/submit", {game_id: "g1", player_id: "p1", word: "sun", move: 2})).code, "SAME_AS_LAST");
  await call("/api/submit", {game_id: "g1", player_id: "p1", word: "sky", move: 2});
  const done = await call("/api/submit", {game_id: "g1", player_id: "p2", word: "night", move: 2});
  assert.deepEqual(done.game.moves[2].prompts, ["sky", "night"]);
  const dash = await call("/api/dashboard?player_id=p1");
  assert.equal(dash.games[0].opponent_name, "Timer");
  assert.equal((await call("/api/player/recover", {recovery_code: "old-1111"})).id, "p1");
});
