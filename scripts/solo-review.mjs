#!/usr/bin/env node
// Manual quality review of simulated Solo games: plays games through the real Solo lifecycle
// against the "human" stand-in (scripts/convergence.mjs) and prints every round, marking the bot
// answers a person might need explained (recovery rounds, and answers below the high-quality
// threshold), so a reviewer can read them and judge.
//
//   node scripts/solo-review.mjs [--games 20] [--character milo|gary|both] [--transcripts 10] [--seed 7000]
//
// Read-only: it never changes the engine, the data or any fixture.

import {fileURLToPath} from "node:url";
import {PLAYERS, distribution, playGame} from "./convergence.mjs";

/** Play `games` games for a character; returns {results, rounds} with each round's facts. */
export function reviewGames({games = 20, character = "milo", seed = 7000, language = "en"} = {}) {
  const out = [];
  for (let i = 0; i < games; i++) {
    const transcript = [];
    const matched = playGame(PLAYERS.human, {seed: seed + i, character, language, transcript});
    out.push({game: i + 1, matched, rounds: transcript.map(r => {
      const d = r.decision || {};
      const tier = !d.pair ? "opening" : d.recovery ? "recovery" : d.highQuality ? "high" : d.stage === "anchored" ? "anchored" : "other";
      return {move: r.move, pair: r.pair, player: r.player, bot: r.bot, tier, reason: d.recoveryReason || "", rank: d.pickRank ?? null,
        plausibility: d.pickPlausibility ?? null, weak: d.pickWeak ?? null, unresolved: d.unresolvedInputs || 0, near: Boolean(d.nearMatch), style: Boolean(d.tieBreak?.changed)};
    })});
  }
  return out;
}

export function summary(list) {
  const rounds = list.flatMap(g => g.rounds).filter(r => r.pair);
  const share = f => (rounds.length ? rounds.filter(f).length / rounds.length : 0);
  return {
    ...distribution(list.map(g => g.matched)),
    rounds: rounds.length,
    highQuality: share(r => r.tier === "high"),
    anchored: share(r => r.tier === "anchored"),
    recovery: share(r => r.tier === "recovery"),
    recoveryAfterMove2: (() => { const later = rounds.filter(r => r.move > 2); return later.length ? later.filter(r => r.tier === "recovery").length / later.length : 0; })(),
    unresolved: share(r => r.unresolved > 0),
    nearMatch: share(r => r.near)
  };
}

const pct = x => `${Math.round(100 * x)}%`;
function printTranscript(g, character) {
  const lines = [`${character} game ${g.game}: ${g.matched ? `matched on move ${g.matched}` : "no match in 20 moves"}`];
  for (const r of g.rounds) {
    const mark = r.tier === "recovery" ? `  ← recovery (${r.reason})` : r.tier === "anchored" ? "  ← anchored (one side via shared neighbours)" : "";
    lines.push(`  ${String(r.move).padStart(2)}. ${(r.pair ? r.pair.join(" + ") : "(opening)").padEnd(28)} you ${String(r.player).padEnd(14)} ${character} ${String(r.bot).padEnd(14)}${r.near ? " [near-match]" : ""}${mark}`);
  }
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
  const games = Number(arg("--games", 20)), transcripts = Number(arg("--transcripts", 10)), seed = Number(arg("--seed", 7000));
  const who = arg("--character", "both");
  for (const character of who === "both" ? ["milo", "gary"] : [who]) {
    const list = reviewGames({games, character, seed});
    const s = summary(list);
    console.log(`\n=== ${character}: ${games} games · median match move ${s.medianMatched ?? "—"} · ≤5 ${pct(s.within5)} · ≤10 ${pct(s.within10)} · matched ${pct(s.matched)}`);
    console.log(`    rounds ${s.rounds} · high quality ${pct(s.highQuality)} · anchored ${pct(s.anchored)} · recovery ${pct(s.recovery)} (after move 2: ${pct(s.recoveryAfterMove2)}) · unresolved ${pct(s.unresolved)} · near-match ${pct(s.nearMatch)}`);
    const flagged = list.flatMap(g => g.rounds.filter(r => r.tier === "recovery" || r.tier === "anchored").map(r => `game ${g.game} move ${r.move}: ${r.pair.join(" + ")} → ${r.bot} (${r.tier})`));
    console.log(`    rounds to read (recovery or anchored): ${flagged.length}`);
    for (const line of flagged) console.log(`      ${line}`);
    for (const g of list.slice(0, Math.max(0, Math.ceil(transcripts / (who === "both" ? 2 : 1))))) console.log(`\n${printTranscript(g, character)}`);
  }
}
