// @ts-check
// Family-game room codes: exactly two uppercase letters and two digits ("AB12"). Short enough for
// a child to read aloud or type on another device. 26 × 26 × 100 = 67,600 codes, so a code is only
// unique among ACTIVE rooms (waiting or in play) and every new room checks for a clash first.

export const JOIN_CODE_PATTERN = /^[A-Z]{2}[0-9]{2}$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * A random room code.
 * @param {() => number} [random]
 * @returns {string}
 */
export function randomJoinCode(random = Math.random) {
  const letter = () => LETTERS[Math.floor(random() * LETTERS.length)];
  return `${letter()}${letter()}${String(Math.floor(random() * 100)).padStart(2, "0")}`;
}

/**
 * What a player typed, as a room code: spaces dropped and letters uppercased ("ab 12" → "AB12").
 * Anything else (hyphens, extra characters) is left alone so it fails isJoinCode.
 * @param {unknown} raw
 */
export function normalizeJoinCode(raw) {
  return String(raw ?? "").replace(/\s+/g, "").toUpperCase();
}

/** @param {string} code */
export const isJoinCode = code => JOIN_CODE_PATTERN.test(code);

/**
 * Whether a typed name is really a room code ("AB12", or the old "ABCD-12"): a name is never
 * taken from a code, so these are refused and the player is asked for their own name.
 * @param {unknown} name
 */
export function looksLikeRoomCode(name) {
  const compact = String(name ?? "").replace(/[\s-]+/g, "").toUpperCase();
  return /^[A-Z]{2}[0-9]{2}$/.test(compact) || /^[A-Z]{4}[0-9]{2}$/.test(compact);
}
