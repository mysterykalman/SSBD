// Builds dist/: the static app that Vercel serves (index.html, hashed JS/CSS,
// service worker, icons, manifest). The Family-mode API is the Vercel Function in
// api/index.js, which Vercel builds from source; nothing here bundles server code.
import {build} from "esbuild";
import {createHash} from "node:crypto";
import {mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const src = p => join(root, "src", p);

const appBundle = await build({entryPoints: [src("client/app.js")], bundle: true, loader: {".webp": "dataurl"}, format: "esm", minify: true, write: false, target: ["es2020", "safari14"], legalComments: "none"});
const appJs = appBundle.outputFiles[0].text;
const audioBundle = await build({entryPoints: [src("client/audio-entry.js")], bundle: true, format: "esm", minify: true, write: false, target: ["es2020", "safari14"], legalComments: "none"});
const audioJs = audioBundle.outputFiles[0].text;
const css = await readFile(src("client/styles.css"), "utf8");
// The app icon (favicon, home-screen and install icons), generated from the supplied artwork.
const ICONS = ["favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
const icons = Object.fromEntries(await Promise.all(ICONS.map(async name => [`/${name}`, await readFile(src(`client/icons/${name}`))])));
const manifest = await readFile(src("client/manifest.webmanifest"), "utf8");

const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 10);
const appName = `/assets/app.${hash(appJs)}.js`;
const audioName = `/assets/audio-settings.${hash(audioJs)}.js`;
const cssName = `/assets/styles.${hash(css)}.css`;
const html = (await readFile(src("client/index.html"), "utf8")).replace("%APP_JS%", appName).replace("%AUDIO_JS%", audioName).replace("%STYLES_CSS%", cssName);
const swTemplate = await readFile(src("client/sw.js"), "utf8");
// The version covers every precached file and the worker's own logic, so any
// change produces a new cache and a clean, all-at-once switch.
const iconHash = createHash("sha256");
for (const body of Object.values(icons)) iconHash.update(body);
const version = hash(appJs + audioJs + css + html + iconHash.digest("hex") + manifest + swTemplate);
// The page carries its own version so it can tell when a newer worker has taken over.
const page = html.replace("%APP_VERSION%", version);
const swSource = swTemplate
  .replace("%VERSION%", version)
  .replace("%PRECACHE%", JSON.stringify(["/", appName, audioName, cssName, "/favicon.ico", "/favicon-32.png", "/manifest.webmanifest"]));
if (swSource.includes("%")) throw new Error("sw.js still has an unfilled %PLACEHOLDER%");
const sw = (await build({stdin: {contents: swSource, loader: "js"}, minify: true, write: false, format: "iife"})).outputFiles[0].text;

const files = {
  "/index.html": page,
  [appName]: appJs,
  [audioName]: audioJs,
  [cssName]: css,
  "/sw.js": sw,
  ...icons,
  "/manifest.webmanifest": manifest
};

await rm(dist, {recursive: true, force: true});
for (const [path, body] of Object.entries(files)) {
  const out = join(dist, path);
  await mkdir(dirname(out), {recursive: true});
  await writeFile(out, body);
}
console.log(`Built version ${version}: ${Object.keys(files).length} static files in dist/`);