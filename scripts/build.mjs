// Builds dist/: the static app that Vercel serves (index.html, hashed JS/CSS,
// service worker, icons, manifest). The Family-mode API is the Vercel Function in
// api/index.js, which Vercel builds from source; nothing here bundles server code.
import {build, transform} from "esbuild";
import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
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
const cloudSync = await readFile(src("client/cloud-sync.js"), "utf8");
const account = await readFile(src("client/account.js"), "utf8");
const ICONS = ["favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
const icons = Object.fromEntries(await Promise.all(ICONS.map(async name => [`/${name}`, await readFile(src(`client/icons/${name}`))])));
const manifest = await readFile(src("client/manifest.webmanifest"), "utf8");
const momLaunch = await readFile(src("client/mom-mode/entry-fix.js"), "utf8");
const characterStatic = {
  "/character-art/gary.webp": await readFile(src("client/gary.webp")),
  "/character-art/milo.webp": await readFile(src("client/milo.webp")),
  "/character-art/pam.webp": await readFile(src("client/mom-mode/pam.webp"))
};

const runtimeKnowledgePath = src("client/mom-mode/knowledge.runtime.json");
const hasMomRuntime = existsSync(runtimeKnowledgePath);
const LEGACY_MOM_JS = ["knowledge.js", "knowledge.general.js", "knowledge.generated.js", "facets.js", "engine.js", "deduction.js", "copy.js", "adapter.js", "app.js", "debug.js"];
const RUNTIME_MOM_JS = ["copy.js", "app.js", "debug.js"];
const MOM_JS = hasMomRuntime ? RUNTIME_MOM_JS : LEGACY_MOM_JS;
const MOM_CSS = ["styles.css", "character.css"];
const MOM_STATIC = ["pam.webp", "pam-v2.webp"];
const legacyMomScriptChain = '<script src="./knowledge.js" defer></script><script src="./knowledge.general.js" defer></script><script src="./knowledge.generated.js" defer></script><script src="./facets.js" defer></script><script src="./engine.js" defer></script><script src="./deduction.js" defer></script><script src="./copy.js" defer></script><script src="./adapter.js" defer></script><script src="./app.js" defer></script><script src="./debug.js" defer></script>';
const runtimeMomScriptChain = '<script src="./knowledge.runtime.js" defer></script><script src="./runtime-entry.js" defer></script><script src="./copy.js" defer></script><script src="./app.js" defer></script><script src="./debug.js" defer></script>';
let momIndex = await readFile(src("client/mom-mode/index.html"), "utf8");
if (hasMomRuntime) {
  if (!momIndex.includes(legacyMomScriptChain)) throw new Error("Mom index script chain changed; compact runtime build cannot safely replace it");
  momIndex = momIndex.replace(legacyMomScriptChain, runtimeMomScriptChain);
}
const momJsSource = Object.fromEntries(await Promise.all(MOM_JS.map(async name => [name, await readFile(src(`client/mom-mode/${name}`), "utf8")])));
const momCssSource = Object.fromEntries(await Promise.all(MOM_CSS.map(async name => [name, await readFile(src(`client/mom-mode/${name}`), "utf8")])));
const momStatic = Object.fromEntries(await Promise.all(MOM_STATIC.map(async name => [name, await readFile(src(`client/mom-mode/${name}`))])));

const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 10);
const appName = `/assets/app.${hash(appJs)}.js`;
const audioName = `/assets/audio-settings.${hash(audioJs)}.js`;
const cssName = `/assets/styles.${hash(css)}.css`;

const momJs = {};
for (const [name, source] of Object.entries(momJsSource)) {
  momJs[name] = (await transform(source, {loader: "js", minify: true, target: ["es2020", "safari14"], legalComments: "none"})).code;
}
if (hasMomRuntime) {
  const runtimeData = JSON.parse(await readFile(runtimeKnowledgePath, "utf8"));
  if (!runtimeData?.meta?.conceptCount || runtimeData.meta.conceptCount < 50000) throw new Error(`Compact Mom runtime is incomplete: ${runtimeData?.meta?.conceptCount ?? 0} concepts`);
  momJs["knowledge.runtime.js"] = `window.MOM_RUNTIME_KNOWLEDGE=${JSON.stringify(runtimeData)};`;
  const runtimeBundle = await build({entryPoints: [src("client/mom-mode/runtime-entry.js")], bundle: true, format: "iife", minify: true, write: false, target: ["es2020", "safari14"], legalComments: "none"});
  momJs["runtime-entry.js"] = runtimeBundle.outputFiles[0].text;
}
const momCss = {};
for (const [name, source] of Object.entries(momCssSource)) {
  momCss[name] = (await transform(source, {loader: "css", minify: true, target: ["es2020", "safari14"], legalComments: "none"})).code;
}
const momAssetPath = (name, body) => `./assets/${name.replace(/\.(js|css)$/, "")}.${hash(body)}.${name.endsWith(".js") ? "js" : "css"}`;
const momAssetFiles = {};
const momAssetUrls = [];
let momPage = momIndex;
for (const [name, body] of Object.entries({...momCss, ...momJs})) {
  const relative = momAssetPath(name, body);
  momPage = momPage.replaceAll(`./${name}`, relative);
  const canonical = `/mom/${relative.replace(/^\.\//, "")}`;
  const legacy = `/mom-mode/${relative.replace(/^\.\//, "")}`;
  momAssetFiles[canonical] = body;
  momAssetFiles[legacy] = body;
  momAssetUrls.push(canonical);
}

const html = (await readFile(src("client/index.html"), "utf8")).replace("%APP_JS%", appName).replace("%AUDIO_JS%", audioName).replace("%STYLES_CSS%", cssName);
const swTemplate = await readFile(src("client/sw.js"), "utf8");
const iconHash = createHash("sha256");
for (const body of Object.values(icons)) iconHash.update(body);
const characterHash = createHash("sha256");
for (const body of Object.values(characterStatic)) characterHash.update(body);
const momHash = createHash("sha256");
momHash.update(momPage);
for (const body of Object.values(momJs)) momHash.update(body);
for (const body of Object.values(momCss)) momHash.update(body);
for (const body of Object.values(momStatic)) momHash.update(body);
const version = hash(appJs + audioJs + css + html + momLaunch + cloudSync + account + iconHash.digest("hex") + characterHash.digest("hex") + momHash.digest("hex") + manifest + swTemplate);
const page = html.replace("%APP_VERSION%", version);
const momPrecache = ["/mom/", ...momAssetUrls, "/mom/pam.webp", "/mom/pam-v2.webp"];
const characterPrecache = Object.keys(characterStatic);
const swSource = swTemplate
  .replace("%VERSION%", version)
  .replace("%PRECACHE%", JSON.stringify(["/", appName, audioName, cssName, "/mom-launch.js", "/cloud-sync.js", "/account.js", "/favicon.ico", "/favicon-32.png", "/manifest.webmanifest", ...characterPrecache, ...momPrecache]));
if (swSource.includes("%")) throw new Error("sw.js still has an unfilled %PLACEHOLDER%");
const sw = (await build({stdin: {contents: swSource, loader: "js"}, minify: true, write: false, format: "iife"})).outputFiles[0].text;

const files = {
  "/index.html": page,
  [appName]: appJs,
  [audioName]: audioJs,
  [cssName]: css,
  "/mom-launch.js": momLaunch,
  "/cloud-sync.js": cloudSync,
  "/account.js": account,
  "/sw.js": sw,
  ...icons,
  ...characterStatic,
  "/manifest.webmanifest": manifest,
  "/mom/index.html": momPage,
  "/mom-mode/index.html": momPage,
  ...momAssetFiles
};
for (const [name, body] of Object.entries(momStatic)) {
  files[`/mom/${name}`] = body;
  files[`/mom-mode/${name}`] = body;
}

await rm(dist, {recursive: true, force: true});
for (const [path, body] of Object.entries(files)) {
  const out = join(dist, path);
  await mkdir(dirname(out), {recursive: true});
  await writeFile(out, body);
}
console.log(`Built version ${version}: ${Object.keys(files).length} static files in dist/ (${hasMomRuntime ? "compact Mom runtime" : "legacy Mom runtime"})`);
