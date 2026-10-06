// Builds dist/: a single-file Worker (dist/server/index.js) with the app
// shell embedded, plus a static mirror of the shell in dist/ for hosts that
// serve files directly.
import {build} from "esbuild";
import {createHash} from "node:crypto";
import {mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const src = p => join(root, "src", p);

const appBundle = await build({entryPoints: [src("client/app.js")], bundle: true, format: "esm", minify: true, write: false, target: ["es2020", "safari14"], legalComments: "none"});
const appJs = appBundle.outputFiles[0].text;
const css = await readFile(src("client/styles.css"), "utf8");
const icon = await readFile(src("client/icon.svg"), "utf8");
const manifest = await readFile(src("client/manifest.webmanifest"), "utf8");

const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 10);
const appName = `/assets/app.${hash(appJs)}.js`;
const cssName = `/assets/styles.${hash(css)}.css`;
const html = (await readFile(src("client/index.html"), "utf8")).replace("%APP_JS%", appName).replace("%STYLES_CSS%", cssName);
const version = hash(appJs + css + html + icon + manifest);
const swSource = (await readFile(src("client/sw.js"), "utf8"))
  .replace("%VERSION%", version)
  .replace("%PRECACHE%", JSON.stringify(["/", appName, cssName, "/icon.svg", "/manifest.webmanifest"]));
const sw = (await build({stdin: {contents: swSource, loader: "js"}, minify: true, write: false, format: "iife"})).outputFiles[0].text;

const immutable = "public, max-age=31536000, immutable";
const revalidate = "no-cache";
const files = {
  "/index.html": {body: html, type: "text/html; charset=utf-8", cache: revalidate},
  [appName]: {body: appJs, type: "text/javascript; charset=utf-8", cache: immutable},
  [cssName]: {body: css, type: "text/css; charset=utf-8", cache: immutable},
  "/sw.js": {body: sw, type: "text/javascript; charset=utf-8", cache: "no-store"},
  "/icon.svg": {body: icon, type: "image/svg+xml", cache: revalidate},
  "/manifest.webmanifest": {body: manifest, type: "application/manifest+json", cache: revalidate}
};
for (const file of Object.values(files)) file.etag = `"${hash(file.body)}"`;

await rm(dist, {recursive: true, force: true});
await build({
  entryPoints: [src("server/worker.js")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  outfile: join(dist, "server/index.js"),
  plugins: [{
    name: "assets",
    setup(b) {
      b.onResolve({filter: /^virtual:assets$/}, () => ({path: "assets", namespace: "virtual"}));
      b.onLoad({filter: /.*/, namespace: "virtual"}, () => ({contents: `export const assets = ${JSON.stringify(files)};`, loader: "js"}));
    }
  }]
});
for (const [path, file] of Object.entries(files)) {
  const out = join(dist, path);
  await mkdir(dirname(out), {recursive: true});
  await writeFile(out, file.body);
}
console.log(`Built version ${version}: dist/server/index.js + ${Object.keys(files).length} static files`);
