// @ts-check
// Vercel Function for every /api/* request (vercel.json rewrites them here).
// Family mode only: Solo never calls the API. The database connection comes from
// the server-side POSTGRES_URL environment variable and is never sent to the browser.

import {handleApi} from "../src/server/api.js";
import {storeFromEnv} from "../src/server/db.js";

/**
 * vercel.json rewrites /api/<path> to /api?__path=<path>; put the original path back
 * (and leave a request that already carries its original path alone).
 * @param {Request} request
 * @returns {Promise<Request>}
 */
async function restorePath(request) {
  const url = new URL(request.url);
  const rewritten = url.searchParams.get("__path");
  if (rewritten === null) return request;
  url.searchParams.delete("__path");
  url.pathname = rewritten ? `/api/${rewritten.replace(/^\/+/, "")}` : "/api";
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  return new Request(url, {method: request.method, headers: request.headers, body});
}

/**
 * @param {Request} request
 * @param {import("../src/server/api.js").ApiEnv} [env]
 * @returns {Promise<Response>}
 */
export async function handle(request, env) {
  try {
    // REVIEW_TOKEN (server-side only) unlocks the private bot-review endpoints; without it they are off.
    return await handleApi(await restorePath(request), env || {store: storeFromEnv(), reviewToken: process.env.REVIEW_TOKEN || undefined});
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({error: "Something went wrong. Please try again.", code: "SERVER_ERROR"}), {status: 500, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});
  }
}

/** @param {Request} request */
const fromVercel = request => handle(request);
export {fromVercel as GET, fromVercel as POST, fromVercel as PUT, fromVercel as PATCH, fromVercel as DELETE, fromVercel as HEAD, fromVercel as OPTIONS};
