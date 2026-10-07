// A throwaway local PostgreSQL for development and tests, using the server
// binaries installed on this machine (PG_BIN, `pg_config --bindir`, or
// /usr/lib/postgresql/<version>/bin). Nothing here touches Supabase.
import {execFileSync, spawn, spawnSync} from "node:child_process";
import {chownSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync} from "node:fs";
import {createServer} from "node:net";
import {tmpdir} from "node:os";
import {join} from "node:path";
import pg from "pg";

const root = new URL("..", import.meta.url).pathname;
export const MIGRATIONS_DIR = join(root, "supabase", "migrations");

export function findPostgresBin() {
  const candidates = [];
  if (process.env.PG_BIN) candidates.push(process.env.PG_BIN);
  try { candidates.push(execFileSync("pg_config", ["--bindir"], {encoding: "utf8"}).trim()); } catch {}
  try {
    const versions = readdirSync("/usr/lib/postgresql").sort((a, b) => Number(b) - Number(a));
    for (const v of versions) candidates.push(`/usr/lib/postgresql/${v}/bin`);
  } catch {}
  return candidates.find(dir => existsSync(join(dir, "initdb")) && existsSync(join(dir, "pg_ctl"))) || null;
}

const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => { const {port} = /** @type {any} */ (server.address()); server.close(() => resolve(port)); });
});

/** The SQL files in supabase/migrations, in the order Supabase applies them. */
export function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort().map(f => join(MIGRATIONS_DIR, f));
}

/** Apply every migration to a database (and create Supabase's API roles, which the migration revokes from). */
export async function migrate(url) {
  const client = new pg.Client({connectionString: url});
  await client.connect();
  try {
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    END $$`);
    for (const file of migrationFiles()) await client.query(readFileSync(file, "utf8"));
  } finally {
    await client.end();
  }
}

/**
 * Start a fresh cluster in a temp directory. Returns its admin URL and helpers.
 * Runs the server as the `postgres` OS user when started as root (initdb refuses root).
 */
export async function startLocalPostgres() {
  const bin = findPostgresBin();
  if (!bin) throw new Error("No PostgreSQL server binaries found. Install PostgreSQL (initdb, pg_ctl) or set PG_BIN, or point TEST_DATABASE_URL at a Postgres you can create databases in.");
  const dir = mkdtempSync(join(tmpdir(), "ssbd-pg-"));
  const asRoot = process.getuid?.() === 0;
  const run = (cmd, args) => (asRoot ? ["runuser", ["-u", "postgres", "--", join(bin, cmd), ...args]] : [join(bin, cmd), args]);
  if (asRoot) chownSync(dir, Number(execFileSync("id", ["-u", "postgres"], {encoding: "utf8"})), Number(execFileSync("id", ["-g", "postgres"], {encoding: "utf8"})));
  const data = join(dir, "data");
  const init = spawnSync(...run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--no-locale"]), {encoding: "utf8"});
  if (init.status !== 0) throw new Error(`initdb failed: ${init.stderr || init.stdout}`);
  const port = await freePort();
  const options = `-p ${port} -k ${dir} -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c max_connections=200`;
  const proc = spawn(...run("pg_ctl", ["-D", data, "-o", options, "-l", join(dir, "log"), "-w", "start"]), {stdio: "ignore"});
  const code = await new Promise(resolve => proc.on("exit", resolve));
  if (code !== 0) throw new Error(`postgres did not start: ${readFileSync(join(dir, "log"), "utf8").slice(-2000)}`);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    spawnSync(...run("pg_ctl", ["-D", data, "-m", "immediate", "stop"]), {stdio: "ignore"});
    rmSync(dir, {recursive: true, force: true});
  };
  process.once("exit", stop);
  const url = name => `postgres://postgres@127.0.0.1:${port}/${name}`;
  return {url: url("postgres"), port, urlFor: url, stop};
}

let counter = 0;
/**
 * Databases for tests: one migrated template, then a fresh copy per call.
 * Uses TEST_DATABASE_URL (any Postgres where the user may CREATE DATABASE) when set,
 * otherwise a throwaway local cluster.
 */
export async function databaseFactory() {
  const external = process.env.TEST_DATABASE_URL;
  const cluster = external ? null : await startLocalPostgres();
  const admin = external || cluster.url;
  const urlFor = name => { const u = new URL(admin); u.pathname = `/${name}`; return u.toString(); };
  const template = `ssbd_tmpl_${process.pid}_${Date.now()}`;
  const exec = async sql => { const c = new pg.Client({connectionString: admin}); await c.connect(); try { await c.query(sql); } finally { await c.end(); } };
  await exec(`CREATE DATABASE ${template}`);
  await migrate(urlFor(template));
  const created = [];
  return {
    /** A fresh, migrated database. `blank: true` skips the migration (for schema tests). */
    async create({blank = false} = {}) {
      const name = `ssbd_t${process.pid}_${++counter}`;
      await exec(blank ? `CREATE DATABASE ${name}` : `CREATE DATABASE ${name} TEMPLATE ${template}`);
      created.push(name);
      return urlFor(name);
    },
    async close() {
      if (cluster) return cluster.stop();
      for (const name of [...created, template]) await exec(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(() => {});
    }
  };
}
