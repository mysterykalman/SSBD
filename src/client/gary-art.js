// Gary's portrait. Kept apart from gary.js so that module stays loadable in Node tests;
// the build bundles the image into the app as a data URL, so it works offline.
import garyPortrait from "./gary.webp";

/**
 * Gary's portrait (src/client/gary.webp, bundled into the app so it works offline).
 * Decorative: his name is always written next to him, so the image is hidden from screen readers.
 * @param {"meh" | "sleepy"} mood
 */
export function garyArt(mood = "meh", cls = "") {
  const wrap = document.createElement("span");
  wrap.className = `gary-art-wrap ${cls}`;
  wrap.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.className = `gary-art gary-${mood}`;
  img.src = garyPortrait;
  img.alt = "";
  img.decoding = "async";
  img.draggable = false;
  wrap.append(img);
  return wrap;
}
