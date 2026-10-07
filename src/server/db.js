// @ts-check
// Postgres access for the Family-mode API (Supabase in production, a local
// PostgreSQL in development and tests). Server-side only: nothing here is
// bundled into the browser app.
//
// The store has three entry points:
//   query(sql, params)  one statement, committed on its own
//   tx(fn)              BEGIN … COMMIT on one connection; ROLLBACK on any error
//   snapshot(fn)        a read-only transaction that sees one consistent view
//                       (REPEATABLE READ), for reads that span several queries
//
// Production connects through Supabase's pooler (Supavisor, transaction mode).
// That pooler does not support named prepared statements; pg only creates them
// when a query is given a `name`, which this code never does.

import pg from "pg";

/**
 * @typedef {import("../shared/types.js").Store} Store
 * @typedef {import("../shared/types.js").Queryable} Queryable
 */

/** Local hosts never use TLS unless the URL asks for it. */
const LOCAL = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/;

/**
 * pg options for a connection string. TLS is required for remote hosts. With
 * `ca` the server certificate is verified against it; without one the link is
 * still encrypted but the certificate is not checked, the same as libpq's
 * `sslmode=require` (Supabase's pooler certificate is issued by Supabase's own CA).
 * @param {string} connectionString
 * @param {{ca?: string, max?: number}} [options]
 * @returns {import("pg").PoolConfig}
 */
export function poolConfig(connectionString, {ca, max = 3} = {}) {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");
  // These are handled here, not by pg's URL parser (which would turn "require" into full verification).
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) url.searchParams.delete(key);
  const local = LOCAL.test(url.hostname);
  const ssl = sslmode === "disable" || (local && !sslmode) ? false : ca ? {ca, rejectUnauthorized: true} : {rejectUnauthorized: false};
  return {
    connectionString: url.toString(),
    ssl,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true
  };
}

/**
 * @param {import("pg").Pool} pool
 * @returns {Store}
 */
export function storeFromPool(pool) {
  /**
   * @template T
   * @param {string} begin
   * @param {(q: Queryable) => Promise<T>} fn
   * @returns {Promise<T>}
   */
  const inTransaction = async (begin, fn) => {
    const client = await pool.connect();
    let broken = false;
    try {
      await client.query(begin);
      const result = await fn({query: (sql, params = []) => client.query(sql, /** @type {any[]} */ (params))});
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { broken = true; }
      throw error;
    } finally {
      // A connection that could not even roll back is discarded, never reused.
      client.release(broken);
    }
  };
  return {
    query: (sql, params = []) => pool.query(sql, /** @type {any[]} */ (params)),
    tx: fn => inTransaction("BEGIN", fn),
    snapshot: fn => inTransaction("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY", fn),
    end: () => pool.end()
  };
}

/**
 * @param {string} connectionString
 * @param {{ca?: string, max?: number}} [options]
 * @returns {Store}
 */
export function createStore(connectionString, options) {
  const pool = new pg.Pool(poolConfig(connectionString, options));
  // An idle connection dropped by the pooler must not crash the function.
  pool.on("error", error => console.error("postgres pool error", error.message));
  return storeFromPool(pool);
}

/** @type {Store | null} */
let shared = null;
/**
 * The store for this server process, from POSTGRES_URL (and the optional
 * POSTGRES_CA_CERT). Null when no database is configured.
 * @param {Record<string, string | undefined>} [env]
 * @returns {Store | null}
 */
export function storeFromEnv(env = process.env) {
  if (shared) return shared;
  const url = env.POSTGRES_URL;
  if (!url) return null;
  shared = createStore(url, {ca: env.POSTGRES_CA_CERT || undefined, max: Number(env.POSTGRES_POOL_MAX) || 3});
  return shared;
}

/**
 * A unique-constraint violation, optionally on one named constraint.
 * @param {unknown} error
 * @param {string} [constraint]
 */
export function isUniqueViolation(error, constraint) {
  const e = /** @type {{code?: string, constraint?: string} | null} */ (error);
  return e?.code === "23505" && (!constraint || e.constraint === constraint);
}

/**
 * The database is unreachable, refusing connections, or out of capacity:
 * a temporary outage rather than a bug in the request.
 * @param {unknown} error
 */
export function isUnavailable(error) {
  const e = /** @type {{code?: string, message?: string} | null} */ (error);
  const code = String(e?.code || "");
  return /^(08|53|57P0[1-3]|28|3D000)/.test(code)
    || /^(ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|EPIPE)$/.test(code)
    || /timeout exceeded when trying to connect|Connection terminated/i.test(String(e?.message || ""));
}

/** A table the API needs does not exist (the migration has not been applied). */
export const isSchemaMissing = (/** @type {any} */ error) => error?.code === "42P01";
