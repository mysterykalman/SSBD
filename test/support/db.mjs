// Real PostgreSQL for API tests: one throwaway cluster per test file (or
// TEST_DATABASE_URL), one migrated template, and a fresh copy per test.
import {after} from "node:test";
import {databaseFactory, migrate} from "../../scripts/postgres-local.mjs";
import {createStore} from "../../src/server/db.js";

let factory = null;
const open = new Set();
after(async () => {
  for (const db of open) await db.end().catch(() => {});
  await (await factory)?.close();
});

/** `?` placeholders → `$1…$n`, so test SQL reads like the old SQLite statements. */
const toPg = sql => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

/**
 * A fresh database with the migrations applied (or, with `blank`, an empty one).
 * `pool` is the store's connection count: several, so concurrent requests really run in parallel.
 */
export async function freshDatabase({blank = false, pool = 10} = {}) {
  factory ??= databaseFactory();
  const url = await (await factory).create({blank});
  const store = createStore(url, {max: pool});
  const db = {
    url,
    store,
    /** Apply the migrations now (for a `blank` database set up with older tables first). */
    migrate: () => migrate(url),
    all: async (sql, ...args) => (await store.query(toPg(sql), args)).rows,
    get: async (sql, ...args) => (await store.query(toPg(sql), args)).rows[0],
    run: (sql, ...args) => store.query(toPg(sql), args),
    /** Several statements, no parameters. */
    exec: sql => store.query(sql),
    count: async (sql, ...args) => Number((await store.query(toPg(sql), args)).rows[0].n),
    end: async () => { open.delete(db); await store.end(); }
  };
  open.add(db);
  return db;
}

/** Call handleApi like the Vercel Function does. */
export function caller(handleApi, getEnv) {
  return async (path, body) => {
    const res = await handleApi(new Request(`http://x${path}`, body ? {method: "POST", body: JSON.stringify(body), headers: {"content-type": "application/json"}} : {}), getEnv());
    return {status: res.status, ...(await res.json())};
  };
}

/**
 * A store whose statements can be rewritten or made to fail, inside transactions too.
 * `rule(sql)` returns nothing (run as is), an Error (throw it), or {sql, params} (run that instead).
 */
export function withFaults(store, rule) {
  const wrap = query => async (sql, params = []) => {
    const r = rule(sql, params);
    if (r instanceof Error) throw r;
    return r ? query(r.sql, r.params ?? params) : query(sql, params);
  };
  return {
    ...store,
    query: wrap(store.query),
    tx: fn => store.tx(q => fn({query: wrap(q.query)})),
    snapshot: fn => store.snapshot(q => fn({query: wrap(q.query)}))
  };
}
