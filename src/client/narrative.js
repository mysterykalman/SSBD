// The Solo characters' branching narratives (Gary and Milo). Presentation only: nothing here reads
// or changes the bot's word, the scoring or the game state, and nothing is stored. Every beat is
// re-derived from the game's own revealed moves, so the same game always shows the same dialogue
// (a reload never changes it).
//
// Each completed move gets ONE paired beat from ONE branch: a BEFORE line (after the player locks
// in, before the reveal) and an AFTER line (once both words are visible); wins add a POST-WIN line,
// a 20-move miss a FOLLOW-UP. Lines from different pairs are never combined. Both characters use
// the same branches and the same precedence; only their scripts, their win ranges and their
// long-game variants differ (src/client/gary-narrative.js, src/client/milo-narrative.js).

/** Small stable string hash (FNV-1a): each game starts every branch at its own offset. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// ---------- reading the game's direction (shared by every character) ----------

/** Connection quality of a completed, non-matching round: veryWeak 0, weak 1, good 2, strong 3, close 4. */
export function levelOf(round) {
  if (round.kind === "close") return 4;
  return {veryWeak: 0, weak: 1, good: 2, strong: 3}[round.strength] ?? 1;
}

/**
 * The game's direction from the completed rounds so far (oldest first, opening excluded):
 *   improving  the last two rounds each got better, or this one is close after a good/strong one
 *   drifting   the last two rounds each got worse, or a good/strong round then two weak/very weak ones
 *   stuck      three weak/very weak rounds in a row, or four rounds in a row without a strong/close one
 *   stable     none of these
 * @param {{strength: string, kind: string | null}[]} rounds
 * @returns {"improving" | "drifting" | "stuck" | "stable"}
 */
export function trendOf(rounds) {
  const l = rounds.map(levelOf), n = l.length;
  const last = rounds[n - 1];
  if ((n >= 3 && l[n - 3] < l[n - 2] && l[n - 2] < l[n - 1]) || (n >= 2 && last.kind === "close" && l[n - 2] >= 2 && l[n - 2] <= 3)) return "improving";
  if (n >= 3 && ((l[n - 3] > l[n - 2] && l[n - 2] > l[n - 1]) || (l[n - 3] >= 2 && l[n - 3] <= 3 && l[n - 2] <= 1 && l[n - 1] <= 1))) return "drifting";
  if ((n >= 3 && l.slice(-3).every(x => x <= 1)) || (n >= 4 && l.slice(-4).every(x => x <= 2))) return "stuck";
  return "stable";
}

/**
 * A character's narrative from its script.
 * @param {{
 *   prefix: string,
 *   script: Record<string, Record<string, {en: string[], fr: string[]}>>,
 *   lines: Record<string, {en: string[], fr: string[]}>,
 *   concepts?: Record<string, RegExp>,
 *   wins: {fast: number, normal: number, late: number},
 *   long: {from: number, veryLongFrom?: number | null}
 * }} spec
 *   prefix: i18n key prefix; wins: the last move of a fast / normal / late win (later is very late);
 *   long: the move the long-game variants start (and the very-long ones, when the character has them).
 */
export function createNarrative({prefix, script, lines, concepts = {}, wins, long}) {
  const BRANCHES = Object.keys(script);
  const ONE_OFF = Object.keys(lines);

  /** i18n keys for every line: `${prefix}.${branch}.${pair}.${0|1|2}` and `${prefix}.${kind}.${index}`. */
  const STRINGS = Object.fromEntries(["en", "fr"].map(lang => [lang, Object.fromEntries([
    ...Object.entries(script).flatMap(([branch, pairs]) => Object.entries(pairs).flatMap(([pair, text]) => text[lang].map((line, i) => [`${prefix}.${branch}.${pair}.${i}`, line]))),
    ...Object.entries(lines).flatMap(([kind, text]) => text[lang].map((line, i) => [`${prefix}.${kind}.${i}`, line]))
  ])]));

  /** The keys of one pair: {before, after, extra?} (extra = post-win line, or a 20-move miss's follow-up). */
  function pairKeys(branch, pair) {
    const text = script[branch][pair].en;
    return {before: `${prefix}.${branch}.${pair}.0`, after: `${prefix}.${branch}.${pair}.1`, ...(text[2] ? {extra: `${prefix}.${branch}.${pair}.2`} : {})};
  }
  const pairsOf = branch => Object.keys(script[branch]);
  const oneOffKeys = kind => lines[kind].en.map((_, i) => `${prefix}.${kind}.${i}`);
  const englishOf = key => STRINGS.en[key];

  // Joke concepts: two pairs leaning on the same one are not clustered (a fresh pair is preferred).
  const conceptCache = new Map();
  /** The joke concepts a pair relies on (from its English lines). */
  function conceptsOf(branch, pair) {
    const id = `${branch}.${pair}`;
    if (!conceptCache.has(id)) conceptCache.set(id, Object.keys(concepts).filter(c => script[branch][pair].en.some(line => concepts[c].test(line))));
    return conceptCache.get(id);
  }

  /**
   * Which branch a completed move gets (exact precedence: match, exhausted, opening, close,
   * recovery, improving, drifting, stuck, strange, strong, good, weak, very weak, normal; long-game
   * variants only replace stuck, weak, very weak and normal).
   * @param {{number: number, status: string, strength: string | null, kind: string | null}} round
   * @param {{strength: string, kind: string | null}[]} before completed non-opening rounds before this one
   */
  function branchFor(round, before) {
    const move = round.number;
    if (round.status === "MATCHED") return move <= wins.fast ? "fastWin" : move <= wins.normal ? "normalWin" : move <= wins.late ? "lateWin" : "veryLateWin";
    if (round.status === "EXHAUSTED") return "exhausted";
    if (move <= 1 || round.strength === "opening" || !round.strength) return "opening";
    const longer = fallback => (long.veryLongFrom && move >= long.veryLongFrom ? "veryLong" : move >= long.from ? "long" : fallback);
    if (round.kind === "close") return "close";
    const now = [...before, round];
    const previous = before.length ? trendOf(before) : "stable";
    if ((previous === "drifting" || previous === "stuck") && (round.strength === "strong" || round.strength === "good")) return "recovery";
    const trend = trendOf(now);
    if (trend === "improving") return "improving";
    if (trend === "drifting") return "drifting";
    if (trend === "stuck") return longer("stuck");
    if (round.kind === "strange") return "strange";
    if (round.strength === "strong") return "strong";
    if (round.strength === "good") return "good";
    if (round.strength === "weak") return longer("weak");
    if (round.strength === "veryWeak") return longer("veryWeak");
    return longer("normal");
  }

  /**
   * The character's beat for every revealed move of a game, in order. Pure: the same game always
   * gives the same beats, so a reload shows exactly what was shown before.
   *   - each branch cycles through all its pairs (from a per-game offset) before any repeats
   *   - a pair whose joke concept was already used this game is skipped while a fresh one is left
   *   - never the same before or after line twice in a row
   * @param {string} gameId
   * @param {{number: number, status: string, strength: string | null, kind: string | null}[]} rounds revealed moves, oldest first
   * @returns {{number: number, branch: string, pair: string, before: string, after: string, extra?: string, concepts: string[]}[]}
   */
  function beats(gameId, rounds) {
    const cycles = new Map(); // branch → pairs already used in the current cycle
    const used = new Set();
    const out = [];
    const history = [];
    for (const round of rounds) {
      const branch = branchFor(round, history);
      const pairs = pairsOf(branch);
      if (!cycles.has(branch)) cycles.set(branch, new Set());
      let cycle = cycles.get(branch);
      if (cycle.size >= pairs.length) { cycle = new Set(); cycles.set(branch, cycle); }
      const offset = hash(`${gameId}:${branch}`) % pairs.length;
      const order = pairs.map((_, i) => pairs[(offset + cycle.size + i) % pairs.length]).filter(p => !cycle.has(p));
      const previous = out[out.length - 1];
      const keysOf = p => pairKeys(branch, p);
      const repeatsLine = p => previous && (englishOf(keysOf(p).before) === englishOf(previous.before) || englishOf(keysOf(p).after) === englishOf(previous.after));
      const pair = order.find(p => !repeatsLine(p) && !conceptsOf(branch, p).some(c => used.has(c)))
        ?? order.find(p => !repeatsLine(p)) ?? order[0];
      cycle.add(pair);
      for (const c of conceptsOf(branch, pair)) used.add(c);
      out.push({number: round.number, branch, pair, ...keysOf(pair), concepts: conceptsOf(branch, pair)});
      if (round.status === "REVEALED" && round.number > 1 && round.strength && round.strength !== "opening") history.push(round);
    }
    return out;
  }

  /** The `index`-th line of a one-off pool for a game (stable per-game offset, cycles in order). */
  function oneOffLine(kind, gameId, index) {
    const keys = oneOffKeys(kind);
    return keys[(hash(`${gameId}:${kind}`) + index) % keys.length];
  }

  return {prefix, SCRIPT: script, LINES: lines, BRANCHES, ONE_OFF, STRINGS, pairKeys, pairsOf, oneOffKeys, englishOf, conceptsOf, branchFor, beats, oneOffLine};
}
