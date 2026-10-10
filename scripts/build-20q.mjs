// Standalone 20Q static build.
import {build} from "esbuild";
import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const source = name => join(root, "src/client/twentyq", name);
const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 10);

const bundle = await build({
  entryPoints: [source("app.js")], bundle: true, format: "esm",
  minify: true, write: false, target: ["es2020", "safari14"], legalComments: "none"
});
const js = bundle.outputFiles[0].text;
const css = await readFile(source("styles.css"), "utf8");
const license = await readFile(source("LICENSE-FergusGriggs.txt"), "utf8");
const jsPath = "/20Q/assets/app." + hash(js) + ".js";
const cssPath = "/20Q/assets/styles." + hash(css) + ".css";
const html = (await readFile(source("index.html"), "utf8"))
  .replace("%TWENTYQ_JS%", jsPath).replace("%TWENTYQ_CSS%", cssPath);
const workerTemplate = await readFile(source("sw.js"), "utf8");
const version = hash(js + css + html + workerTemplate + license);
const precache = ["/20Q", "/20Q/", "/20Q/index.html", jsPath, cssPath, "/20Q/LICENSE.txt"];
const worker = workerTemplate.replace("%VERSION%", version).replace("%PRECACHE%", JSON.stringify(precache));
const files = {
  "/20Q/index.html": html,
  [jsPath]: js,
  [cssPath]: css,
  "/20Q/sw.js": worker,
  "/20Q/LICENSE.txt": license
};
for (const [path, body] of Object.entries(files)) {
  const destination = join(dist, path);
  await mkdir(dirname(destination), {recursive: true});
  await writeFile(destination, body);
}
console.log("Built isolated /20Q experiment (" + version + ")");
