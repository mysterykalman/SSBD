const INTRO_SESSION_KEY = "ssbd.audio.intro-played.v1";
const GAME_MUSIC_SESSION_KEY = "ssbd.audio.game-music-started.v1";

function sessionGet(key) {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}

function shouldShow() {
  return (location.pathname === "/" || location.pathname === "/index.html") && !sessionGet(INTRO_SESSION_KEY) && !sessionGet(GAME_MUSIC_SESSION_KEY);
}

function closeWelcome() {
  const dlg = document.getElementById("audioIntroWelcome");
  if (!dlg) return;
  if (dlg.open) dlg.close();
  dlg.remove();
}

function buildWelcome(skipButton) {
  if (!shouldShow() || document.getElementById("audioIntroWelcome")) return;

  const dlg = document.createElement("dialog");
  dlg.id = "audioIntroWelcome";
  dlg.className = "dialog";
  dlg.setAttribute("aria-labelledby", "audioIntroWelcomeTitle");

  const body = document.createElement("div");
  body.className = "dialog-body";
  body.style.textAlign = "center";
  body.style.display = "grid";
  body.style.justifyItems = "center";
  body.style.gap = "18px";

  const title = document.createElement("p");
  title.id = "audioIntroWelcomeTitle";
  title.className = "eyebrow";
  title.textContent = "WELCOME TO";

  const logo = document.createElement("img");
  logo.src = "/logo.webp";
  logo.alt = "Same Same but Different";
  logo.width = 340;
  logo.height = 263;
  logo.style.width = "min(280px, 72vw)";
  logo.style.height = "auto";

  const note = document.createElement("p");
  note.className = "muted";
  note.textContent = "A tiny opening number before we get started.";

  const actions = document.createElement("div");
  actions.className = "row center";

  skipButton.removeAttribute("style");
  skipButton.className = "btn ghost";
  skipButton.textContent = "Skip intro";
  skipButton.addEventListener("click", closeWelcome, {once: true});
  actions.append(skipButton);

  body.append(title, logo, note, actions);
  dlg.append(body);
  dlg.addEventListener("cancel", event => {
    event.preventDefault();
    skipButton.click();
  });
  document.body.append(dlg);
  dlg.showModal();
}

function attachToExistingSkip() {
  const skip = document.getElementById("audioIntroSkip");
  if (!skip || skip.closest("#audioIntroWelcome")) return false;
  buildWelcome(skip);
  return true;
}

if (shouldShow()) {
  if (!attachToExistingSkip()) {
    const observer = new MutationObserver(() => {
      if (attachToExistingSkip()) observer.disconnect();
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    setTimeout(() => observer.disconnect(), 5000);
  }
}

const removalObserver = new MutationObserver(() => {
  const dlg = document.getElementById("audioIntroWelcome");
  if (dlg && !document.getElementById("audioIntroSkip")) closeWelcome();
});
removalObserver.observe(document.documentElement, {childList: true, subtree: true});
