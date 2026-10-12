// The Solo characters' portraits. Kept apart from gary.js/characters.js so those stay loadable in
// Node tests. Portraits are served as explicit static assets so preview builds and browsers use the
// exact same URLs instead of relying on image bundling behavior.

const PORTRAITS = {
  gary: "/character-art/gary.webp?v=exact-20261012",
  milo: "/character-art/milo.webp?v=exact-20261012"
};

/**
 * A character's portrait. Decorative: the character's name is always
 * written next to it, so the image is hidden from screen readers.
 * @param {string} id "gary" | "milo"
 * @param {"meh" | "sleepy"} mood
 */
export function characterArt(id = "gary", mood = "meh", cls = "") {
  const who = Object.hasOwn(PORTRAITS, id) ? id : "gary";
  const wrap = document.createElement("span");
  wrap.className = `gary-art-wrap ${cls}`;
  wrap.dataset.character = who;
  wrap.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.className = `gary-art gary-${mood} art-${who}`;
  img.src = PORTRAITS[who];
  img.alt = "";
  img.decoding = "async";
  img.draggable = false;
  wrap.append(img);
  return wrap;
}

/** Gary's portrait (kept for callers that only ever mean Gary). */
export const garyArt = (mood = "meh", cls = "") => characterArt("gary", mood, cls);
