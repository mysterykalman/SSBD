// Device-local sound system and settings UI.
// Routine feedback uses playful NES-style jingles at low volume. Larger studio/comedy cues are
// reserved for major moments. Every sound is softened with a short fade-in and fade-out.

const STORAGE_KEY = "ssbd.audio.v1";
const DEFAULTS = Object.freeze({enabled: true, game: 0.7, notifications: 0.5, ui: 0.3});
const BASE = "https://raw.githubusercontent.com/Mcamento8/open-game-sfx-index/main/audio/music-jingles";
const FUN_BASE = "https://raw.githubusercontent.com/jonjonsson/SoundMonster/main/Public%20domain";

const SOUND = Object.freeze({
  // Routine cues: deliberately quiet and short so the game never becomes noisy.
  uiClick: {channel: "ui", url: `${BASE}/jingles_NES00.ogg`, gain: 0.18, fadeIn: 35, fadeOut: 130, maxMs: 430},
  uiToggle: {channel: "ui", url: `${BASE}/jingles_NES10.ogg`, gain: 0.18, fadeIn: 35, fadeOut: 140, maxMs: 520},
  lock: {channel: "game", url: `${BASE}/jingles_NES00.ogg`, gain: 0.20, fadeIn: 45, fadeOut: 150, maxMs: 520},
  notify: {channel: "notifications", url: `${BASE}/jingles_NES10.ogg`, gain: 0.20, fadeIn: 45, fadeOut: 170, maxMs: 620},
  notifyError: {channel: "notifications", url: `${BASE}/jingles_NES09.ogg`, gain: 0.18, fadeIn: 45, fadeOut: 180, maxMs: 680},

  // Major-moment cues. These are public-domain/CC0 SoundMonster files and are kept softer than source.
  chooseBoing: {channel: "game", url: `${FUN_BASE}/boing%20cartoon.mp3`, gain: 0.30, fadeIn: 90, fadeOut: 320, major: true},
  chooseDing: {channel: "game", url: `${FUN_BASE}/ding%20bell.mp3`, gain: 0.28, fadeIn: 90, fadeOut: 320, major: true},
  startRoll: {channel: "game", url: `${FUN_BASE}/announcement%20timpani%20roll.mp3`, gain: 0.24, fadeIn: 120, fadeOut: 420, major: true, maxMs: 1800},
  finalReveal: {channel: "game", url: `${FUN_BASE}/shock%20gasp.mp3`, gain: 0.26, fadeIn: 110, fadeOut: 380, major: true},
  winApplause: {channel: "game", url: `${FUN_BASE}/applause.mp3`, gain: 0.27, fadeIn: 140, fadeOut: 520, major: true, maxMs: 2600},
  winHallelujah: {channel: "game", url: `${FUN_BASE}/hallelujah.mp3`, gain: 0.23, fadeIn: 140, fadeOut: 500, major: true, maxMs: 2400},
  quitBye: {channel: "game", url: `${FUN_BASE}/bye%20bye.mp3`, gain: 0.24, fadeIn: 100, fadeOut: 350, major: true}
});

const POOL = Object.freeze({
  choose: ["chooseBoing", "chooseDing"],
  start: ["startRoll"],
  finalReveal: ["finalReveal"],
  win: ["winApplause", "winHallelujah"],
  quit: ["quitBye"]
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
let activeMajor = null;
let pendingStart = false;
let lastPhaseSignature = "";

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function ramp(audio, from, to, ms, done) {
  const started = performance.now();
  const tick = now => {
    if (!audio || audio.paused) return;
    const p = Math.min(1, (now - started) / Math.max(1, ms));
    audio.volume = clamp(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(tick);
    else done?.();
  };
  audio.volume = clamp(from);
  requestAnimationFrame(tick);
}

function fadeOut(audio, ms = 180) {
  if (!audio || audio.paused || audio.__ssbdFading) return;
  audio.__ssbdFading = true;
  ramp(audio, audio.volume, 0, ms, () => {
    try { audio.pause(); audio.currentTime = 0; } catch {}
    if (activeMajor === audio) activeMajor = null;
  });
}

function scheduleFade(audio, spec) {
  const fadeMs = spec.fadeOut ?? 180;
  if (spec.maxMs) setTimeout(() => fadeOut(audio, fadeMs), Math.max(40, spec.maxMs - fadeMs));
  const maybeFade = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const remaining = audio.duration - audio.currentTime;
    if (remaining <= Math.max(0.22, fadeMs / 1000 + 0.05)) {
      audio.removeEventListener("timeupdate", maybeFade);
      fadeOut(audio, Math.min(fadeMs, Math.max(80, remaining * 1000 - 25)));
    }
  };
  audio.addEventListener("timeupdate", maybeFade);
}

function play(name, {preview = false} = {}) {
  const spec = SOUND[name];
  if (!spec || !settings.enabled) return;
  const target = clamp(settings[spec.channel] * (spec.gain ?? 1));
  if (target <= 0) return;
  const now = performance.now();
  if (!preview && now - (lastPlayed.get(name) || 0) < 120) return;
  lastPlayed.set(name, now);
  try {
    if (spec.major && activeMajor && !activeMajor.paused) fadeOut(activeMajor, 140);
    const audio = new Audio(spec.url);
    audio.preload = "auto";
    audio.volume = 0;
    if (spec.major) activeMajor = audio;
    audio.addEventListener("ended", () => { if (activeMajor === audio) activeMajor = null; }, {once: true});
    audio.play().then(() => {
      ramp(audio, 0, target, spec.fadeIn ?? 45);
      scheduleFade(audio, spec);
    }).catch(() => {});
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
    sound: "Sound", soundOn: "Enable sound",
    soundHint: "Adjust each type separately. Your levels are remembered when sound is turned off.",
    game: "Game sounds", gameHint: "Character choice, game start, winning reveal, wins and quitting",
    notifications: "Notification sounds", notificationsHint: "Updates, alerts and errors",
    ui: "UI sounds", uiHint: "Buttons and controls"
  },
  fr: {
    sound: "Son", soundOn: "Activer le son",
    soundHint: "Réglez chaque type séparément. Vos niveaux sont conservés lorsque le son est désactivé.",
    game: "Sons du jeu", gameHint: "Choix du personnage, début, révélation gagnante, victoire et départ",
    notifications: "Sons de notification", notificationsHint: "Mises à jour, alertes et erreurs",
    ui: "Sons de l’interface", uiHint: "Boutons et commandes"
  }
};

function injectStyles() {
  if (document.getElementById("audioSettingsStyle")) return;
  const style = document.createElement("style");
  style.id = "audioSettingsStyle";
  style.textContent = `
    .audio-settings-panel{border-top:1px solid rgba(36,31,25,.14);margin-top:.85rem;padding-top:.85rem;text-align:left}
    .audio-settings-heading{font-size:1rem;margin:0 0 .3rem;font-weight:800}.audio-settings-hint{margin:0 0 .8rem;font-size:.84rem;opacity:.72;line-height:1.35}
    .audio-master{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:.2rem 0 .85rem;font-weight:750}.audio-master input{width:1.15rem;height:1.15rem;accent-color:currentColor}
    .audio-channel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.15rem .7rem;align-items:center;margin:.75rem 0}.audio-channel label{font-weight:750}.audio-channel small{grid-column:1;opacity:.68;font-size:.78rem}
    .audio-range-row{grid-column:1 / -1;display:grid;grid-template-columns:minmax(0,1fr) 3.2rem;gap:.65rem;align-items:center;margin-top:.3rem}.audio-range-row input[type=range]{width:100%;accent-color:currentColor}
    .audio-value{font-variant-numeric:tabular-nums;text-align:right;font-size:.82rem;font-weight:750}.audio-settings-panel.muted .audio-channel{opacity:.5}
  `;
  document.head.append(style);
}

function channelRow(channel, title, hint, previewSound) {
  const wrap = document.createElement("div");
  wrap.className = "audio-channel";
  const id = `audio-${channel}`;
  const label = document.createElement("label");
  label.htmlFor = id; label.textContent = title;
  const small = document.createElement("small"); small.textContent = hint;
  const row = document.createElement("div"); row.className = "audio-range-row";
  const range = document.createElement("input");
  range.type = "range"; range.id = id; range.min = "0"; range.max = "100"; range.step = "5";
  range.value = String(Math.round(settings[channel] * 100)); range.disabled = !settings.enabled; range.setAttribute("aria-label", title);
  const value = document.createElement("span"); value.className = "audio-value"; value.textContent = `${range.value}%`;
  range.addEventListener("input", () => { settings[channel] = Number(range.value) / 100; value.textContent = `${range.value}%`; saveSettings(); });
  range.addEventListener("change", () => play(previewSound, {preview: true}));
  row.append(range, value); wrap.append(label, small, row); return wrap;
}

function enhanceProfileDialog() {
  const dlg = document.getElementById("dialog");
  if (!dlg?.open || dlg.querySelector(".audio-settings-panel")) return;
  const form = dlg.querySelector(".dialog-body");
  if (!form) return;
  const text = copy[lang()];
  const panel = document.createElement("section");
  panel.className = `audio-settings-panel${settings.enabled ? "" : " muted"}`;
  const heading = document.createElement("h3"); heading.className = "audio-settings-heading"; heading.textContent = text.sound;
  const hint = document.createElement("p"); hint.className = "audio-settings-hint"; hint.textContent = text.soundHint;
  const master = document.createElement("label"); master.className = "audio-master"; master.append(document.createTextNode(text.soundOn));
  const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = settings.enabled; master.append(toggle);
  const rows = [
    channelRow("game", text.game, text.gameHint, "winApplause"),
    channelRow("notifications", text.notifications, text.notificationsHint, "notify"),
    channelRow("ui", text.ui, text.uiHint, "uiClick")
  ];
  toggle.addEventListener("change", () => {
    settings.enabled = toggle.checked; saveSettings(); panel.classList.toggle("muted", !settings.enabled);
    for (const range of panel.querySelectorAll('input[type="range"]')) range.disabled = !settings.enabled;
    if (settings.enabled) play("uiToggle", {preview: true});
  });
  panel.append(heading, hint, master, ...rows);
  const error = form.querySelector("#dialogError");
  form.insertBefore(panel, error || form.querySelector(".row.end") || null);
}

function installInteractionSounds() {
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const button = target.closest("button, a, [role=button], summary");
    if (!button || button.disabled) return;

    if (button.id === "quitConfirm") { playPool("quit"); return; }
    if (button.id === "startCharacter") { pendingStart = true; return; }
    if (button.id === "createFamily" || button.id === "joinFamily") pendingStart = true;
    if (button.id === "lockBtn") return;
    play("uiClick");
  }, true);

  document.addEventListener("change", event => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (input?.name === "character") playPool("choose");
  }, true);

  document.addEventListener("submit", event => {
    if (event.target?.id === "wordForm") play("lock");
  }, true);
}

function inspectGameAudio() {
  const app = document.getElementById("app");
  if (!app) return;
  const phase = app.dataset.phase || "";
  const modal = document.getElementById("revealModal");
  const words = [...(modal?.querySelectorAll(".rv-word .chip-word") || [])].map(node => node.textContent.trim()).join("|");
  const signature = `${location.pathname}|${phase}|${modal?.classList.contains("match") ? "match" : ""}|${words}`;
  if (signature === lastPhaseSignature) return;
  lastPhaseSignature = signature;

  if (pendingStart && phase === "playing" && (/^\/solo\//.test(location.pathname) || /^\/games\//.test(location.pathname))) {
    pendingStart = false;
    playPool("start");
    return;
  }

  if (phase === "revealing" && modal?.classList.contains("match")) {
    playPool("finalReveal");
    return;
  }

  if (phase === "gameOver" && document.querySelector(".end.win")) playPool("win");
}

let bellCount = 0;
function inspectBell() {
  const node = document.getElementById("notifCount");
  if (!node) return;
  const next = Number.parseInt(node.textContent || "0", 10) || 0;
  if (next > bellCount) play("notify");
  bellCount = next;
}

function installObservers() {
  const app = document.getElementById("app");
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
  inspectGameAudio(); inspectBell();
}

injectStyles();
installInteractionSounds();
installObservers();
