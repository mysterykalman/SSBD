// SSBD audio policy layer.
// This file only manages first-visit state, homepage session flags, and the
// one-time global audio trim. Playback itself remains owned by audio-settings.js.

const AUDIO_SETTINGS_KEY = "ssbd.audio.v1";
const AUDIO_TRIM_KEY = "ssbd.audio.global-trim-15.v1";
const INTRO_SESSION_KEY = "ssbd.audio.intro-played.v1";
const GAME_MUSIC_SESSION_KEY = "ssbd.audio.game-music-started.v1";
const INTRO_EVER_KEY = "ssbd.audio.intro-seen-ever.v1";
const AUDIO_TRIM = 0.85;

function isHomepageRoute() {
  return location.pathname === "/" || location.pathname === "/index.html";
}

// Apply the requested 15% reduction once per browser. Because this runs before
// audio-settings.js, both existing saved settings and first-run defaults are lowered
// without changing any individual MP3 asset or per-mode behaviour.
try {
  if (localStorage.getItem(AUDIO_TRIM_KEY) !== "1") {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || "null"); } catch {}

    const next = {
      enabled: saved?.enabled !== false,
      music: Math.max(0, Math.min(1, Number(saved?.music ?? 0.42) * AUDIO_TRIM)),
      game: Math.max(0, Math.min(1, Number(saved?.game ?? 0.7) * AUDIO_TRIM))
    };

    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
    localStorage.setItem(AUDIO_TRIM_KEY, "1");
  }
} catch {}

let firstHomepageVisit = false;

try {
  if (isHomepageRoute()) {
    firstHomepageVisit = localStorage.getItem(INTRO_EVER_KEY) !== "1";

    if (firstHomepageVisit) {
      // Do not mark the intro as seen until the welcome actually renders. If a
      // build/runtime problem prevents the popup, the next homepage visit gets
      // another chance instead of permanently losing the intro.
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
