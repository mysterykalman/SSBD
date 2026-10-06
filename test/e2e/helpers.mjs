import {spawn} from "node:child_process";
import {chromium} from "playwright";

export const SHOTS = process.env.SHOTS_DIR || null;

export async function startServer() {
  const port = 9000 + Math.floor(Math.random() * 900);
  const proc = spawn(process.execPath, ["scripts/dev-server.mjs", String(port), ":memory:"], {stdio: ["ignore", "pipe", "inherit"]});
  await new Promise((resolve, reject) => {
    proc.stdout.on("data", d => String(d).includes("Listening") && resolve());
    proc.on("exit", code => reject(new Error(`server exited ${code}`)));
  });
  return {url: `http://localhost:${port}`, stop: () => proc.kill()};
}

export async function launch() {
  return chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
}

/** The bot's locked word for the open Solo move, read from device storage (test-only peek). */
export async function botWord(page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("ssbd.store"));
    const id = location.pathname.split("/").pop();
    const game = data.solo[id];
    return game.moves[game.moves.length - 1].hidden?.b || null;
  });
}

export async function lockIn(page, word) {
  await page.fill("#word", word);
  await page.click("#lockBtn");
}

export async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
