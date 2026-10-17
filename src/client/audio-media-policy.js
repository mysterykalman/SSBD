// Keeps the existing SSBD audio engine attached to the actual UI state.
// This does not replace Audio or create a second music system. It only tracks
// the real media element created by audio-settings.js and starts/stops it when
// the app moves between the homepage and a game.

const nativePlay = HTMLMediaElement.prototype.play;
let gameMusic = null;
let introMusic = null;
let scheduled = false;

HTMLMediaElement.prototype.play = function (...args) {
  try {
    const src = String(this.currentSrc || this.src || "");
    if (src.includes("/audio/game-music.mp3")) gameMusic = this;
    if (src.includes("/audio/intro.mp3")) introMusic = this;
  } catch {}
  return nativePlay.apply(this, args);
};

function isReview() {
  return /^\/review(?:\/|$)/.test(location.pathname);
}

function isHomepageView() {
  if (isReview()) return false;
  if (document.body.classList.contains("conn-mode-open")) return false;
  return Boolean(document.querySelector(".home-grid.start-grid"));
}

function isGameView() {
  if (isReview() || isHomepageView()) return false;
  if (document.body.classList.contains("conn-mode-open")) return true;
  if (/^\/(?:solo|games)\//.test(location.pathname)) return true;
  if (/^\/mom(?:-mode)?(?:\/|$)/.test(location.pathname)) return true;
  return Boolean(document.querySelector(".game-nav, .game-card, [data-phase='game'], [data-phase='reveal'], [data-phase='gameOver']"));
}

function stopGameMusicOnHome() {
  if (!gameMusic || gameMusic.paused) return;
  try {
    gameMusic.pause();
    gameMusic.currentTime = 0;
  } catch {}
}

function sync() {
  scheduled = false;

  if (document.hidden) return;

  if (isHomepageView() || isReview()) {
    stopGameMusicOnHome();
    return;
  }

  if (isGameView()) {
    window.SSBDAudio?.startGameMusic?.();
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-phase"]
});
window.addEventListener("popstate", schedule);
window.addEventListener("hashchange", schedule);
window.addEventListener("pageshow", schedule);
document.addEventListener("visibilitychange", schedule);
document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  const control = target?.closest('[data-mode="connections"] .mode-actions .btn, .conn-tier');
  if (control) window.SSBDAudio?.startGameMusic?.();
  setTimeout(schedule, 0);
}, true);

window.__SSBDAudioTrackedMedia = {
  get gameMusic() { return gameMusic; },
  get introMusic() { return introMusic; },
  sync
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, {once: true});
else schedule();
setTimeout(schedule, 100);
