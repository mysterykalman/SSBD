// Presentation helpers for the Solo characters (Gary, Milo; see characters.js).
// Everything here is flavour only. The bot engine (src/shared/bot.js) still picks
// the word; the character just shows it. Nothing in this file reads or changes game state,
// scoring or storage of games, and nothing here makes network calls.

const RECENT_LIMIT = 6;

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

// Whether the player has met a character (each intro shows once). Gary's key predates Milo.
const metKey = id => `ssbd_${id}_met`;
export function hasMet(id = "gary") {
  try { return localStorage.getItem(metKey(id)) === "1"; } catch { return true; }
}
export function markMet(id = "gary") {
  try { localStorage.setItem(metKey(id), "1"); } catch {}
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
