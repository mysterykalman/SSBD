// Social/share metadata in the app's HTML head: the current description everywhere, each tag
// exactly once, and the preview image is the existing 512px app icon on the production host.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile, stat} from "node:fs/promises";

const DESCRIPTION = "A ridiculous word game for people who think they know each other.";
const TITLE = "Same Same but Different";
const PROD = "https://ssbd-omega.vercel.app"; // the repository's configured homepage
const html = await readFile(new URL("../src/client/index.html", import.meta.url), "utf8");
const head = html.slice(0, html.indexOf("</head>"));
const metas = (attr, name) => [...head.matchAll(new RegExp(`<meta ${attr}="${name.replace(/[:.]/g, "\\$&")}" content="([^"]*)">`, "g"))].map(m => m[1]);

test("one title and one of each description/share tag, with the new copy", () => {
  assert.deepEqual([...head.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1]), [TITLE]);
  const expected = {
    "name:description": DESCRIPTION,
    "property:og:type": "website",
    "property:og:title": TITLE,
    "property:og:description": DESCRIPTION,
    "property:og:image": `${PROD}/icon-512.png`,
    "property:og:image:width": "512",
    "property:og:image:height": "512",
    "name:twitter:card": "summary",
    "name:twitter:title": TITLE,
    "name:twitter:description": DESCRIPTION,
    "name:twitter:image": `${PROD}/icon-512.png`
  };
  for (const [key, value] of Object.entries(expected)) {
    const [attr, ...rest] = key.split(":");
    assert.deepEqual(metas(attr, rest.join(":")), [value], key);
  }
  assert.doesNotMatch(html, /warm, playful word-connection game/);
});

test("the share image and icons are the existing app icon files", async () => {
  for (const file of ["icon-512.png", "favicon.ico", "favicon-32.png", "apple-touch-icon.png"]) {
    assert.ok((await stat(new URL(`../src/client/icons/${file}`, import.meta.url))).size > 0, file);
  }
  const png = await readFile(new URL("../src/client/icons/icon-512.png", import.meta.url));
  assert.equal(png.readUInt32BE(16), 512, "512px wide");
  assert.equal(png.readUInt32BE(20), 512, "512px tall");
  for (const href of ["/favicon.ico", "/favicon-32.png", "/apple-touch-icon.png"]) assert.equal(head.split(`href="${href}"`).length - 1, 1, href);
});
