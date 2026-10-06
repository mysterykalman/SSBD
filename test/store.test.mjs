// Unit tests for device-local persistence (src/client/store.js) with a fake localStorage.
import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {SCHEMA_VERSION} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {KEY, LANGUAGE_KEY, MAX_SOLO_GAMES, createStore, migrate} from "../src/client/store.js";

class FakeStorage {
  constructor({quota = Infinity, broken = false} = {}) { this.map = new Map(); this.quota = quota; this.broken = broken; }
  get size() { let n = 0; for (const [k, v] of this.map) n += k.length + v.length; return n; }
  getItem(k) { if (this.broken) throw new Error("SecurityError"); return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) {
    if (this.broken) throw new Error("SecurityError");
    v = String(v);
    const before = this.map.get(k);
    this.map.set(k, v);
    if (this.size > this.quota) {
      if (before === undefined) this.map.delete(k); else this.map.set(k, before);
      const error = new Error("QuotaExceededError"); error.name = "QuotaExceededError"; throw error;
    }
  }
  removeItem(k) { this.map.delete(k); }
}

let storage;
beforeEach(() => { storage = new FakeStorage(); globalThis.localStorage = storage; });

const stored = () => JSON.parse(storage.getItem(KEY));
let clock = Date.parse("2026-01-01T00:00:00Z");
const tick = () => new Date(clock += 1000).toISOString();
const newGame = id => startSoloGame({id, language: "en", seed: 7, now: tick()});
function play(game, n) {
  for (let i = 0; i < n; i++) {
    const r = submitSoloWord(game, ["apple", "river", "cloud", "tiger", "candle"][i], tick());
    if (r.ok) game = r.game;
  }
  return game;
}

test("missing storage starts an empty store and writes it", () => {
  const store = createStore();
  assert.equal(store.healthy, true);
  assert.deepEqual(store.soloGames(), []);
  assert.equal(store.last(), null);
  assert.equal(stored().schema, SCHEMA_VERSION);
});

test("garbage JSON and wrong shapes are replaced, not fatal", () => {
  for (const junk of ["{not json", "42", "[]", "null", JSON.stringify({solo: [1, 2], seen: "x", last: 5})]) {
    storage = new FakeStorage(); globalThis.localStorage = storage;
    storage.setItem(KEY, junk);
    const store = createStore();
    assert.deepEqual(store.soloGames(), [], junk);
    assert.equal(store.last(), null, junk);
    assert.equal(stored().schema, SCHEMA_VERSION);
  }
});

test("future schema is backed up before the store starts fresh", () => {
  const future = {schema: SCHEMA_VERSION + 1, solo: {x: {schema: SCHEMA_VERSION + 1, moves: [{}]}}, last: {kind: "solo", id: "x"}};
  storage.setItem(KEY, JSON.stringify(future));
  const store = createStore();
  assert.deepEqual(store.soloGames(), []);
  assert.deepEqual(JSON.parse(storage.getItem(`${KEY}.backup.v${SCHEMA_VERSION + 1}`)), future);
});

test("older-schema games in a compatible shape are upgraded; unusable ones are backed up", () => {
  const good = play(newGame("old1"), 2);
  const old = {...good, schema: 1};
  delete old.status;
  const broken = {schema: 1, id: "old2", moves: [{word: "cat"}]};
  storage.setItem(KEY, JSON.stringify({schema: 1, solo: {old1: old, old2: broken}, seen: {old1: 2, bad: "x"}, last: {kind: "solo", id: "old1"}}));
  const store = createStore();
  const game = store.soloGame("old1");
  assert.equal(game.schema, SCHEMA_VERSION);
  assert.equal(game.status, "ACTIVE");
  assert.equal(game.moves.length, good.moves.length);
  assert.equal(store.soloGame("old2"), null);
  assert.deepEqual(JSON.parse(storage.getItem(`${KEY}.backup.v1`)).solo.old2, broken);
  assert.equal(store.seen("old1"), 2);
  assert.equal(store.seen("bad"), 0);
  assert.equal(store.last().id, "old1");
  // The upgraded game is still playable.
  assert.equal(submitSoloWord(game, "zebra").ok, true);
});

test("migrate keeps current-schema games untouched", () => {
  const g = newGame("a");
  assert.deepEqual(migrate({schema: SCHEMA_VERSION, solo: {a: g}}).solo.a, g);
});

test("games, seen and last survive a new store instance (refresh)", () => {
  const a = createStore();
  const game = play(newGame("g1"), 3);
  assert.equal(a.saveSolo(game), true);
  a.markSeen("g1", 3);
  a.setLast({kind: "solo", id: "g1"});
  const b = createStore();
  assert.deepEqual(b.soloGame("g1"), game);
  assert.equal(b.seen("g1"), 3);
  b.markSeen("g1", 1);
  assert.equal(b.seen("g1"), 3, "seen never goes backwards");
  assert.equal(b.last().kind, "solo");
  assert.equal(b.last().id, "g1");
});

test("language persists and rejects junk", () => {
  const a = createStore();
  assert.equal(a.language(), null);
  a.setLanguage("fr");
  assert.equal(createStore().language(), "fr");
  storage.setItem(LANGUAGE_KEY, "de");
  assert.equal(createStore().language(), null);
});

test("pruning keeps at most MAX_SOLO_GAMES and never deletes the active game", () => {
  const store = createStore();
  const active = newGame("active"); // oldest of all
  store.saveSolo(active);
  store.setLast({kind: "solo", id: "active"});
  for (let i = 0; i < MAX_SOLO_GAMES + 10; i++) store.saveSolo(newGame(`g${i}`));
  const ids = store.soloGames().map(g => g.id);
  assert.equal(ids.length, MAX_SOLO_GAMES);
  assert.ok(ids.includes("active"));
  assert.ok(ids.includes(`g${MAX_SOLO_GAMES + 9}`), "newest kept");
  assert.ok(!ids.includes("g0"), "oldest non-active pruned");
  assert.equal(Object.keys(stored().solo).length, MAX_SOLO_GAMES);
});

test("quota exceeded: old games are dropped to make room, the active game is saved", () => {
  const store = createStore();
  for (let i = 0; i < 10; i++) store.saveSolo(play(newGame(`old${i}`), 3));
  storage.quota = storage.size + 500; // nearly full
  const active = play(newGame("now"), 4);
  assert.equal(store.saveSolo(active), true);
  assert.equal(store.healthy, true);
  assert.deepEqual(createStore().soloGame("now"), active);
  assert.ok(Object.keys(stored().solo).length < 11, "something was pruned");
});

test("quota too small even for the active game: save reports failure but play continues in memory", () => {
  const store = createStore();
  storage.quota = storage.size + 10;
  const game = newGame("big");
  assert.equal(store.saveSolo(game), false);
  assert.equal(store.healthy, false);
  assert.deepEqual(store.soloGame("big"), game, "still readable from memory");
  const next = play(game, 1);
  store.saveSolo(next);
  assert.deepEqual(store.soloGame("big"), next);
});

test("blocked storage (throws on access) never throws to the app", () => {
  storage.broken = true;
  const store = createStore();
  assert.equal(store.healthy, false);
  assert.equal(store.language(), null);
  assert.equal(store.setLanguage("fr"), false);
  const game = newGame("x");
  assert.equal(store.saveSolo(game), false);
  assert.deepEqual(store.soloGame("x"), game);
  store.setLast({kind: "solo", id: "x"});
  assert.equal(store.last().id, "x");
  assert.equal(store.player(), null);
});

test("two tabs never erase each other's games", () => {
  const tab1 = createStore(), tab2 = createStore();
  tab1.saveSolo(newGame("one"));
  tab2.saveSolo(newGame("two"));
  const g1 = play(tab1.soloGame("one"), 2);
  tab1.saveSolo(g1);
  // tab2 still holds an older copy of "one" in memory; saving it must not roll back progress.
  tab2.markSeen("two", 1);
  const fresh = createStore();
  assert.deepEqual(fresh.soloGame("one"), g1);
  assert.ok(fresh.soloGame("two"));
  // A stale save of an older state never rolls back a newer one.
  tab2.saveSolo(newGame("one"));
  assert.equal(createStore().soloGame("one").moves.length, g1.moves.length);
});

test("setLast validates input", () => {
  const store = createStore();
  store.setLast({kind: "nope", id: 1});
  assert.equal(store.last(), null);
  store.setLast({kind: "family", id: "abc"});
  assert.equal(createStore().last().id, "abc");
});
