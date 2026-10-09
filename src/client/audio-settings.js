// Device-local sound system and settings UI.
// Audio comes from Mcamento8/open-game-sfx-index. The selected files are CC0/public domain.

const STORAGE_KEY = "ssbd.audio.v1";
const DEFAULTS = Object.freeze({enabled: true, game: 0.7, notifications: 0.5, ui: 0.3});
const BASE = "https://raw.githubusercontent.com/Mcamento8/open-game-sfx-index/main/audio";

const SOUND = Object.freeze({
  uiClick: {channel: "ui", url: `${BASE}/ui-audio/click2.ogg`},
  uiToggle: {channel: "ui", url: `${BASE}/ui-audio/switch12.ogg`},
  gameLock: {channel: "game", url: `${BASE}/interface-sounds/confirmation_001.ogg`},
  gameReveal: {channel: "game", url: `${BASE}/interface-sounds/drop_002.ogg`},
  gameWin: {channel: "game", url: `${BASE}/music-jingles/jingles_PIZZI01.ogg`},
  notify: {channel: "notifications", url: `${BASE}/interface-sounds/confirmation_002.ogg`},
  notifyError: {channel: "notifications", url: `${BASE}/interface-sounds/error_001.ogg`}
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

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function play(name, {preview = false} = {}) {
  const spec = SOUND[name];
  if (!spec || !settings.enabled) return;
  const volume = clamp(settings[spec.channel]);
  if (volume <= 0) return;
  const now = performance.now();
  if (!preview && now - (lastPlayed.get(name) || 0) < 70) return;
  lastPlayed.set(name, now);
  try {
    const audio = new Audio(spec.url);
    audio.preload = "auto";
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
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
    gameHint: "Lock-ins, reveals and wins",
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
    gameHint: "Validation, révélations et victoires",
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
    #profileBtn.audio-settings-gear{font-size:1.22rem;line-height:1;font-family:system-ui,sans-serif}
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

function setGear() {
  const button = document.getElementById("profileBtn");
  if (!button) return;
  if (button.textContent !== "⚙") button.textContent = "⚙";
  button.classList.add("audio-settings-gear");
  button.setAttribute("aria-label", copy[lang()].settings);
  button.setAttribute("title", copy[lang()].settings);
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
    channelRow("game", text.game, text.gameHint, "gameReveal"),
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
    if (button?.id === "lockBtn") return;
    play("uiClick");
  }, true);
  document.addEventListener("submit", event => {
    if (event.target?.id === "wordForm") play("gameLock");
  }, true);
}

let previousPhase = null;
function inspectGamePhase() {
  const app = document.getElementById("app");
  if (!app) return;
  const phase = app.dataset.phase || null;
  if (phase === previousPhase) return;
  previousPhase = phase;
  if (phase === "revealing") play("gameReveal");
  if (phase === "gameOver" && app.querySelector(".end.win, #agreedPanel, .duo-art.win, .duo-art.agreed")) play("gameWin");
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
  if (app) new MutationObserver(inspectGamePhase).observe(app, {attributes: true, attributeFilter: ["data-phase"], childList: true, subtree: true});
  const toasts = document.getElementById("toasts");
  if (toasts) new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element) || !node.classList.contains("toast")) continue;
      play(node.classList.contains("error") ? "notifyError" : "notify");
    }
  }).observe(toasts, {childList: true});
  const count = document.getElementById("notifCount");
  if (count) new MutationObserver(inspectBell).observe(count, {childList: true, characterData: true, subtree: true, attributes: true});
  const profile = document.getElementById("profileBtn");
  if (profile) new MutationObserver(setGear).observe(profile, {childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["aria-label"]});
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("#profileBtn")) queueMicrotask(enhanceProfileDialog);
  });
  inspectGamePhase();
  inspectBell();
}

injectStyles();
setGear();
installUiSounds();
installObservers();
