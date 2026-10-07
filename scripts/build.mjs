// Builds dist/: the static app that Vercel serves (index.html, hashed JS/CSS,
// service worker, icon, manifest). The Family-mode API is the Vercel Function in
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
const css = await readFile(src("client/styles.css"), "utf8");
const icon = await readFile(src("client/icon.svg"), "utf8");
const manifest = await readFile(src("client/manifest.webmanifest"), "utf8");

const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 10);
const appName = `/assets/app.${hash(appJs)}.js`;
const cssName = `/assets/styles.${hash(css)}.css`;
const html = (await readFile(src("client/index.html"), "utf8")).replace("%APP_JS%", appName).replace("%STYLES_CSS%", cssName);
const swTemplate = await readFile(src("client/sw.js"), "utf8");
// The version covers every precached file and the worker's own logic, so any
// change produces a new cache and a clean, all-at-once switch.
const version = hash(appJs + css + html + icon + manifest + swTemplate);
const swSource = swTemplate
  .replace("%VERSION%", version)
  .replace("%PRECACHE%", JSON.stringify(["/", appName, cssName, "/icon.svg", "/manifest.webmanifest"]));
if (swSource.includes("%")) throw new Error("sw.js still has an unfilled %PLACEHOLDER%");
const sw = (await build({stdin: {contents: swSource, loader: "js"}, minify: true, write: false, format: "iife"})).outputFiles[0].text;

const files = {
  "/index.html": html,
  [appName]: appJs,
  [cssName]: css,
  "/sw.js": sw,
  "/icon.svg": icon,
  "/manifest.webmanifest": manifest
};

await rm(dist, {recursive: true, force: true});
for (const [path, body] of Object.entries(files)) {
  const out = join(dist, path);
  await mkdir(dirname(out), {recursive: true});
  await writeFile(out, body);
}
console.log(`Built version ${version}: ${Object.keys(files).length} static files in dist/`);
