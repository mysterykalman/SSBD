// Device-local sound system and settings UI.
// Audio comes from Mcamento8/open-game-sfx-index. The selected files are CC0/public domain.
// We use a small curated set of event-specific sounds, never the full index.


const STORAGE_KEY = "ssbd.audio.v1";
const DEFAULTS = Object.freeze({enabled: true, game: 0.7, notifications: 0.5, ui: 0.3});
const BASE = "https://raw.githubusercontent.com/Mcamento8/open-game-sfx-index/main/audio";

const SOUND = Object.freeze({
  uiClick: {channel: "ui", url: `${BASE}/ui-audio/click2.ogg`},
  uiToggle: {channel: "ui", url: `${BASE}/ui-audio/switch12.ogg`},
  lock1: {channel: "game", url: `${BASE}/interface-sounds/confirmation_001.ogg`},
  lock2: {channel: "game", url: `${BASE}/interface-sounds/confirmation_002.ogg`},
  revealDrop: {channel: "game", url: `${BASE}/interface-sounds/drop_002.ogg`},
  notify: {channel: "notifications", url: `${BASE}/interface-sounds/confirmation_002.ogg`},
  notifyError: {channel: "notifications", url: `${BASE}/interface-sounds/error_001.ogg`},

  // Short, playful musical punctuation. These are deliberately reused across a few moments
  // so the game has a recognizable sound language rather than dozens of unrelated noises.
  piz00: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI00.ogg`},
  piz01: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI01.ogg`},
  piz02: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI02.ogg`},
  piz03: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI03.ogg`},
  piz04: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI04.ogg`},
  piz05: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI05.ogg`},
  piz06: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI06.ogg`},
  piz07: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI07.ogg`},
  hit00: {channel: "game", url: `${BASE}/music-jingles/jingles_HIT00.ogg`},
  hit02: {channel: "game", url: `${BASE}/music-jingles/jingles_HIT02.ogg`},
  hit03: {channel: "game", url: `${BASE}/music-jingles/jingles_HIT03.ogg`},
  hit06: {channel: "game", url: `${BASE}/music-jingles/jingles_HIT06.ogg`},
  hit10: {channel: "game", url: `${BASE}/music-jingles/jingles_HIT10.ogg`},
  hit12: {channel: "game", url: `${BASE}/music-jingles/jingles_HIT12.ogg`},
  nes00: {channel: "game", url: `${BASE}/music-jingles/jingles_NES00.ogg`},
  nes09: {channel: "game", url: `${BASE}/music-jingles/jingles_NES09.ogg`},
  nes10: {channel: "game", url: `${BASE}/music-jingles/jingles_NES10.ogg`},
  downer: {channel: "game", url: `${BASE}/oga-levelup-powerup/Downer01.wav`},
  rise1: {channel: "game", url: `${BASE}/oga-levelup-powerup/Rise01.wav`},
  rise2: {channel: "game", url: `${BASE}/oga-levelup-powerup/Rise02.wav`},
  rise3: {channel: "game", url: `${BASE}/oga-levelup-powerup/Rise03.wav`},
  rise4: {channel: "game", url: `${BASE}/oga-levelup-powerup/Rise04.wav`},
  rise5: {channel: "game", url: `${BASE}/oga-levelup-powerup/Rise05.wav`},
  rise6: {channel: "game", url: `${BASE}/oga-levelup-powerup/Rise06.wav`},
  coin: {channel: "game", url: `${BASE}/oga-levelup-powerup/Coin01.wav`}
});

const POOL = Object.freeze({
  lock: ["lock1", "lock2"],
  reveal: ["revealDrop", "piz00", "hit00"],
  revealClose: ["rise1", "rise2", "piz02"],
  revealRelated: ["piz04", "hit03", "rise3"],
  revealApart: ["downer", "hit06", "piz06"],
  revealNeutral: ["revealDrop", "piz00", "hit00"],
  win: ["piz01", "piz03", "nes00", "rise4"],
  closeEnoughAsk: ["rise6", "piz00"],
  closeEnoughYes: ["rise5", "piz05", "hit10"],
  closeEnoughNo: ["downer", "hit06", "piz07"],
  fail: ["downer", "piz07", "nes09"],
  draw: ["piz04", "hit12", "nes10"],
  quit: ["hit02", "downer"],
  rating: ["coin", "lock2"]
});

function clamp(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return {...DEFAULTS};
    return {
      enabled: saved.enabled !== false,
      game: clamp(saved.game ?? DEFAULTS.game),
      notifications: clamp(saved.notifications ?? DEFAULTS.notifications),
      ui: clamp(saved.ui ?? DEFAULTS.ui)
    };
  } catch {
    return {...DEFAULTS};
  }
}

let settings = loadSettings();
const lastPlayed = new Map();
const lastPoolPick = new Map();

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function play(name, {preview = false} = {}) {
  const spec = SOUND[name];
  if (!spec || !settings.enabled) return;
  const volume = clamp(settings[spec.channel]);
  if (volume <= 0) return;
  const now = performance.now();
  if (!preview && now - (lastPlayed.get(name) || 0) < 90) return;
  lastPlayed.set(name, now);
  try {
    const audio = new Audio(spec.url);
    audio.preload = "auto";
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

function playPool(poolName, options) {
  const pool = POOL[poolName];
  if (!pool?.length) return;
  const previous = lastPoolPick.get(poolName);
  const choices = pool.length > 1 ? pool.filter(name => name !== previous) : pool;
  const name = choices[Math.floor(Math.random() * choices.length)] || pool[0];
  lastPoolPick.set(poolName, name);
  play(name, options);
}

function lang() {
  return document.documentElement.lang === "fr" ? "fr" : "en";
}

const copy = {
  en: {
    settings: "Settings",
    sound: "Sound",
    soundOn: "Enable sound",
    soundHint: "Adjust each type separately. Your levels are remembered when sound is turned off.",
    game: "Game sounds",
    gameHint: "Reveals, wins, fails and other game moments",
    notifications: "Notification sounds",
    notificationsHint: "Updates, alerts and errors",
    ui: "UI sounds",
    uiHint: "Buttons and controls"
  },
  fr: {
    settings: "Réglages",
    sound: "Son",
    soundOn: "Activer le son",
    soundHint: "Réglez chaque type séparément. Vos niveaux sont conservés lorsque le son est désactivé.",
    game: "Sons du jeu",
    gameHint: "Révélations, victoires, défaites et autres moments du jeu",
    notifications: "Sons de notification",
    notificationsHint: "Mises à jour, alertes et erreurs",
    ui: "Sons de l’interface",
    uiHint: "Boutons et commandes"
  }
};

function injectStyles() {
  if (document.getElementById("audioSettingsStyle")) return;
  const style = document.createElement("style");
  style.id = "audioSettingsStyle";
  style.textContent = `
    .audio-settings-panel{border-top:1px solid rgba(36,31,25,.14);margin-top:.85rem;padding-top:.85rem;text-align:left}
    .audio-settings-heading{font-size:1rem;margin:0 0 .3rem;font-weight:800}
    .audio-settings-hint{margin:0 0 .8rem;font-size:.84rem;opacity:.72;line-height:1.35}
    .audio-master{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:.2rem 0 .85rem;font-weight:750}
    .audio-master input{width:1.15rem;height:1.15rem;accent-color:currentColor}
    .audio-channel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.15rem .7rem;align-items:center;margin:.75rem 0}
    .audio-channel label{font-weight:750}
    .audio-channel small{grid-column:1;opacity:.68;font-size:.78rem}
    .audio-range-row{grid-column:1 / -1;display:grid;grid-template-columns:minmax(0,1fr) 3.2rem;gap:.65rem;align-items:center;margin-top:.3rem}
    .audio-range-row input[type=range]{width:100%;accent-color:currentColor}
    .audio-value{font-variant-numeric:tabular-nums;text-align:right;font-size:.82rem;font-weight:750}
    .audio-settings-panel.muted .audio-channel{opacity:.5}
  `;
  document.head.append(style);
}

function channelRow(channel, title, hint, previewSound) {
  const wrap = document.createElement("div");
  wrap.className = "audio-channel";
  const id = `audio-${channel}`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = title;
  const small = document.createElement("small");
  small.textContent = hint;
  const row = document.createElement("div");
  row.className = "audio-range-row";
  const range = document.createElement("input");
  range.type = "range";
  range.id = id;
  range.min = "0";
  range.max = "100";
  range.step = "5";
  range.value = String(Math.round(settings[channel] * 100));
  range.disabled = !settings.enabled;
  range.setAttribute("aria-label", title);
  const value = document.createElement("span");
  value.className = "audio-value";
  value.textContent = `${range.value}%`;
  range.addEventListener("input", () => {
    settings[channel] = Number(range.value) / 100;
    value.textContent = `${range.value}%`;
    saveSettings();
  });
  range.addEventListener("change", () => play(previewSound, {preview: true}));
  row.append(range, value);
  wrap.append(label, small, row);
  return wrap;
}

function enhanceProfileDialog() {
  const dlg = document.getElementById("dialog");
  if (!dlg?.open || dlg.querySelector(".audio-settings-panel")) return;
  const form = dlg.querySelector(".dialog-body");
  if (!form) return;
  const text = copy[lang()];
  const panel = document.createElement("section");
  panel.className = `audio-settings-panel${settings.enabled ? "" : " muted"}`;
  panel.setAttribute("aria-labelledby", "audioSettingsTitle");
  const heading = document.createElement("h3");
  heading.id = "audioSettingsTitle";
  heading.className = "audio-settings-heading";
  heading.textContent = text.sound;
  const hint = document.createElement("p");
  hint.className = "audio-settings-hint";
  hint.textContent = text.soundHint;
  const master = document.createElement("label");
  master.className = "audio-master";
  master.append(document.createTextNode(text.soundOn));
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = settings.enabled;
  toggle.setAttribute("aria-label", text.soundOn);
  master.append(toggle);
  const rows = [
    channelRow("game", text.game, text.gameHint, "piz01"),
    channelRow("notifications", text.notifications, text.notificationsHint, "notify"),
    channelRow("ui", text.ui, text.uiHint, "uiClick")
  ];
  toggle.addEventListener("change", () => {
    settings.enabled = toggle.checked;
    saveSettings();
    panel.classList.toggle("muted", !settings.enabled);
    for (const range of panel.querySelectorAll('input[type="range"]')) range.disabled = !settings.enabled;
    if (settings.enabled) play("uiToggle", {preview: true});
  });
  panel.append(heading, hint, master, ...rows);
  const error = form.querySelector("#dialogError");
  form.insertBefore(panel, error || form.querySelector(".row.end") || null);
}

function isUiControl(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, [role=button], summary"));
}

function installUiSounds() {
  document.addEventListener("click", event => {
    if (!isUiControl(event.target)) return;
    const button = event.target.closest("button");
    if (button?.disabled) return;

    // Important game actions get their own joke/punctuation instead of the generic click.
    if (button?.id === "lockBtn") return;
    if (button?.id === "closeBtn") { playPool("closeEnoughAsk"); return; }
    if (button?.id === "closeNo") { playPool("closeEnoughNo"); return; }
    if (button?.id === "quitConfirm") { playPool("quit"); return; }
    if (button?.classList.contains("wc-star")) { playPool("rating"); return; }
    play("uiClick");
  }, true);
  document.addEventListener("submit", event => {
    if (event.target?.id === "wordForm") playPool("lock");
  }, true);
}

function revealPool() {
  const modal = document.getElementById("revealModal");
  if (!modal) return "reveal";
  if (modal.classList.contains("match")) return "reveal";
  // The game marks how close the two words were (src/client/reactions.js), so this bundle needs no lexicon.
  const group = modal.dataset.closeness;
  if (group === "close") return "revealClose";
  if (group === "related") return "revealRelated";
  if (group === "apart") return "revealApart";
  if (group === "neutral") return "revealNeutral";
  return "reveal";
}

let lastGameCue = null;
function inspectGameAudio() {
  const app = document.getElementById("app");
  if (!app) return;
  const phase = app.dataset.phase || "";
  let cue = null;
  let signature = null;

  if (phase === "revealing") {
    cue = revealPool();
    const modal = document.getElementById("revealModal");
    const words = [...(modal?.querySelectorAll(".rv-word .chip-word") || [])].map(node => node.textContent.trim()).join("|");
    signature = `reveal:${cue}:${words}`;
  } else if (phase === "gameOver") {
    if (document.getElementById("agreedPanel")) cue = "closeEnoughYes";
    else if (document.querySelector(".end.win")) cue = "win";
    else if (document.getElementById("endedPanel")) cue = "quit";
    else if (document.querySelector(".end.over .gary-end")) cue = "fail";
    else if (document.querySelector(".end.over")) cue = "draw";
    if (cue) signature = `end:${cue}:${document.getElementById("boardTitle")?.textContent || ""}`;
  }

  if (!cue || !signature || signature === lastGameCue) return;
  lastGameCue = signature;
  playPool(cue);
}

let bellCount = 0;
function inspectBell() {
  const node = document.getElementById("notifCount");
  if (!node) return;
  const next = Number.parseInt(node.textContent || "0", 10) || 0;
  if (next > bellCount && bellCount >= 0) play("notify");
  bellCount = next;
}

function installObservers() {
  const app = document.getElementById("app");
  // Only the phase attribute (set on every render): watching the whole subtree ran this on every
  // typed letter and timer tick, which made the game sluggish.
  if (app) new MutationObserver(inspectGameAudio).observe(app, {attributes: true, attributeFilter: ["data-phase"]});
  const toasts = document.getElementById("toasts");
  if (toasts) new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element) || !node.classList.contains("toast")) continue;
      play(node.classList.contains("error") ? "notifyError" : "notify");
    }
  }).observe(toasts, {childList: true});
  const count = document.getElementById("notifCount");
  if (count) new MutationObserver(inspectBell).observe(count, {childList: true, characterData: true, subtree: true, attributes: true});
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("#profileBtn")) queueMicrotask(enhanceProfileDialog);
  });
  inspectGameAudio();
  inspectBell();
}

injectStyles();
installUiSounds();
installObservers();
