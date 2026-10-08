// Together "Leave game": the game ends for both (ENDED: never a win or a loss), the other player is
// told, nobody is left waiting, and it works in every game state and after a reload (idempotent).
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {caller, freshDatabase} from "./support/db.mjs";

let env, db;
beforeEach(async () => { db = await freshDatabase(); env = {store: db.store}; });
afterEach(() => db.end());

const call = caller(handleApi, () => env);
const player = async name => call("/api/player", {display_name: name});
const view = (gameId, playerId) => call(`/api/game?id=${gameId}&player_id=${playerId}`);
const leave = (gameId, playerId) => call("/api/games/leave", {game_id: gameId, player_id: playerId});
const submit = (gameId, playerId, word, move) => call("/api/submit", {game_id: gameId, player_id: playerId, word, move});

async function started() {
  const ana = await player("Ana"), ben = await player("Ben");
  const created = await call("/api/games", {player_id: ana.id, solo: false, language: "en"});
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  return {ana, ben, id: created.id, code: created.join_code};
}

test("leaving during a round: the game ends, the other player is told who left, and no one can play on", async () => {
  const {ana, ben, id} = await started();
  await submit(id, ana.id, "sun", 1); // Ana has locked in; Ben has not
  const left = await leave(id, ben.id);
  assert.equal(left.ok, true);
  assert.equal(left.left, true);
  assert.equal(left.game.status, "ENDED");
  assert.equal(left.game.leftBy, "you");
  const a = await view(id, ana.id);
  assert.equal(a.game.status, "ENDED", "Ana is not left waiting");
  assert.equal(a.game.leftBy, "other");
  assert.equal(a.game.opponent.name, "Ben");
  const notes = await call(`/api/notifications?player_id=${ana.id}`);
  assert.ok(notes.notifications.some(n => n.kind === "PLAYER_LEFT" && n.game_id === id), "Ana is notified");
  assert.ok(!(await call(`/api/notifications?player_id=${ben.id}`)).notifications.some(n => n.kind === "PLAYER_LEFT"), "the one who left is not");
  // Nothing can be played any more, by either side.
  assert.notEqual((await submit(id, ben.id, "moon", 1)).ok, true);
  // Never a win or a loss: no match, no exhaustion, no completion notice.
  assert.ok(!["MATCHED", "EXHAUSTED"].includes(a.game.status));
  assert.ok(!notes.notifications.some(n => n.kind === "GAME_COMPLETE" || n.kind === "GAME_EXHAUSTED"));
});

test("leaving is idempotent (a reload or a retry changes nothing) and only for members", async () => {
  const {ana, ben, id} = await started();
  await leave(id, ana.id);
  const again = await leave(id, ana.id);
  assert.equal(again.ok, true);
  assert.equal(again.left, false, "already ended");
  assert.equal(again.game.status, "ENDED");
  assert.equal((await leave(id, ben.id)).game.leftBy, "other", "the other player leaving afterwards keeps who left first");
  const notes = (await call(`/api/notifications?player_id=${ben.id}`)).notifications.filter(n => n.kind === "PLAYER_LEFT");
  assert.equal(notes.length, 1, "told once");
  const carl = await player("Carl");
  assert.equal((await leave(id, carl.id)).status, 403);
  assert.equal((await leave("nope", ana.id)).status, 404);
});

test("leaving before anyone joined, before the first round, and after a reveal", async () => {
  // Before anyone joined: the room just ends (and its code is free again).
  const ana = await player("Ana");
  const waiting = await call("/api/games", {player_id: ana.id, solo: false, language: "en"});
  const w = await leave(waiting.id, ana.id);
  assert.equal(w.game.status, "ENDED");
  const ben = await player("Ben");
  assert.equal((await call("/api/games/join", {player_id: ben.id, join_code: waiting.join_code})).code, "GAME_NOT_FOUND", "an ended room cannot be joined");
  // Before the first round is played.
  const g1 = await started();
  assert.equal((await leave(g1.id, g1.ana.id)).game.status, "ENDED");
  // After a reveal, in a longer game.
  const g2 = await started();
  const anaWords = ["sun", "violin", "rocket", "pencil", "turtle", "pillow"], benWords = ["moon", "garden", "carrot", "anchor", "candle", "zebra"];
  for (let move = 1; move <= 6; move++) {
    assert.equal((await submit(g2.id, g2.ana.id, anaWords[move - 1], move)).ok, true);
    assert.equal((await submit(g2.id, g2.ben.id, benWords[move - 1], move)).ok, true);
  }
  const before = await view(g2.id, g2.ana.id);
  assert.equal(before.game.moves.filter(m => m.words).length, 6);
  const left = await leave(g2.id, g2.ana.id);
  assert.equal(left.game.status, "ENDED");
  const b = await view(g2.id, g2.ben.id);
  assert.equal(b.game.leftBy, "other");
  assert.equal(b.game.moves.filter(m => m.words).length, 6, "the history is kept");
});

test("a finished game is never changed by leaving; an ended game cannot be rematched; the dashboard shows it ended", async () => {
  const {ana, ben, id} = await started();
  await submit(id, ana.id, "sun", 1);
  await submit(id, ben.id, "sun", 1);
  const done = await leave(id, ana.id);
  assert.equal(done.left, false);
  assert.equal(done.game.status, "MATCHED", "a match stays a match");
  const g = await started();
  await leave(g.id, g.ben.id);
  assert.equal((await call("/api/games/rematch", {game_id: g.id, player_id: g.ana.id})).code, "GAME_NOT_FINISHED");
  const dash = await call(`/api/dashboard?player_id=${g.ana.id}`);
  assert.equal(dash.games.find(x => x.id === g.id).status, "ENDED");
});
