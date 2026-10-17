// SSBD audio policy layer.
// Keeps the homepage quiet after the one-time intro, pauses game music when the
// browser/tab is hidden, and resumes it only when a game is still active.

const INTRO_SESSION_KEY = "ssbd.audio.intro-played.v1";
const GAME_MUSIC_SESSION_KEY = "ssbd.audio.game-music-started.v1";
const INTRO_EVER_KEY = "ssbd.audio.intro-seen-ever.v1";
const GAME_MUSIC_PATH = "/audio/game-music.mp3";

function isHomepage() {
  return (location.pathname === "/" || location.pathname === "/index.html") &&
    !document.body?.classList.contains("conn-mode-open");
}

function isGameActive() {
  return document.body?.classList.contains("conn-mode-open") ||
    /^\/(?:solo|games)\//.test(location.pathname) ||
    /^\/mom(?:-mode)?(?:\/|$)/.test(location.pathname);
}

let firstHomepageVisit = false;
try {
  if (location.pathname === "/" || location.pathname === "/index.html") {
    firstHomepageVisit = localStorage.getItem(INTRO_EVER_KEY) !== "1";
    if (firstHomepageVisit) {
      localStorage.setItem(INTRO_EVER_KEY, "1");
      sessionStorage.removeItem(INTRO_SESSION_KEY);
    } else {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    // A previous game session must never make the homepage start background music.
    sessionStorage.removeItem(GAME_MUSIC_SESSION_KEY);
  }
} catch {}

window.__SSBDFirstHomepageVisit = firstHomepageVisit;

// Track the shared background-music Audio instance without changing the audio system itself.
const NativeAudio = window.Audio;
if (typeof NativeAudio === "function" && !window.__SSBDAudioPolicyWrapped) {
  const WrappedAudio = function(src) {
    const audio = new NativeAudio(src);
    try {
      if (String(src || "").includes(GAME_MUSIC_PATH)) window.__SSBDGameMusicAudio = audio;
    } catch {}
    return audio;
  };
  WrappedAudio.prototype = NativeAudio.prototype;
  try { Object.setPrototypeOf(WrappedAudio, NativeAudio); } catch {}
  window.Audio = WrappedAudio;
  window.__SSBDAudioPolicyWrapped = true;
}

let pausedForHidden = false;

function gameMusic() {
  return window.__SSBDGameMusicAudio || null;
}

function pauseGameMusic({forHidden = false} = {}) {
  const audio = gameMusic();
  if (!audio || audio.paused) return;
  if (forHidden) pausedForHidden = true;
  try { audio.pause(); } catch {}
}

function enforcePagePolicy() {
  if (isHomepage()) pauseGameMusic();
}

function handleVisibility() {
  const audio = gameMusic();
  if (document.hidden) {
    if (audio && !audio.paused) pauseGameMusic({forHidden: true});
    return;
  }

  if (!pausedForHidden) {
    enforcePagePolicy();
    return;
  }

  pausedForHidden = false;
  if (!audio || !isGameActive() || isHomepage()) return;
  audio.play().catch(() => {});
}

document.addEventListener("visibilitychange", handleVisibility);
window.addEventListener("pagehide", () => pauseGameMusic({forHidden: true}));
window.addEventListener("pageshow", handleVisibility);
window.addEventListener("popstate", () => setTimeout(enforcePagePolicy, 0));

if (document.body) {
  new MutationObserver(enforcePagePolicy).observe(document.body, {attributes: true, attributeFilter: ["class"]});
}

// The intro dialog is built later in the same entry bundle. Attempt autoplay on the
// true first visit; browsers that require a gesture simply leave the existing Play intro button available.
setTimeout(() => {
  if (!window.__SSBDFirstHomepageVisit) return;
  if (!document.getElementById("audioIntroWelcome")) return;
  window.SSBDAudio?.playIntro?.();
}, 0);

setTimeout(enforcePagePolicy, 0);
