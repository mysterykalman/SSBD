// Accessibility and localization checks in a real browser (Chromium via Playwright).
// No axe dependency: the checks below cover the rules that matter for this app
// (names, labels, ids, ARIA references, live regions, focus, dialogs, lang, contrast).
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

/** Static a11y audit of the current DOM. Returns a list of problems (empty = pass). */
async function audit(page) {
  return page.evaluate(() => {
    const problems = [];
    const visible = el => {
      if (el.closest("[hidden], [aria-hidden='true'], dialog:not([open])")) return false;
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden";
    };
    const name = el => {
      if (el.getAttribute("aria-label")?.trim()) return el.getAttribute("aria-label").trim();
      const by = el.getAttribute("aria-labelledby");
      if (by) return by.split(/\s+/).map(id => document.getElementById(id)?.textContent || "").join(" ").trim();
      if (el.labels?.length) return [...el.labels].map(l => l.textContent).join(" ").trim();
      return (el.textContent || "").trim();
    };
    // Unique ids.
    const ids = {};
    for (const el of document.querySelectorAll("[id]")) ids[el.id] = (ids[el.id] || 0) + 1;
    for (const [id, n] of Object.entries(ids)) if (n > 1) problems.push(`duplicate id #${id} (${n}x)`);
    // ARIA id references resolve.
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls", "for"]) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        for (const id of el.getAttribute(attr).split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id)) problems.push(`${el.tagName.toLowerCase()} ${attr}="${id}" points nowhere`);
        }
      }
    }
    // Buttons and links have names; inputs have labels.
    for (const el of document.querySelectorAll("button, a[href], [role=button]")) {
      if (visible(el) && !name(el)) problems.push(`unnamed ${el.tagName.toLowerCase()} ${el.outerHTML.slice(0, 80)}`);
    }
    for (const el of document.querySelectorAll("input, select, textarea")) {
      if (el.type === "hidden" || !visible(el)) continue;
      if (!el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")) problems.push(`input #${el.id} has no label`);
    }
    // aria-label is not allowed on generic div/span without a role.
    for (const el of document.querySelectorAll("div[aria-label], span[aria-label], p[aria-label]")) {
      if (!el.getAttribute("role")) problems.push(`aria-label on generic <${el.tagName.toLowerCase()}> is ignored: "${el.getAttribute("aria-label")}"`);
    }
    // Progress bars carry values.
    for (const el of document.querySelectorAll("[role=progressbar]")) {
      if (!name(el) || el.getAttribute("aria-valuenow") == null || el.getAttribute("aria-valuemax") == null) problems.push("progressbar missing name/value");
    }
    // Groups and landmarks with roles have names where required.
    for (const el of document.querySelectorAll("[role=group], dialog[open]")) {
      if (!name(el)) problems.push(`unnamed ${el.getAttribute("role") || el.tagName.toLowerCase()}`);
    }
    // aria-hidden content is not focusable.
    for (const el of document.querySelectorAll("[aria-hidden='true'] :is(button, a[href], input)")) problems.push(`focusable inside aria-hidden: ${el.outerHTML.slice(0, 60)}`);
    // Page language is set and valid.
    if (!["en", "fr"].includes(document.documentElement.lang)) problems.push(`html lang="${document.documentElement.lang}"`);
    // Nothing shows the acronym.
    if (/\bSSBD\b/.test(document.body.innerText + document.title)) problems.push("SSBD visible in UI");
    return problems;
  });
}

/** Text contrast for every visible text node, against its effective background. */
async function contrastFailures(page) {
  return page.evaluate(() => {
    const parse = c => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return {r, g, b, a};
    };
    const over = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1
    });
    const lum = ({r, g, b}) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const background = el => {
      const layers = [];
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      }
      let bg = {r: 255, g: 255, b: 255, a: 1};
      for (const layer of layers.reverse()) bg = over(layer, bg);
      return bg;
    };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      const el = walker.currentNode.parentElement;
      if (!text || !el || seen.has(el) || !/[\p{L}\p{N}]/u.test(text)) continue;
      seen.add(el);
      if (el.closest("[hidden], [aria-hidden='true'], .sr-only, dialog:not([open]), noscript, script, style")) continue;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) continue;
      if (el.closest("button:disabled")) continue; // disabled controls are exempt (WCAG 1.4.3)
      if (el.closest(".brand")) continue; // logotype is exempt (WCAG 1.4.3); reported separately
      const fg = parse(s.color);
      if (!fg) continue;
      const bg = background(el);
      const r = ratio(over(fg, bg), bg);
      const size = parseFloat(s.fontSize), weight = Number(s.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      if (r + 0.005 < need) {
        out.push({text: text.slice(0, 30), cls: el.className || el.tagName.toLowerCase(), ratio: Math.round(r * 100) / 100, need, color: s.color, size});
      }
    }
    return out;
  });
}

async function tabTo(page, predicate, max = 25) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(predicate)) return true;
  }
  return false;
}

const focusRing = page => page.evaluate(() => {
  const s = getComputedStyle(document.activeElement);
  return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || /rgb/.test(s.boxShadow);
});

test("keyboard-only Solo: Tab to start, type, Enter, focus returns to the word box, reveal is announced once", async () => {
  const context = await browser.newContext({locale: "en-US", reducedMotion: "reduce"});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");

  // The skip link comes first and is translated.
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.className), "skip");
  assert.ok(await tabTo(page, () => document.activeElement?.id === "startSolo"), "Start Solo reachable by Tab");
  assert.ok(await focusRing(page), "visible focus on Start Solo");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#word");
  await page.waitForFunction(() => document.activeElement?.id === "word");

  // Error is tied to the input.
  await page.keyboard.press("Enter");
  assert.equal(await page.getAttribute("#word", "aria-invalid"), "true");
  assert.match(await page.getAttribute("#word", "aria-describedby"), /\bformHelp\b/);
  assert.match(await page.locator("#formHelp").innerText(), /type a word/i);
  assert.equal(await page.getAttribute("#formHelp", "aria-live"), "polite");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "word", "focus stays in the word box after an error");
  await page.keyboard.type("x");
  assert.equal(await page.getAttribute("#word", "aria-invalid"), "false", "typing clears the error state");
  await page.keyboard.press("Backspace");

  const bot = await botWord(page);
  const mine = bot.toLowerCase() === "lighthouse" ? "volcano" : "lighthouse";
  await page.keyboard.type(mine);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".reveal");
  await page.waitForFunction(() => document.activeElement?.id === "word" || document.activeElement?.id === "newGameBtn");

  // One announcement, from the persistent live region; the banner itself is not live.
  await page.waitForFunction(() => document.getElementById("srAnnounce")?.textContent.length > 0);
  const said = await page.locator("#srAnnounce").textContent();
  assert.match(said, /Reveal!/);
  assert.match(said, new RegExp(`You: ${mine}`, "i"));
  assert.match(said, new RegExp(`Bot: ${bot}`, "i"));
  assert.equal(await page.getAttribute("#srAnnounce", "aria-live"), "polite");
  assert.equal(await page.locator(".reveal[aria-live], .reveal[role]").count(), 0, "reveal banner is not a second live region");
  assert.equal(await page.locator(".reveal.animate").count(), 0, "reduced motion: no reveal animation");
  if (await page.locator("#word").count()) {
    assert.match(await page.getAttribute("#word", "aria-describedby"), /\bprompt\b/, "the prompt words describe the input");
    assert.equal(await page.getAttribute("#prompt", "lang"), "en");
  }
  // Re-rendering (language switch back and forth) does not announce the same reveal again.
  await page.click('[data-lang="fr"]');
  await page.click('[data-lang="en"]');
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#srAnnounce").textContent(), said);
  assert.deepEqual(await audit(page), []);
  assert.deepEqual(errors, []);
  await context.close();
});

test("language: keyboard toggle, persists across reload, updates lang, keeps the active game's word language", async () => {
  const context = await browser.newContext({locale: "en-US"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");
  assert.equal(await page.getAttribute("#langGroup", "role"), "group");
  assert.equal(await page.getAttribute("#langGroup", "aria-label"), "Language");

  // Start an English game, then switch the UI to French with the keyboard.
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  await page.fill("#word", "pizz");
  await page.focus('[data-lang="fr"]');
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.documentElement.lang === "fr");
  assert.equal(await page.getAttribute('[data-lang="fr"]', "aria-pressed"), "true");
  assert.equal(await page.getAttribute('[data-lang="en"]', "aria-pressed"), "false");
  assert.equal(await page.getAttribute('[data-lang="fr"]', "lang"), "fr");
  assert.equal(await page.evaluate(() => localStorage.getItem("ssbd_language")), "fr");
  assert.equal(await page.inputValue("#word"), "pizz", "typed text survives the switch");
  assert.equal(await page.getAttribute("#word", "lang"), "en", "input keeps the game's language");
  assert.equal(await page.getAttribute("#langGroup", "aria-label"), "Langue");
  assert.equal(await page.getAttribute("#brandLink", "lang"), "en");
  const note = await page.locator(".lang-note").innerText();
  assert.match(note, /Cette partie est en anglais\./);
  assert.match(note, /Nouvelle partie en français/);
  assert.match(await page.locator("#lockBtn").innerText(), /verrouille/i);
  assert.equal(await page.locator(".skip").textContent(), "Aller au jeu");
  assert.deepEqual(await audit(page), []);

  // Reload: still French.
  await page.reload();
  await page.waitForSelector("#lockBtn");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "fr");
  assert.equal(await page.getAttribute('[data-lang="fr"]', "aria-pressed"), "true");
  assert.match(await page.locator("#lockBtn").innerText(), /verrouille/i);

  // Explicit "new game in French" gives a French game with no note.
  await page.click(".lang-note button");
  await page.waitForFunction(() => document.getElementById("word")?.lang === "fr");
  assert.equal(await page.locator(".lang-note").count(), 0);

  // Home in French: the English game is labelled as such in the list.
  await page.click("#backBtn");
  await page.waitForSelector("#startSolo");
  assert.equal(await page.locator("#startSolo").innerText(), "Commencer une partie solo");
  assert.match(await page.locator("#gameList").innerText(), /En anglais/);
  assert.doesNotMatch(await page.locator("body").innerText(), /\bSSBD\b/);
  assert.deepEqual(await audit(page), []);

  // A fresh visit with a French browser and no stored choice starts in French; a stored choice wins.
  const frContext = await browser.newContext({locale: "fr-CA"});
  const frPage = await frContext.newPage();
  await frPage.goto(server.url);
  await frPage.waitForSelector("#startSolo");
  assert.equal(await frPage.evaluate(() => document.documentElement.lang), "fr");
  await frPage.click('[data-lang="en"]');
  await frPage.reload();
  await frPage.waitForSelector("#startSolo");
  assert.equal(await frPage.evaluate(() => document.documentElement.lang), "en");
  await frContext.close();
  await context.close();
});

test("dialogs are labelled, trap focus, close on Escape and return focus; errors are tied to the field", async () => {
  const context = await browser.newContext({locale: "en-US"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#profileBtn");
  assert.equal(await page.getAttribute("#profileBtn", "aria-label"), "Your profile");
  await page.focus("#profileBtn");
  await page.keyboard.press("Enter");
  await page.waitForSelector("dialog[open]");
  assert.equal(await page.getAttribute("#dialog", "aria-labelledby"), "dialogTitle");
  assert.ok((await page.locator("#dialogTitle").innerText()).trim());
  assert.deepEqual(await audit(page), []);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    // Native modal: focus cycles through the dialog and may step out to the browser's own UI
    // (activeElement = body), but never onto the inert page behind it.
    assert.ok(await page.evaluate(() => {
      const el = document.activeElement;
      return document.getElementById("dialog").contains(el) || el === document.body || el === null;
    }), "focus never reaches the page behind the dialog");
  }
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.getElementById("dialog").open);
  await page.waitForFunction(() => document.activeElement?.id === "profileBtn");

  // Name dialog: empty submit shows an error the input points at.
  await page.focus("#createFamily");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#nameInput");
  await page.waitForFunction(() => document.activeElement?.id === "nameInput");
  assert.equal(await page.getAttribute("#dialog", "aria-describedby"), "dialogCopy");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("dialogError").textContent.length > 0);
  assert.equal(await page.getAttribute("#nameInput", "aria-invalid"), "true");
  assert.equal(await page.getAttribute("#nameInput", "aria-describedby"), "dialogError");
  assert.equal(await page.getAttribute("#dialogError", "role"), "alert");
  assert.deepEqual(await audit(page), []);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.activeElement?.id === "createFamily");
  await context.close();
});

test("toasts: one live region, no double announcements when going offline", async () => {
  const context = await browser.newContext({locale: "en-US"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  assert.equal(await page.getAttribute("#toasts", "aria-live"), "polite");
  await context.setOffline(true);
  await page.waitForSelector(".toast");
  assert.equal(await page.locator(".toast[role], .toast [role=status], .toast [role=alert]").count(), 0, "toast items add no second live region");
  assert.equal(await page.getAttribute("#offlinePill", "role"), null, "offline pill is not also a live region");
  assert.equal(await page.isVisible("#offlinePill"), true);
  assert.equal(await page.getAttribute(".toast-close", "aria-label"), "Dismiss");
  await context.setOffline(false);
  await context.close();
});

test("colour contrast of visible text meets WCAG AA (4.5:1 body, 3:1 large) in both languages", async () => {
  const context = await browser.newContext({locale: "en-US", reducedMotion: "reduce"});
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForSelector("#startSolo");
  const failures = [];
  const collect = async where => { for (const f of await contrastFailures(page)) failures.push({where, ...f}); };
  await collect("home");
  await page.click("#startSolo");
  await page.waitForSelector("#word");
  await page.fill("#word", "");
  await page.click("#lockBtn"); // error state
  await collect("game-error");
  const bot = await botWord(page);
  await page.fill("#word", bot.toLowerCase() === "rainbow" ? "thunder" : "rainbow");
  await page.click("#lockBtn");
  await page.waitForSelector(".trail-row");
  await collect("game-reveal");
  await page.click('[data-lang="fr"]');
  await collect("game-fr");
  const unique = [...new Map(failures.map(f => [`${f.cls}|${f.color}|${f.ratio}`, f])).values()];
  if (unique.length) console.log("contrast failures:\n" + unique.map(f => `  [${f.where}] .${f.cls} "${f.text}" ${f.ratio}:1 (needs ${f.need}) ${f.color} ${f.size}px`).join("\n"));
  assert.deepEqual(unique, [], "text below WCAG AA contrast");
  await context.close();
});
