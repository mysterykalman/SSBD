import {test} from "node:test";
import assert from "node:assert/strict";
import {ENGINE_CONFIG, selectBotWord} from "../src/shared/engine.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {currentMove, seededRandom, usedKeys} from "../src/shared/rules.js";
import {moveSeed, publicMove, startSoloGame, submitSoloWord} from "../src/shared/solo.js";
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
    if (result.game.status === "ACTIVE") assert.deepEqual(currentMove(result.game).prompts, [result.move.words.a, result.move.words.b]);
    game = result.game;
    words.push(result.move.words.b);
  }
  return {game, botWords: words};
}

test("a fresh Solo game is blank: no prompts, nothing revealed, bot word hidden", () => {
  const game = startSoloGame({id: "fresh", seed: 7});
  assert.equal(game.moves.length, 1);
  const move = currentMove(game);
  assert.equal(move.prompts, null);
  assert.equal(move.words, null);
  assert.ok(move.hidden.b, "bot has locked a word");
  assert.equal(publicMove(move).hidden, undefined, "display copy has no bot word");
});

test("the bot locks its word before the player types, so the player's word cannot influence it", () => {
  const game = startSoloGame({id: "independent", seed: 99});
  const locked = currentMove(game).hidden.b;
  const a = submitSoloWord(game, "banana"), b = submitSoloWord(game, locked);
  assert.equal(a.move.words.b, locked);
  assert.equal(b.move.words.b, locked);
  assert.equal(b.game.status, "MATCHED", "typing the bot's word is a match");
});

test("Solo plays through: prompts chain, bot never repeats any game word, game ends cleanly", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const {game, botWords} = playOut(seed);
    const revealedKeys = game.moves.filter(m => m.words).flatMap(m => [wordKey(m.words.a), wordKey(m.words.b)]);
    // Bot word at move n must not equal any word revealed before move n.
    game.moves.filter(m => m.words).forEach((m, i, list) => {
      const earlier = new Set(list.slice(0, i).flatMap(x => [wordKey(x.words.a), wordKey(x.words.b)]));
      assert.ok(!earlier.has(wordKey(m.words.b)), `bot reused ${m.words.b} (seed ${seed})`);
    });
    assert.equal(new Set(botWords.map(wordKey)).size, botWords.length);
    assert.ok(revealedKeys.length > 0);
    assert.ok(["ACTIVE", "MATCHED", "EXHAUSTED"].includes(game.status));
  }
});

test("Solo reaches the 20-move limit with a valid end state", () => {
  let game = startSoloGame({id: "long", seed: 1234});
  let n = 0;
  while (game.status === "ACTIVE" && n < 200) {
    const bot = currentMove(game).hidden.b;
    // A word guaranteed to be valid, unused and different from the bot's.
    const word = `zz${String.fromCharCode(97 + (n % 26))}${String.fromCharCode(97 + Math.floor(n / 26))}`;
    assert.notEqual(wordKey(word), wordKey(bot));
    const r = submitSoloWord(game, word);
    assert.ok(r.ok, r.code);
    game = r.game;
    n++;
  }
  assert.equal(game.status, "EXHAUSTED");
  assert.equal(game.moves.length, 20);
  assert.equal(currentMove(game).hidden, undefined);
});

test("openings vary between new games; a response to the same pair only varies within its quality window", () => {
  const openings = new Set();
  for (let seed = 1; seed <= 30; seed++) openings.add(currentMove(startSoloGame({id: `v${seed}`, seed})).hidden.b);
  assert.ok(openings.size >= 15, `only ${openings.size} distinct openings`);
  const responses = new Set(), pool = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const r = selectBotWord({pair: ["sun", "moon"], seed});
    responses.add(r.word);
    r.decision.pool.forEach(w => pool.add(w));
  }
  for (const w of responses) assert.ok(pool.has(w), `sun + moon gave ${w}, outside its quality window`);
  assert.ok(pool.size <= ENGINE_CONFIG.window.size);
  // And the same seed always gives the same word.
  for (let seed = 1; seed <= 10; seed++) assert.equal(selectBotWord({pair: ["sun", "moon"], seed}).word, selectBotWord({pair: ["sun", "moon"], seed}).word);
});

test("bot responses relate to both prompts", () => {
  const lex = getLexicon("en");
  const near = (a, b) => {
    const A = lex.concepts.get(lex.resolve(a)), B = lex.concepts.get(lex.resolve(b));
    return A.links.has(B.id) || [...A.links].some(x => B.links.has(x)) || A.tags.some(t => B.tags.includes(t));
  };
  const pairs = [["sun", "moon"], ["dog", "cat"], ["pizza", "cake"], ["beach", "summer"], ["dragon", "castle"], ["rain", "flower"], ["school", "book"], ["music", "party"]];
  for (const [a, b] of pairs) {
    for (let seed = 1; seed <= 10; seed++) {
      const pick = selectBotWord({pair: [a, b], seed});
      assert.equal(pick.quality, "strong", `${a}+${b} -> ${pick.word}`);
      assert.ok(near(pick.word, a) && near(pick.word, b), `${a}+${b} -> ${pick.word}`);
      assert.notEqual(wordKey(pick.word), wordKey(a));
      assert.notEqual(wordKey(pick.word), wordKey(b));
    }
  }
});

test("bot excludes used words and handles unknown prompts gracefully", () => {
  const exclude = new Set(["sky", "star", "night", "space", "light"].map(wordKey));
  for (let seed = 1; seed <= 10; seed++) {
    const pick = selectBotWord({pair: ["sun", "moon"], blocked: [...exclude], seed});
    assert.ok(!exclude.has(wordKey(pick.word)), pick.word);
  }
  const odd = selectBotWord({pair: ["zorblax", "quuxify"], seed: 1});
  assert.ok(odd.word && odd.quality === "loose");
  assert.equal(odd.decision.stage, "no-known-input");
  assert.equal(odd.decision.lowQuality, true);
  const compound = selectBotWord({pair: ["sunflower", "nightmare"], seed: 1});
  assert.ok(compound.word);
});

test("French Solo uses the French word pool", () => {
  const fr = getLexicon("fr");
  const game = startSoloGame({id: "fr", language: "fr", seed: 5});
  assert.ok(fr.resolve(currentMove(game).hidden.b), currentMove(game).hidden.b);
  const r = submitSoloWord(game, "soleil");
  assert.ok(r.ok);
  if (r.game.status === "ACTIVE") assert.ok(fr.resolve(currentMove(r.game).hidden.b));
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
          // Recomputing from exactly the engine's inputs (this move's prompts, the revealed words, the
          // language, the character and the move's seed) gives the same word.
          const blocked = game.moves.flatMap(m => (m.words ? [m.words.a, m.words.b] : []));
          const again = selectBotWord({pair: move.prompts, blocked, language, character: "gary", seed: moveSeed(game, move.number)});
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
  const playerWords = [...fr.concepts.values()].map(c => c.label);
  for (let seed = 1; seed <= 200; seed++) {
    let game = startSoloGame({id: `fr-${seed}`, language: "fr", seed});
    const random = seededRandom(seed);
    for (let n = 0; n < 6 && game.status === "ACTIVE"; n++) {
      const bot = currentMove(game).hidden.b;
      assert.ok(frOnly(bot), `seed ${seed}: ${bot} is not French`);
      // Some player words are English or nonsense; the bot must still answer in French.
      const typed = n % 3 === 2 ? [...en.concepts.values()][Math.floor(random() * en.concepts.size)].label : playerWords[Math.floor(random() * playerWords.length)];
      const r = submitSoloWord(game, typed);
      if (r.ok) game = r.game;
      else break;
    }
  }
});

test("one-letter and unusual player words never break the bot", () => {
  for (const language of ["en", "fr"]) {
    let game = startSoloGame({id: `odd-${language}`, language, seed: 11});
    for (const word of ["s", "I", "a", "zorblax", "é", "quuxify", "x", "velvet"]) {
      if (game.status !== "ACTIVE") break;
      const r = submitSoloWord(game, word);
      if (!r.ok) {
        // One-letter words may be refused by validation; that must be a normal error code.
        assert.ok(["TOO_SHORT", "ALREADY_USED", "SAME_AS_LAST"].includes(r.code), `${word}: ${r.code}`);
        continue;
      }
      game = r.game;
      if (game.status === "ACTIVE") {
        const bot = currentMove(game).hidden.b;
        assert.ok(bot && getLexicon(language).byKey.has(wordKey(bot)), `${word} -> ${bot}`);
      }
    }
  }
});
