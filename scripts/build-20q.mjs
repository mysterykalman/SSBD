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
