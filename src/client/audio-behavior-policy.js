// SSBD audio policy layer.
// This file only manages first-visit state and homepage session flags.
// Playback itself remains owned by audio-settings.js so the native Audio API is never wrapped.

const INTRO_SESSION_KEY = "ssbd.audio.intro-played.v1";
const GAME_MUSIC_SESSION_KEY = "ssbd.audio.game-music-started.v1";
const INTRO_EVER_KEY = "ssbd.audio.intro-seen-ever.v1";

function isHomepageRoute() {
  return location.pathname === "/" || location.pathname === "/index.html";
}

let firstHomepageVisit = false;

try {
  if (isHomepageRoute()) {
    firstHomepageVisit = localStorage.getItem(INTRO_EVER_KEY) !== "1";

    if (firstHomepageVisit) {
      localStorage.setItem(INTRO_EVER_KEY, "1");
      sessionStorage.removeItem(INTRO_SESSION_KEY);
    } else {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }

    // Never let a previous game session make the homepage start background music.
    sessionStorage.removeItem(GAME_MUSIC_SESSION_KEY);
  }
} catch {}

window.__SSBDFirstHomepageVisit = firstHomepageVisit;

// intro-welcome.js is loaded later in the same entry bundle. On the real first visit,
// attempt to start the intro automatically. If the browser blocks autoplay, the existing
// Play intro button remains the user-gesture fallback.
setTimeout(() => {
  if (!window.__SSBDFirstHomepageVisit) return;
  if (!document.getElementById("audioIntroWelcome")) return;
  window.SSBDAudio?.playIntro?.();
}, 0);
