// Local server that behaves like the Vercel deployment: static files from dist/,
// the rewrites and headers from vercel.json, and /api/* handled by api/index.js.
//
// Usage: node scripts/dev-server.mjs [port]
//   POSTGRES_URL=…   use that database (never applies migrations to it)
//   (unset)          start a throwaway local PostgreSQL with the migrations applied
//   NO_DATABASE=1    no database at all (/api/* answers 503 NO_DATABASE; Solo still works)
//   STATIC_DIR=path  serve a different build (tests use it to simulate a new release)
import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {extname, join, normalize, resolve} from "node:path";
import {handle} from "../api/index.js";
import {createStore} from "../src/server/db.js";
import {migrate, startLocalPostgres} from "./postgres-local.mjs";

const root = new URL("..", import.meta.url).pathname;
const port = Number(process.argv[2] || process.env.PORT || 8787);
const staticDir = resolve(process.env.STATIC_DIR || join(root, "dist"));
const config = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));

let store = null;
if (!process.env.NO_DATABASE) {
  let url = process.env.POSTGRES_URL;
  if (!url) {
    const local = await startLocalPostgres();
    await migrate(local.url);
    url = local.url;
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(0));
  }
  store = createStore(url, {ca: process.env.POSTGRES_CA_CERT || undefined, max: 10});
}

/** vercel.json source pattern (path-to-regexp style: `/:name*`, `:name`, raw regex groups) → RegExp. */
function pattern(source) {
  let out = "", depth = 0;
  for (let i = 0; i < source.length;) {
    const rest = source.slice(i);
    const named = depth === 0 && /^\/:(\w+)\*/.exec(rest);
    if (named) { out += `(?:/(?<${named[1]}>.*))?`; i += named[0].length; continue; }
    const param = depth === 0 && /^:(\w+)/.exec(rest);
    if (param) { out += `(?<${param[1]}>[^/]+)`; i += param[0].length; continue; }
    const ch = source[i++];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    out += depth === 0 && /[.+?^${}|[\]\\]/.test(ch) ? "\\" + ch : ch;
  }
  return new RegExp(`^${out}$`);
}
const rewrites = config.rewrites.map(r => ({re: pattern(r.source), destination: r.destination}));
const headerRules = config.headers.map(r => ({re: pattern(r.source), headers: r.headers}));

const TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json"};

async function staticFile(path) {
  const file = normalize(join(staticDir, decodeURIComponent(path)));
  if (!file.startsWith(staticDir)) return null;
  try {
    const info = await stat(file);
    if (info.isDirectory()) return staticFile(join(path, "index.html"));
    return {body: await readFile(file), type: TYPES[extname(file)] || "application/octet-stream"};
  } catch {
    return null;
  }
}

function configHeaders(path) {
  const out = {};
  for (const rule of headerRules) if (rule.re.test(path)) for (const {key, value} of rule.headers) out[key.toLowerCase()] = value;
  return out;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    // Like Vercel: real files first, then rewrites.
    let file = path.startsWith("/api") ? null : await staticFile(path);
    let target = null;
    if (!file) {
      for (const rule of rewrites) {
        const m = rule.re.exec(path);
        if (!m) continue;
        target = rule.destination.replace(/:(\w+)\*?/g, (_, name) => m.groups?.[name] ?? "");
        break;
      }
    }
    if (target?.startsWith("/api")) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const dest = new URL(target, url);
      for (const [key, value] of url.searchParams) if (!dest.searchParams.has(key)) dest.searchParams.append(key, value);
      const request = new Request(dest, {method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks)});
      const response = await handle(request, {store});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!file && target) file = await staticFile(target);
    if (!file) {
      res.writeHead(404, {"content-type": "text/plain"}).end("Not found");
      return;
    }
    res.writeHead(200, {"content-type": file.type, ...configHeaders(path)});
    res.end(req.method === "HEAD" ? undefined : file.body);
  } catch (error) {
    console.error(error);
    res.writeHead(500).end("dev server error");
  }
}).listen(port, () => console.log(`Listening on http://localhost:${port}`));
