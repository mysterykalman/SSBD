// Family room codes: exactly two uppercase letters and two digits ("AB12"), end to end (generation,
// validation, creation, joining, collisions), against a real PostgreSQL.
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {JOIN_CODE_PATTERN, isJoinCode, normalizeJoinCode, randomJoinCode} from "../src/shared/codes.js";
import {seededRandom} from "../src/shared/rules.js";
import {caller, freshDatabase} from "./support/db.mjs";

let db, env, call;
beforeEach(async () => {
  db = await freshDatabase();
  env = {store: db.store};
  call = caller(handleApi, () => env);
});
afterEach(() => db.end());

test("generated codes are always two uppercase letters and two digits (AA00)", () => {
  assert.equal(String(JOIN_CODE_PATTERN), String(/^[A-Z]{2}[0-9]{2}$/));
  const random = seededRandom(7), seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const code = randomJoinCode(random);
    assert.match(code, /^[A-Z]{2}[0-9]{2}$/, code);
    seen.add(code);
  }
  assert.ok([...seen].some(code => code.endsWith("00")) && [...seen].some(code => /0[1-9]$/.test(code)), "digits are zero-padded (00–09)");
  assert.ok(new Set([...seen].map(code => code[0])).size === 26, "every letter A–Z is used");
  assert.equal(randomJoinCode(() => 0), "AA00");
  assert.equal(randomJoinCode(() => 0.9999), "ZZ99");
});

test("normalisation and validation: lowercase and spaces are fine, anything else is malformed", () => {
  assert.equal(normalizeJoinCode(" ab 12 "), "AB12");
  assert.ok(isJoinCode(normalizeJoinCode("qm99")));
  for (const bad of ["", "A12", "ABC1", "AB1", "AB123", "1A2B", "AB-12", "ABCD-12", "ABCD12", "ÀB12", "AB１2"]) {
    assert.ok(!isJoinCode(normalizeJoinCode(bad)), `${bad} must be rejected`);
  }
});

async function familyRoom(name = "Ana") {
  const host = await call("/api/player", {display_name: name});
  const room = await call("/api/games", {player_id: host.id, solo: false});
  return {host, room};
}

test("a Family room gets a new-format code, and a friend joins with it (typed in lowercase too)", async () => {
  const {host, room} = await familyRoom();
  assert.match(room.join_code, /^[A-Z]{2}[0-9]{2}$/);
  const view = await call(`/api/game?id=${room.id}&player_id=${host.id}`);
  assert.equal(view.game.joinCode, room.join_code);
  const ben = await call("/api/player", {display_name: "Ben"});
  const joined = await call("/api/games/join", {player_id: ben.id, join_code: ` ${room.join_code.toLowerCase().slice(0, 2)} ${room.join_code.slice(2)} `});
  assert.equal(joined.id, room.id);
  assert.equal(joined.join_code, room.join_code);
  const dash = await call(`/api/dashboard?player_id=${host.id}`);
  for (const g of dash.games) if (!g.bot) assert.match(g.join_code, /^[A-Z]{2}[0-9]{2}$/);
});

test("malformed codes, including the old ABCD-12 format, are rejected before any lookup", async () => {
  await familyRoom();
  const ben = await call("/api/player", {display_name: "Ben"});
  for (const bad of ["ABCD-12", "AB-12", "A1B2", "AB123", "", "ROOM"]) {
    const r = await call("/api/games/join", {player_id: ben.id, join_code: bad});
    assert.equal(r.status, 400, bad);
    assert.equal(r.code, "BAD_JOIN_CODE", bad);
  }
  const missing = await call("/api/games/join", {player_id: ben.id, join_code: "ZZ00"});
  assert.equal(missing.code, "GAME_NOT_FOUND", "a well-formed code nobody uses is simply not found");
});

test("active-code collisions are regenerated, and never touch the other room", async () => {
  const codes = ["QQ11"];
  env = {store: db.store, codes: {joinCode: () => codes.shift() ?? "RR22"}};
  const first = await familyRoom("Ana");
  assert.equal(first.room.join_code, "QQ11");
  codes.push("QQ11", "QQ11", "RR22");
  const second = await familyRoom("Cleo");
  assert.equal(second.room.join_code, "RR22", "the active code was skipped");
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", first.room.id), 1, "the first room is untouched");
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM games WHERE join_code = 'QQ11' AND status IN ('WAITING', 'ACTIVE')"), 1);
  // Joining QQ11 reaches the first room, never the second.
  const ben = await call("/api/player", {display_name: "Ben"});
  assert.equal((await call("/api/games/join", {player_id: ben.id, join_code: "QQ11"})).id, first.room.id);
});

test("a finished room frees its code: a new room may reuse it, and joining finds only the active room", async () => {
  const codes = ["MM55"];
  env = {store: db.store, codes: {joinCode: () => codes.shift() ?? "NN66"}};
  const old = await familyRoom("Ana");
  await db.run("UPDATE games SET status = 'MATCHED' WHERE id = ?", old.room.id);
  codes.push("MM55");
  const fresh = await familyRoom("Cleo");
  assert.equal(fresh.room.join_code, "MM55", "the finished room's code is free again");
  const ben = await call("/api/player", {display_name: "Ben"});
  assert.equal((await call("/api/games/join", {player_id: ben.id, join_code: "MM55"})).id, fresh.room.id);
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", old.room.id), 1, "the finished room was not joined");
  // The database still refuses two ACTIVE rooms with one code, even if a request skipped the check.
  await assert.rejects(db.run("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at) VALUES('dup','MM55','WAITING',1,'t','t')"), /duplicate key|unique/i);
});

test("rematches get new-format codes and skip codes in use", async () => {
  const codes = ["KK10"];
  env = {store: db.store, codes: {joinCode: () => codes.shift() ?? "LL20"}};
  const {host, room} = await familyRoom();
  const ben = await call("/api/player", {display_name: "Ben"});
  await call("/api/games/join", {player_id: ben.id, join_code: room.join_code});
  await call("/api/submit", {game_id: room.id, player_id: host.id, word: "tea", move: 1});
  await call("/api/submit", {game_id: room.id, player_id: ben.id, word: "tea", move: 1});
  const blocker = await familyRoom("Dee"); // an active room holding the next code (LL20)
  codes.push(blocker.room.join_code, "PP30");
  const r = await call("/api/games/rematch", {player_id: ben.id, game_id: room.id});
  assert.equal(r.status, 200);
  assert.equal(r.join_code, "PP30", "an active room's code was skipped");
  assert.match(r.join_code, /^[A-Z]{2}[0-9]{2}$/);
});
