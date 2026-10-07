// @ts-check
// Cloudflare Worker entry: the family-game API plus the app shell.
// Static files are embedded at build time (see scripts/build.mjs).

import {handleApi} from "./api.js";
import {assets} from "virtual:assets";

const SHELL_ROUTES = /^\/(?:$|index\.html$|games\/|join\/|solo\/?)/;

/**
 * @param {string} path
 * @param {Request} request
 * @returns {Response | null}
 */
function serveAsset(path, request) {
  const asset = assets[path];
  if (!asset) return null;
  /** @type {Record<string, string>} */
  const headers = {"content-type": asset.type, "cache-control": asset.cache, etag: asset.etag};
  if (path === "/sw.js") headers["service-worker-allowed"] = "/";
  if (request.headers.get("if-none-match") === asset.etag) return new Response(null, {status: 304, headers});
  return new Response(request.method === "HEAD" ? null : asset.body, {headers});
}

export default {
  /**
   * @param {Request} request
   * @param {{DB?: import("../shared/types.js").D1Database}} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({error: "Something went wrong. Please try again.", code: "SERVER_ERROR"}), {status: 500, headers: {"content-type": "application/json", "cache-control": "no-store"}});
      }
    }
    const direct = serveAsset(url.pathname, request);
    if (direct) return direct;
    const shell = SHELL_ROUTES.test(url.pathname) ? serveAsset("/index.html", request) : null;
    if (shell) return shell;
    return new Response("Not found", {status: 404, headers: {"content-type": "text/plain"}});
  }
};
