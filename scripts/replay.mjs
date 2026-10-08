#!/usr/bin/env node
// Replay Solo bot decisions: the old engine (engine-1 on lexicon-1), the previous engine (engine-2.2
// on lexicon-3, frozen in src/shared/engine-2.2.js) and the current engine side by side, on the
// versioned fixtures (test/fixtures/bot-replay.json) or on rounds from a log export. A logged round
// made by engine-2.2 is reproduced exactly by the frozen copy (same input, same seed).
//
//   node scripts/replay.mjs                               fixtures, table on stdout
//   node scripts/replay.mjs --format csv > replay.csv     fixtures as CSV (or --format json)
//   node scripts/replay.mjs --log export.json             replay logged rounds from a /review JSON export
//                                                         (server "Export JSON" or "Export device JSON")
//
// This is read-only: it never changes the engine, the dataset or the fixtures. Promoting a logged
// round to a fixture (and tuning against it) is a deliberate, reviewed edit (see docs/BOT_ENGINE.md).

import {readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {chooseResponse} from "../src/shared/bot.js";
import {ENGINE_VERSION, STAGE_NAMES, STRONGEST_CONFIG, selectBotWord} from "../src/shared/engine.js";
import {selectBotWord as selectBotWord22} from "../src/shared/engine-2.2.js";
import {lemmaKeys} from "../src/shared/morph.js";
import {wordKey} from "../src/shared/words.js";
import {csvCell} from "../src/shared/gamelog.js";

export const FIXTURES = fileURLToPath(new URL("../test/fixtures/bot-replay.json", import.meta.url));
const STAGE_NUMBER = Object.fromEntries(Object.entries(STAGE_NAMES).map(([n, name]) => [name, Number(n)]));
/** Stage number of a decision (special stages such as unknown-input count as 7). */
export const stageNumber = name => STAGE_NUMBER[name] ?? (name === "recovery" ? 4 : 7);

/** engine-2.2 (frozen, on lexicon-3): for replaying rounds it logged. */
export function previousEngine({pair, blocked = [], language = "en", seed = 0}) {
  try {
    return selectBotWord22({pair, blocked, language, seed}).word;
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

/** The original engine (engine-1) on the data it shipped with (lexicon-1). */
export function oldEngine({pair, blocked = [], language = "en"}) {
  const excludeKeys = new Set([...blocked, ...pair].flatMap(w => [...lemmaKeys(w, language)]));
  try {
    return chooseResponse({prompts: pair, language, excludeKeys, rng: () => 0.5, dataset: "lexicon-1"}).word;
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

const same = (a, b) => wordKey(String(a || "")) === wordKey(String(b || ""));

/**
 * Run one case through both engines and check it against its expectations.
 * @returns {{id: string, category: string, language: string, pair: string[], blocked: number, original: string | null,
 *   old: string, previous: string, top: string, current: string, recovery: boolean, band: string | null, stage: string, lowQuality: boolean, pool: string[], ms: number, verdict: string, problems: string[]}}
 */
export function replayCase(c) {
  const input = {pair: c.pair, blocked: c.blocked || [], history: c.history || [], language: c.language, character: c.character || "gary", seed: c.seed ?? 0};
  const t0 = performance.now();
  const {word, decision} = selectBotWord(input);
  const ms = performance.now() - t0;
  // The single strongest answer (a quality window of one): what `acceptable` describes.
  const top = selectBotWord({...input, config: STRONGEST_CONFIG}).word;
  const expect = c.expect || {};
  const problems = [];
  const blockedKeys = new Set([...(c.blocked || []), ...c.pair].flatMap(w => [...lemmaKeys(w, c.language)]));
  if (!word || !String(word).trim()) problems.push("no word");
  if ([...lemmaKeys(word, c.language)].some(k => blockedKeys.has(k))) problems.push("blocked or input word returned");
  if (!decision.pool.some(w => same(w, word))) problems.push(`${word} is outside the pool it was drawn from`);
  for (const w of [word, top]) if (expect.reject?.some(r => same(r, w))) problems.push(`rejected answer ${w}`);
  if (expect.acceptable && !expect.acceptable.some(w => same(w, top))) problems.push(`strongest answer ${top} is not among the acceptable answers`);
  if (expect.maxStage && stageNumber(decision.stage) > expect.maxStage) problems.push(`stage ${decision.stage} is weaker than stage ${expect.maxStage}`);
  if (expect.lowQuality !== undefined && Boolean(decision.lowQuality) !== expect.lowQuality) problems.push(`low-quality indicator ${decision.lowQuality} (expected ${expect.lowQuality})`);
  if (expect.recovery !== undefined && Boolean(decision.recovery) !== expect.recovery) problems.push(`recovery ${decision.recovery} (expected ${expect.recovery})`);
  const verdict = problems.length ? (c.status === "known-gap" ? "known gap" : "FAIL") : "ok";
  return {id: c.id, category: c.category || "", language: c.language, pair: c.pair, blocked: (c.blocked || []).length,
    original: c.original?.word || null, old: oldEngine(c), previous: previousEngine(input), top, current: word, recovery: Boolean(decision.recovery), band: decision.band || null, stage: decision.stage, lowQuality: Boolean(decision.lowQuality),
    pool: decision.pool, ms: Math.round(ms * 10) / 10, verdict, problems};
}

/** Turn a /review JSON export into replay cases (each round's input rebuilt from the game). */
export function casesFromLog(exported) {
  const cases = [];
  for (const g of exported.games || []) {
    const rounds = (g.rounds_list || []).slice().sort((a, b) => a.round - b.round);
    const used = [], history = [];
    for (const r of rounds) {
      const pair = r.pair_a ? [r.pair_a, r.pair_b] : null;
      if (pair) {
        cases.push({id: `${g.game_id}#${r.round}`, category: `log · ${g.character} · ${g.engine_version || "?"}`, language: g.language, pair, character: g.character,
          blocked: [...used], history: history.slice(), seed: r.decision?.seed ?? 0, original: {engine: g.engine_version, word: r.bot_word}, flags: r.flags || [], expect: {}, status: "logged"});
      }
      used.push(r.user_word, r.bot_word);
      history.push({a: r.user_word, b: r.bot_word});
    }
  }
  return cases;
}

const COLUMNS = ["id", "category", "language", "pair", "blocked", "original", "old", "previous", "top", "current", "band", "stage", "lowQuality", "recovery", "pool", "ms", "verdict", "problems"];
const cell = (row, key) => (Array.isArray(row[key]) ? row[key].join(key === "pair" ? " + " : "; ") : row[key] ?? "");

export function toTable(rows) {
  const lines = [["case", "pair", "original", "engine-1", "engine-2.2", "strongest", `${ENGINE_VERSION} pick`, "stage", "verdict"]];
  for (const r of rows) lines.push([r.id, `${r.pair.join(" + ")}${r.blocked ? ` (−${r.blocked})` : ""}`, r.original || "", r.old, r.previous, r.top, `${r.current}${r.band ? ` (${r.band})` : ""}`, `${r.stage}${r.recovery ? " RECOVERY" : r.lowQuality ? " LOW" : ""}`, `${r.verdict}${r.problems.length ? `: ${r.problems.join("; ")}` : ""}`]);
  const widths = lines[0].map((_, i) => Math.min(40, Math.max(...lines.map(l => String(l[i]).length))));
  return lines.map(l => l.map((v, i) => String(v).padEnd(widths[i])).join("  ").trimEnd()).join("\n");
}

function main(argv) {
  const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const format = arg("--format") || "table";
  const log = arg("--log");
  const cases = log ? casesFromLog(JSON.parse(readFileSync(log, "utf8"))) : JSON.parse(readFileSync(arg("--fixtures") || FIXTURES, "utf8")).cases;
  const rows = cases.map(replayCase);
  let out;
  if (format === "json") out = JSON.stringify({engine: ENGINE_VERSION, replayed_at: new Date().toISOString(), rows}, null, 2);
  else if (format === "csv") out = [COLUMNS.join(","), ...rows.map(r => COLUMNS.map(k => csvCell(cell(r, k))).join(","))].join("\r\n");
  else {
    const failed = rows.filter(r => r.verdict === "FAIL").length, gaps = rows.filter(r => r.verdict === "known gap").length;
    const changed = rows.filter(r => !same(r.old, r.current)).length, changed22 = rows.filter(r => !same(r.previous, r.current)).length;
    out = `${toTable(rows)}\n\n${rows.length} cases · ${changed} changed from engine-1 · ${changed22} changed from engine-2.2 · ${failed} failing · ${gaps} known gaps`;
  }
  const file = arg("--out");
  if (file) writeFileSync(file, `${out}\n`); else process.stdout.write(`${out}\n`);
  return rows.some(r => r.verdict === "FAIL") ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
