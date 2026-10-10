// Final-state polish for the move trail and exhausted-game audio.
// Kept in the main audio bundle so it respects the same device-local sound preference.

const LOSS_SOUND_URL = "https://raw.githubusercontent.com/jonjonsson/SoundMonster/main/Public%20domain/buzzer.mp3";
const AUDIO_STORAGE_KEY = "ssbd.audio.v1";
let lastLossSignature = "";

function lossAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY) || "null");
    return {
      enabled: saved?.enabled !== false,
      game: Number.isFinite(Number(saved?.game)) ? Math.max(0, Math.min(1, Number(saved.game))) : 0.7
    };
  } catch {
    return {enabled: true, game: 0.7};
  }
}

function playLossSound() {
  const settings = lossAudioSettings();
  if (!settings.enabled || settings.game <= 0) return;

  try {
    const audio = new Audio(LOSS_SOUND_URL);
    const target = Math.max(0, Math.min(1, settings.game * 0.22));
    const fadeInMs = 80;
    const fadeOutMs = 280;
    const maxMs = 1250;
    let fading = false;

    const ramp = (from, to, ms, done) => {
      const started = performance.now();
      const tick = now => {
        if (audio.paused) return;
        const p = Math.min(1, (now - started) / Math.max(1, ms));
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * p));
        if (p < 1) requestAnimationFrame(tick);
        else done?.();
      };
      audio.volume = Math.max(0, Math.min(1, from));
      requestAnimationFrame(tick);
    };

    const fadeOut = () => {
      if (fading || audio.paused) return;
      fading = true;
      ramp(audio.volume, 0, fadeOutMs, () => {
        try { audio.pause(); audio.currentTime = 0; } catch {}
      });
    };

    audio.preload = "auto";
    audio.volume = 0;
    audio.play().then(() => {
      ramp(0, target, fadeInMs);
      setTimeout(fadeOut, Math.max(80, maxMs - fadeOutMs));
      audio.addEventListener("timeupdate", () => {
        if (!Number.isFinite(audio.duration) || fading) return;
        if (audio.duration - audio.currentTime <= fadeOutMs / 1000 + 0.05) fadeOut();
      });
    }).catch(() => {});
  } catch {}
}

function installEndgameStyles() {
  if (document.getElementById("ssbdEndgamePolish")) return;
  const style = document.createElement("style");
  style.id = "ssbdEndgamePolish";
  style.textContent = `
    .progress.finale .stones {
      width: fit-content;
      max-width: 100%;
      margin-inline: auto;
    }
    .progress.ssbd-loss .stone.final {
      background: var(--coral);
      color: var(--ink);
      box-shadow: 0 3px 0 var(--ink);
    }
  `;
  document.head.append(style);
}

function syncEndgameState() {
  const app = document.getElementById("app");
  const progress = document.getElementById("progress");
  if (!app || !progress) return;

  const exhausted = app.dataset.phase === "gameOver" && Boolean(document.querySelector(".end.over"));
  progress.classList.toggle("ssbd-loss", exhausted);

  if (!exhausted) return;

  const finalStone = progress.querySelector(".stone.final");
  if (finalStone) {
    finalStone.textContent = "×";
    finalStone.setAttribute("aria-label", "No match");
  }

  const signature = `${location.pathname}|${progress.dataset.move || ""}|loss`;
  if (signature !== lastLossSignature) {
    lastLossSignature = signature;
    playLossSound();
  }
}

installEndgameStyles();

const app = document.getElementById("app");
if (app) {
  new MutationObserver(() => requestAnimationFrame(syncEndgameState)).observe(app, {
    attributes: true,
    attributeFilter: ["data-phase"],
    childList: true,
    subtree: true
  });
}

requestAnimationFrame(syncEndgameState);
