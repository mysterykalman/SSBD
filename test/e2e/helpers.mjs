import {spawn} from "node:child_process";
import {chromium} from "playwright";
import pg from "pg";
import {databaseFactory, migrate} from "../../scripts/postgres-local.mjs";

export const SHOTS = process.env.SHOTS_DIR || null;

let factory = null;
/**
 * Start the local server (static dist/ + vercel.json routing + the /api function) on a fresh,
 * migrated PostgreSQL database. `port` reuses an origin (same SW scope); `staticDir` serves a
 * different build; `beforeMigrate` runs SQL on an empty database before the migrations
 * (an already-populated database); `database: false` runs with no database at all.
 */
export async function startServer({port = 9000 + Math.floor(Math.random() * 900), staticDir, database = true, beforeMigrate, env: extraEnv = {}} = {}) {
  const env = {...process.env, ...extraEnv};
  delete env.POSTGRES_URL;
  delete env.NO_DATABASE;
  if (staticDir) env.STATIC_DIR = staticDir;
  if (database) {
    factory ??= databaseFactory();
    const url = await (await factory).create({blank: Boolean(beforeMigrate)});
    if (beforeMigrate) {
      const client = new pg.Client({connectionString: url});
      await client.connect();
      try { await client.query(beforeMigrate); } finally { await client.end(); }
      await migrate(url);
    }
    env.POSTGRES_URL = url;
  } else {
    env.NO_DATABASE = "1";
  }
  const proc = spawn(process.execPath, ["scripts/dev-server.mjs", String(port)], {stdio: ["ignore", "pipe", "inherit"], env});
  await new Promise((resolve, reject) => {
    proc.stdout.on("data", d => String(d).includes("Listening") && resolve());
    proc.on("exit", code => reject(new Error(`server exited ${code}`)));
  });
  const exited = new Promise(resolve => proc.on("exit", resolve));
  return {url: `http://localhost:${port}`, port, databaseUrl: env.POSTGRES_URL || null, stop: () => { proc.kill(); return exited; }};
}

/**
 * Launch Chromium. New contexts have already "met Gary" (the one-time Solo intro is skipped) and
 * Gary never makes a remark, so flows stay deterministic. Opt back in per context with
 * `browser.newContext({meetGary: true})` (show the intro) or `{garyRandom: () => number}` source
 * via `{garyRandomValue: 0.1}` (a fixed value for Gary's presentation randomness).
 */
export async function launch() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async ({meetGary = false, garyRandomValue = 0.99, ...options} = {}) => {
    const context = await newContext(options);
    await context.addInitScript(([met, value]) => {
      if (!met) { try { localStorage.setItem("ssbd_gary_met", "1"); localStorage.setItem("ssbd_milo_met", "1"); } catch {} }
      if (value !== null) window.__garyRandom = () => value;
    }, [meetGary, garyRandomValue]);
    return context;
  };
  return browser;
}

/**
 * Start a Solo game from home: "Let's play!" opens "Who do you want to play with?", then pick a
 * character (by default whoever is preselected: the last choice, or Gary) and start.
 */
export async function startSolo(page, character = null) {
  await page.click("#startSolo");
  await page.waitForSelector("#characterPicker[open]");
  if (character) await page.click(`#characterPicker label[data-character="${character}"]`);
  await page.click("#startCharacter");
}

/**
 * Join a family game through the UI: the room code first (typed, or already filled in from an invite
 * link when `code` is omitted), then "What should we call you?" with the player's own name.
 */
export async function joinRoom(page, {name, code = null}) {
  await page.waitForSelector("dialog #joinInput");
  if (code !== null) await page.fill("#joinInput", code);
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("dialog #nameInput");
  await page.fill("#nameInput", name);
  await page.click('dialog button[type="submit"]');
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

/**
 * Type a word and press the lock button. By default a reveal modal that follows is dismissed with
 * "Keep playing" (a rejected word opens no modal, so that only costs a short grace period).
 * Pass `{reveal: false}` to leave the modal open for inspection.
 */
export async function lockIn(page, word, {reveal = true} = {}) {
  await page.fill("#word", word);
  await page.click("#lockBtn");
  if (reveal) await continueReveal(page);
}

export async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

/** Submit with the Enter key instead of the button (same `reveal` option as lockIn). */
export async function lockInEnter(page, word, {reveal = true} = {}) {
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

/**
 * Every word either side already played in a Solo game (lowercase, with simple plural forms):
 * a played word is used up for both the player and Gary/Milo, so it can't be played again.
 */
export function usedWords(game) {
  const used = new Set();
  for (const m of game?.moves || []) {
    if (!m.words) continue;
    for (const w of [m.words.a, m.words.b].map(x => x.toLowerCase())) for (const form of [w, `${w}s`, `${w}es`, w.replace(/e?s$/, "")]) used.add(form);
  }
  return used;
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
    const used = usedWords(game);
    const bot = String(game.moves[game.moves.length - 1].hidden?.b || "").toLowerCase();
    const word = pool.find(w => !used.has(w) && w !== bot && !played.includes(w));
    if (!word) throw new Error("ran out of words");
    const before = revealedCount(game);
    await lockIn(page, word, {reveal: false});
    await waitForReveal(page, before);
    if (continueLast || i < count - 1) await continueReveal(page);
    played.push(word);
  }
  return played;
}

/** Wait until the open reveal modal shows its result and "Keep playing"; returns the modal's text. */
export async function revealShown(page, {timeout = 10000} = {}) {
  await page.locator("#revealContinue").waitFor({state: "visible", timeout});
  return page.locator("#revealModal").innerText();
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

/**
 * The Solo character's narrative beat in the open reveal (Gary's or Milo's): the BEFORE and AFTER
 * lines as shown, and the branch of the one approved pair they come from (null when they are not a
 * pair). Language: the page's.
 */
export async function garyBeat(page, language = "en") {
  const {GARY_NARRATIVE} = await import("../../src/client/gary-narrative.js");
  const {MILO_NARRATIVE} = await import("../../src/client/milo-narrative.js");
  const {STRINGS} = await import("../../src/client/i18n.js");
  const read = selector => page.locator(selector).count().then(n => (n ? page.locator(selector).getAttribute("data-full") : null));
  const before = await read("#garyBefore .gary-says"), after = await read("#garyLine .gary-says");
  for (const [character, n] of [["gary", GARY_NARRATIVE], ["milo", MILO_NARRATIVE]]) {
    for (const branch of n.BRANCHES) {
      for (const pair of n.pairsOf(branch)) {
        const keys = n.pairKeys(branch, pair);
        if (STRINGS[language][keys.before] === before && STRINGS[language][keys.after] === after) return {before, after, branch, pair, character, extra: keys.extra ? STRINGS[language][keys.extra] : null};
      }
    }
  }
  return {before, after, branch: null, pair: null, character: null, extra: null};
}
