// Run against the local development server: node scripts/audit-responsive.mjs
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const origin = process.env.SSBD_AUDIT_URL || "http://localhost:8787";
const widths = [320, 360, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const routes = ["/", "/mom-mode/", "/review"];
const out = "artifacts/responsive-audit";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
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
} finally {
  await browser.close();
}
await fs.writeFile(path.join(out, "report.json"), JSON.stringify(findings, null, 2));
for (const item of findings) {
  const fail = item.error || item.overflow || item.bad?.length || item.errors?.length || (item.status && item.status >= 400);
  console.log(`${fail ? "FAIL" : "PASS"} ${item.route} ${item.width}px${fail ? " " + JSON.stringify(item).slice(0, 260) : ""}`);
}
if (findings.some(x => x.error || x.overflow || x.bad?.length || x.errors?.length || (x.status && x.status >= 400))) process.exitCode = 1;
