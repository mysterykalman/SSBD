// Device-local sound system and settings UI.
// Routine interaction sounds stay subtle. Larger comedy/studio cues are reserved for major moments.

const STORAGE_KEY = "ssbd.audio.v1";
const DEFAULTS = Object.freeze({enabled: true, game: 0.7, notifications: 0.5, ui: 0.3});
const UI_BASE = "https://raw.githubusercontent.com/Mcamento8/open-game-sfx-index/main/audio";
const FUN_BASE = "https://raw.githubusercontent.com/jonjonsson/SoundMonster/main/Public%20domain";

const SOUND = Object.freeze({
  uiClick: {channel: "ui", url: `${UI_BASE}/ui-audio/click2.ogg`, gain: 0.55},
  uiToggle: {channel: "ui", url: `${UI_BASE}/ui-audio/switch12.ogg`, gain: 0.55},
  lock: {channel: "game", url: `${UI_BASE}/interface-sounds/confirmation_001.ogg`, gain: 0.42},
  notify: {channel: "notifications", url: `${UI_BASE}/interface-sounds/confirmation_002.ogg`, gain: 0.5},
  notifyError: {channel: "notifications", url: `${UI_BASE}/interface-sounds/error_001.ogg`, gain: 0.48},

  // Major-moment cues. These source files are CC0/public domain in SoundMonster.
  chooseBoing: {channel: "game", url: `${FUN_BASE}/boing%20cartoon.mp3`, gain: 0.34, major: true},
  chooseDing: {channel: "game", url: `${FUN_BASE}/ding%20bell.mp3`, gain: 0.30, major: true},
  startRoll: {channel: "game", url: `${FUN_BASE}/announcement%20timpani%20roll.mp3`, gain: 0.27, major: true},
  finalReveal: {channel: "game", url: `${FUN_BASE}/shock%20gasp.mp3`, gain: 0.30, major: true},
  winApplause: {channel: "game", url: `${FUN_BASE}/applause.mp3`, gain: 0.31, major: true},
  winHallelujah: {channel: "game", url: `${FUN_BASE}/hallelujah.mp3`, gain: 0.25, major: true},
  quitBye: {channel: "game", url: `${FUN_BASE}/bye%20bye.mp3`, gain: 0.28, major: true}
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

function fadeOut(audio, ms = 420) {
  if (!audio || audio.paused || audio.datasetFading) return;
  audio.datasetFading = true;
  ramp(audio, audio.volume, 0, ms, () => {
    try { audio.pause(); audio.currentTime = 0; } catch {}
    if (activeMajor === audio) activeMajor = null;
  });
}

function scheduleFadeOut(audio, ms = 420) {
  const maybeFade = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const remaining = audio.duration - audio.currentTime;
    if (remaining <= Math.max(0.5, ms / 1000 + 0.08)) {
      audio.removeEventListener("timeupdate", maybeFade);
      fadeOut(audio, Math.min(ms, Math.max(120, remaining * 1000 - 40)));
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
    audio.volume = spec.major ? 0 : target;
    if (spec.major) activeMajor = audio;
    audio.addEventListener("ended", () => { if (activeMajor === audio) activeMajor = null; }, {once: true});
    audio.play().then(() => {
      if (spec.major) {
        ramp(audio, 0, target, 130);
        scheduleFadeOut(audio, 450);
      }
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
    sound: "Sound",
    soundOn: "Enable sound",
    soundHint: "Adjust each type separately. Your levels are remembered when sound is turned off.",
    game: "Game sounds",
    gameHint: "Major game moments and subtle lock-in feedback",
    notifications: "Notification sounds",
    notificationsHint: "Updates, alerts and errors",
    ui: "UI sounds",
    uiHint: "Buttons and controls"
  },
  fr: {
    sound: "Son",
    soundOn: "Activer le son",
    soundHint: "Réglez chaque type séparément. Vos niveaux sont conservés lorsque le son est désactivé.",
    game: "Sons du jeu",
    gameHint: "Moments importants du jeu et validation discrète",
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
    .audio-channel label{font-weight:750}.audio-channel small{grid-column:1;opacity:.68;font-size:.78rem}
    .audio-range-row{grid-column:1 / -1;display:grid;grid-template-columns:minmax(0,1fr) 3.2rem;gap:.65rem;align-items:center;margin-top:.3rem}
    .audio-range-row input[type=range]{width:100%;accent-color:currentColor}.audio-value{font-variant-numeric:tabular-nums;text-align:right;font-size:.82rem;font-weight:750}
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
  master.append(toggle);
  const rows = [
    channelRow("game", text.game, text.gameHint, "winApplause"),
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

function installInteractionSounds() {
  document.addEventListener("change", event => {
    if (event.target instanceof HTMLInputElement && event.target.matches("#characterPicker .pick-radio")) playPool("choose");
  }, true);

  document.addEventListener("submit", event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.id === "wordForm") { play("lock"); return; }
    if (event.target.closest("#characterPicker")) { playPool("start"); return; }
    // Creating a Together game asks for the player's name first. The confirmed name submit is the real start.
    if (pendingTogetherStart && event.target.closest("#dialog")) {
      pendingTogetherStart = false;
      playPool("start");
    }
  }, true);

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button, a, [role=button], summary");
    if (!button || button.matches(":disabled")) return;
    if (button.id === "createFamily") { pendingTogetherStart = true; return; }
    if (button.id === "quitConfirm") { playPool("quit"); return; }
    if (button.id === "lockBtn" || button.id === "startCharacter") return;
    play("uiClick");
  }, true);
}

let pendingTogetherStart = false;
let lastMajorCue = null;
function inspectGameAudio() {
  const app = document.getElementById("app");
  if (!app) return;
  const phase = app.dataset.phase || "";
  let cue = null;
  let signature = null;

  // A reveal gets a large cue only when this exact reveal is the match that ends the game.
  if (phase === "revealing") {
    const modal = document.getElementById("revealModal");
    if (modal?.classList.contains("match")) {
      cue = "finalReveal";
      const words = [...modal.querySelectorAll(".rv-word .chip-word")].map(node => node.textContent.trim()).join("|");
      signature = `final-reveal:${words}`;
    }
  } else if (phase === "gameOver" && document.querySelector(".end.win")) {
    cue = "win";
    signature = `win:${document.getElementById("boardTitle")?.textContent || ""}:${location.pathname}`;
  }

  if (!cue || !signature || signature === lastMajorCue) return;
  lastMajorCue = signature;
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
installInteractionSounds();
installObservers();
