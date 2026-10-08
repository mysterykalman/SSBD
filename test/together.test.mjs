// Together mode on the server (real PostgreSQL): both players name themselves (never from the room
// code), a played word is used up for both players, and a match is one shared, authoritative event.
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {caller, freshDatabase} from "./support/db.mjs";

let db, call;
beforeEach(async () => {
  db = await freshDatabase();
  call = caller(handleApi, () => ({store: db.store}));
});
afterEach(() => db.end());

const player = name => call("/api/player", {display_name: name});
const submitAs = (gameId, playerId, word, move) => call("/api/submit", {game_id: gameId, player_id: playerId, word, move});
const view = (gameId, playerId) => call(`/api/game?id=${gameId}&player_id=${playerId}`);

async function room() {
  const ana = await player("Ana");
  const created = await call("/api/games", {player_id: ana.id, solo: false});
  return {ana, created, id: created.id, code: created.join_code};
}

test("names: a room code is never accepted as a name, on create or rename", async () => {
  for (const name of ["ZL12", "zl 12", "ZLED-31", "zled31", "AB-12"]) {
    const r = await player(name);
    assert.equal(r.status, 400, name);
    assert.equal(r.code, "BAD_NAME", name);
  }
  const ok = await player("Zoe");
  assert.equal(ok.display_name, "Zoe");
  assert.equal((await call("/api/player/name", {player_id: ok.id, display_name: "QM99"})).code, "BAD_NAME");
  assert.equal((await call("/api/player/name", {player_id: ok.id, display_name: "   "})).code, "EMPTY_NAME");
  assert.equal((await call("/api/player/name", {player_id: "nobody", display_name: "Kim"})).code, "UNKNOWN_PLAYER");
  const renamed = await call("/api/player/name", {player_id: ok.id, display_name: "  Zoé   B  "});
  assert.deepEqual([renamed.id, renamed.display_name, renamed.recovery_code], [ok.id, "Zoé B", ok.recovery_code], "same player, same recovery code");
});

test("lookup before the name step: bad, missing, full, open and already-a-member rooms", async () => {
  const {ana, code} = await room();
  assert.equal((await call("/api/games/lookup?code=ABCD-12")).code, "BAD_JOIN_CODE");
  assert.equal((await call("/api/games/lookup?code=ZZ00")).code, "GAME_NOT_FOUND");
  const open = await call(`/api/games/lookup?code=${code.toLowerCase()}`);
  assert.deepEqual([open.status, open.ok, open.join_code, open.member], [200, true, code, false]);
  assert.equal((await call(`/api/games/lookup?code=${code}&player_id=${ana.id}`)).member, true);
  const ben = await player("Ben");
  await call("/api/games/join", {player_id: ben.id, join_code: code});
  assert.equal((await call(`/api/games/lookup?code=${code}`)).code, "GAME_FULL");
  assert.equal((await call(`/api/games/lookup?code=${code}&player_id=${ben.id}`)).member, true, "a member can always come back");
  // Looking up never joins anyone.
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM game_players WHERE game_id = (SELECT id FROM games WHERE join_code = ?)", code), 2);
});

test("both players see each other's own names, including after a rename, and never the room code", async () => {
  const {ana, id, code} = await room();
  const ben = await player("Ben");
  await call("/api/games/join", {player_id: ben.id, join_code: code});
  assert.equal((await view(id, ana.id)).game.opponent.name, "Ben");
  assert.equal((await view(id, ben.id)).game.opponent.name, "Ana");
  await call("/api/player/name", {player_id: ben.id, display_name: "Benji"});
  assert.equal((await view(id, ana.id)).game.opponent.name, "Benji");
  assert.equal((await view(id, ben.id)).game.you.name, "Benji");
  for (const p of [ana, ben]) assert.doesNotMatch(JSON.stringify((await view(id, p.id)).game.opponent), new RegExp(code));
});

test("a word either player played is used up for both, normalised like every duplicate; a same-move match still wins", async () => {
  const {ana, id, code} = await room();
  const ben = await player("Ben");
  await call("/api/games/join", {player_id: ben.id, join_code: code});
  await submitAs(id, ana.id, "Ocean", 1);
  await submitAs(id, ben.id, "forest", 1);
  // Move 2: Ben tries Ana's word, Ana tries Ben's (any case, spacing, punctuation or plural).
  for (const [who, word] of [[ben, "ocean"], [ben, " OCEAN! "], [ben, "oceans"], [ana, "Forest"], [ana, "forests"]]) {
    const r = await submitAs(id, who.id, word, 2);
    assert.equal(r.status, 400, `${who.display_name}: ${word}`);
    assert.equal(r.code, "ALREADY_USED", `${who.display_name}: ${word}`);
  }
  assert.equal((await submitAs(id, ana.id, "ocean", 2)).code, "SAME_AS_LAST", "a player's own last word keeps its own message");
  // Nothing was stored for move 2, and the move is still open for both.
  assert.equal(await db.count("SELECT COUNT(*) AS n FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = ? AND r.round_number = 2", id), 0);
  // The same new word from both players in one move is a match, not a duplicate.
  assert.equal((await submitAs(id, ana.id, "tree", 2)).ok, true);
  const won = await submitAs(id, ben.id, "Trees", 2);
  assert.equal(won.ok, true);
  assert.equal(won.game.status, "MATCHED");
});

test("a word stays used up for the rest of the game, several moves later", async () => {
  const {ana, id, code} = await room();
  const ben = await player("Ben");
  await call("/api/games/join", {player_id: ben.id, join_code: code});
  const moves = [["ocean", "forest"], ["wave", "leaf"], ["boat", "branch"]];
  for (const [i, [a, b]] of moves.entries()) {
    await submitAs(id, ana.id, a, i + 1);
    await submitAs(id, ben.id, b, i + 1);
  }
  assert.equal((await submitAs(id, ben.id, "ocean", 4)).code, "ALREADY_USED");
  assert.equal((await submitAs(id, ana.id, "forest", 4)).code, "ALREADY_USED");
  assert.equal((await submitAs(id, ana.id, "leaf", 4)).code, "ALREADY_USED");
});

test("race: simultaneous matching submissions make exactly one win, seen the same way by both players", async () => {
  for (let run = 0; run < 12; run++) {
    const {ana, id, code} = await room();
    const ben = await player("Ben");
    await call("/api/games/join", {player_id: ben.id, join_code: code});
    // Both lock the same word at the same moment (retries included).
    const results = await Promise.all([submitAs(id, ana.id, "rocket", 1), submitAs(id, ben.id, "Rocket", 1), submitAs(id, ana.id, "rocket", 1), submitAs(id, ben.id, "Rocket", 1)]);
    for (const r of results) assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(results.some(r => r.game.status === "MATCHED"), "the second of the two commits sees the match");
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", id), 1, "no extra round opened");
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ? AND status = 'MATCHED'", id), 1);
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = ?", id), 2, "one word per player");
    for (const p of [ana, ben]) {
      const v = (await view(id, p.id)).game;
      assert.equal(v.status, "MATCHED");
      assert.equal(v.moves.length, 1);
      assert.equal(v.moves[0].status, "MATCHED");
      assert.equal(await db.count("SELECT COUNT(*) AS n FROM notifications WHERE player_id = ? AND game_id = ? AND kind = 'GAME_COMPLETE'", p.id, id), 1, "one win notification each");
    }
    // A late retry after the win changes nothing.
    const late = await submitAs(id, ana.id, "rocket", 1);
    assert.equal(late.game.status, "MATCHED");
    assert.equal(await db.count("SELECT COUNT(*) AS n FROM rounds WHERE game_id = ?", id), 1);
  }
});
