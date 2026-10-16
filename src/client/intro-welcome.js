const INTRO_SESSION_KEY = "ssbd.audio.intro-played.v1";
const GAME_MUSIC_SESSION_KEY = "ssbd.audio.game-music-started.v1";

function sessionGet(key) {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}

function shouldShow() {
  return (location.pathname === "/" || location.pathname === "/index.html") && !sessionGet(INTRO_SESSION_KEY) && !sessionGet(GAME_MUSIC_SESSION_KEY);
}

function removeWelcome() {
  document.getElementById("audioIntroWelcome")?.remove();
}

function buildWelcome(skipButton) {
  if (!shouldShow() || document.getElementById("audioIntroWelcome")) return;
  const hero = document.querySelector("#app .hero") || document.getElementById("app");
  if (!hero) return;

  const chip = document.createElement("div");
  chip.id = "audioIntroWelcome";
  chip.className = "mode-chip";
  chip.setAttribute("role", "status");
  chip.setAttribute("aria-label", "Welcome intro music");
  Object.assign(chip.style, {
    width: "fit-content",
    maxWidth: "100%",
    margin: "0 auto 8px",
    flexWrap: "wrap",
    justifyContent: "center"
  });

  const badge = document.createElement("span");
  badge.className = "beta-badge";
  badge.textContent = "WELCOME TO";

  const logo = document.createElement("img");
  logo.src = "/logo.webp";
  logo.alt = "Same Same but Different";
  logo.width = 136;
  logo.height = 105;
  Object.assign(logo.style, {width: "108px", height: "auto", flex: "none"});

  const note = document.createElement("span");
  note.textContent = "A tiny fanfare for absolutely no reason.";
  Object.assign(note.style, {fontWeight: "800", textAlign: "center"});

  skipButton.removeAttribute("style");
  skipButton.className = "btn small ghost";
  skipButton.textContent = "Skip intro";
  skipButton.addEventListener("click", removeWelcome, {once: true});

  chip.append(badge, logo, note, skipButton);
  hero.prepend(chip);
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
  const welcome = document.getElementById("audioIntroWelcome");
  if (welcome && !document.getElementById("audioIntroSkip")) removeWelcome();
});
removalObserver.observe(document.documentElement, {childList: true, subtree: true});
