// Run against the local development server: node scripts/audit-responsive.mjs
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const origin = process.env.SSBD_AUDIT_URL || "http://localhost:8787";
const widths = [320, 360, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const routes = ["/", "/mom/", "/review"];
const out = "artifacts/responsive-audit";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
const gameplay = [];
try {
  for (const route of routes) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const url = new URL(route, origin).href;
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(500);
        const layout = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > viewport + 2;
          const bad = [...document.querySelectorAll("button, a, input, .audio-value, .answer")].filter(el => {
            if (!el.getClientRects().length) return false;
            const style = getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none") return false;
            const b = el.getBoundingClientRect();
            return b.width > 0 && (b.left < -3 || b.right > viewport + 3);
          }).slice(0, 12).map(el => ({ selector: el.id || el.className?.toString().slice(0, 80) || el.tagName, text: el.textContent?.trim().slice(0, 40) }));
          return { overflow, bad };
        });
        const slug = route === "/" ? "home" : route.replaceAll("/", "");
        await page.screenshot({ path: path.join(out, `${slug}-${width}.png`), fullPage: true });
        findings.push({ route, width, status: response?.status(), ...layout, errors });
      } catch (error) {
        findings.push({ route, width, error: error.message });
      } finally {
        await page.close();
      }
    }
  }

  // Capture actual Pam gameplay after dismissing her introduction.
  for (const width of widths) {
    const page = await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    const state = {route:"/mom/",width,scenario:"pam-gameplay",screenshots:[],errors:[]};
    page.on("pageerror",e=>state.errors.push(e.message));
    const capture = async name => {
      const file = `pam-${name}-${width}.png`;
      await page.screenshot({path:path.join(out,file),fullPage:true});
      state.screenshots.push(file);
      const check = await page.evaluate(() => {
        const w=document.documentElement.clientWidth;
        const visible=[...document.querySelectorAll("button:not([hidden]),input:not([hidden])")].filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=="hidden" && !el.closest("[hidden]"));
        return {overflow:document.documentElement.scrollWidth>w+2,offscreen:visible.filter(el=>{const r=el.getBoundingClientRect();return r.left < -3 || r.right>w+3}).map(el=>el.id||el.textContent.trim().slice(0,30))};
      });
      if(check.overflow||check.offscreen.length) state.errors.push(`${name}: ${JSON.stringify(check)}`);
    };
    try {
      await page.goto(new URL("/mom/",origin).href,{waitUntil:"domcontentloaded"});
      await page.locator("#pam-intro-dialog").waitFor({state:"visible",timeout:10000});
      await page.locator("#pam-intro-play").click();
      await capture("setup");
      await page.locator("#secret-word").fill("guitar");
      await page.locator("#start-btn").click();
      await capture("category");
      await page.locator('#category-actions [data-answer="other"]').click();
      await capture("question-1");
      for(let turn=0;turn<6;turn++){
        const stage=await page.locator(".game-card").getAttribute("data-stage");
        if(stage==="question"){
          await page.locator('#answer-actions [data-answer="yes"]').click();
          await capture(`turn-${turn+2}`);
        } else if(stage==="hunch") {
          await capture("hunch");
          await page.locator("#guess-now-btn").click();
          await capture("guess");
          break;
        } else if(stage==="guess"||stage==="result") break;
        else throw new Error(`Unexpected Pam stage: ${stage}`);
      }
      const finalStage=await page.locator(".game-card").getAttribute("data-stage");
      if(finalStage==="guess"){
        await page.locator("#wrong-btn").click();
        await capture("result");
      }
      state.stageReached=await page.locator(".game-card").getAttribute("data-stage");
    }catch(e){state.errors.push(e.message);}
    gameplay.push(state);
    await page.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(out, "report.json"), JSON.stringify(findings, null, 2));
await fs.writeFile(path.join(out, "gameplay-report.json"), JSON.stringify(gameplay, null, 2));
for (const item of findings) {
  const fail = item.error || item.overflow || item.bad?.length || item.errors?.length || (item.status && item.status >= 400);
  console.log(`${fail ? "FAIL" : "PASS"} ${item.route} ${item.width}px${fail ? " " + JSON.stringify(item).slice(0, 260) : ""}`);
}
if (findings.some(x => x.error || x.overflow || x.bad?.length || x.errors?.length || (x.status && x.status >= 400))) process.exitCode = 1;

for(const state of gameplay) console.log(`${state.errors.length ? "FAIL" : "PASS"} Pam gameplay ${state.width}px: ${state.screenshots.length} screenshots, stage ${state.stageReached||"unknown"}${state.errors.length ? " "+state.errors.join("; ").slice(0,250):""}`);
if(gameplay.some(s=>s.errors.length)) process.exitCode=1;
