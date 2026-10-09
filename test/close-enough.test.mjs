// Together "Close enough?": one player asks whether the latest revealed pair counts; the other says
// Yes (an agreed match, status AGREED, for both) or No (play goes on). Refreshes, retries, late
// answers and simultaneous actions can never produce two different results.
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {caller, freshDatabase} from "./support/db.mjs";

let env, db;
beforeEach(async () => { db = await freshDatabase(); env = {store: db.store}; });
afterEach(() => db.end());

const call = caller(handleApi, () => env);
const player = async name => call("/api/player", {display_name: name});
const view = async (gameId, playerId) => (await call(`/api/game?id=${gameId}&player_id=${playerId}`)).game;
const submit = (gameId, playerId, word, move) => call("/api/submit", {game_id: gameId, player_id: playerId, word, move});
const close = (gameId, playerId, move, action) => call("/api/games/close-enough", {game_id: gameId, player_id: playerId, move, action});

/** A started game with `reveals` pairs revealed (no match). */
async function started(reveals = 1) {
  const ana = await player("Ana"), ben = await player("Ben");
  const created = await call("/api/games", {player_id: ana.id, solo: false, language: "en"});
  await call("/api/games/join", {player_id: ben.id, join_code: created.join_code});
  const a = ["ocean", "violin", "rocket", "pencil"], b = ["sea", "garden", "carrot", "anchor"];
  for (let move = 1; move <= reveals; move++) {
    await submit(created.id, ana.id, a[move - 1], move);
    await submit(created.id, ben.id, b[move - 1], move);
  }
  return {ana, ben, id: created.id};
}

test("nothing to ask before the first reveal", async () => {
  const {ana, id} = await started(0);
  assert.equal((await view(id, ana.id)).closeEnough, null);
  assert.equal((await close(id, ana.id, 0, "ask")).code, "TOO_EARLY");
});

test("asking: the other player sees Yes/No, the asker waits; Yes ends the game as an agreed match for both", async () => {
  const {ana, ben, id} = await started(1);
  const before = await view(id, ana.id);
  assert.deepEqual(before.closeEnough, {move: 1, canAsk: true, state: null, by: null});
  const asked = await close(id, ana.id, 1, "ask");
  assert.equal(asked.ok, true);
  assert.equal(asked.result, "asked");
  assert.equal(asked.game.closeEnough.state, "waiting");
  assert.equal(asked.game.closeEnough.canAsk, false);
  const benSees = await view(id, ben.id);
  assert.equal(benSees.closeEnough.state, "asked");
  assert.equal(benSees.closeEnough.by, "other");
  assert.ok((await call(`/api/notifications?player_id=${ben.id}`)).notifications.some(n => n.kind === "CLOSE_ENOUGH" && n.game_id === id));

  const yes = await close(id, ben.id, 1, "yes");
  assert.equal(yes.result, "agreed");
  for (const who of [ana, ben]) {
    const g = await view(id, who.id);
    assert.equal(g.status, "AGREED", "both see the same result");
    assert.equal(g.agreedMove, 1);
    assert.equal(g.closeEnough, null);
    assert.equal(g.moves.at(-1).number, 1, "the open move that never happened is gone");
    assert.deepEqual(g.moves.at(-1).words, {a: "ocean", b: "sea"});
  }
  assert.ok((await call(`/api/notifications?player_id=${ana.id}`)).notifications.some(n => n.kind === "GAME_AGREED"));
  // The game is over: no more words, and the dashboard lists it as finished (AGREED).
  assert.equal((await submit(id, ana.id, "wave", 2)).code, "GAME_OVER");
  const dash = await call(`/api/dashboard?player_id=${ana.id}`);
  assert.equal(dash.games.find(g => g.id === id).status, "AGREED");
  // A late or repeated tap (either player, any action) just sees the agreed result.
  for (const [who, action] of [[ben, "yes"], [ben, "no"], [ana, "ask"]]) {
    const again = await close(id, who.id, 1, action);
    assert.equal(again.ok, true);
    assert.equal(again.game.status, "AGREED");
  }
  // A rematch is allowed after an agreed match.
  assert.equal((await call("/api/games/rematch", {player_id: ana.id, game_id: id})).ok !== false, true);
});

test("No: the request is dismissed, play continues, and the asker can't ask again about the same pair", async () => {
  const {ana, ben, id} = await started(1);
  await close(id, ana.id, 1, "ask");
  const no = await close(id, ben.id, 1, "no");
  assert.equal(no.result, "declined");
  assert.equal(no.game.status, "ACTIVE");
  assert.equal(no.game.closeEnough.state, "declined");
  assert.equal(no.game.closeEnough.by, "other");
  const anaSees = await view(id, ana.id);
  assert.equal(anaSees.status, "ACTIVE");
  assert.equal(anaSees.closeEnough.state, "declined");
  assert.equal(anaSees.closeEnough.by, "you");
  assert.equal(anaSees.closeEnough.canAsk, false);
  assert.ok((await call(`/api/notifications?player_id=${ana.id}`)).notifications.some(n => n.kind === "CLOSE_DECLINED"));
  // Asking again about the same pair changes nothing; a late Yes after No cannot flip it.
  assert.equal((await close(id, ana.id, 1, "ask")).result, "same");
  assert.equal((await close(id, ben.id, 1, "yes")).result, "same");
  assert.equal((await view(id, ben.id)).status, "ACTIVE");
  // Ben may still ask about this pair himself, and play goes on normally.
  assert.equal((await view(id, ben.id)).closeEnough.canAsk, true);
  assert.equal((await submit(id, ana.id, "wave", 2)).ok, true);
  assert.equal((await submit(id, ben.id, "beach", 2)).ok, true);
  const next = await view(id, ana.id);
  assert.equal(next.moves.at(-1).number, 3);
  assert.deepEqual(next.closeEnough, {move: 2, canAsk: true, state: null, by: null}, "a new pair: ask again");
});

test("both ask at the same time: that is a Yes from both, never two requests", async () => {
  const {ana, ben, id} = await started(1);
  const [x, y] = await Promise.all([close(id, ana.id, 1, "ask"), close(id, ben.id, 1, "ask")]);
  assert.deepEqual([x.result, y.result].sort(), ["agreed", "asked"]);
  assert.equal((await view(id, ana.id)).status, "AGREED");
  assert.equal((await view(id, ben.id)).status, "AGREED");
});

test("Yes and No racing (double tap / two tabs): one wins and both players see the same thing", async () => {
  const {ana, ben, id} = await started(1);
  await close(id, ana.id, 1, "ask");
  await Promise.all([close(id, ben.id, 1, "yes"), close(id, ben.id, 1, "no")]);
  const a = await view(id, ana.id), b = await view(id, ben.id);
  assert.equal(a.status, b.status);
  assert.ok(a.status === "AGREED" || (a.closeEnough.state === "declined" && b.closeEnough.state === "declined"));
});

test("a request about an older pair goes stale once the next pair is revealed", async () => {
  const {ana, ben, id} = await started(1);
  await close(id, ana.id, 1, "ask");
  // They keep playing while the request is pending: the next reveal moves on.
  await submit(id, ana.id, "wave", 2);
  await submit(id, ben.id, "beach", 2);
  const b = await view(id, ben.id);
  assert.equal(b.closeEnough.move, 2);
  assert.equal(b.closeEnough.state, null, "the old request is no longer pending");
  const late = await close(id, ben.id, 1, "yes");
  assert.equal(late.code, "STALE_REQUEST");
  assert.equal(late.game.status, "ACTIVE");
  assert.equal((await close(id, ben.id, 2, "yes")).code, "NO_REQUEST");
});

test("a finished pair can't be revealed over an agreed game, and strangers or Solo games can't ask", async () => {
  const {ana, ben, id} = await started(1);
  await submit(id, ana.id, "wave", 2); // Ana locked her next word before the agreement
  await close(id, ana.id, 1, "ask");
  await close(id, ben.id, 1, "yes");
  assert.equal((await submit(id, ben.id, "beach", 2)).code, "GAME_OVER");
  const g = await view(id, ana.id);
  assert.equal(g.status, "AGREED");
  assert.equal(g.moves.length, 1);
  const carl = await player("Carl");
  assert.equal((await close(id, carl.id, 1, "ask")).status, 403);
  assert.equal((await close(id, ana.id, 1, "maybe")).status, 400);
  const solo = await call("/api/games", {player_id: carl.id, solo: true, language: "en"});
  assert.equal((await close(solo.id, carl.id, 1, "ask")).code, "NOT_TOGETHER");
});
