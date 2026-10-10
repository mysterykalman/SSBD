// @ts-check
// Post-reveal analysis of one Solo round, for playtest review (logged with the round, never used to
// choose a word: the bot's word was committed before the player's word existed).
//
// The engine's decision already records how the BOT's word relates to the two clues. This adds the
// PLAYER's side (the `user_` word, as in the round record), which needs the lexicon and so cannot be worked out from an export alone:
//   user_rel        how the player's word relates to clue A and clue B (0..1, same scale as the
//                     engine's relA/relB) and the kind of each link
//   user_bot_rel    how close the player's word and the bot's word are to each other (0..1, kind)
//   user_rank       where the player's word sat in the bot's own logged candidate list (1 = the bot's
//                     top-ranked word), or null when it was not among them
// With the decision record this is enough to sort a round afterwards into: random / inexplicable,
// one-sided, understandable but frustrating, good miss, "I almost picked that", or a fun surprise
// (see docs/BOT_ENGINE.md, "Playtest export").

import {getLexicon} from "./lexicon/index.js";
import {understandWord} from "./understand.js";
import {relation} from "./engine.js";
import {lemmaKeys} from "./morph.js";

const round3 = x => Math.round(x * 1000) / 1000;

/**
 * @param {{prompts: [string, string] | null, words: {a: string, b: string}}} move a revealed move
 * @param {any} decision the engine decision committed before the reveal (or null)
 * @param {string} [language]
 */
export function roundAnalysis(move, decision, language = "en") {
  if (!move?.words) return null;
  const lex = getLexicon(language === "fr" ? "fr" : "en");
  const ids = word => understandWord(word, lex.language, lex).ids;
  const player = ids(move.words.a), bot = ids(move.words.b);
  const playerConcept = player.length ? lex.concepts.get(player[0]) : null;
  const botConcept = bot.length ? lex.concepts.get(bot[0]) : null;
  /** @type {{user_understood: boolean, user_rel: number[] | null, user_kinds: string[] | null, user_bot_rel: number | null, user_bot_kind: string | null, user_rank: number | null}} */
  const out = {user_understood: Boolean(playerConcept), user_rel: null, user_kinds: null, user_bot_rel: null, user_bot_kind: null, user_rank: null};
  if (playerConcept && move.prompts) {
    const [a, b] = move.prompts.map(w => relation(lex, ids(w), playerConcept));
    out.user_rel = [round3(a.score), round3(b.score)];
    out.user_kinds = [a.kind, b.kind];
  }
  if (playerConcept && botConcept) {
    if (playerConcept.id === botConcept.id) { out.user_bot_rel = 1; out.user_bot_kind = "same"; }
    else {
      const x = relation(lex, bot, playerConcept), y = relation(lex, player, botConcept);
      const best = x.score >= y.score ? x : y;
      out.user_bot_rel = round3(best.score);
      out.user_bot_kind = best.kind;
    }
  }
  const keys = new Set(lemmaKeys(move.words.a, lex.language));
  const index = (decision?.candidates || []).findIndex(c => [...lemmaKeys(c.word, lex.language)].some(k => keys.has(k)));
  out.user_rank = index >= 0 ? index + 1 : null;
  return out;
}
