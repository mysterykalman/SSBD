// Character picker confirmation cue. Kept separate so the existing audio system remains unchanged.
const CONFIRM_SOUND_URL = "https://raw.githubusercontent.com/jonjonsson/SoundMonster/main/Public%20domain/ding%20bell.mp3";
const AUDIO_STORAGE_KEY = "ssbd.audio.v1";

function audioSettings() {
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

function playCharacterConfirm() {
  const settings = audioSettings();
  if (!settings.enabled || settings.game <= 0) return;

  try {
    const audio = new Audio(CONFIRM_SOUND_URL);
    const target = settings.game * 0.28;
    const fadeInMs = 90;
    const fadeOutMs = 320;
    audio.preload = "auto";
    audio.volume = 0;

    const ramp = (from, to, ms, done) => {
      const started = performance.now();
      const tick = now => {
        if (audio.paused) return;
        const progress = Math.min(1, (now - started) / Math.max(1, ms));
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
        if (progress < 1) requestAnimationFrame(tick);
        else done?.();
      };
      audio.volume = from;
      requestAnimationFrame(tick);
    };

    const fadeOut = () => {
      if (audio.paused || audio.__ssbdConfirmFading) return;
      audio.__ssbdConfirmFading = true;
      ramp(audio.volume, 0, fadeOutMs, () => {
        try { audio.pause(); audio.currentTime = 0; } catch {}
      });
    };

    audio.play().then(() => {
      ramp(0, target, fadeInMs);
      const maybeFade = () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= fadeOutMs / 1000 + 0.05) {
          audio.removeEventListener("timeupdate", maybeFade);
          fadeOut();
        }
      };
      audio.addEventListener("timeupdate", maybeFade);
    }).catch(() => {});
  } catch {}
}

document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("#startCharacter")) playCharacterConfirm();
}, true);
