import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE_CONFIG, selectBotWord} from "../src/shared/engine.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {currentMove, seededRandom, usedKeys} from "../src/shared/rules.js";
import {moveSeed, publicMove, selectContextualBotWord, startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {wordKey} from "../src/shared/words.js";

const PLAYER_WORDS = ["sun", "sky", "night", "dream", "bed", "pillow", "blanket", "cozy", "winter", "snow", "cold", "ice", "skating", "fun", "party", "cake", "candle", "birthday", "gift", "surprise", "happy"];

function playOut(seed, language = "en") {
  let game = startSoloGame({id: `game-${seed}`, language, seed});
  const words = [];
  for (const word of PLAYER_WORDS) {
    if (game.status !== "ACTIVE") break;
    const before = currentMove(game);
    const result = submitSoloWord(game, word);
    if (!result.ok) { assert.ok(["ALREADY_USED", "SAME_AS_LAST"].includes(result.code), result.code); continue; }
    assert.equal(result.move.number, before.number);
    assert.equal(result.move.words.a, word);
    words.push(result.move.words.b);
    game = result.game;
  }
  return {game, words};
}

test("a fresh Solo game is blank: no prompts, nothing revealed, bot word hidden", () => {
  const game = startSoloGame({id: "blank", seed: 7});
  const move = currentMove(game);
  assert.equal(move.prompts, null);
  assert.equal(move.words, null);
  assert.equal(typeof move.hidden.b, "string");
  assert.equal(publicMove(move).hidden, undefined);
});

test("the bot locks its word before the player types, so the player's word cannot influence it", () => {
  const base = startSoloGame({id: "fair", seed: 11});
  const locked = currentMove(base).hidden.b;
  const a = submitSoloWord(structuredClone(base), locked === "sun" ? "moon" : "sun");
  const b = submitSoloWord(structuredClone(base), locked === "cake" ? "party" : "cake");
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.move.words.b, locked);
  assert.equal(b.move.words.b, locked);
});

test("Solo plays through: prompts chain, bot never repeats any game word, game ends cleanly", () => {
  for (let seed = 0; seed < 20; seed++) {
    const {game, words} = playOut(seed);
    assert.equal(new Set(words.map(wordKey)).size, words.length);
    for (let i = 1; i < game.moves.length; i++) {
      const previous = game.moves[i - 1];
      const current = game.moves[i];
      if (previous.words && current.prompts) assert.deepEqual(current.prompts, [previous.words.a, previous.words.b]);
    }
    assert.ok(["ACTIVE", "FINISHED"].includes(game.status));
  }
});

test("Solo reaches the 20-move limit with a valid end state", () => {
  const lex = getLexicon("en");
  const all = [...lex.concepts.values()].map(c => c.label);
  let game = startSoloGame({id: "limit", seed: 91});
  let cursor = 0;
  while (game.status === "ACTIVE") {
    let result = {ok: false};
    while (!result.ok) result = submitSoloWord(game, all[cursor++ % all.length]);
    game = result.game;
    if (cursor > all.length * 2) assert.fail("could not find enough legal words");
  }
  assert.equal(game.moves.filter(m => m.words).length, 20);
});

test("openings vary between new games; a response to the same pair only varies within its quality window", () => {
  const openings = new Set();
  for (let seed = 0; seed < 20; seed++) openings.add(currentMove(startSoloGame({id: `opening-${seed}`, seed})).hidden.b);
  assert.ok(openings.size > 2);

  const words = new Set();
  for (let seed = 0; seed < 50; seed++) words.add(selectBotWord({pair: ["dog", "cat"], seed}).word);
  assert.ok(words.size >= 1);
  for (const word of words) {
    const result = selectBotWord({pair: ["dog", "cat"], seed: 0});
    const candidate = result.decision.candidates.find(c => c.word === word);
    assert.ok(candidate?.highQuality, word);
  }
});

test("bot responses relate to both prompts", () => {
  const pairs = [["dog", "cat"], ["sun", "moon"], ["cake", "party"], ["snow", "cold"], ["book", "school"]];
  for (const pair of pairs) {
    const pick = selectBotWord({pair, seed: 17});
    const selected = pick.decision.candidates.find(c => c.word === pick.word);
    assert.ok(selected, `${pair.join("+")} -> ${pick.word}`);
    assert.ok(selected.relA > 0 && selected.relB > 0, `${pair.join("+")} -> ${pick.word}: ${selected.relA}/${selected.relB}`);
  }
});

test("bot excludes used words and handles unknown prompts gracefully", () => {
  const first = selectBotWord({pair: ["dog", "cat"], seed: 1});
  const second = selectBotWord({pair: ["dog", "cat"], blocked: [first.word], seed: 1});
  assert.notEqual(wordKey(first.word), wordKey(second.word));
  const unknown = selectBotWord({pair: ["flibbertigibbet", "dog"], seed: 1});
  assert.equal(typeof unknown.word, "string");
  assert.equal(unknown.decision.lowQuality, true);
});

test("French Solo uses the French word pool", () => {
  let game = startSoloGame({id: "fr", language: "fr", seed: 5});
  const fr = getLexicon("fr");
  for (let i = 0; i < 5 && game.status === "ACTIVE"; i++) {
    const bot = currentMove(game).hidden.b;
    assert.ok(fr.byKey.has(wordKey(bot)), bot);
    const candidate = [...fr.concepts.values()].find(c => !usedKeys(game).has(c.key) && wordKey(c.label) !== wordKey(bot));
    const result = submitSoloWord(game, candidate.label);
    assert.equal(result.ok, true);
    game = result.game;
  }
});

test("Solo duplicate rules: same word twice in a row and reused words are blocked", () => {
  let game = startSoloGame({id: "dup", seed: 3});
  let r = submitSoloWord(game, currentMove(game).hidden.b === "zebra" ? "giraffe" : "zebra");
  game = r.game;
  if (game.status !== "ACTIVE") return;
  const first = game.moves[0].words.a;
  assert.equal(submitSoloWord(game, first).code, "SAME_AS_LAST");
  assert.equal(submitSoloWord(game, "   ").code, "EMPTY");
  assert.ok(usedKeys(game).has(wordKey(first)));
});

test("each bot word comes from the exact current prompts, one word per move", () => {
  for (const language of ["en", "fr"]) {
    for (let seed = 1; seed <= 10; seed++) {
      let game = startSoloGame({id: `exact-${language}-${seed}`, language, seed});
      const lex = getLexicon(language);
      const all = [...lex.concepts.values()];
      const random = seededRandom(seed * 31);
      for (let n = 0; n < 19 && game.status === "ACTIVE"; n++) {
        const move = currentMove(game);
        const hidden = move.hidden.b;
        assert.equal(typeof hidden, "string");
        assert.ok(hidden.split(" ").length <= 3, hidden);
        if (move.prompts) {
          // Recomputing from exactly the production selector's inputs (this move's prompts, revealed
          // words and rounds, language, character and move seed) gives the same contextual word.
          const blocked = game.moves.flatMap(m => (m.words ? [m.words.a, m.words.b] : []));
          const history = game.moves.flatMap(m => (m.words ? [{a: m.words.a, b: m.words.b}] : []));
          const again = selectContextualBotWord({pair: move.prompts, blocked, history, language, character: "gary", seed: moveSeed(game, move.number)});
          assert.equal(again.word, hidden, `move ${move.number}`);
          assert.deepEqual(again.decision, move.hidden.decision, "the stored decision is the one that chose the word");
        }
        let r = {ok: false};
        while (!r.ok) r = submitSoloWord(game, all[Math.floor(random() * all.length)].label);
        assert.equal(r.move.words.b, hidden, "the revealed bot word is the locked one");
        game = r.game;
      }
    }
  }
});

test("French games use French vocabulary only (200 games)", () => {
  const fr = getLexicon("fr"), en = getLexicon("en");
  const frOnly = word => fr.byKey.has(wordKey(word));
  const enOnly = word => en.byKey.has(wordKey(word));
  let checked = 0;
  for (let seed = 0; seed < 200; seed++) {
    const game = startSoloGame({id: `fr-${seed}`, language: "fr", seed});
    const word = currentMove(game).hidden.b;
    assert.ok(frOnly(word), word);
    checked++;
  }
  assert.equal(checked, 200);
  assert.ok(enOnly("dog"));
});

test("one-letter and unusual player words never break the bot", () => {
  for (const word of ["x", "q", "zzzzz", "123", "hello-there"]) {
    const game = startSoloGame({id: `odd-${word}`, seed: 21});
    const result = submitSoloWord(game, word);
    if (!result.ok) assert.ok(["TOO_SHORT", "INVALID", "SAME_AS_LAST", "ALREADY_USED"].includes(result.code));
  }
});
