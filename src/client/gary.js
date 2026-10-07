// Gary from Accounting: the presentation identity of the Solo opponent.
// Everything here is flavour only. The bot engine (src/shared/bot.js) still picks
// the word; Gary just shows it. Nothing in this file reads or changes game state,
// scoring or storage of games, and nothing here makes network calls.
//
// Copy lives in i18n.js under the keys referenced below.

/** Character config: i18n keys only. */
export const GARY = {
  name: "garyName",
  title: "garyTitle",
  intro: {kicker: "garyMeet", lines: ["garyIntro1", "garyIntro2", "garyIntro3"], aside: "garyIntroSigh", cta: "garyIntroCta"},
  // Each reaction is typed either before Gary's word ("sigh" … STORY) or after it (STORY … "I object").
  reactions: {
    resigned: [["garySigh", "before"], ["garyFine", "before"], ["garyApparently", "before"], ["garyThisAgain", "before"], ["garyOkayThen", "before"], ["garyThere", "after"]],
    competitive: [["garyObject", "after"], ["garyRude", "after"], ["garyWasGoingTo", "after"], ["garyAnnoyinglyGood", "after"], ["garyPleased", "after"]],
    dramatic: [["garyNeedMinute", "after"], ["garyConcerns", "after"], ["garyUnnecessary", "after"], ["garyDoneNow", "after"], ["garyHappy", "after"]],
    minimal: [["garyUgh", "before"], ["garyReally", "before"], ["garyWow", "after"], ["garyNoted", "after"]]
  },
  special: {
    match: [["garyDots", "garyInconvenient"], ["garyDots", "garyYouWin"]],
    middle: ["garyStillDoing"],
    nearEnd: ["garyToldEnding"],
    gameOver: ["garyFinally", "garySameTime"]
  }
};

export const REACTION_CHANCE = 0.3; // about a third of ordinary reveals
const MATCH_CHANCE = 0.7;
const SPECIAL_CHANCE = 0.2;
const RECENT_LIMIT = 6;

/** Every i18n key Gary uses (for tests). */
export function garyKeys() {
  const keys = new Set([GARY.name, GARY.title, GARY.intro.kicker, ...GARY.intro.lines, GARY.intro.aside, GARY.intro.cta]);
  for (const list of Object.values(GARY.reactions)) for (const [key] of list) keys.add(key);
  for (const list of Object.values(GARY.special)) for (const item of list) for (const key of [item].flat()) keys.add(key);
  return [...keys];
}

/**
 * Decide whether Gary says something on this reveal. Pure: same inputs, same answer.
 * @param {{status: string, move: number, recent: string[], random: () => number}} options
 *   status: the revealed move's status (REVEALED, MATCHED, EXHAUSTED); recent: keys Gary used lately in this game.
 * @returns {{when: "before" | "after", keys: string[]} | null}
 */
export function pickReaction({status, move, recent = [], random = Math.random}) {
  const used = new Set(recent);
  if (status === "MATCHED") {
    if (random() >= MATCH_CHANCE) return null;
    const options = GARY.special.match.filter(([, line]) => !used.has(line));
    const pick = (options.length ? options : GARY.special.match)[Math.floor(random() * (options.length || GARY.special.match.length))];
    return {when: "after", keys: [...pick]};
  }
  if (status === "EXHAUSTED") return null; // the game-over beat says goodbye instead
  // Rare one-off lines around the middle and near the end of a long game.
  if (move >= 9 && move <= 11 && !used.has("garyStillDoing") && random() < SPECIAL_CHANCE) return {when: "after", keys: ["garyStillDoing"]};
  if (move >= 17 && move <= 19 && !used.has("garyToldEnding") && random() < SPECIAL_CHANCE) return {when: "after", keys: ["garyToldEnding"]};
  if (random() >= REACTION_CHANCE) return null;
  const categories = Object.keys(GARY.reactions);
  const category = categories[Math.floor(random() * categories.length)];
  let pool = GARY.reactions[category].filter(([key]) => !used.has(key));
  if (!pool.length) pool = Object.values(GARY.reactions).flat().filter(([key]) => !used.has(key));
  if (!pool.length) pool = GARY.reactions[category];
  const [key, when] = pool[Math.floor(random() * pool.length)];
  return {when: /** @type {"before" | "after"} */ (when), keys: [key]};
}

// Recently used lines, per game, kept for this browser session only.
const RECENT_KEY = "ssbd.gary.recent";
export function recentLines(gameId) {
  try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) || "{}")[gameId] || []; } catch { return []; }
}
export function rememberLines(gameId, keys) {
  try {
    const all = JSON.parse(sessionStorage.getItem(RECENT_KEY) || "{}");
    all[gameId] = [...(all[gameId] || []), ...keys].slice(-RECENT_LIMIT);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(all));
  } catch {}
}

// Whether the player has met Gary (the intro shows once).
const MET_KEY = "ssbd_gary_met";
export function hasMetGary() {
  try { return localStorage.getItem(MET_KEY) === "1"; } catch { return true; }
}
export function markMetGary() {
  try { localStorage.setItem(MET_KEY, "1"); } catch {}
}

/** Presentation randomness. Automated tests may pin it via window.__garyRandom; players never see a difference. */
export function garyRandom() {
  const pinned = typeof window !== "undefined" ? window.__garyRandom : undefined;
  return typeof pinned === "function" ? pinned() : Math.random();
}

function graphemes(text) {
  try { return [...new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(text)].map(s => s.segment); } catch { return Array.from(text); }
}

/**
 * Type `text` into `el` one character at a time, as if Gary is begrudgingly typing it.
 * The full text is laid out invisibly from the start so nothing around it moves.
 * Visible letters are aria-hidden; screen readers get the complete text (sr-only) at once.
 * @returns {Promise<void>}
 */
export function typeInto(el, text, {reduced = false, maxTotal = 900, alive = () => true} = {}) {
  const chars = graphemes(text);
  const typed = document.createElement("span");
  const ghost = document.createElement("span");
  const spoken = document.createElement("span");
  typed.className = "typed";
  ghost.className = "ghost";
  spoken.className = "sr-only";
  typed.setAttribute("aria-hidden", "true");
  ghost.setAttribute("aria-hidden", "true");
  spoken.textContent = text;
  el.replaceChildren(typed, ghost, spoken);
  el.dataset.full = text;
  if (reduced || !chars.length) {
    typed.textContent = text;
    return Promise.resolve();
  }
  ghost.textContent = text;
  const step = Math.min(70, maxTotal / chars.length);
  return new Promise(resolve => {
    let i = 0;
    const tick = () => {
      if (!alive()) { typed.textContent = text; ghost.textContent = ""; return resolve(); }
      i++;
      typed.textContent = chars.slice(0, i).join("");
      ghost.textContent = chars.slice(i).join("");
      if (i >= chars.length) return resolve();
      // 50–90 ms per letter, squeezed so a long word never takes more than maxTotal.
      const jitter = 50 + garyRandom() * 40;
      setTimeout(tick, Math.min(jitter, step * 1.3));
    };
    setTimeout(tick, Math.min(60, step));
  });
}
