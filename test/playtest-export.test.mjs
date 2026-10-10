// Playtest export (engine-2.5.1): each round carries enough to classify the bot's answer afterwards
// (random, one-sided, understandable but frustrating, good miss, "I almost picked that", fun surprise)
// without asking the player anything, and each game has a summary computed from its stored rounds.
import {test, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import {handleApi} from "../src/server/api.js";
import {cleanRound, gameRecord, gameSummary, roundRecord, ONE_SIDED_WEAK} from "../src/shared/gamelog.js";
import {roundAnalysis} from "../src/shared/round-analysis.js";
import {ENGINE_CONFIG, ENGINE_VERSION, selectBotWord} from "../src/shared/engine.js";
import {DATASET_VERSION} from "../src/shared/lexicon/index.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {freshDatabase} from "./support/db.mjs";

const TOKEN = "review-secret-for-tests";
let db, env;
beforeEach(async () => { db = await freshDatabase(); env = {store: db.store, reviewToken: TOKEN}; });
afterEach(() => db.end());

async function api(path, {body, token} = {}) {
  const headers = {"content-type": "application/json", ...(token ? {authorization: `Bearer ${token}`} : {})};
  const res = await handleApi(new Request(`http://x${path}`, {method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined}), env);
  return {status: res.status, data: await res.json()};
}

/** Play a real Solo game, logging each reveal exactly as the app does (with the round analysis). */
function playLogged(id, words, character) {
  let game = startSoloGame({id, seed: 5, character, now: "2026-04-01T10:00:00.000Z"});
  const rounds = [];
  for (const w of words) {
    if (game.status !== "ACTIVE") break;
    const r = submitSoloWord(game, w, `2026-04-01T10:${String(rounds.length).padStart(2, "0")}:30.000Z`);
    if (!r.ok) continue;
    game = r.game;
    rounds.push(roundRecord(game, r.move, r.decision, r.decisionMs, null, roundAnalysis(r.move, r.decision, game.language)));
  }
  return {game, rounds, record: gameRecord(game, {engineVersion: ENGINE_VERSION, datasetVersion: DATASET_VERSION, config: ENGINE_CONFIG})};
}

test("round analysis: how the player's word relates to both clues and to the bot's word, and its rank in the bot's list", () => {
  const decision = selectBotWord({pair: ["oven", "cake"], seed: 1, character: "milo"}).decision;
  const pan = roundAnalysis({prompts: ["oven", "cake"], words: {a: "pans", b: decision.selected}}, decision, "en");
  assert.equal(pan.user_understood, true);
  assert.ok(pan.user_rel.every(x => x > 0), "PAN relates to both clues");
  assert.equal(pan.user_kinds.length, 2);
  const rank = decision.candidates.findIndex(c => c.word === "pan") + 1;
  assert.equal(pan.user_rank, rank > 0 ? rank : null, "plural forms are matched to the bot's candidates");
  assert.ok(typeof pan.user_bot_rel === "number");
  const same = roundAnalysis({prompts: ["oven", "cake"], words: {a: decision.selected, b: decision.selected}}, decision, "en");
  assert.equal(same.user_bot_rel, 1);
  assert.equal(same.user_bot_kind, "same");
  assert.equal(same.user_rank, 1);
  const odd = roundAnalysis({prompts: ["oven", "cake"], words: {a: "zorblax", b: decision.selected}}, decision, "en");
  assert.equal(odd.user_understood, false);
  assert.equal(odd.user_rel, null);
  assert.equal(odd.user_rank, null);
  // The opening move has no clues to relate to.
  assert.equal(roundAnalysis({prompts: null, words: {a: "dog", b: "cat"}}, null, "en").user_rel, null);
});

test("every round record carries the raw diagnostics needed to classify the answer afterwards", () => {
  const {rounds} = playLogged("pt-game-1", ["rain", "cloud", "storm", "umbrella", "wet"], "gary");
  for (const r of rounds.filter(x => x.pair)) {
    const d = r.decision;
    // Bot side: understanding, quality, both relations, balance, obviousness, why it won, profile influence.
    for (const key of ["inputs", "stage", "lowQuality", "recovery", "candidates", "pickWeak", "pickStrong", "pickBalance", "pickConsensus", "selection"]) assert.ok(key in d, key);
    for (const key of ["semanticTop", "profileTop", "profileChanged", "varied", "alternatives", "nearMatchApplied"]) assert.ok(key in d.selection, key);
    // Player side: the post-reveal round analysis.
    for (const key of ["user_understood", "user_rel", "user_kinds", "user_bot_rel", "user_bot_kind", "user_rank"]) assert.ok(key in r.analysis, key);
    // The upload validator keeps it.
    assert.deepEqual(cleanRound(r).analysis, r.analysis);
  }
});

test("game summary: character, moves, result, low-quality, unknown-input and one-sided counts, balance, near-match and trajectory influence", () => {
  const {game, rounds, record} = playLogged("pt-game-2", ["rain", "cloud", "storm", "umbrella", "wet", "puddle", "boots", "mud"], "milo");
  const s = gameSummary({...record, rounds_list: rounds});
  assert.deepEqual(Object.keys(s).sort(), ["avg_balance", "character", "low_quality_rounds", "moves", "near_match_rounds", "one_sided_picks", "profile_changed_rounds", "result", "trajectory_rounds", "unknown_input_rounds", "varied_rounds"].sort());
  assert.equal(s.character, "milo");
  assert.equal(s.moves, rounds.length);
  assert.equal(s.result, game.status === "MATCHED" ? "matched" : "in_progress");
  assert.equal(s.low_quality_rounds, rounds.filter(r => r.low_quality).length);
  assert.equal(s.one_sided_picks, rounds.filter(r => r.pair && r.decision.pickWeak < ONE_SIDED_WEAK).length);
  assert.ok(s.avg_balance === null || (s.avg_balance >= 0 && s.avg_balance <= 1));
  for (const k of ["unknown_input_rounds", "near_match_rounds", "trajectory_rounds", "profile_changed_rounds", "varied_rounds"]) assert.ok(Number.isInteger(s[k]) && s[k] <= s.moves, k);
});

test("server: the round analysis is stored, and the JSON export and games list carry each game's summary", async () => {
  const a = playLogged("pt-game-3", ["rain", "cloud", "storm", "umbrella"], "gary");
  assert.equal((await api("/api/log/batch", {body: {games: [a.record], rounds: a.rounds}})).data.rounds, a.rounds.length);
  const exported = (await api("/api/review/export?format=json", {token: TOKEN})).data;
  const g = exported.games.find(x => x.game_id === "pt-game-3");
  assert.equal(g.summary.character, "gary");
  assert.equal(g.summary.moves, a.rounds.length);
  for (const r of g.rounds_list.filter(x => x.pair_a)) {
    assert.ok(r.decision.roundAnalysis, "stored with the round's decision record");
    assert.ok("user_rel" in r.decision.roundAnalysis && "user_rank" in r.decision.roundAnalysis);
    assert.ok(r.decision.selection && typeof r.decision.pickBalance === "number");
  }
  const list = (await api("/api/review/games", {token: TOKEN})).data.games;
  assert.equal(list.find(x => x.game_id === "pt-game-3").summary.moves, a.rounds.length);
});
