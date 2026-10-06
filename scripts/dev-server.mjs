// Runs the built Worker on Node with a local SQLite-backed D1.
// Usage: node scripts/dev-server.mjs [port] [sqlite-file]
import {createServer} from "node:http";
import {mkdirSync} from "node:fs";
import {createD1} from "./d1-sqlite.mjs";

const port = Number(process.argv[2] || process.env.PORT || 8787);
const file = process.argv[3] || process.env.DB_FILE || ".dev-data/dev.sqlite";
if (file !== ":memory:") mkdirSync(".dev-data", {recursive: true});
const env = {DB: createD1(file)};
const worker = (await import(new URL("../dist/server/index.js", import.meta.url) + "?t=" + Date.now())).default;

createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://${req.headers.host}${req.url}`, {method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body});
  try {
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500).end("dev server error");
  }
}).listen(port, () => console.log(`Listening on http://localhost:${port}`));
