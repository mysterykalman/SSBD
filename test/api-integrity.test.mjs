// Family-game API: one-letter words, notifications, rematch, and data
// integrity for every critical transition (each checked against the stored rows).

import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi, rematchIdFor} from "../src/server/api.js";
import {caller, freshDatabase, withFaults} from "./support/db.mjs";

let env, db;
beforeEach(async () => {
  db = await freshDatabase();
  env = {store: db.store};
});
afterEach(() => db.end());

const call = caller(handleApi, () => env);
const player = name => call("/api/player", {display_name: name});
const view = (gameId, playerId) => call(`/api/game?id=${gameId}&player_id=${playerId}`);
const submitAs = (gameId, playerId, word, move) => call("/api/submit", {game_id: gameId, player_id: playerId, word, move});
const notes = playerId => call(`/api/notifications?player_id=${playerId}`);
const markRead = body => call("/api/notifications/read", body);
const rematch = (playerId, gameId) => call("/api/games/rematch", {player_id: playerId, game_id: gameId});
const count = (sql, ...args) => db.count(sql, ...args);

async function activeFamily(language = "en") {
  const ana = await player("Ana"), ben = await player("Ben");
  const created = await call("/api/games", {player_id: ana.id, solo: false, language});
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  return {ana, ben, created, id: created.id};
}
async function matchedFamily(language = "en") {
  const g = await activeFamily(language);
  await submitAs(g.id, g.ana.id, "sun", 1);
  await submitAs(g.id, g.ben.id, "moon", 1);
  await submitAs(g.id, g.ana.id, "sky", 2);
  await submitAs(g.id, g.ben.id, "Sky", 2);
  return g;
}

// ---------- one-letter words ----------

for (const language of ["en", "fr"]) {
  test(`family game (${language}): one-letter words are accepted, revealed and duplicate-checked`, async () => {
    const {ana, ben, id} = await activeFamily(language);
    const s1 = await submitAs(id, ana.id, " s ", 1);
    assert.equal(s1.ok, true, JSON.stringify(s1));
    assert.equal(s1.game.moves[0].mine, "s");
    const s2 = await submitAs(id, ben.id, "É", 1);
    assert.equal(s2.ok, true);
    assert.deepEqual(s2.game.moves[0].words, {a: "s", b: "É"});
    assert.deepEqual(s2.game.moves[1].prompts, ["s", "É"]);
    assert.equal(s2.game.language, language);

    const dupA = await submitAs(id, ana.id, "S", 2);
    assert.equal(dupA.status, 400);
    assert.equal(dupA.code, "SAME_AS_LAST");
    assert.equal((await submitAs(id, ben.id, "e", 2)).code, "SAME_AS_LAST", "é/É/e share one key");
    assert.equal((await submitAs(id, ana.id, "a", 2)).ok, true);
    assert.equal((await submitAs(id, ben.id, "I", 2)).ok, true);
    assert.equal((await submitAs(id, ana.id, "s", 3)).code, "ALREADY_USED");
    assert.equal((await submitAs(id, ana.id, "é", 3)).code, "ALREADY_USED", "the other side's word is used up too");
    assert.equal((await submitAs(id, ana.id, "I", 3)).code, "ALREADY_USED", "even the other side's latest word");
    assert.equal((await submitAs(id, ana.id, "o", 3)).ok, true);
    assert.equal((await submitAs(id, ben.id, "E", 3)).code, "ALREADY_USED", "Ben used É on move 1");
    assert.equal((await submitAs(id, ben.id, "ê", 3)).code, "ALREADY_USED", "ê, é and e share one key");
    assert.equal((await submitAs(id, ben.id, "S", 3)).code, "ALREADY_USED", "Ana's move-1 word is used up for Ben");
    const three = await submitAs(id, ben.id, "x", 3);
    assert.equal(three.game.moves[2].status, "REVEALED");
    assert.deepEqual(three.game.moves[3].prompts, ["o", "x"]);
    assert.equal((await submitAs(id, ana.id, "z", 4)).ok, true);
    const end = await submitAs(id, ben.id, "Z", 4);
    assert.equal(end.game.status, "MATCHED", "a one-letter match ends the game");
    assert.equal(await count("SELECT COUNT(*) AS n FROM submissions WHERE word = 's'"), 1);
  });
}

test("a retried one-letter submission is idempotent", async () => {
  const {ana, id} = await activeFamily();
  assert.equal((await submitAs(id, ana.id, "s", 1)).ok, true);
  const retry = await submitAs(id, ana.id, "S", 1);
  assert.equal(retry.ok, true);
  assert.equal(retry.duplicate, true);
  assert.equal((await submitAs(id, ana.id, "a", 1)).code, "ALREADY_LOCKED");
});

// ---------- notifications ----------

test("notifications: shape, kinds, newest first, unread count, deterministic ids", async () => {
  const {ana, ben, id} = await activeFamily();
  let n = await notes(ana.id);
  assert.equal(n.status, 200);
  assert.deepEqual(n.notifications.map(x => x.kind), ["PLAYER_JOINED"]);
  assert.deepEqual(Object.keys(n.notifications[0]).sort(), ["created_at", "game_id", "id", "kind", "opponent_name", "read_at"]);
  assert.equal(n.notifications[0].id, `${id}:joined:${ana.id}`);
  assert.equal(n.notifications[0].opponent_name, "Ben");
  assert.equal(n.notifications[0].read_at, null);
  assert.equal(n.unread, 1);
  assert.deepEqual((await notes(ben.id)).notifications, [], "the joiner is not notified of their own join");

  await submitAs(id, ana.id, "sun", 1);
  n = await notes(ben.id);
  assert.deepEqual(n.notifications.map(x => [x.kind, x.id, x.opponent_name]), [["YOUR_TURN", `${id}:turn-1:${ben.id}`, "Ana"]]);
  await submitAs(id, ben.id, "moon", 1);
  n = await notes(ben.id);
  assert.deepEqual(n.notifications.map(x => x.kind), ["READY_TO_REVEAL", "YOUR_TURN"], "newest first");
  assert.equal(n.unread, 2);
  assert.deepEqual((await notes(ana.id)).notifications.map(x => x.kind), ["READY_TO_REVEAL", "PLAYER_JOINED"]);

  // Retries and settle() re-runs never duplicate a notification.
  await submitAs(id, ana.id, "sun", 1);
  await submitAs(id, ben.id, "moon", 1);
  await Promise.all([view(id, ana.id), view(id, ben.id)]);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ?", id), 4);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE id = ?", `${id}:reveal-1:${ana.id}`), 1);
});

test("notifications: GAME_COMPLETE on a match, GAME_EXHAUSTED after 20 moves", async () => {
  const m = await matchedFamily();
  for (const p of [m.ana, m.ben]) {
    const n = await notes(p.id);
    assert.equal(n.notifications[0].kind, "GAME_COMPLETE");
    assert.equal(n.notifications[0].id, `${m.id}:end:${p.id}`);
  }
  const e = await activeFamily();
  for (let move = 1; move <= 20; move++) {
    await submitAs(e.id, e.ana.id, `aa${String.fromCharCode(96 + move)}`, move);
    await submitAs(e.id, e.ben.id, `bb${String.fromCharCode(96 + move)}`, move);
  }
  const n = await notes(e.ana.id);
  assert.equal(n.notifications[0].kind, "GAME_EXHAUSTED");
  assert.equal(n.notifications[0].game_id, e.id);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'GAME_EXHAUSTED'", e.id), 2);
});

test("notifications: legacy Solo (BOT) games never create or list any", async () => {
  const ana = await player("Ana");
  const solo = await call("/api/games", {player_id: ana.id, solo: true});
  for (let move = 1; move <= 3; move++) {
    const r = await submitAs(solo.id, ana.id, `qq${String.fromCharCode(96 + move)}zv`, move);
    if (r.game.status !== "ACTIVE") break;
  }
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ?", solo.id), 0);
  // Rows written for legacy Solo games by earlier releases stay hidden.
  (await db.run("INSERT INTO notifications VALUES(?,?,?,?,?,?,?)", `${solo.id}:reveal-1:${ana.id}`, ana.id, solo.id, "READY_TO_REVEAL", "old", null, "2025-01-01"));
  (await db.run("INSERT INTO notifications VALUES(?,?,?,?,?,?,?)", "orphan", ana.id, null, "INFO", "old", null, "2025-01-01"));
  const n = await notes(ana.id);
  assert.deepEqual(n.notifications, []);
  assert.equal(n.unread, 0);
  assert.deepEqual((await call(`/api/dashboard?player_id=${ana.id}`)).notifications, []);
});

test("notifications/read: by ids or all, only the owner's rows, first read time kept", async () => {
  const {ana, ben, id} = await activeFamily();
  await submitAs(id, ana.id, "sun", 1);
  await submitAs(id, ben.id, "moon", 1);
  await submitAs(id, ben.id, "star", 2);
  const benNotes = (await notes(ben.id)).notifications;
  const anaNotes = (await notes(ana.id)).notifications;
  assert.equal(anaNotes.length, 3);

  // Ben cannot mark Ana's notifications.
  const foreign = await markRead({player_id: ben.id, ids: anaNotes.map(x => x.id)});
  assert.deepEqual(foreign, {status: 200, ok: true, unread: benNotes.length});
  assert.equal((await notes(ana.id)).unread, 3);
  assert.equal((await markRead({player_id: "nobody", all: true})).status, 403);

  const one = await markRead({player_id: ana.id, ids: [anaNotes[0].id, anaNotes[0].id, "missing"]});
  assert.deepEqual(one, {status: 200, ok: true, unread: 2});
  const after = (await notes(ana.id)).notifications;
  const readAt = after.find(x => x.id === anaNotes[0].id).read_at;
  assert.ok(readAt);
  assert.equal(after.length, 3, "read notifications are still listed, with read_at");
  assert.equal((await call(`/api/dashboard?player_id=${ana.id}`)).notifications.length, 2, "dashboard lists unread only");

  await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(await markRead({player_id: ana.id, all: true}), {status: 200, ok: true, unread: 0});
  assert.equal((await notes(ana.id)).notifications.find(x => x.id === anaNotes[0].id).read_at, readAt, "first read time kept");
  assert.equal((await notes(ben.id)).unread, benNotes.length, "marking all only touches the owner's rows");
  assert.deepEqual(await markRead({player_id: ben.id}), {status: 200, ok: true, unread: benNotes.length}, "nothing to mark is fine");
});

test("the dashboard never marks notifications read", async () => {
  const {ana} = await activeFamily();
  for (let i = 0; i < 3; i++) assert.equal((await call(`/api/dashboard?player_id=${ana.id}`)).notifications.length, 1);
  assert.equal((await notes(ana.id)).unread, 1);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE read_at IS NOT NULL"), 0);
});

test("notifications: newest 50 only, unread counts them all; unknown players get 403", async () => {
  const {ana, id} = await activeFamily();
  for (let i = 0; i < 60; i++) await db.run("INSERT INTO notifications VALUES(?,?,?,?,?,?,?)", `${id}:turn-x${i}:${ana.id}`, ana.id, id, "YOUR_TURN", "m", null, `2027-01-01T00:00:${String(i).padStart(2, "0")}.000Z`);
  const n = await notes(ana.id);
  assert.equal(n.notifications.length, 50);
  assert.equal(n.notifications[0].id, `${id}:turn-x59:${ana.id}`);
  assert.equal(n.unread, 61);
  assert.equal((await notes("nobody")).status, 403);
});

// ---------- rematch ----------

test("rematch: same players, same slots and language, fresh round 1, other player notified", async () => {
  const m = await matchedFamily("fr");
  const r = await rematch(m.ben.id, m.id);
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r).sort(), ["existing", "id", "join_code", "status"]);
  assert.equal(r.existing, false);
  assert.notEqual(r.id, m.id);
  assert.equal(r.id, await rematchIdFor(m.id));
  assert.match(r.join_code, /^[A-Z]{2}[0-9]{2}$/);

  const v = (await view(r.id, m.ana.id)).game;
  assert.equal(v.kind, "family");
  assert.equal(v.status, "ACTIVE");
  assert.equal(v.language, "fr");
  assert.equal(v.rematchId, null);
  assert.deepEqual(v.you, {side: "a", name: "Ana"});
  assert.deepEqual(v.opponent, {side: "b", bot: false, name: "Ben", joined: true});
  assert.equal(v.moves.length, 1);
  assert.deepEqual(v.moves[0], {...v.moves[0], number: 1, prompts: null, status: "OPEN", words: null, mine: null, otherLocked: false});
  assert.ok(!/\b(sun|moon|sky)\b/i.test(JSON.stringify(v)), "no words from the old game");
  assert.equal(await count("SELECT COUNT(*) AS n FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = ?", r.id), 0);
  assert.equal((await db.get("SELECT rematch_of FROM games WHERE id = ?", r.id)).rematch_of, m.id);

  const anaNotes = (await notes(m.ana.id)).notifications;
  assert.deepEqual(anaNotes[0], {...anaNotes[0], kind: "REMATCH", game_id: r.id, id: `${r.id}:rematch:${m.ana.id}`, opponent_name: "Ben", read_at: null});
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ?", r.id), 1, "only the other player is notified");

  // The old game links to the rematch, for both players; nothing else about it changed.
  for (const p of [m.ana, m.ben]) {
    const old = (await view(m.id, p.id)).game;
    assert.equal(old.rematchId, r.id);
    assert.equal(old.status, "MATCHED");
    assert.equal(old.moves.length, 2);
  }
  // Words from the old game are not "already used" in the rematch.
  assert.equal((await submitAs(r.id, m.ana.id, "sky", 1)).ok, true);
  assert.equal((await submitAs(r.id, m.ben.id, "sun", 1)).ok, true);
});

test("rematch: idempotent for either player, for retries and for races", async () => {
  const m = await matchedFamily();
  const racing = await Promise.all([rematch(m.ana.id, m.id), rematch(m.ben.id, m.id), rematch(m.ana.id, m.id)]);
  const ids = new Set(racing.map(r => r.id));
  assert.equal(ids.size, 1, JSON.stringify(racing));
  assert.equal(racing.filter(r => r.existing === false).length, 1);
  assert.equal(new Set(racing.map(r => r.join_code)).size, 1);
  const again = await rematch(m.ben.id, m.id);
  assert.deepEqual(again, {...racing[0], existing: true});
  assert.equal(await count("SELECT COUNT(*) AS n FROM games WHERE rematch_of = ?", m.id), 1);
  assert.equal(await count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", again.id), 2);
  assert.equal(await count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", again.id), 1);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ?", again.id), 1);
});

test("rematch: refused for unfinished, legacy Solo, unknown or non-member requests; works after exhaustion and chains", async () => {
  const g = await activeFamily();
  assert.equal((await rematch(g.ana.id, g.id)).code, "GAME_NOT_FINISHED");
  const waiting = await call("/api/games", {player_id: g.ana.id, solo: false});
  assert.equal((await rematch(g.ana.id, waiting.id)).code, "GAME_NOT_FINISHED");
  const eve = await player("Eve");
  assert.equal((await rematch(eve.id, g.id)).status, 403);
  assert.equal((await rematch("nobody", g.id)).code, "UNKNOWN_PLAYER");
  assert.equal((await rematch(g.ana.id, "nope")).status, 404);

  const solo = await call("/api/games", {player_id: g.ana.id, solo: true});
  (await db.run("UPDATE games SET status = 'MATCHED' WHERE id = ?", solo.id));
  const s = await rematch(g.ana.id, solo.id);
  assert.equal(s.code, "NOT_FAMILY_GAME");
  assert.equal((await view(solo.id, g.ana.id)).game.rematchId, null);
  assert.equal(await count("SELECT COUNT(*) AS n FROM games"), 3, "refusals create nothing");

  for (let move = 1; move <= 20; move++) {
    await submitAs(g.id, g.ana.id, `aa${String.fromCharCode(96 + move)}`, move);
    await submitAs(g.id, g.ben.id, `bb${String.fromCharCode(96 + move)}`, move);
  }
  const r1 = await rematch(g.ana.id, g.id);
  assert.equal(r1.existing, false);
  assert.equal((await rematch(g.ana.id, r1.id)).code, "GAME_NOT_FINISHED");
  await submitAs(r1.id, g.ana.id, "cat", 1);
  await submitAs(r1.id, g.ben.id, "cat", 1);
  const r2 = await rematch(g.ben.id, r1.id);
  assert.equal(r2.existing, false);
  assert.notEqual(r2.id, r1.id);
  assert.equal((await view(r1.id, g.ana.id)).game.rematchId, r2.id);
  assert.equal((await view(g.id, g.ana.id)).game.rematchId, r1.id);
});

test("rematch of a COMPLETE game from an earlier release works and keeps the old rows", async () => {
  await call("/api/health");
  await db.exec(`INSERT INTO players VALUES('p1','Old','OLD-1111','2025-01-01','2025-01-01');
    INSERT INTO players VALUES('p2','Timer','TIM-2222','2025-01-01','2025-01-01');
    INSERT INTO games (id,join_code,status,round_number,created_at,updated_at) VALUES('g9','WX99','COMPLETE',1,'2025-01-01','2025-01-01');
    INSERT INTO game_players VALUES('g9','p2',1,'2025-01-01'); INSERT INTO game_players VALUES('g9','p1',2,'2025-01-01');
    INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES('r-uuid-9','g9',1,NULL,NULL,'COMPLETE','2025-01-01','2025-01-01');
    INSERT INTO submissions VALUES('r-uuid-9','p1','CAT','2025-01-01'); INSERT INTO submissions VALUES('r-uuid-9','p2','CAT','2025-01-01');`);
  const before = JSON.stringify((await db.get("SELECT * FROM games WHERE id = 'g9'")));
  const r = await rematch("p1", "g9");
  assert.equal(r.existing, false);
  const v = (await view(r.id, "p1")).game;
  assert.equal(v.you.side, "b", "slots are kept");
  assert.equal(v.language, "en");
  assert.equal(JSON.stringify((await db.get("SELECT * FROM games WHERE id = 'g9'"))), before, "the old game row is untouched");
  assert.equal(await count("SELECT COUNT(*) AS n FROM submissions WHERE round_id = 'r-uuid-9'"), 2);
});

// ---------- explicit states and integrity ----------

test("legacy Solo is never labelled family, and family is never labelled Solo", async () => {
  const bot = await player("BOT"); // a person who calls themself BOT is still a person
  const ana = await player("Ana");
  const fam = await call("/api/games", {player_id: bot.id, solo: false});
  await call("/api/games/join", {player_id: ana.id, join_code: fam.join_code});
  const stringy = await call("/api/games", {player_id: ana.id, solo: "false"});
  const missing = await call("/api/games", {player_id: ana.id});
  for (const id of [fam.id, stringy.id, missing.id]) {
    const v = (await view(id, id === fam.id ? bot.id : ana.id)).game;
    assert.equal(v.kind, "family", id);
    assert.equal(v.opponent.bot, false);
  }
  assert.equal((await view(fam.id, ana.id)).game.opponent.name, "BOT");

  const solo = await call("/api/games", {player_id: ana.id, solo: true});
  const leg = await submitAs(solo.id, ana.id, "sun", 1);
  assert.equal(leg.game.kind, "legacy-solo");
  assert.equal((await view(solo.id, ana.id)).game.kind, "legacy-solo");
  assert.equal((await call("/api/games/join", {player_id: bot.id, join_code: solo.join_code})).code, "GAME_FULL");
  assert.equal((await view(solo.id, ana.id)).game.kind, "legacy-solo", "a refused join does not relabel it");
  const dash = await call(`/api/dashboard?player_id=${ana.id}`);
  const byId = Object.fromEntries(dash.games.map(g => [g.id, g.bot]));
  assert.deepEqual(byId, {[fam.id]: false, [stringy.id]: false, [missing.id]: false, [solo.id]: true});
});

test("create and join write exactly the expected rows", async () => {
  const ana = await player("Ana"), ben = await player("Ben");
  const created = await call("/api/games", {player_id: ana.id, language: "fr"});
  assert.equal(created.language, "fr");
  assert.deepEqual({...(await db.get("SELECT status, round_number, language, rematch_of FROM games WHERE id = ?", created.id))}, {status: "WAITING", round_number: 1, language: "fr", rematch_of: null});
  assert.equal(await count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", created.id), 1);
  assert.deepEqual((await db.all("SELECT id, round_number, status, previous_a, previous_b FROM rounds WHERE game_id = ?", created.id)).map(r => ({...r})), [{id: `${created.id}:1`, round_number: 1, status: "OPEN", previous_a: null, previous_b: null}]);
  assert.equal((await call("/api/games", {player_id: "nobody"})).code, "UNKNOWN_PLAYER");

  await Promise.all([1, 2].map(() => call("/api/games/join", {player_id: ben.id, join_code: created.join_code})));
  assert.equal((await db.get("SELECT status FROM games WHERE id = ?", created.id)).status, "ACTIVE");
  assert.deepEqual((await db.all("SELECT player_id, slot FROM game_players WHERE game_id = ? ORDER BY slot", created.id)).map(r => ({...r})), [{player_id: ana.id, slot: 1}, {player_id: ben.id, slot: 2}]);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'PLAYER_JOINED'", created.id), 1);
});

test("submit, reveal and next round: rows match the reported state after each step", async () => {
  const {ana, ben, id} = await activeFamily();
  const s1 = await submitAs(id, ana.id, "Sun", 1);
  assert.equal(s1.ok, true);
  assert.equal((await db.get("SELECT word FROM submissions WHERE round_id = ? AND player_id = ?", `${id}:1`, ana.id)).word, "Sun");
  assert.equal((await db.get("SELECT status FROM rounds WHERE id = ?", `${id}:1`)).status, "OPEN");
  const s2 = await submitAs(id, ben.id, "Moon", 1);
  assert.equal(s2.game.moves[0].status, "REVEALED");
  const r1 = (await db.get("SELECT status, revealed_at FROM rounds WHERE id = ?", `${id}:1`));
  assert.equal(r1.status, "REVEALED");
  assert.equal(r1.revealed_at, s2.game.moves[0].revealedAt);
  assert.deepEqual({...(await db.get("SELECT previous_a, previous_b, status FROM rounds WHERE id = ?", `${id}:2`))}, {previous_a: "Sun", previous_b: "Moon", status: "OPEN"});
  assert.equal((await db.get("SELECT round_number FROM games WHERE id = ?", id)).round_number, 2);
  assert.equal(s2.game.moves.length, 2);
});

test("a submit whose row cannot be confirmed never reports success", async () => {
  const {ana, id} = await activeFamily();
  // Simulate a write that is silently lost (e.g. a failed replica write) by dropping every submission insert.
  env = {store: withFaults(db.store, sql => (/INSERT INTO submissions/.test(sql) ? {sql: "SELECT $1::text, $2::text, $3::text, $4::text WHERE false"} : null))};
  const r = await submitAs(id, ana.id, "sun", 1);
  env = {store: db.store};
  assert.notEqual(r.ok, true);
  assert.equal(r.status, 503);
  assert.equal(r.code, "NOT_SAVED");
  assert.equal(await count("SELECT COUNT(*) AS n FROM submissions"), 0);
  assert.equal((await submitAs(id, ana.id, "sun", 1)).ok, true, "a retry succeeds once the database is healthy");
});

test("a failed YOUR_TURN notification does not fail a saved submission", async () => {
  const {ana, ben, id} = await activeFamily();
  env = {store: withFaults(db.store, sql => (/INTO notifications/.test(sql) ? new Error("notifications are down") : null))};
  const original = console.error;
  console.error = () => {};
  const r = await submitAs(id, ana.id, "sun", 1).finally(() => { console.error = original; });
  env = {store: db.store};
  assert.equal(r.ok, true);
  assert.equal(r.game.moves[0].mine, "sun");
  assert.equal((await submitAs(id, ben.id, "moon", 1)).game.moves[0].status, "REVEALED");
});

test("a failed reveal batch changes nothing and is finished on the next read", async () => {
  const {ana, ben, id} = await activeFamily();
  await submitAs(id, ana.id, "sun", 1);
  // The reveal transaction fails after it has already closed the round: all of it must roll back.
  env = {store: withFaults(db.store, sql => (/INSERT INTO rounds .*ON CONFLICT DO NOTHING/s.test(sql) ? new Error("database down mid-reveal") : null))};
  const r = await submitAs(id, ben.id, "moon", 1).catch(e => ({thrown: e}));
  env = {store: db.store};
  assert.ok(r.thrown || r.status >= 500, "the failure is reported, not hidden");
  assert.equal((await db.get("SELECT status FROM rounds WHERE id = ?", `${id}:1`)).status, "OPEN", "the reveal rolled back as a whole");
  assert.equal(await count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", id), 1);
  const v = (await view(id, ana.id)).game;
  assert.equal(v.moves[0].status, "REVEALED");
  assert.deepEqual(v.moves[1].prompts, ["sun", "moon"]);
  assert.equal(await count("SELECT COUNT(*) AS n FROM notifications WHERE game_id = ? AND kind = 'READY_TO_REVEAL'", id), 2);
});

test("match and exhaust: game and round rows agree, and the end is recorded once", async () => {
  const m = await matchedFamily();
  assert.equal((await db.get("SELECT status FROM games WHERE id = ?", m.id)).status, "MATCHED");
  assert.deepEqual((await db.all("SELECT status FROM rounds WHERE game_id = ? ORDER BY round_number", m.id)).map(r => r.status), ["REVEALED", "MATCHED"]);
  assert.equal((await submitAs(m.id, m.ana.id, "late", 3)).code, "GAME_OVER");
  assert.equal(await count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", m.id), 2);

  const e = await activeFamily();
  for (let move = 1; move <= 20; move++) {
    await submitAs(e.id, e.ana.id, `aa${String.fromCharCode(96 + move)}`, move);
    await submitAs(e.id, e.ben.id, `bb${String.fromCharCode(96 + move)}`, move);
  }
  assert.equal((await db.get("SELECT status, round_number FROM games WHERE id = ?", e.id)).status, "EXHAUSTED");
  assert.equal(await count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", e.id), 20);
  assert.equal((await db.get("SELECT status FROM rounds WHERE id = ?", `${e.id}:20`)).status, "EXHAUSTED");
  assert.equal((await submitAs(e.id, e.ana.id, "late", 21)).code, "GAME_OVER");
  assert.equal(await count("SELECT COUNT(*) AS n FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = ?", e.id), 40);
});

test("the migration is additive: an existing database keeps its rows and gains the newer columns", async () => {
  const old = await freshDatabase({blank: true});
  try {
    await old.exec(`CREATE TABLE players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
      CREATE TABLE games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en');
      INSERT INTO players VALUES('p1','Old','OLD-1111','2025-01-01','2025-01-01');
      INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES('g1','ABCD-12','ACTIVE',3,'2025-01-01','2025-01-01','fr');`);
    await old.migrate();
    await old.migrate(); // applying it twice is harmless
    const cols = (await old.all("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'games' ORDER BY ordinal_position")).map(c => c.column_name);
    assert.deepEqual(cols, ["id", "join_code", "status", "round_number", "created_at", "updated_at", "language", "rematch_of"]);
    // The row keeps its data; only its old-format room code ("ABCD-12") was rewritten to the current format.
    const row = {...(await old.get("SELECT * FROM games WHERE id = 'g1'"))};
    assert.match(row.join_code, /^[A-Z]{2}[0-9]{2}$/);
    assert.deepEqual({...row, join_code: "AB12"}, {id: "g1", join_code: "AB12", status: "ACTIVE", round_number: 3, created_at: "2025-01-01", updated_at: "2025-01-01", language: "fr", rematch_of: null});
    assert.equal((await old.get("SELECT display_name FROM players WHERE id = 'p1'")).display_name, "Old");
    env = {store: old.store};
    assert.equal((await call("/api/player/recover", {recovery_code: "old-1111"})).id, "p1");
  } finally {
    env = {store: db.store};
    await old.end();
  }
});
