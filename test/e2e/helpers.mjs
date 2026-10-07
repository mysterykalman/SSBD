import {spawn} from "node:child_process";
import {chromium} from "playwright";

export const SHOTS = process.env.SHOTS_DIR || null;

/** Start the built worker on Node. `port` reuses an origin (same SW scope); `workerFile` serves a different build. */
export async function startServer({port = 9000 + Math.floor(Math.random() * 900), workerFile} = {}) {
  const env = workerFile ? {...process.env, WORKER_FILE: workerFile} : process.env;
  const proc = spawn(process.execPath, ["scripts/dev-server.mjs", String(port), ":memory:"], {stdio: ["ignore", "pipe", "inherit"], env});
  await new Promise((resolve, reject) => {
    proc.stdout.on("data", d => String(d).includes("Listening") && resolve());
    proc.on("exit", code => reject(new Error(`server exited ${code}`)));
  });
  const exited = new Promise(resolve => proc.on("exit", resolve));
  return {url: `http://localhost:${port}`, port, stop: () => { proc.kill(); return exited; }};
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

/**
 * If a reveal modal is up (or about to come up), press its "Keep playing" button and wait for it to close.
 * A no-op when the app shows the reveal inline: if neither #revealModal nor #revealContinue shows up
 * within a short grace period, it returns straight away (so long games stay fast).
 */
export async function continueReveal(page, {timeout = 8000, grace = 300} = {}) {
  const present = () => page.locator("#revealModal, #revealContinue").count();
  const graceEnd = Date.now() + grace;
  while (!(await present())) {
    if (Date.now() > graceEnd) return false;
    await page.waitForTimeout(50);
  }
  const button = page.locator("#revealContinue");
  try {
    await button.waitFor({state: "visible", timeout});
  } catch {
    return false;
  }
  await button.click();
  await page.locator("#revealModal").waitFor({state: "hidden", timeout}).catch(() => {});
  return true;
}

/** Type a word and press the lock button. `{reveal: true}` also dismisses a reveal modal afterwards. */
export async function lockIn(page, word, {reveal = false} = {}) {
  await page.fill("#word", word);
  await page.click("#lockBtn");
  if (reveal) await continueReveal(page);
}

export async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

/** Submit with the Enter key instead of the button. */
export async function lockInEnter(page, word, {reveal = false} = {}) {
  await page.fill("#word", word);
  await page.press("#word", "Enter");
  if (reveal) await continueReveal(page);
}

/** The Solo game record for the page's /solo/<id> URL, straight from device storage. */
export async function soloRecord(page) {
  return page.evaluate(() => {
    const id = location.pathname.split("/").pop();
    return JSON.parse(localStorage.getItem("ssbd.store") || "null")?.solo?.[id] || null;
  });
}

const revealedCount = game => (game?.moves || []).filter(m => m.words).length;

/** Wait until the stored game for this page has more than `n` revealed moves (or is finished). */
export async function waitForReveal(page, n) {
  await page.waitForFunction(n => {
    const id = location.pathname.split("/").pop();
    const game = JSON.parse(localStorage.getItem("ssbd.store") || "null")?.solo?.[id];
    return game && (game.moves.filter(m => m.words).length > n || game.status !== "ACTIVE");
  }, n);
}

// Distinct, ordinary words for long Solo games (more than 20, so a clash with the bot can be skipped).
export const PLAY_WORDS = ["whale", "garden", "pencil", "rocket", "banana", "violin", "jungle", "candle", "turtle", "pillow",
  "marble", "forest", "ladder", "rabbit", "button", "carrot", "dragon", "mirror", "kettle", "puzzle", "anchor", "walrus", "trumpet", "lantern"];

/**
 * Play `count` Solo moves without ever matching the bot, so the game keeps going.
 * Words already played on this side are skipped. Each reveal modal is dismissed, except the last one
 * when `continueLast` is false (so a test can inspect it). Returns the words played.
 */
export async function playDistinct(page, count, pool = PLAY_WORDS, {continueLast = true} = {}) {
  const played = [];
  for (let i = 0; i < count; i++) {
    const game = await soloRecord(page);
    if (!game || game.status !== "ACTIVE") break;
    const mine = new Set(game.moves.filter(m => m.words).map(m => m.words.a.toLowerCase()));
    const bot = String(game.moves[game.moves.length - 1].hidden?.b || "").toLowerCase();
    const word = pool.find(w => !mine.has(w) && w !== bot && !played.includes(w));
    if (!word) throw new Error("ran out of words");
    const before = revealedCount(game);
    await lockIn(page, word);
    await waitForReveal(page, before);
    if (continueLast || i < count - 1) await continueReveal(page);
    played.push(word);
  }
  return played;
}

/** Progress as shown to the player: the progressbar's aria-valuenow (and its "Move n of 20" text). */
export async function progressOf(page) {
  const bar = page.locator("[role=progressbar]").first();
  return {
    now: Number(await bar.getAttribute("aria-valuenow")),
    max: Number(await bar.getAttribute("aria-valuemax")),
    text: (await bar.getAttribute("aria-valuetext")) || ""
  };
}
