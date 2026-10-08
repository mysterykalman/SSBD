// Race and idempotency tests against a real PostgreSQL. Requests run truly in
// parallel: each "instance" has its own connection pool (like two warm Vercel
// Function instances), and every race is repeated. State is checked in the
// database directly, never through GET /api/game (which would repair a stuck
// game and hide a lost reveal).
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {createStore} from "../src/server/db.js";
import {randomJoinCode} from "../src/shared/codes.js";
import {caller, freshDatabase} from "./support/db.mjs";

let db, other, callA, callB;
beforeEach(async () => {
  db = await freshDatabase({pool: 12});
  other = createStore(db.url, {max: 12}); // a second, independent instance
  callA = caller(handleApi, () => ({store: db.store}));
  callB = caller(handleApi, () => ({store: other}));
});
afterEach(async () => {
  await other.end();
  await db.end();
});

const either = i => (i % 2 ? callB : callA);
const player = (name, call = callA) => call("/api/player", {display_name: name});
const submit = (call, gameId, playerId, word, move) => call("/api/submit", {game_id: gameId, player_id: playerId, word, move});

async function familyGame() {
  const ana = await player("Ana"), ben = await player("Ben");
  const created = await callA("/api/games", {player_id: ana.id, solo: false});
  return {ana, ben, id: created.id, code: created.join_code};
}
async function activeGame() {
  const g = await familyGame();
  const joined = await callB("/api/games/join", {player_id: g.ben.id, join_code: g.code});
  assert.equal(joined.id, g.id);
  return g;
}

test("simultaneous joins: one seat, one PLAYER_JOINED, everyone else told the game is full", async () => {
  for (let round = 0; round < 8; round++) {
    const g = await familyGame();
    const joiners = await Promise.all(Array.from({length: 8}, (_, i) => player(`J${i}`, either(i))));
    const results = await Promise.all(joiners.map((p, i) => either(i)("/api/games/join", {player_id: p.id, join_code: g.code})));
    assert.equal(results.filter(r => r.status === 200 && r.id === g.id).length, 1, JSON.stringify(results.map(r => r.code || r.status)));
    assert.equal(results.filter(r => r.code === "GAME_FULL").length, 7);
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", g.id), 2);
    assert.equal((await db.get("SELECT status FROM games WHERE id = ?", g.id)).status, "ACTIVE");
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'PLAYER_JOINED'", g.id), 1);
  }
});

test("one player joining many times at once is idempotent", async () => {
  const g = await familyGame();
  const results = await Promise.all(Array.from({length: 10}, (_, i) => either(i)("/api/games/join", {player_id: g.ben.id, join_code: g.code})));
  for (const r of results) assert.equal(r.id, g.id, JSON.stringify(r));
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", g.id), 2);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE kind = 'PLAYER_JOINED'"), 1);
});

test("simultaneous submissions by both players always reveal, exactly once, without any later read", async () => {
  const games = await Promise.all(Array.from({length: 20}, () => activeGame()));
  const results = await Promise.all(games.flatMap(g => [submit(callA, g.id, g.ana.id, "sun", 1), submit(callB, g.id, g.ben.id, "moon", 1)]));
  for (const r of results) assert.equal(r.ok, true, JSON.stringify(r));
  for (const [i, g] of games.entries()) {
    // Straight from the database: no GET (which would repair a stuck move) has happened.
    const rounds = await db.all("SELECT round_number, status, previous_a, previous_b, created_at, revealed_at FROM rounds WHERE game_id = ? ORDER BY round_number", g.id);
    assert.equal(rounds.length, 2, `game ${i}: the move was revealed and the next one opened`);
    assert.equal(rounds[0].status, "REVEALED");
    assert.deepEqual([rounds[1].previous_a, rounds[1].previous_b], ["sun", "moon"]);
    assert.equal(rounds[1].created_at, rounds[0].revealed_at, "closing and opening happened in one transaction");
    assert.equal((await db.get("SELECT round_number FROM games WHERE id = ?", g.id)).round_number, 2);
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'READY_TO_REVEAL'", g.id), 2);
    // The submission that landed second saw both words and answered with the revealed move.
    const pair = results.slice(i * 2, i * 2 + 2);
    assert.ok(pair.some(r => r.game.moves[0].status === "REVEALED"), `game ${i}: someone saw the reveal`);
  }
});

test("conflicting duplicate submissions by one player: exactly one word is stored", async () => {
  for (let round = 0; round < 10; round++) {
    const g = await activeGame();
    const words = ["apple", "pear", "plum", "fig", "kiwi", "lime"];
    const results = await Promise.all(words.map((w, i) => submit(either(i), g.id, g.ana.id, w, 1)));
    const stored = await db.all("SELECT word FROM submissions WHERE round_id = ?", `${g.id}:1`);
    assert.equal(stored.length, 1);
    for (const r of results) {
      if (r.ok) assert.equal(r.game.moves[0].mine, stored[0].word);
      else assert.equal(r.code, "ALREADY_LOCKED", JSON.stringify(r));
    }
    assert.equal(results.filter(r => r.ok).length, 1, "only the stored word reports success");
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE kind = 'YOUR_TURN' AND game_id = ?", g.id), 1);
  }
});

test("reveal race: many requests finishing the same move close it once, open one next move, notify once", async () => {
  for (const [a, b, status] of [["Rain", "Cloud", "REVEALED"], ["Pizza", "pizza", "MATCHED"]]) {
    const g = await activeGame();
    // Both words stored, nothing revealed yet (as if both submit requests died right after saving).
    await db.run("INSERT INTO submissions (round_id,player_id,word,submitted_at) VALUES(?,?,?,?),(?,?,?,?)", `${g.id}:1`, g.ana.id, a, "2026-01-01", `${g.id}:1`, g.ben.id, b, "2026-01-01");
    const reads = await Promise.all(Array.from({length: 16}, (_, i) => either(i)(`/api/game?id=${g.id}&player_id=${i % 2 ? g.ben.id : g.ana.id}`)));
    for (const r of reads) assert.equal(r.game.moves[0].status, status);
    const rounds = await db.all("SELECT status, created_at, revealed_at FROM rounds WHERE game_id = ? ORDER BY round_number", g.id);
    if (status === "REVEALED") {
      assert.equal(rounds.length, 2);
      assert.equal(rounds[1].created_at, rounds[0].revealed_at);
      assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'READY_TO_REVEAL'", g.id), 2);
    } else {
      assert.equal(rounds.length, 1);
      assert.equal((await db.get("SELECT status FROM games WHERE id = ?", g.id)).status, "MATCHED");
      assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'GAME_COMPLETE'", g.id), 2);
    }
    // Every notification of this reveal carries the one reveal time: one transaction wrote them.
    const times = await db.all("SELECT DISTINCT created_at FROM notifications WHERE game_id = ? AND kind <> 'PLAYER_JOINED'", g.id);
    assert.deepEqual(times.map(t => t.created_at), [rounds[0].revealed_at]);
  }
});

test("retries after lost responses change nothing: same game, same rows, same notifications", async () => {
  const g = await activeGame();
  await Promise.all([submit(callA, g.id, g.ana.id, "sun", 1), submit(callB, g.id, g.ben.id, "moon", 1)]);
  const snapshot = async () => JSON.stringify({
    rounds: await db.all("SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number", g.id),
    subs: await db.all("SELECT * FROM submissions ORDER BY round_id, player_id"),
    notes: await db.all("SELECT id, read_at, created_at FROM notifications ORDER BY id"),
    game: await db.get("SELECT * FROM games WHERE id = ?", g.id)
  });
  const before = await snapshot();
  const retries = await Promise.all(Array.from({length: 12}, (_, i) => (i % 2
    ? submit(either(i), g.id, g.ben.id, "MOON", 1)
    : submit(either(i), g.id, g.ana.id, "sun", 1))));
  for (const r of retries) {
    assert.equal(r.ok, true);
    assert.equal(r.duplicate, true);
  }
  const joins = await Promise.all(Array.from({length: 6}, (_, i) => either(i)("/api/games/join", {player_id: g.ben.id, join_code: g.code})));
  for (const r of joins) assert.equal(r.id, g.id);
  assert.equal(await snapshot(), before);
});

test("hidden until reveal: while one player submits, the other never sees the word", async () => {
  const g = await activeGame();
  const polls = Array.from({length: 20}, (_, i) => either(i)(`/api/game?id=${g.id}&player_id=${g.ben.id}`));
  const [saved, ...views] = await Promise.all([submit(callA, g.id, g.ana.id, "zeppelin", 1), ...polls]);
  assert.equal(saved.ok, true);
  for (const v of views) assert.doesNotMatch(JSON.stringify(v), /zeppelin/i);
  const after = await callB(`/api/game?id=${g.id}&player_id=${g.ben.id}`);
  assert.equal(after.game.moves[0].otherLocked, true);
  assert.doesNotMatch(JSON.stringify(after), /zeppelin/i);
  assert.doesNotMatch(JSON.stringify(await callB(`/api/notifications?player_id=${g.ben.id}`)), /zeppelin/i);
});

test("mark-read races: every row read once, the first read time kept, only the owner's rows", async () => {
  const g = await activeGame();
  for (let i = 0; i < 30; i++) await db.run("INSERT INTO notifications (id,player_id,game_id,kind,message,read_at,created_at) VALUES(?,?,?,?,?,NULL,?)", `${g.id}:x${i}:${g.ana.id}`, g.ana.id, g.id, "YOUR_TURN", "m", `2026-02-01T00:00:${String(i).padStart(2, "0")}.000Z`);
  const firstId = `${g.id}:x0:${g.ana.id}`;
  await callA("/api/notifications/read", {player_id: g.ana.id, ids: [firstId]});
  const firstRead = (await db.get("SELECT read_at FROM notifications WHERE id = ?", firstId)).read_at;
  const ids = Array.from({length: 30}, (_, i) => `${g.id}:x${i}:${g.ana.id}`);
  const results = await Promise.all(Array.from({length: 12}, (_, i) => either(i)("/api/notifications/read", i % 3 === 0
    ? {player_id: g.ana.id, all: true}
    : {player_id: g.ana.id, ids: ids.slice(i, i + 12)})));
  for (const r of results) assert.equal(r.ok, true);
  // Ben marking Ana's ids read changes nothing.
  await callB("/api/notifications/read", {player_id: g.ben.id, ids});
  assert.equal((await db.get("SELECT read_at FROM notifications WHERE id = ?", firstId)).read_at, firstRead, "first read time kept");
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE player_id = ? AND read_at IS NULL", g.ana.id), 0);
  assert.equal((await callA(`/api/notifications?player_id=${g.ana.id}`)).unread, 0);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE player_id = ? AND read_at IS NOT NULL", g.ben.id), 0);
});

test("rematch race: both players and their retries get one rematch game, created once", async () => {
  for (let round = 0; round < 6; round++) {
    const g = await activeGame();
    await Promise.all([submit(callA, g.id, g.ana.id, "tea", 1), submit(callB, g.id, g.ben.id, "TEA", 1)]);
    assert.equal((await db.get("SELECT status FROM games WHERE id = ?", g.id)).status, "MATCHED");
    const results = await Promise.all(Array.from({length: 10}, (_, i) => either(i)("/api/games/rematch", {player_id: i % 2 ? g.ben.id : g.ana.id, game_id: g.id})));
    const ids = new Set(results.map(r => r.id));
    assert.equal(ids.size, 1, JSON.stringify(results));
    assert.equal(results.filter(r => r.existing === false).length, 1, "created exactly once");
    assert.equal(new Set(results.map(r => r.join_code)).size, 1);
    const [id] = ids;
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM games WHERE rematch_of = ?", g.id), 1);
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", id), 2);
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", id), 1);
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'REMATCH'", id), 1);
  }
});

test("join-code and recovery-code collisions between simultaneous requests are retried", async () => {
  const codesFor = list => ({joinCode: () => list.shift() ?? randomJoinCode()});
  const ana = await player("Ana");
  for (let round = 0; round < 5; round++) {
    const x = codesFor([`SM${10 + round}`, `XA${10 + round}`]), y = codesFor([`SM${10 + round}`, `YB${10 + round}`]);
    const callX = caller(handleApi, () => ({store: db.store, codes: x})), callY = caller(handleApi, () => ({store: other, codes: y}));
    const [a, b] = await Promise.all([callX("/api/games", {player_id: ana.id, solo: false}), callY("/api/games", {player_id: ana.id, solo: false})]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.notEqual(a.join_code, b.join_code);
    assert.ok([a.join_code, b.join_code].includes(`SM${10 + round}`), "one of them got the contested code");
  }
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds"), 10, "no half-made games");
  for (let round = 0; round < 5; round++) {
    const digits = () => { const list = [5000 + round, 6000 + round]; return () => list.shift() ?? 7000 + round; };
    const pX = caller(handleApi, () => ({store: db.store, codes: {recoveryDigits: digits()}}));
    const pY = caller(handleApi, () => ({store: other, codes: {recoveryDigits: digits()}}));
    const [s1, s2] = await Promise.all([pX("/api/player", {display_name: "Sam"}), pY("/api/player", {display_name: "Sam"})]);
    assert.equal(s1.status, 200);
    assert.equal(s2.status, 200);
    assert.notEqual(s1.recovery_code, s2.recovery_code);
    assert.equal((await callA("/api/player/recover", {recovery_code: s1.recovery_code})).id, s1.id);
    assert.equal((await callB("/api/player/recover", {recovery_code: s2.recovery_code.toLowerCase()})).id, s2.id);
  }
});

test("a whole game played with both players racing every move ends exactly once", async () => {
  const g = await activeGame();
  const words = [["acorn", "maple"], ["forest", "leaf"], ["autumn", "tree"], ["season", "fall"], ["same", "same"]];
  for (const [n, [a, b]] of words.entries()) {
    const [x, y] = await Promise.all([submit(callA, g.id, g.ana.id, a, n + 1), submit(callB, g.id, g.ben.id, b, n + 1)]);
    assert.ok(x.ok && y.ok, JSON.stringify([x, y]));
  }
  assert.equal((await db.get("SELECT status, round_number FROM games WHERE id = ?", g.id)).status, "MATCHED");
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", g.id), 5);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ? AND status = 'OPEN'", g.id), 0);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'READY_TO_REVEAL'", g.id), 8);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'GAME_COMPLETE'", g.id), 2);
});
