import {copyFile, mkdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "src", "client", "audio");
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

// Mom Mode is a separate document and does not load the main app bundle. Give it the
// same shared audio controller at a stable URL so music and volume settings stay consistent.
await copyFile(join(root, "src", "client", "audio-settings.js"), join(root, "dist", "audio-settings.js"));

// The tactile audio settings panel uses this existing felt patch as its surface.
const feltDir = join(root, "dist", "felt");
await mkdir(feltDir, {recursive: true});
const audioPatch = join(root, "src", "client", "felt", "audio-panel-patch.png");
if (existsSync(audioPatch)) await copyFile(audioPatch, join(feltDir, "audio-panel-patch.png"));
