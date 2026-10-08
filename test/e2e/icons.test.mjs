// The app icon: the "Same Same but Different" artwork as the favicon, Apple touch icon and install icons.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** Width and height from a PNG's IHDR chunk. */
const pngSize = bytes => ({width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)});

test("the page links the favicon and touch icon, the manifest lists install icons, and every one is served at its size", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  const links = await page.$$eval('link[rel~="icon"], link[rel="apple-touch-icon"]', els => els.map(el => [el.rel, el.getAttribute("href"), el.getAttribute("sizes")]));
  assert.deepEqual(links, [["icon", "/favicon.ico", "48x48"], ["icon", "/favicon-32.png", "32x32"], ["apple-touch-icon", "/apple-touch-icon.png", null]]);
  assert.equal(await page.locator('link[href$=".svg"]').count(), 0, "the old SVG icon is gone");

  const fetchBytes = async path => {
    const res = await fetch(server.url + path);
    assert.equal(res.status, 200, path);
    return {type: res.headers.get("content-type"), bytes: Buffer.from(await res.arrayBuffer())};
  };
  const ico = await fetchBytes("/favicon.ico");
  assert.equal(ico.type, "image/x-icon");
  assert.deepEqual([...ico.bytes.subarray(0, 4)], [0, 0, 1, 0], "a real .ico file");
  assert.ok(ico.bytes.readUInt16LE(4) >= 3, "with 16, 32 and 48 px images");
  for (const [path, size] of [["/favicon-32.png", 32], ["/apple-touch-icon.png", 180], ["/icon-192.png", 192], ["/icon-512.png", 512]]) {
    const png = await fetchBytes(path);
    assert.equal(png.type, "image/png", path);
    assert.deepEqual(pngSize(png.bytes), {width: size, height: size}, path);
  }
  const manifest = await (await fetch(server.url + "/manifest.webmanifest")).json();
  assert.deepEqual(manifest.icons.map(i => [i.src, i.sizes, i.type]), [["/icon-192.png", "192x192", "image/png"], ["/icon-512.png", "512x512", "image/png"]]);
  // Transparent rounded corners on the install icon, the artwork in the middle.
  const corner = await page.evaluate(async () => {
    const img = new Image();
    img.src = "/icon-512.png";
    await img.decode();
    const canvas = Object.assign(document.createElement("canvas"), {width: 512, height: 512});
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return {corner: ctx.getImageData(2, 2, 1, 1).data[3], middle: ctx.getImageData(256, 256, 1, 1).data[3]};
  });
  assert.deepEqual(corner, {corner: 0, middle: 255});
  await context.close();
});
