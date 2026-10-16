// Device-local game sound and music system.
// Intro music is offered once per browser session and only begins after the player chooses Play intro.
// Background music starts when a mode is selected and then loops for the rest of that session.

const STORAGE_KEY = "ssbd.audio.v1";
const INTRO_SESSION_KEY = "ssbd.audio.intro-played.v1";
const GAME_MUSIC_SESSION_KEY = "ssbd.audio.game-music-started.v1";
const DEFAULTS = Object.freeze({enabled: true, music: 0.42, game: 0.7});
const INTRO_URL = "/audio/intro.mp3";
const GAME_MUSIC_URL = "/audio/game-music.mp3";
const INTRO_FADE_MS = 300;
const INTRO_END_TRIM_SECONDS = 0.5;
const GAME_MUSIC_FADE_MS = 90;
const BASE = "https://raw.githubusercontent.com/Mcamento8/open-game-sfx-index/main/audio/music-jingles";
const FUN_BASE = "https://raw.githubusercontent.com/jonjonsson/SoundMonster/main/Public%20domain";

const SOUND = Object.freeze({
  closeAsk: {channel: "game", url: `${BASE}/jingles_NES04.ogg`, gain: 0.17, fadeIn: 40, fadeOut: 150, maxMs: 560},
  closeYes: {channel: "game", url: `${BASE}/jingles_NES05.ogg`, gain: 0.18, fadeIn: 40, fadeOut: 160, maxMs: 620},
  closeNo: {channel: "game", url: `${BASE}/jingles_NES06.ogg`, gain: 0.16, fadeIn: 40, fadeOut: 170, maxMs: 620},
  rating: {channel: "game", url: `${BASE}/jingles_NES07.ogg`, gain: 0.16, fadeIn: 35, fadeOut: 150, maxMs: 520},
  chooseBoing: {channel: "game", url: `${FUN_BASE}/boing%20cartoon.mp3`, gain: 0.30, fadeIn: 90, fadeOut: 320, major: true},
  chooseDing: {channel: "game", url: `${FUN_BASE}/ding%20bell.mp3`, gain: 0.28, fadeIn: 90, fadeOut: 320, major: true},
  startRoll: {channel: "game", url: `${FUN_BASE}/announcement%20timpani%20roll.mp3`, gain: 0.24, fadeIn: 120, fadeOut: 420, major: true, maxMs: 1800},
  finalReveal: {channel: "game", url: `${FUN_BASE}/shock%20gasp.mp3`, gain: 0.26, fadeIn: 110, fadeOut: 380, major: true},
  winHallelujah: {channel: "game", url: `${FUN_BASE}/hallelujah.mp3`, gain: 0.23, fadeIn: 140, fadeOut: 420, major: true, maxMs: 1900},
  winClap: {channel: "game", url: `${FUN_BASE}/golf%20clap.mp3`, gain: 0.27, fadeIn: 140, fadeOut: 520, major: true, maxMs: 2200},
  quitSlide: {channel: "game", url: `${FUN_BASE}/flute%20slide%20cartoon%20falling.mp3`, gain: 0.22, fadeIn: 90, fadeOut: 360, major: true, maxMs: 1400},
  quitRadio: {channel: "game", url: `${FUN_BASE}/radio%20mic%20off%20MDC1200.mp3`, gain: 0.20, fadeIn: 80, fadeOut: 300, major: true, maxMs: 1100}
});

const POOL = Object.freeze({
  choose: ["chooseBoing", "chooseDing"],
  start: ["startRoll"],
  finalReveal: ["finalReveal"],
  quit: ["quitSlide", "quitRadio"]
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
      music: clamp(saved.music ?? DEFAULTS.music),
      game: clamp(saved.game ?? DEFAULTS.game)
    };
  } catch {
    return {...DEFAULTS};
  }
}

function sessionGet(key) {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}
function sessionSet(key) {
  try { sessionStorage.setItem(key, "1"); } catch {}
}

let settings = loadSettings();
const lastPlayed = new Map();
const lastPoolPick = new Map();
let activeMajor = null;
let pendingStart = false;
let lastPhaseSignature = "";
let winSequenceTimer = null;
let introAudio = null;
let gameMusicAudio = null;
let musicUnlockArmed = false;

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function ramp(audio, from, to, ms, done) {
  if (!audio) return;
  const token = Symbol("ramp");
  audio.__ssbdRamp = token;
  const started = performance.now();
  const tick = now => {
    if (!audio || audio.paused || audio.__ssbdRamp !== token) return;
    const p = Math.min(1, (now - started) / Math.max(1, ms));
    audio.volume = clamp(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(tick);
    else done?.();
  };
  audio.volume = clamp(from);
  requestAnimationFrame(tick);
}

function fadeOut(audio, ms = 180, {reset = true, onDone} = {}) {
  if (!audio || audio.paused || audio.__ssbdFading) { onDone?.(); return; }
  audio.__ssbdFading = true;
  ramp(audio, audio.volume, 0, ms, () => {
    try { audio.pause(); if (reset) audio.currentTime = 0; } catch {}
    audio.__ssbdFading = false;
    if (activeMajor === audio) activeMajor = null;
    onDone?.();
  });
}

function musicTarget() {
  return settings.enabled ? clamp(settings.music) : 0;
}

function updateLiveMusicVolume() {
  const target = musicTarget();
  if (introAudio && !introAudio.paused && !introAudio.__ssbdFading) introAudio.volume = target;
  if (gameMusicAudio && !gameMusicAudio.paused && !gameMusicAudio.__ssbdFading) gameMusicAudio.volume = target;
}

function introFinished() {
  const resumeGameMusic = Boolean(introAudio?.__ssbdResumeGameMusic);
  sessionSet(INTRO_SESSION_KEY);
  introAudio = null;
  document.dispatchEvent(new CustomEvent("ssbd:intro-ended"));
  if (resumeGameMusic) startGameMusic();
}

function stopIntro({markPlayed = false} = {}) {
  if (markPlayed) sessionSet(INTRO_SESSION_KEY);
  const audio = introAudio;
  introAudio = null;
  if (audio) fadeOut(audio, INTRO_FADE_MS);
}

async function playIntroOnce({force = false} = {}) {
  if (!settings.enabled || musicTarget() <= 0) return false;
  if (!force && (sessionGet(INTRO_SESSION_KEY) || sessionGet(GAME_MUSIC_SESSION_KEY))) return false;
  if (!force && location.pathname !== "/" && location.pathname !== "/index.html") return false;
  if (introAudio && !introAudio.paused) return true;

  const audio = new Audio(INTRO_URL);
  introAudio = audio;
  audio.preload = "auto";
  audio.volume = 0;
  audio.addEventListener("error", () => {
    if (introAudio === audio) introAudio = null;
  }, {once: true});
  audio.addEventListener("ended", () => {
    if (introAudio === audio) introFinished();
  }, {once: true});
  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration) || audio.__ssbdFading) return;
    const fadeBeforeEnd = INTRO_END_TRIM_SECONDS + INTRO_FADE_MS / 1000 + 0.04;
    if (audio.duration - audio.currentTime <= fadeBeforeEnd) {
      fadeOut(audio, INTRO_FADE_MS, {reset: false, onDone: () => {
        if (introAudio === audio) introFinished();
      }});
    }
  });

  try {
    await audio.play();
    ramp(audio, 0, musicTarget(), INTRO_FADE_MS);
    return true;
  } catch {
    if (introAudio === audio) introAudio = null;
    return false;
  }
}

async function replayIntro() {
  if (!settings.enabled || musicTarget() <= 0) return false;

  const resumeGameMusic =
    Boolean(gameMusicAudio && !gameMusicAudio.paused) ||
    sessionGet(GAME_MUSIC_SESSION_KEY);

  if (gameMusicAudio && !gameMusicAudio.paused) {
    fadeOut(gameMusicAudio, 140, {reset: false});
  }

  stopIntro();

  const played = await playIntroOnce({force: true});

  if (played && introAudio) {
    introAudio.__ssbdResumeGameMusic = resumeGameMusic;
  } else if (resumeGameMusic) {
    startGameMusic();
  }

  return played;
}

function skipIntro() {
  stopIntro({markPlayed: true});
  document.dispatchEvent(new CustomEvent("ssbd:intro-ended"));
}

function armMusicUnlock() {
  if (musicUnlockArmed) return;
  musicUnlockArmed = true;
  const retry = () => {
    musicUnlockArmed = false;
    document.removeEventListener("pointerdown", retry, true);
    document.removeEventListener("keydown", retry, true);
    if (sessionGet(GAME_MUSIC_SESSION_KEY)) startGameMusic();
  };
  document.addEventListener("pointerdown", retry, true);
  document.addEventListener("keydown", retry, true);
}

function startGameMusic() {
  sessionSet(GAME_MUSIC_SESSION_KEY);
  stopIntro({markPlayed: true});
  if (!settings.enabled || musicTarget() <= 0) return;
  if (gameMusicAudio && !gameMusicAudio.paused) {
    gameMusicAudio.volume = musicTarget();
    return;
  }
  const audio = gameMusicAudio || new Audio(GAME_MUSIC_URL);
  gameMusicAudio = audio;
  audio.preload = "auto";
  audio.loop = true;
  audio.__ssbdFading = false;
  audio.volume = 0;
  audio.addEventListener("error", () => {}, {once: true});
  audio.play().then(() => ramp(audio, 0, musicTarget(), GAME_MUSIC_FADE_MS)).catch(armMusicUnlock);
}

function pauseBackgroundMusic() {
  if (introAudio) stopIntro();
  if (gameMusicAudio && !gameMusicAudio.paused) fadeOut(gameMusicAudio, 140, {reset: false});
}

function isGameRoute() {
  return /^\/(?:solo|games)\//.test(location.pathname) || /^\/mom(?:-mode)?(?:\/|$)/.test(location.pathname);
}


let gameMusicPausedForBackground = false;

function pauseGameMusicForBackground() {
  if (!gameMusicAudio || gameMusicAudio.paused) return;

  gameMusicPausedForBackground = true;
  gameMusicAudio.pause();
}

function resumeGameMusicFromBackground() {
  if (!gameMusicPausedForBackground) return;

  gameMusicPausedForBackground = false;

  if (!settings.enabled || musicTarget() <= 0) return;
  if (!gameMusicAudio || document.hidden) return;

  gameMusicAudio.play().catch(() => {});
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGameMusicForBackground();
  } else {
    resumeGameMusicFromBackground();
  }
});

window.addEventListener("pagehide", pauseGameMusicForBackground);

function syncBackgroundMusic() {
  if (!settings.enabled) { pauseBackgroundMusic(); return; }
  if (isGameRoute() || sessionGet(GAME_MUSIC_SESSION_KEY)) startGameMusic();
}

window.SSBDAudio = Object.freeze({
  playIntro: playIntroOnce,
  replayIntro,
  skipIntro,
  startGameMusic
});

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
  const target = clamp(settings.game * (spec.gain ?? 1));
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
    return audio;
  } catch {}
}

function playPool(poolName, options) {
  const pool = POOL[poolName];
  if (!pool?.length) return;
  const previous = lastPoolPick.get(poolName);
  const choices = pool.length > 1 ? pool.filter(name => name !== previous) : pool;
  const name = choices[Math.floor(Math.random() * choices.length)] || pool[0];
  lastPoolPick.set(poolName, name);
  return play(name, options);
}

function playWinSequence() {
  if (winSequenceTimer) clearTimeout(winSequenceTimer);
  play("winHallelujah");
  winSequenceTimer = setTimeout(() => {
    winSequenceTimer = null;
    play("winClap");
  }, 1700);
}

function lang() {
  return document.documentElement.lang === "fr" ? "fr" : "en";
}

const copy = {
  en: {
    sound: "Sound", soundOn: "Enable sound",
    soundHint: "Set the music and game-sound volume for this device.",
    music: "Music", musicHint: "Intro and looping background music",
    game: "Game sounds", gameHint: "Close-enough decisions, character choice, game start, matching reveal, wins and quitting",
    close: "Close"
  },
  fr: {
    sound: "Son", soundOn: "Activer le son",
    soundHint: "Réglez le volume de la musique et des sons du jeu sur cet appareil.",
    music: "Musique", musicHint: "Introduction et musique de fond en boucle",
    game: "Sons du jeu", gameHint: "Décisions presque identiques, choix du personnage, début, victoire et départ",
    close: "Fermer"
  }
};

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
  range.addEventListener("input", () => {
    settings[channel] = Number(range.value) / 100;
    value.textContent = `${range.value}%`;
    saveSettings();
    if (channel === "music") updateLiveMusicVolume();
  });
  if (previewSound) range.addEventListener("change", () => play(previewSound, {preview: true}));
  row.append(range, value); wrap.append(label, small, row); return wrap;
}

function buildAudioPanel() {
  const text = copy[lang()];
  const panel = document.createElement("section");
  panel.className = `audio-settings-panel${settings.enabled ? "" : " muted"}`;
  const heading = document.createElement("h3"); heading.className = "audio-settings-heading"; heading.textContent = text.sound;
  const hint = document.createElement("p"); hint.className = "audio-settings-hint"; hint.textContent = text.soundHint;
  const master = document.createElement("label"); master.className = "audio-master"; master.append(document.createTextNode(text.soundOn));
  const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = settings.enabled; master.append(toggle);
  const rows = [channelRow("music", text.music, text.musicHint), channelRow("game", text.game, text.gameHint, "winHallelujah")];
  toggle.addEventListener("change", () => {
    settings.enabled = toggle.checked;
    saveSettings();
    panel.classList.toggle("muted", !settings.enabled);
    for (const range of panel.querySelectorAll('input[type="range"]')) range.disabled = !settings.enabled;
    if (settings.enabled) syncBackgroundMusic(); else pauseBackgroundMusic();
  });
  panel.append(heading, hint, master, ...rows);
  return panel;
}

function enhanceProfileDialog() {
  const dlg = document.getElementById("dialog");
  if (!dlg?.open || dlg.querySelector(".audio-settings-panel")) return;
  const form = dlg.querySelector(".dialog-body") || dlg.querySelector("form") || dlg;
  const panel = buildAudioPanel();
  const error = form.querySelector("#dialogError");
  const actions = form.querySelector(".row.end");
  form.insertBefore(panel, error || actions || null);
}

function scheduleProfileEnhance() {
  queueMicrotask(enhanceProfileDialog);
  requestAnimationFrame(enhanceProfileDialog);
  setTimeout(enhanceProfileDialog, 50);
}

function installStandaloneAudioSettings() {
  if (document.getElementById("audioSettingsBtn")) return;

  let actions = document.querySelector(".top-actions");

  if (!actions) {
    actions = document.createElement("div");
    actions.className = "top-actions audio-global-actions";
    document.body.prepend(actions);
  }

  const button = document.createElement("button");
  button.id = "audioSettingsBtn";
  button.type = "button";
  button.className = "btn small ghost";
  button.textContent = lang() === "fr" ? "Son" : "Sound";
  button.setAttribute("aria-label", lang() === "fr" ? "Préférences audio" : "Sound preferences");

  button.addEventListener("click", () => {
    document.getElementById("audioSettingsDialog")?.remove();

    const dialog = document.createElement("dialog");
    dialog.id = "audioSettingsDialog";
    dialog.className = "dialog";

    const body = document.createElement("div");
    body.className = "dialog-body";
    body.append(buildAudioPanel());

    const row = document.createElement("div");
    row.className = "row end";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn ghost";
    close.textContent = copy[lang()].close;
    close.addEventListener("click", () => dialog.close());

    row.append(close);
    body.append(row);
    dialog.append(body);
    document.body.append(dialog);

    dialog.addEventListener("close", () => dialog.remove(), {once: true});
    dialog.showModal();
    close.focus();
  });

  actions.append(button);
}

function selectedModeControl(button) {
  if (!button) return false;
  if (["startSolo", "startCharacter", "createFamily", "joinFamily"].includes(button.id)) return true;
  if (button.matches?.('a[href="/mom/"],a[href="/mom"],a[href="/mom-mode/"],a[href="/mom-mode"]')) return true;
  return false;
}

function installInteractionSounds() {
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const button = target.closest("button, a, [role=button], summary");
    if (!button || button.disabled) return;

    if (selectedModeControl(button)) startGameMusic();
    if (button.id === "quitConfirm") { playPool("quit"); return; }
    if (button.id === "startCharacter") {
      play("chooseDing");
      pendingStart = true;
      return;
    }
    if (button.id === "createFamily" || button.id === "joinFamily") pendingStart = true;
    if (button.id === "closeBtn") { play("closeAsk"); return; }
    if (button.id === "closeYes") { play("closeYes"); return; }
    if (button.id === "closeNo") { play("closeNo"); return; }
    if (button.classList?.contains("wc-star")) { play("rating"); return; }
  }, true);

  document.addEventListener("change", event => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (input?.name === "character") playPool("choose");
  }, true);
}

function inspectGameAudio() {
  const app = document.getElementById("app");
  if (!app) { syncBackgroundMusic(); return; }
  const phase = app.dataset.phase || "";
  const modal = document.getElementById("revealModal");
  const words = [...(modal?.querySelectorAll(".rv-word .chip-word") || [])].map(node => node.textContent.trim()).join("|");
  const signature = `${location.pathname}|${phase}|${modal?.classList.contains("match") ? "match" : ""}|${words}`;
  if (signature === lastPhaseSignature) return;
  lastPhaseSignature = signature;

  if (phase === "playing" && (/^\/solo\//.test(location.pathname) || /^\/games\//.test(location.pathname))) startGameMusic();

  if (pendingStart && phase === "playing" && (/^\/solo\//.test(location.pathname) || /^\/games\//.test(location.pathname))) {
    pendingStart = false;
    setTimeout(() => playPool("start"), 260);
    return;
  }

  if (phase === "revealing" && modal?.classList.contains("match")) {
    playPool("finalReveal");
    return;
  }

  if (phase === "gameOver" && document.querySelector(".end.win")) playWinSequence();
}

function installObservers() {
  const app = document.getElementById("app");
  if (app) new MutationObserver(inspectGameAudio).observe(app, {attributes: true, attributeFilter: ["data-phase"]});
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("#profileBtn")) scheduleProfileEnhance();
  });
  installStandaloneAudioSettings();
  inspectGameAudio();
  syncBackgroundMusic();
}

installInteractionSounds();
installObservers();