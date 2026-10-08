// Gary and Milo are presentation only: both play with the exact same word engine, so the same game
// gives the same words whoever the player chose, and every engine rule (human-first, weak-side,
// lazy-answer) holds for both because there is only one engine.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile, readdir} from "node:fs/promises";
import {currentMove} from "../src/shared/rules.js";
import {setGaryDiagnostics, startSoloGame, submitSoloWord} from "../src/shared/solo.js";

const HUMAN = ["sea", "sand", "castle", "lobster", "sandbox", "jogging", "butter", "fly", "banana", "rocket", "garden", "violin"];

function play(character, seed, language = "en") {
  let game = startSoloGame({id: `g-${seed}`, language, seed, character, now: "2026-01-01T00:00:00.000Z"});
  const words = [currentMove(game).hidden.b];
  const decisions = [];
  for (const word of HUMAN) {
    if (game.status !== "ACTIVE") break;
    const r = submitSoloWord(game, word, "2026-01-01T00:00:01.000Z");
    if (!r.ok) continue;
    game = r.game;
    decisions.push(r.move.garyDecision ?? null);
    if (game.status === "ACTIVE") words.push(currentMove(game).hidden.b);
  }
  return {game, words, decisions};
}

test("same seed, same player words: Gary and Milo pick exactly the same words (and the same reasons)", () => {
  setGaryDiagnostics(true);
  try {
    for (const language of ["en", "fr"]) {
      for (let seed = 1; seed <= 25; seed++) {
        const gary = play("gary", seed, language), milo = play("milo", seed, language);
        assert.deepEqual(milo.words, gary.words, `${language} seed ${seed}`);
        assert.deepEqual(milo.decisions, gary.decisions, "identical ranking, support checks and rejections");
        // Identical game state, apart from how long the open move's decision took (wall-clock time).
        const timeless = moves => moves.map(({hidden, ...m}) => (hidden ? {...m, hidden: {...hidden, ms: 0}} : m));
        assert.deepEqual(timeless(milo.game.moves), timeless(gary.game.moves));
        assert.equal(gary.game.character, "gary");
        assert.equal(milo.game.character, "milo");
      }
    }
  } finally {
    setGaryDiagnostics(false);
  }
});

test("determinism per character: the same game replays identically, and old games without a character are Gary's", () => {
  for (const character of ["gary", "milo"]) {
    for (let seed = 1; seed <= 10; seed++) assert.deepEqual(play(character, seed).words, play(character, seed).words);
  }
  const legacy = startSoloGame({id: "old", seed: 3});
  assert.equal(legacy.character, undefined);
  assert.deepEqual(play(undefined, 3).words, play("gary", 3).words);
});

test("the engine never reads the character: it is an explicit input, but no choice depends on it", async () => {
  const dir = new URL("../src/shared/", import.meta.url);
  for (const file of (await readdir(dir, {recursive: true})).filter(f => f.endsWith(".js"))) {
    const source = (await readFile(new URL(file, dir), "utf8")).replace(/^\s*(\/\/|\*).*$/gm, "");
    if (file === "solo.js") {
      // startSoloGame stores it; lockBotWord passes it to the engine as part of its explicit input.
      assert.equal((source.match(/\bcharacter\b/g) || []).length, 6, "solo.js stores the character and passes it on, nothing else");
      continue;
    }
    if (file === "engine.js") {
      // The engine takes it as an input and sets it aside (both characters share one baseline).
      assert.deepEqual(source.match(/.*\bcharacter\b.*/g).map(line => line.trim()), ['export function selectBotWord({pair, blocked = [], language = "en", character = "gary", seed = 0, config = ENGINE_CONFIG}) {', "void character;"]);
      continue;
    }
    if (file === "types.js") continue;
    assert.doesNotMatch(source, /\bcharacter\b|\bmilo\b/i, file);
  }
});
