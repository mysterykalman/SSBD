// Cloudflare Worker entry: the family-game API plus the app shell.
// Static files are embedded at build time (see scripts/build.mjs).

import {handleApi} from "./api.js";
import {assets} from "virtual:assets";

const SHELL_ROUTES = /^\/(?:$|index\.html$|games\/|join\/|solo\/?)/;

function serveAsset(path, request) {
  const asset = assets[path];
  if (!asset) return null;
  const headers = {"content-type": asset.type, "cache-control": asset.cache, etag: asset.etag};
  if (path === "/sw.js") headers["service-worker-allowed"] = "/";
  if (request.headers.get("if-none-match") === asset.etag) return new Response(null, {status: 304, headers});
  return new Response(request.method === "HEAD" ? null : asset.body, {headers});
}

export default {
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
    if (SHELL_ROUTES.test(url.pathname)) return serveAsset("/index.html", request);
    return new Response("Not found", {status: 404, headers: {"content-type": "text/plain"}});
  }
};
