// Together reveals: a short, kind word after each pair, based on how close the two answers were.
// Presentation only (never fed back into the game). Deterministic per game and move, so both
// players see the same line, and a refresh shows the same one again. Lines rotate within each
// group, and the same line is never used for two rounds in a row.
import {hashString} from "../shared/rules.js";

/** Line keys (i18n.js) for each closeness group. */
export const REACTIONS = {
  close: ["reactClose1", "reactClose2", "reactClose3", "reactClose4"],
  related: ["reactRelated1", "reactRelated2", "reactRelated3", "reactRelated4"],
  apart: ["reactApart1", "reactApart2", "reactApart3", "reactApart4"],
  neutral: ["reactNeutral1", "reactNeutral2", "reactNeutral3", "reactNeutral4"]
};

/**
 * How close two revealed words are. Symmetric, so both players get the same answer:
 * "close" (the same idea or direct neighbours), "related" (they share a neighbour or a kind),
 * "apart" (both known, nothing in common) or "neutral" (a word the lexicon doesn't know: no judging).
 * @param {{resolve: (word: string) => string | null, concepts: Map<string, {near: Set<string>, kinds: Map<string, number>}>}} lex
 * @param {string} a
 * @param {string} b
 * @returns {"close" | "related" | "apart" | "neutral"}
 */
export function closeness(lex, a, b) {
  const x = lex.resolve(a), y = lex.resolve(b);
  const cx = x ? lex.concepts.get(x) : null, cy = y ? lex.concepts.get(y) : null;
  if (!cx || !cy) return "neutral";
  if (x === y || cx.near.has(y) || cy.near.has(x)) return "close";
  if ([...cx.near].some(n => cy.near.has(n)) || [...cx.kinds.keys()].some(kind => cy.kinds.has(kind))) return "related";
  return "apart";
}

/**
 * The reaction line key for every revealed, unmatched move of a game, in order (match and game-over
 * moves get none: they have their own moments). Rotates through each group, starting at a point
 * chosen by the game id, and skips ahead when the line would repeat the previous round's.
 * @param {Parameters<typeof closeness>[0]} lex
 * @param {string} gameId
 * @param {Array<{number: number, status: string, words: {a: string, b: string} | null}>} moves
 * @returns {Map<number, string>} move number → line key
 */
export function reactionKeys(lex, gameId, moves) {
  const out = new Map();
  const used = {close: 0, related: 0, apart: 0, neutral: 0};
  const start = hashString(`react:${gameId}`);
  let previous = null;
  for (const move of moves) {
    if (move.status !== "REVEALED" || !move.words) continue;
    const group = closeness(lex, move.words.a, move.words.b);
    const pool = REACTIONS[group];
    let key = pool[(start + used[group]++) % pool.length];
    if (key === previous) key = pool[(start + used[group]++) % pool.length];
    out.set(move.number, key);
    previous = key;
  }
  return out;
}
