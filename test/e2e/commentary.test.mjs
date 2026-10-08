// Character commentary layout: the bubble has one fixed, responsive width (never the width of the text
// typed so far), so the typewriter never resizes it; the avatar stays put; nothing overflows on a
// phone. Gary and Milo, English and French, short, long and multi-line lines, mobile and desktop.
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {botWord, launch, soloRecord, startServer, startSolo, usedWords} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer({database: false}); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const WORDS = {en: ["garden", "violin", "rocket", "pencil", "turtle", "pillow", "lantern", "anchor"], fr: ["jardin", "violon", "fusée", "crayon", "tortue", "oreiller", "lanterne", "ancre"]};

/** Lock in a word and sample the commentary geometry on every animation frame until the reveal is ready. */
async function sampleReveal(page, word) {
  await page.fill("#word", word);
  const samples = page.evaluate(() => new Promise(resolve => {
    const out = [], t0 = performance.now();
    const tick = () => {
      for (const id of ["garyBefore", "garyLine"]) {
        const box = document.getElementById(id);
        if (!box || box.hidden) continue;
        const bubble = box.querySelector(".gary-bubble"), art = box.querySelector(".gary-reaction-art");
        const typed = box.querySelector(".gary-says .typed")?.textContent.length ?? 0;
        out.push({id, typed, width: bubble.getBoundingClientRect().width, art: art.getBoundingClientRect().left, right: bubble.getBoundingClientRect().right,
          overflow: document.documentElement.scrollWidth > innerWidth + 1, viewport: innerWidth});
      }
      if (document.getElementById("revealContinue") || performance.now() - t0 > 15000) return resolve(out);
      requestAnimationFrame(tick);
    };
    tick();
  }));
  await page.click("#lockBtn");
  return samples;
}

for (const lang of ["en", "fr"]) {
  for (const who of ["gary", "milo"]) {
    test(`commentary width stays fixed while typing, and the avatar stays put (${who}, ${lang}, desktop and mobile)`, async () => {
      const widths = {};
      for (const viewport of [{width: 1280, height: 860}, {width: 360, height: 740}]) {
        const context = await browser.newContext({viewport});
        const page = await context.newPage();
        await page.goto(server.url);
        if (lang === "fr") await page.click('[data-lang="fr"]');
        await startSolo(page, who);
        await page.waitForSelector("#word");
        for (let move = 0; move < 4; move++) {
          const bot = (await botWord(page)).toLowerCase();
          const used = usedWords(await soloRecord(page));
          const word = WORDS[lang].find(w => w !== bot && !used.has(w));
          const samples = await sampleReveal(page, word);
          for (const id of ["garyBefore", "garyLine"]) {
            const mine = samples.filter(s => s.id === id);
            assert.ok(mine.length, `${id} was shown`);
            const typing = mine.filter(s => s.typed > 0);
            assert.ok(typing.length > 1, `${id}: sampled while typing`);
            const w = new Set(mine.map(s => Math.round(s.width))), a = new Set(mine.map(s => Math.round(s.art)));
            assert.equal(w.size, 1, `${who} ${lang} ${viewport.width} move ${move + 1} ${id}: width changed while typing (${[...w]})`);
            assert.equal(a.size, 1, `${id}: the avatar moved (${[...a]})`);
            assert.ok(mine.every(s => !s.overflow && s.right <= s.viewport + 0.5), `${id}: no horizontal overflow`);
            (widths[viewport.width] ??= new Set()).add(Math.round(mine[0].width));
          }
          if (await page.locator("#app .end").count()) break;
          await page.click("#revealContinue");
          await page.waitForSelector("#revealModal", {state: "detached"});
        }
        await context.close();
      }
      // Short, long and multi-line lines all get the same bubble width (the text wraps inside it).
      for (const [vw, set] of Object.entries(widths)) assert.equal(set.size, 1, `${who} ${lang} ${vw}px: one bubble width for every line (${[...set]})`);
    });
  }
}

test("Gary and Milo use the same commentary dimensions", async () => {
  const sizes = {};
  for (const who of ["gary", "milo"]) {
    const context = await browser.newContext({viewport: {width: 1280, height: 860}, reducedMotion: "reduce"});
    const page = await context.newPage();
    await page.goto(server.url);
    await startSolo(page, who);
    await page.waitForSelector("#word");
    const bot = (await botWord(page)).toLowerCase();
    await page.fill("#word", bot === "garden" ? "pencil" : "garden");
    await page.click("#lockBtn");
    await page.waitForSelector("#revealContinue");
    sizes[who] = await page.evaluate(() => ["garyBefore", "garyLine"].map(id => Math.round(document.querySelector(`#${id} .gary-bubble`).getBoundingClientRect().width)));
    await context.close();
  }
  assert.deepEqual(sizes.gary, sizes.milo);
});
