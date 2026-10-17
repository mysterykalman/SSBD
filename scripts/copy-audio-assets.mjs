import {copyFile, mkdir, readFile, writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(root, "src", "client");
const sourceDir = join(clientDir, "audio");
const distDir = join(root, "dist", "audio");
const files = ["intro.mp3", "game-music.mp3"];

await mkdir(distDir, {recursive: true});
for (const name of files) {
  const source = join(sourceDir, name);
  if (!existsSync(source)) {
    console.warn(`Audio asset missing: ${source}`);
    continue;
  }
  await copyFile(source, join(distDir, name));
}

// Don’t Tell Me is a separate document and does not load the main app bundle.
// Build one stable classic-script bundle from the same shared audio pieces used by
// the main shell so music, controls, replay-intro and lifecycle behaviour stay aligned.
const standaloneParts = [
  "audio-behavior-policy.js",
  "audio-media-policy.js",
  "audio-settings.js",
  "audio-ui-polish.js",
  "audio-shell-recovery.js"
];
const standaloneSources = await Promise.all(
  standaloneParts.map(name => readFile(join(clientDir, name), "utf8"))
);
const standaloneAudio = standaloneSources
  .map(source => `(() => {\n${source}\n})();`)
  .join("\n;\n");
await writeFile(join(root, "dist", "audio-settings.js"), standaloneAudio, "utf8");

// Stable helper used by the separate Don’t Tell Me document to reconstruct an
// unfinished local round when the Home dashboard sends the player back to it.
await copyFile(
  join(clientDir, "mom-mode", "resume-persistence.js"),
  join(root, "dist", "mom-resume.js")
);
for (const relative of ["mom/index.html", "mom-mode/index.html"]) {
  const pagePath = join(root, "dist", relative);
  if (!existsSync(pagePath)) continue;
  const page = await readFile(pagePath, "utf8");
  if (!page.includes('/mom-resume.js')) {
    await writeFile(pagePath, page.replace('</body>', '<script src="/mom-resume.js" defer></script>\n</body>'), "utf8");
  }
}

// The tactile audio settings panel uses this existing felt patch as its surface.
const feltDir = join(root, "dist", "felt");
await mkdir(feltDir, {recursive: true});
const audioPatch = join(clientDir, "felt", "audio-panel-patch.png");
if (existsSync(audioPatch)) await copyFile(audioPatch, join(feltDir, "audio-panel-patch.png"));
