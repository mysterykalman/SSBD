// Solo fairness: the bot commits its word for a round from what both players have already seen
// (the shared pair and the revealed rounds), before the player answers; nothing the player types
// that round (or a reload) can change it. Milo and Gary follow exactly the same rules.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ENGINE_CONFIG, STRONGEST_CONFIG, selectBotWord} from "../src/shared/engine.js";
import {currentMove} from "../src/shared/rules.js";
import {moveSeed, startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {PLAYERS, distribution, playGame} from "../scripts/convergence.mjs";

const revealedWords = game => game.moves.filter(m => m.words).flatMap(m => [m.words.a, m.words.b]);

test("the bot's decision input is only the shared pair, earlier revealed rounds, language, character and seed", () => {
  // Source audit: the single engine call in the Solo lifecycle, and what it is given.
  const solo = readFileSync(new URL("../src/shared/solo.js", import.meta.url), "utf8");
  const calls = solo.match(/selectBotWord\(\{[^}]*\}\)/g);
  assert.deepEqual(calls, ["selectBotWord({pair: move.prompts, blocked, history, language: game.language, character: game.character || \"gary\", seed: moveSeed(game, move.number)})"]);
  assert.match(solo, /const blocked = game\.moves\.flatMap\(m => \(m\.words \? \[m\.words\.a, m\.words\.b\] : \[\]\)\);/, "blocked = revealed words only");
  assert.match(solo, /const history = game\.moves\.flatMap\(m => \(m\.words \? \[\{a: m\.words\.a, b: m\.words\.b\}\] : \[\]\)\);/, "history = revealed rounds only");
  // And the committed decision records exactly that input.
  let game = startSoloGame({id: "audit", seed: 9});
  for (const word of ["garden", "violin", "rocket"]) {
    const r = submitSoloWord(game, word);
    if (!r.ok || r.game.status !== "ACTIVE") break;
    game = r.game;
    const move = currentMove(game);
    const d = move.hidden.decision;
    assert.deepEqual(d.pair, move.prompts, "the latest revealed pair");
    assert.equal(d.seed, moveSeed(game, move.number));
    const history = game.moves.filter(m => m.words).map(m => ({a: m.words.a, b: m.words.b}));
    assert.deepEqual(selectBotWord({pair: move.prompts, blocked: revealedWords(game), history, language: "en", seed: d.seed}).word, move.hidden.b, "re-deriving from the shared state gives the committed word");
  }
});

test("the next round's word is committed at the reveal, before the player's next answer exists", () => {
  let game = startSoloGame({id: "commit", seed: 4});
  assert.ok(currentMove(game).hidden?.b, "round 1 is committed when the game starts");
  for (const word of ["garden", "violin", "rocket", "pencil"]) {
    const r = submitSoloWord(game, word);
    if (!r.ok || r.game.status !== "ACTIVE") break;
    game = r.game;
    const next = currentMove(game);
    assert.ok(!next.words, "the next round is still open");
    assert.ok(next.hidden?.b, `round ${next.number} already holds the bot's word`);
    assert.deepEqual(next.prompts, [r.move.words.a, r.move.words.b], "built from the pair both players just saw");
  }
});

test("changing the player's answer (or a rejected attempt first) never changes the committed bot word", () => {
  for (let seed = 1; seed <= 12; seed++) {
    let game = startSoloGame({id: `same-${seed}`, seed});
    const r1 = submitSoloWord(game, "garden");
    if (!r1.ok || r1.game.status !== "ACTIVE") continue;
    game = r1.game;
    const committed = currentMove(game).hidden.b;
    // A rejected word (already used) leaves the game, and the committed word, untouched.
    const rejected = submitSoloWord(game, "garden");
    assert.equal(rejected.ok, false);
    assert.equal(currentMove(game).hidden.b, committed);
    const seen = new Set();
    for (const answer of ["whale", "pencil", "turtle", "lantern", "anchor", "carrot"]) {
      const r = submitSoloWord(game, answer);
      if (r.ok) seen.add(r.move.words.b);
    }
    assert.deepEqual([...seen], [committed], `seed ${seed}`);
  }
});

test("reload/resume keeps the committed word: a saved game reveals exactly the word locked before saving", () => {
  for (let seed = 1; seed <= 10; seed++) {
    let game = startSoloGame({id: `reload-${seed}`, seed});
    game = submitSoloWord(game, "garden").game;
    if (game.status !== "ACTIVE") continue;
    const before = currentMove(game).hidden.b;
    const restored = JSON.parse(JSON.stringify(game)); // what localStorage gives back after a reload
    assert.equal(currentMove(restored).hidden.b, before);
    const r = submitSoloWord(restored, "violin");
    if (r.ok) assert.equal(r.move.words.b, before);
    assert.equal(r.ok && r.decision.selected, r.ok && before, "the logged decision is the committed one");
  }
});

test("Gary and Milo follow the same fair-play rules: each commits before the reveal, from the shared state only", () => {
  for (let seed = 1; seed <= 15; seed++) {
    for (const character of ["gary", "milo"]) {
      let game = startSoloGame({id: `twin-${seed}`, seed, character});
      for (const word of ["garden", "violin", "rocket", "pencil", "turtle", "pillow"]) {
        const move = currentMove(game);
        assert.ok(move.hidden?.b, `${character}: committed before the player's word`);
        assert.equal(move.hidden.decision.character, character);
        const r = submitSoloWord(game, word);
        if (!r.ok) continue;
        assert.equal(r.move.words.b, move.hidden.b, "the revealed word is the committed one");
        if (r.game.status !== "ACTIVE") break;
        game = r.game;
      }
    }
  }
});

test("convergence is natural, not forced: no weaker word is chosen to make the game last longer", t => {
  // Simulated games against the most convergent possible player (who always plays the strongest
  // answer). Short games are fine when that is the natural outcome; what must hold is that the bot
  // never steps away from the best answer except to an equally good one.
  const games = 120;
  const results = Array.from({length: games}, (_, i) => playGame(PLAYERS.obvious, {seed: 500 + i}));
  t.diagnostic(JSON.stringify(distribution(results)));
  // Every simulated bot word was valid (playGame throws on an invalid or repeated word).
  assert.equal(results.length, games);
  // When only one answer is good enough, the bot plays exactly that answer; otherwise only answers
  // within the character's near-best range of it (never a weaker word to stretch the game).
  let checked = 0;
  for (const character of ["milo", "gary"]) {
    const margin = ENGINE_CONFIG.profiles[character].window.margin;
    for (const pair of [["sun", "beach"], ["cat", "dog"], ["paw", "fish"], ["trees", "bird"], ["bread", "butter"], ["lamp", "restaurant"], ["chicken", "sea"], ["rain", "bow"]]) {
      for (let seed = 1; seed <= 20; seed++) {
        const r = selectBotWord({pair, seed, character});
        const best = selectBotWord({pair, seed, character, config: STRONGEST_CONFIG}).word;
        if (r.decision.window.size === 1) { assert.equal(r.word, best, `${pair}`); checked++; }
        else {
          const top = r.decision.candidates.find(c => c.word === best), pick = r.decision.candidates.find(c => c.word === r.word);
          assert.ok(pick.profileScore >= top.profileScore - margin - 1e-9, `${character} ${pair}: ${r.word} is as good as ${best}`);
          assert.ok(pick.highQuality, `${character} ${pair}: ${r.word} clears the quality floor`);
        }
      }
    }
  }
  assert.ok(checked > 0);
});

