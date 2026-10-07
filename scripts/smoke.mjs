// Smoke check for a deployment (e.g. a Vercel Preview): does Family mode have a working API?
// Usage: npm run smoke -- <base-url> [--write]
//   Read-only by default. --write also creates a throwaway player and game (real rows).
//   VERCEL_BYPASS=<token> adds Vercel's protection-bypass header for protected previews.
// Exits non-zero, with the reason, on the first failure.
const args = process.argv.slice(2);
const base = (args.find(a => !a.startsWith("--")) || "").replace(/\/+$/, "");
const write = args.includes("--write");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: npm run smoke -- <base-url> [--write]");
  process.exit(2);
}
const headers = process.env.VERCEL_BYPASS ? {"x-vercel-protection-bypass": process.env.VERCEL_BYPASS} : {};
let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
  return ok;
};
async function get(path, init = {}) {
  const res = await fetch(base + path, {...init, headers: {...headers, ...init.headers}, redirect: "manual"});
  const type = res.headers.get("content-type") || "";
  const body = type.includes("json") ? await res.json().catch(() => null) : await res.text();
  return {res, type, body};
}

const health = await get("/api/health");
check(health.type.includes("json"), "/api/health answers JSON", `${health.res.status} ${health.type || "no content-type"}`);
check(health.body?.ok === true && health.body?.db === true, "database reachable and migrated", JSON.stringify(health.body)?.slice(0, 160));
const missing = await get("/api/does-not-exist");
check(missing.res.status === 404 && missing.type.includes("json"), "unknown /api path is a JSON 404", `${missing.res.status} ${missing.type}`);
for (const path of ["/", "/games/smoke-check", "/join/SM00", "/solo"]) {
  const page = await get(path);
  check(page.res.status === 200 && /<main id="app"/.test(String(page.body)), `${path} serves the app`, String(page.res.status));
}
const html = String((await get("/")).body);
const asset = html.match(/\/assets\/app\.[0-9a-f]+\.js/)?.[0];
if (check(Boolean(asset), "index.html references the app bundle")) {
  const js = await get(asset);
  check(js.res.status === 200 && /immutable/.test(js.res.headers.get("cache-control") || ""), "app bundle served, cached as immutable");
  check(!/POSTGRES_URL|postgres:\/\/|SUPABASE_SERVICE_ROLE/.test(String(js.body)), "no database settings in the browser bundle");
}
const sw = await get("/sw.js");
check(sw.res.status === 200 && /no-store/.test(sw.res.headers.get("cache-control") || ""), "service worker served, never cached");

if (write) {
  const post = (path, body) => get(path, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
  const player = await post("/api/player", {display_name: "Smoke Test"});
  if (check(player.res.status === 200 && player.body?.id, "POST /api/player", JSON.stringify(player.body)?.slice(0, 120))) {
    const game = await post("/api/games", {player_id: player.body.id, solo: false});
    check(game.res.status === 200 && game.body?.join_code, "POST /api/games", JSON.stringify(game.body)?.slice(0, 120));
    const recovered = await post("/api/player/recover", {recovery_code: player.body.recovery_code});
    check(recovered.body?.id === player.body.id, "POST /api/player/recover");
  }
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
