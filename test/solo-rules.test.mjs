// Solo state transitions. These tests only rely on the bot obeying the rules
// (never reusing a game word, choosing before the player types), not on how
// good its associations are.

import {test} from "node:test";
import assert from "node:assert/strict";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {FINISHED, MAX_MOVES, currentMove, isFinished, moveOutcome, seededRandom, usedKeys} from "../src/shared/rules.js";
import {publicMove, startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {wordKey} from "../src/shared/words.js";

const MULTIPLAYER_FIELDS = ["kind", "joinCode", "join_code", "waitingForPlayer", "you", "opponent", "members", "players"];
const MOVE_MULTIPLAYER_FIELDS = ["mine", "otherLocked", "submitted"];

const deepFreeze = obj => {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
};

/** A word that passes validation and that the bot will never know. */
const nonsense = n => "q" + n.toString(26).split("").map(c => String.fromCharCode(97 + parseInt(c, 26))).join("") + "zv";

function checkSoloInvariants(game, label) {
  assert.equal(game.mode, "solo", label);
  for (const f of MULTIPLAYER_FIELDS) assert.equal(game[f], undefined, `${label}: solo state has no ${f}`);
  game.moves.forEach((m, i) => {
    assert.equal(m.number, i + 1, `${label}: contiguous numbers`);
    for (const f of MOVE_MULTIPLAYER_FIELDS) assert.equal(m[f], undefined, `${label}: solo move has no ${f}`);
    if (i === 0) assert.equal(m.prompts, null, `${label}: first move has no prompts`);
    else assert.deepEqual(m.prompts, [game.moves[i - 1].words.a, game.moves[i - 1].words.b], `${label}: prompts are the previous reveal`);
    if (m.status === "OPEN") assert.equal(m.words, null, `${label}: open move shows nothing`);
    else {
      assert.equal(m.hidden, undefined, `${label}: revealed moves drop the locked word`);
      assert.equal(m.status, moveOutcome(m.number, m.words.a, m.words.b));
    }
  });
  const last = currentMove(game);
  if (game.status === "ACTIVE") {
    assert.equal(last.status, "OPEN", label);
    assert.ok(last.hidden?.b, `${label}: the bot has locked a word for the open move`);
    assert.ok(!usedKeys(game).has(wordKey(last.hidden.b)), `${label}: locked bot word is new to the game`);
    assert.equal(publicMove(last).hidden, undefined, `${label}: display copy hides the bot word`);
  } else {
    assert.ok(FINISHED.has(game.status));
    assert.equal(last.status, game.status);
    assert.equal(last.hidden, undefined, `${label}: finished games keep no locked word`);
  }
  // The bot never used any word that was already in the game when it chose.
  const seen = new Set();
  for (const m of game.moves.filter(x => x.words)) {
    assert.ok(!seen.has(wordKey(m.words.b)), `${label}: bot reused ${m.words.b}`);
    seen.add(wordKey(m.words.a));
    seen.add(wordKey(m.words.b));
  }
}

test("fresh Solo game: one open move, no prompts, nothing revealed, no multiplayer fields", () => {
  const game = startSoloGame({id: "fresh", seed: 1, now: "2026-01-01T00:00:00.000Z"});
  assert.equal(game.status, "ACTIVE");
  assert.equal(game.moves.length, 1);
  assert.equal(game.createdAt, "2026-01-01T00:00:00.000Z");
  const shown = publicMove(currentMove(game));
  assert.deepEqual(shown, {number: 1, prompts: null, words: null, status: "OPEN", openedAt: "2026-01-01T00:00:00.000Z", revealedAt: null});
  checkSoloInvariants(game, "fresh");
});

test("OPEN -> REVEALED: the bot's pre-locked word is revealed with the player's and both become the prompts", () => {
  const game = startSoloGame({id: "reveal", seed: 2});
  const botWord = currentMove(game).hidden.b;
  const word = nonsense(1);
  const r = submitSoloWord(game, `  ${word.toUpperCase()}! `, "2026-03-03T00:00:00.000Z");
  assert.equal(r.ok, true);
  assert.equal(r.move.number, 1);
  assert.equal(r.move.status, "REVEALED");
  assert.deepEqual(r.move.words, {a: word.toUpperCase(), b: botWord});
  assert.equal(r.move.revealedAt, "2026-03-03T00:00:00.000Z");
  assert.ok(r.move.botQuality);
  assert.equal(r.move.hidden, undefined);
  assert.deepEqual(r.game.moves[0], r.move);
  assert.deepEqual(currentMove(r.game).prompts, [word.toUpperCase(), botWord]);
  assert.equal(currentMove(r.game).number, 2);
  checkSoloInvariants(r.game, "after reveal");
});

test("the bot cannot see the player's word: whatever the player types, the bot's word is the same", () => {
  for (let seed = 1; seed <= 20; seed++) {
    let game = startSoloGame({id: `ind-${seed}`, seed});
    for (let move = 0; move < 3 && !isFinished(game); move++) {
      const locked = currentMove(game).hidden.b;
      const outcomes = [nonsense(seed * 10 + move), "elephant", "rainbow"].map(w => submitSoloWord(game, w)).filter(r => r.ok);
      for (const r of outcomes) assert.equal(r.move.words.b, locked);
      game = outcomes[0].game;
    }
  }
});

test("refresh (JSON round trip) never re-rolls the bot", () => {
  const game = startSoloGame({id: "refresh", seed: 3});
  const restored = JSON.parse(JSON.stringify(game));
  assert.equal(submitSoloWord(restored, nonsense(3)).move.words.b, currentMove(game).hidden.b);
});

test("OPEN -> MATCHED: typing the bot's word ends the game early; nothing opens after", () => {
  let game = startSoloGame({id: "match", seed: 4});
  game = submitSoloWord(game, nonsense(4)).game;
  const botWord = currentMove(game).hidden.b;
  const r = submitSoloWord(game, botWord.toUpperCase());
  assert.equal(r.ok, true);
  assert.equal(r.game.status, "MATCHED");
  assert.equal(r.move.status, "MATCHED");
  assert.equal(r.game.moves.length, 2);
  checkSoloInvariants(r.game, "matched");
  assert.equal(submitSoloWord(r.game, nonsense(5)).code, "GAME_OVER");
});

test("OPEN(move 20) -> EXHAUSTED, then every submission is refused", () => {
  let game = startSoloGame({id: "exhaust", seed: 5});
  for (let i = 1; i <= MAX_MOVES; i++) {
    assert.equal(game.status, "ACTIVE");
    const r = submitSoloWord(game, nonsense(100 + i));
    assert.equal(r.ok, true);
    assert.equal(r.move.number, i);
    game = r.game;
    checkSoloInvariants(game, `move ${i}`);
  }
  assert.equal(game.status, "EXHAUSTED");
  assert.equal(game.moves.length, MAX_MOVES);
  const r = submitSoloWord(game, nonsense(999));
  assert.deepEqual(r, {ok: false, code: "GAME_OVER"});
});

test("player word errors return a code and leave the game untouched", () => {
  let game = startSoloGame({id: "codes", seed: 6});
  game = submitSoloWord(game, "Pebble").game;
  game = submitSoloWord(game, nonsense(6)).game;
  const frozen = deepFreeze(game);
  const before = JSON.stringify(frozen);
  const cases = {"": "EMPTY", "  ": "EMPTY", "abc1": "INVALID_CHARACTERS", ["x".repeat(30)]: "TOO_LONG", "a": "TOO_SHORT", "one two three four": "TOO_MANY_WORDS"};
  for (const [raw, code] of Object.entries(cases)) {
    const r = submitSoloWord(frozen, raw);
    assert.equal(r.ok, false);
    assert.equal(r.code, code, raw);
    assert.equal(r.game, undefined);
  }
  assert.equal(submitSoloWord(frozen, nonsense(6).toUpperCase()).code, "SAME_AS_LAST");
  assert.equal(submitSoloWord(frozen, "pebble!").code, "ALREADY_USED");
  assert.equal(JSON.stringify(frozen), before);
});

test("the player may answer with a word the bot already played", () => {
  let game = startSoloGame({id: "other-side", seed: 7});
  const r1 = submitSoloWord(game, nonsense(7));
  if (r1.game.status !== "ACTIVE") return;
  const r2 = submitSoloWord(r1.game, r1.move.words.b);
  assert.equal(r2.ok, true);
});

test("submitting never mutates the saved game", () => {
  const game = deepFreeze(startSoloGame({id: "immut", seed: 8}));
  const before = JSON.stringify(game);
  const r = submitSoloWord(game, nonsense(8));
  assert.ok(r.ok);
  assert.equal(JSON.stringify(game), before);
});

test("new games start from scratch: no words carried over from a previous game", () => {
  let old = startSoloGame({id: "old", seed: 9});
  for (let i = 0; i < 5 && !isFinished(old); i++) old = submitSoloWord(old, nonsense(900 + i)).game;
  const fresh = startSoloGame({id: "new", seed: 10});
  assert.equal(fresh.moves.length, 1);
  assert.equal(usedKeys(fresh).size, 0);
  assert.equal(currentMove(fresh).prompts, null);
  assert.equal(JSON.stringify(fresh).includes(nonsense(900)), false);
});

test("opening words vary between new games", () => {
  const openings = new Set();
  for (let seed = 1; seed <= 40; seed++) openings.add(currentMove(startSoloGame({id: `v${seed}`, seed})).hidden.b);
  assert.ok(openings.size >= 10, `only ${openings.size} different openings`);
});

test("a saved game missing its locked bot word (or holding a used one) still plays without peeking", () => {
  let game = startSoloGame({id: "heal", seed: 11});
  game = submitSoloWord(game, nonsense(11)).game;
  const {hidden, ...bare} = currentMove(game);
  const missing = {...game, moves: [...game.moves.slice(0, -1), bare]};
  const r = submitSoloWord(missing, nonsense(12));
  assert.equal(r.ok, true);
  assert.equal(r.move.words.b, hidden.b, "re-locking is deterministic and ignores the player's word");
  const stale = {...game, moves: [...game.moves.slice(0, -1), {...bare, hidden: {b: game.moves[0].words.b, quality: "loose"}}]};
  const r2 = submitSoloWord(stale, nonsense(13));
  assert.equal(r2.ok, true);
  assert.notEqual(wordKey(r2.move.words.b), wordKey(game.moves[0].words.b), "bot did not reuse a game word");
});

test("property: random Solo games (EN and FR) keep every invariant after every step", () => {
  for (const language of ["en", "fr"]) {
    const vocab = getLexicon(language).words;
    let finished = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = seededRandom(seed * 7919);
      let game = startSoloGame({id: `prop-${language}-${seed}`, language, seed});
      checkSoloInvariants(game, `${language}/${seed} start`);
      let guard = 0;
      while (!isFinished(game) && guard++ < 200) {
        // Lean on real lexicon words so collisions with the bot actually happen.
        const raw = rng() < 0.85 ? vocab[Math.floor(rng() * vocab.length)] : nonsense(seed * 1000 + guard);
        const before = currentMove(game);
        const r = submitSoloWord(game, raw);
        if (!r.ok) {
          assert.ok(["SAME_AS_LAST", "ALREADY_USED", "TOO_LONG", "TOO_MANY_WORDS", "INVALID_CHARACTERS", "TOO_SHORT"].includes(r.code), `${raw}: ${r.code}`);
          continue;
        }
        assert.equal(r.move.number, before.number);
        assert.equal(r.move.words.b, before.hidden.b, "revealed bot word is the one locked before the player typed");
        game = r.game;
        checkSoloInvariants(game, `${language}/${seed} move ${r.move.number}`);
      }
      assert.ok(isFinished(game));
      finished++;
    }
    assert.equal(finished, 60);
  }
});
