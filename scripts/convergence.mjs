#!/usr/bin/env node
// How fast Solo games converge: plays many simulated games through the real Solo lifecycle
// (startSoloGame / submitSoloWord, so the bot commits each word before the "player" answers) against
// several stand-ins for a human player, and prints the match-by-move distribution.
//
//   node scripts/convergence.mjs [--games 400] [--format table|json]
//
// The stand-ins only approximate people (real players also use words the vocabulary does not know),
// so treat the output as a comparison between engine versions, not as a prediction of live metrics.
// Live numbers come from /review (Match within 5 / 10 moves, median moves to match).

import {fileURLToPath} from "node:url";
import {ENGINE_CONFIG, selectBotWord} from "../src/shared/engine.js";
import {chooseResponse} from "../src/shared/bot.js";
import {lemmaKeys} from "../src/shared/morph.js";
import {MAX_MOVES, checkWord, currentMove, hashString, isFinished} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";

const revealed = game => game.moves.filter(m => m.words).flatMap(m => [m.words.a, m.words.b]);

/** Stand-ins for the human side. Each sees exactly what the player sees: the latest pair and the used words. */
export const PLAYERS = {
  // Always the single strongest bridge (the most convergent possible player).
  obvious: ({pair, blocked, language, seed}) => selectBotWord({pair, blocked, language, seed, config: {...ENGINE_CONFIG, window: {...ENGINE_CONFIG.window, size: 1}}}).word,
  // Picks from the same quality window as the bot, independently (a varied, reasonable player).
  varied: ({pair, blocked, language, seed}) => selectBotWord({pair, blocked, language, seed: seed ^ 0x5bd1e995}).word,
  // The original human-prediction model (engine-1): what a typical person would most likely say.
  predictor: ({pair, blocked, language, seed}) => {
    if (!pair) return selectBotWord({pair, blocked, language, seed: seed ^ 0x1234567}).word;
    const excludeKeys = new Set([...blocked, ...pair].flatMap(w => [...lemmaKeys(w, language)]));
    return chooseResponse({prompts: pair, language, excludeKeys, rng: () => (seed % 1000) / 1000}).word;
  }
};

/** Play one game; returns the move it matched on, or null. */
export function playGame(player, {seed, language = "en"} = {}) {
  let game = startSoloGame({id: `sim-${seed}`, language, seed, character: seed % 2 ? "milo" : "gary"});
  while (!isFinished(game)) {
    const move = currentMove(game);
    const blocked = revealed(game);
    const pair = move.number === 1 ? null : move.prompts;
    let word = player({pair, blocked, language, seed: hashString(`human:${seed}:${move.number}`)});
    if (!checkWord(game, "a", word).ok) word = selectBotWord({pair, blocked: [...blocked, word], language, seed: hashString(`retry:${seed}:${move.number}`)}).word;
    const result = submitSoloWord(game, word);
    if (!result.ok) throw new Error(`${result.code}: ${word}`);
    game = result.game;
    if (game.status === "MATCHED") return result.move.number;
  }
  return null;
}

export function distribution(results) {
  const n = results.length;
  const matched = results.filter(x => x !== null).sort((a, b) => a - b);
  const within = k => results.filter(x => x !== null && x <= k).length / n;
  const median = matched.length ? matched[Math.floor((matched.length - 1) / 2)] : null;
  return {games: n, within3: within(3), within5: within(5), within10: within(10), matched: matched.length / n,
    medianMatched: median, fifteenPlus: results.filter(x => x === null || x >= 15).length / n};
}

export function simulate({games = 400, language = "en"} = {}) {
  const out = {};
  for (const [name, player] of Object.entries(PLAYERS)) {
    out[name] = distribution(Array.from({length: games}, (_, i) => playGame(player, {seed: 1000 + i, language})));
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const games = Number(arg("--games") || 400);
  const result = {en: simulate({games, language: "en"}), fr: simulate({games: Math.round(games / 2), language: "fr"})};
  if (arg("--format") === "json") console.log(JSON.stringify(result, null, 2));
  else {
    const pct = x => `${(100 * x).toFixed(0)}%`.padStart(5);
    console.log(`player stand-in   lang  games  ≤3     ≤5     ≤10    any    median  15+/none   (max ${MAX_MOVES} moves)`);
    for (const [lang, rows] of Object.entries(result)) for (const [name, d] of Object.entries(rows)) {
      console.log(`${name.padEnd(17)} ${lang}    ${String(d.games).padStart(5)}  ${pct(d.within3)}  ${pct(d.within5)}  ${pct(d.within10)}  ${pct(d.matched)}  ${String(d.medianMatched ?? "—").padStart(6)}  ${pct(d.fifteenPlus)}`);
    }
  }
}
