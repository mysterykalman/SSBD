// Family-game API against a real PostgreSQL (one fresh, migrated database per test).
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {caller, freshDatabase} from "./support/db.mjs";

let env, db;
beforeEach(async () => {
  db = await freshDatabase();
  env = {store: db.store};
});
afterEach(() => db.end());

const call = caller(handleApi, () => env);
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
  const rounds = (await db.get("SELECT COUNT(*)::int AS n FROM rounds WHERE game_id = ?", created.id));
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
  await call("/api/health");
  await db.exec(`INSERT INTO players VALUES('p1','Old','OLD-1111','2025-01-01','2025-01-01');
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

// ---------- state integrity ----------

const submitAs = (gameId, playerId, word, move) => call("/api/submit", {game_id: gameId, player_id: playerId, word, move});
async function activeFamily() {
  const g = await familyGame();
  await call("/api/games/join", {player_id: g.ben.id, join_code: g.created.join_code});
  return g;
}

const VIEW_KEYS = ["kind", "id", "joinCode", "language", "status", "waitingForPlayer", "createdAt", "updatedAt", "maxMoves", "you", "opponent", "rematchId", "moves"].sort();
const MOVE_KEYS = ["number", "prompts", "status", "openedAt", "revealedAt", "words", "botQuality", "mine", "otherLocked"].sort();

test("view shape: family and legacy-solo kinds carry the fields the client reads", async () => {
  const {ana, ben, created} = await activeFamily();
  const fam = (await view(created.id, ben.id)).game;
  assert.deepEqual(Object.keys(fam).sort(), VIEW_KEYS);
  assert.deepEqual(Object.keys(fam.moves[0]).sort(), MOVE_KEYS);
  assert.equal(fam.kind, "family");
  assert.equal(fam.maxMoves, 20);
  assert.equal(fam.waitingForPlayer, false);
  assert.deepEqual(fam.you, {side: "b", name: "Ben"});
  assert.deepEqual(fam.opponent, {side: "a", bot: false, name: "Ana", joined: true});
  assert.equal(fam.moves[0].prompts, null);

  const solo = await call("/api/games", {player_id: ana.id, solo: true, language: "fr"});
  const leg = (await view(solo.id, ana.id)).game;
  assert.deepEqual(Object.keys(leg).sort(), VIEW_KEYS);
  assert.equal(leg.kind, "legacy-solo");
  assert.equal(leg.language, "fr");
  assert.equal(leg.waitingForPlayer, false);
  assert.deepEqual(leg.opponent, {side: "b", bot: true, name: null, joined: true});

  const waiting = await call("/api/games", {player_id: ana.id, solo: false});
  const w = (await view(waiting.id, ana.id)).game;
  assert.equal(w.kind, "family");
  assert.equal(w.waitingForPlayer, true);
  assert.deepEqual(w.opponent, {side: "b", bot: false, name: null, joined: false});
});

test("non-members get 403 and unknown games 404, for reads and submissions", async () => {
  const {created} = await activeFamily();
  const eve = await player("Eve");
  assert.equal((await view(created.id, eve.id)).status, 403);
  assert.equal((await view(created.id, "")).status, 403);
  const s = await submitAs(created.id, eve.id, "hello", 1);
  assert.equal(s.status, 403);
  assert.equal(s.code, "NOT_A_MEMBER");
  assert.equal(s.game, undefined);
  assert.equal((await view("nope", eve.id)).status, 404);
  assert.equal((await submitAs("nope", eve.id, "hello", 1)).status, 404);
});

test("before reveal, neither player's word appears in any response the other player gets", async () => {
  const {ana, ben, created} = await activeFamily();
  for (let move = 1; move <= 4; move++) {
    const wa = `alpha${"q".repeat(move)}`, wb = `beta${"z".repeat(move)}`;
    const leaks = [];
    const s1 = await submitAs(created.id, ana.id, wa, move);
    assert.equal(s1.game.moves.at(-1).mine, wa);
    assert.equal(s1.game.moves.at(-1).words, null);
    leaks.push(await view(created.id, ben.id), await call(`/api/dashboard?player_id=${ben.id}`));
    // Ben's mistakes and stale retries must not leak Ana's word either.
    leaks.push(await submitAs(created.id, ben.id, "", move), await submitAs(created.id, ben.id, "abc1", move));
    if (move > 1) leaks.push(await submitAs(created.id, ben.id, `beta${"z".repeat(move - 1)}`, move));
    if (move > 1) leaks.push(await submitAs(created.id, ben.id, "whatever", move - 1));
    for (const r of leaks) assert.ok(!JSON.stringify(r).toLowerCase().includes(wa), `move ${move}: Ana's word leaked: ${JSON.stringify(r)}`);
    const b = (await view(created.id, ben.id)).game.moves.at(-1);
    assert.equal(b.otherLocked, true);
    assert.equal(b.mine, null);
    const s2 = await submitAs(created.id, ben.id, wb, move);
    assert.deepEqual(s2.game.moves[move - 1].words, {a: wa, b: wb});
    assert.equal(s2.game.moves[move - 1].status, "REVEALED");
    assert.deepEqual(s2.game.moves[move].prompts, [wa, wb]);
    assert.equal(s2.game.moves.length, move + 1);
    s2.game.moves.forEach((m, i) => assert.equal(m.number, i + 1));
  }
});

test("a submission for a future move is stale and changes nothing", async () => {
  const {ana, created} = await activeFamily();
  const r = await submitAs(created.id, ana.id, "sun", 5);
  assert.equal(r.code, "STALE_MOVE");
  assert.equal((await view(created.id, ana.id)).game.moves[0].mine, null);
});

test("concurrent submissions by one player with different words: exactly one is locked", async () => {
  const {ana, created} = await activeFamily();
  const results = await Promise.all(["sun", "moon", "star"].map(w => submitAs(created.id, ana.id, w, 1)));
  const locked = (await view(created.id, ana.id)).game.moves[0].mine;
  assert.ok(["sun", "moon", "star"].includes(locked));
  for (const r of results) {
    if (r.ok) assert.equal(r.game.moves[0].mine, locked);
    else assert.equal(r.code, "ALREADY_LOCKED");
  }
  assert.equal((await db.get("SELECT COUNT(*)::int AS n FROM submissions")).n, 1);
});

test("concurrent final submissions that match end the game exactly once", async () => {
  const {ana, ben, created} = await activeFamily();
  const [x, y] = await Promise.all([submitAs(created.id, ana.id, "Pizza", 1), submitAs(created.id, ben.id, "pizza", 1)]);
  assert.ok(x.ok && y.ok);
  const final = (await view(created.id, ben.id)).game;
  assert.equal(final.status, "MATCHED");
  assert.equal(final.moves.length, 1);
  assert.equal((await db.get("SELECT COUNT(*)::int AS n FROM rounds WHERE game_id = ?", created.id)).n, 1);
  assert.equal((await db.get("SELECT COUNT(*)::int AS n FROM notifications WHERE game_id = ? AND kind = 'GAME_COMPLETE'", created.id)).n, 2);
});

test("join: idempotent (even concurrently), a full game is rejected, two racing joiners get one seat", async () => {
  const {ana, ben, created} = await familyGame();
  const again = await Promise.all([1, 2, 3].map(() => call("/api/games/join", {player_id: ben.id, join_code: created.join_code})));
  for (const r of again) assert.equal(r.id, created.id, JSON.stringify(r));
  assert.equal((await call("/api/games/join", {player_id: ana.id, join_code: created.join_code})).id, created.id, "the creator re-joining is a no-op");

  const second = await familyGame();
  const carl = await player("Carl");
  const race = await Promise.all([second.ben, carl].map(p => call("/api/games/join", {player_id: p.id, join_code: second.created.join_code})));
  assert.equal(race.filter(r => r.id === second.created.id).length, 1);
  assert.equal(race.filter(r => r.code === "GAME_FULL").length, 1);
  assert.equal((await db.get("SELECT COUNT(*)::int AS n FROM game_players WHERE game_id = ?", second.created.id)).n, 2);

  const solo = await call("/api/games", {player_id: ana.id, solo: true});
  assert.equal((await call("/api/games/join", {player_id: carl.id, join_code: solo.join_code})).code, "GAME_FULL", "legacy Solo games cannot be joined");
  assert.equal((await call("/api/games/join", {player_id: carl.id, join_code: "ZZZZ-00"})).code, "GAME_NOT_FOUND");
});

test("a move left with both words but unrevealed (interrupted request) is revealed once on the next read", async () => {
  const {ana, ben, created} = await activeFamily();
  (await db.run("INSERT INTO submissions VALUES(?,?,?,?)", `${created.id}:1`, ana.id, "Rain", "2026-01-01"));
  (await db.run("INSERT INTO submissions VALUES(?,?,?,?)", `${created.id}:1`, ben.id, "Cloud", "2026-01-01"));
  const [v1, v2] = await Promise.all([view(created.id, ana.id), view(created.id, ben.id)]);
  for (const v of [v1, v2]) {
    assert.equal(v.game.moves[0].status, "REVEALED");
    assert.deepEqual(v.game.moves[1].prompts, ["Rain", "Cloud"]);
  }
  assert.equal((await db.get("SELECT COUNT(*)::int AS n FROM rounds WHERE game_id = ?", created.id)).n, 2);
  assert.equal((await db.get("SELECT round_number FROM games WHERE id = ?", created.id)).round_number, 2);
  // A retry of the interrupted submission also succeeds.
  const retry = await submitAs(created.id, ana.id, "rain", 1);
  assert.equal(retry.ok, true);
  assert.equal(retry.game.moves.length, 2);
});

test("a retried submission finishes an interrupted reveal", async () => {
  const {ana, ben, created} = await activeFamily();
  (await db.run("INSERT INTO submissions VALUES(?,?,?,?)", `${created.id}:1`, ana.id, "Rain", "2026-01-01"));
  (await db.run("INSERT INTO submissions VALUES(?,?,?,?)", `${created.id}:1`, ben.id, "Rain", "2026-01-01"));
  const retry = await submitAs(created.id, ben.id, "rain", 1);
  assert.equal(retry.duplicate, true);
  assert.equal(retry.game.status, "MATCHED");
});

test("a legacy Solo move missing the bot's word is completed on the next read, without the bot seeing the player's word", async () => {
  const ana = await player("Ana");
  const created = await call("/api/games", {player_id: ana.id, solo: true});
  (await db.run("INSERT INTO submissions VALUES(?,?,?,?)", `${created.id}:1`, ana.id, "Sun", "2026-01-01"));
  const v = (await view(created.id, ana.id)).game;
  assert.notEqual(v.moves[0].status, "OPEN");
  assert.equal(v.moves[0].words.a, "Sun");
  assert.ok(v.moves[0].words.b);
  assert.ok(v.moves[0].botQuality);
});

test("legacy Solo games: the bot never repeats any word in the game across a whole game", async () => {
  const ana = await player("Ana");
  const created = await call("/api/games", {player_id: ana.id, solo: true});
  let game = (await view(created.id, ana.id)).game, n = 0;
  while (game.status === "ACTIVE" && n < 60) {
    n++;
    const move = game.moves.at(-1).number;
    const r = await submitAs(created.id, ana.id, `word${String.fromCharCode(97 + (n % 26))}${String.fromCharCode(97 + Math.floor(n / 26))}`, move);
    if (!r.ok) continue;
    game = r.game;
  }
  assert.notEqual(game.status, "ACTIVE");
  const seen = new Set();
  for (const m of game.moves) {
    const b = m.words.b.toLowerCase();
    assert.ok(!seen.has(b), `bot reused ${b}`);
    seen.add(m.words.a.toLowerCase());
    seen.add(b);
  }
  game.moves.forEach((m, i) => {
    assert.equal(m.number, i + 1);
    if (i) assert.deepEqual(m.prompts, [game.moves[i - 1].words.a, game.moves[i - 1].words.b]);
  });
});

test("rows from earlier releases: COMPLETE games and rounds read as MATCHED and refuse submissions", async () => {
  await call("/api/health");
  await db.exec(`INSERT INTO players VALUES('p1','Old','OLD-1111','2025-01-01','2025-01-01');
    INSERT INTO players VALUES('p2','Timer','TIM-2222','2025-01-01','2025-01-01');
    INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES('g9','WXYZ-99','COMPLETE',1,'2025-01-01','2025-01-01','en');
    INSERT INTO game_players VALUES('g9','p1',1,'2025-01-01'); INSERT INTO game_players VALUES('g9','p2',2,'2025-01-01');
    INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES('r-uuid-9','g9',1,NULL,NULL,'COMPLETE','2025-01-01','2025-01-01');
    INSERT INTO submissions VALUES('r-uuid-9','p1','CAT','2025-01-01'); INSERT INTO submissions VALUES('r-uuid-9','p2','CAT','2025-01-01');`);
  const v = (await view("g9", "p2")).game;
  assert.equal(v.status, "MATCHED");
  assert.equal(v.moves[0].status, "MATCHED");
  assert.deepEqual(v.moves[0].words, {a: "CAT", b: "CAT"});
  assert.equal((await submitAs("g9", "p1", "dog", 2)).code, "GAME_OVER");
  assert.equal((await call("/api/dashboard?player_id=p1")).games[0].status, "MATCHED");
});

test("a new family game starts fresh: no words from the previous game", async () => {
  const {ana, ben, created} = await activeFamily();
  await submitAs(created.id, ana.id, "lighthouse", 1);
  await submitAs(created.id, ben.id, "seagull", 1);
  const next = await call("/api/games", {player_id: ana.id, solo: false});
  await call("/api/games/join", {player_id: ben.id, join_code: next.join_code});
  const v = (await view(next.id, ana.id)).game;
  assert.equal(v.moves.length, 1);
  assert.equal(v.moves[0].prompts, null);
  assert.equal(v.moves[0].mine, null);
  assert.ok(!/lighthouse|seagull/i.test(JSON.stringify(v)));
  assert.equal((await submitAs(next.id, ana.id, "lighthouse", 1)).ok, true, "words from another game are not 'already used'");
});
