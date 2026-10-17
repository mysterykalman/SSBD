// Keeps the existing Sound control attached to the current shared topbar and
// adds a replay-intro action to the existing audio settings dialog.

const INTRO_EVER_KEY = "ssbd.audio.intro-seen-ever.v1";
let soundButton = null;
let scheduled = false;

function markIntroSeenWhenRendered() {
  const welcome = document.getElementById("audioIntroWelcome");
  if (!welcome) return;
  try { localStorage.setItem(INTRO_EVER_KEY, "1"); } catch {}
}

function keepSoundButton() {
  const found = document.getElementById("audioSettingsBtn");
  if (found) soundButton = found;
  if (!soundButton) return;

  const actions = document.querySelector(".top-actions");
  if (!actions || soundButton.parentElement === actions) return;

  const profile = actions.querySelector("#profileBtn, .avatar, [aria-label*='profile' i]");
  actions.insertBefore(soundButton, profile || null);
}

function addReplayIntro() {
  const dialog = document.getElementById("audioSettingsDialog");
  const panel = dialog?.querySelector(".audio-settings-panel");
  if (!panel || panel.querySelector("#audioReplayIntro")) return;

  const actions = document.createElement("div");
  actions.className = "audio-extra-actions";

  const replay = document.createElement("button");
  replay.id = "audioReplayIntro";
  replay.type = "button";
  replay.className = "btn small ghost";
  replay.textContent = "Play intro again";

  replay.addEventListener("click", async () => {
    if (!window.SSBDAudio?.replayIntro) return;
    replay.disabled = true;
    const label = replay.textContent;
    replay.textContent = "Playing intro…";
    try {
      await window.SSBDAudio.replayIntro();
    } finally {
      setTimeout(() => {
        replay.disabled = false;
        replay.textContent = label;
      }, 450);
    }
  });

  actions.append(replay);
  panel.append(actions);
}

function installStyles() {
  if (document.getElementById("audioShellRecoveryStyles")) return;
  const style = document.createElement("style");
  style.id = "audioShellRecoveryStyles";
  style.textContent = `
    .audio-extra-actions{
      display:flex;
      justify-content:flex-start;
      gap:10px;
      flex-wrap:wrap;
      margin-top:2px;
    }
  `;
  document.head.append(style);
}

function sync() {
  scheduled = false;
  installStyles();
  markIntroSeenWhenRendered();
  keepSoundButton();
  addReplayIntro();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {childList: true, subtree: true});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, {once: true});
else schedule();
setTimeout(schedule, 100);
