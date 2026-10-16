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
  dlg.classList.add("is-leaving");
  setTimeout(() => {
    if (dlg.open) dlg.close();
    dlg.remove();
  }, 180);
}

function installStyles() {
  if (document.getElementById("audioIntroWelcomeStyles")) return;
  const style = document.createElement("style");
  style.id = "audioIntroWelcomeStyles";
  style.textContent = `
    #audioIntroWelcome {
      width: min(620px, calc(100vw - 32px));
      max-width: 620px;
      padding: 0;
      border: 0;
      border-radius: 24px;
      background: #fffdf8;
      color: var(--ink);
      box-shadow: 0 24px 70px rgba(60, 38, 26, .22);
      overflow: visible;
      opacity: 0;
      transform: translateY(18px) rotate(-.5deg) scale(.965);
      animation: ssbdIntroCardIn .52s cubic-bezier(.2,.9,.2,1.08) forwards;
    }
    #audioIntroWelcome::backdrop {
      background: rgba(54, 39, 28, .22);
      backdrop-filter: blur(2px);
      animation: ssbdIntroBackdropIn .3s ease both;
    }
    #audioIntroWelcome.is-leaving {
      animation: ssbdIntroCardOut .18s ease forwards;
    }
    #audioIntroWelcome .intro-shell {
      display: grid;
      gap: 18px;
      padding: 30px;
      text-align: center;
    }
    #audioIntroWelcome .intro-bubble {
      --felt-h: 190px;
      display: grid;
      justify-items: center;
      gap: 10px;
      width: 100%;
      min-height: 190px;
      padding: 30px 46px 42px !important;
      text-align: center;
      animation: ssbdIntroBubbleSettle .65s .08s cubic-bezier(.2,.9,.2,1.1) both;
    }
    #audioIntroWelcome .intro-kicker {
      margin: 0;
      color: var(--ink-soft);
      font-size: .78rem;
      font-weight: 900;
      letter-spacing: .14em;
    }
    #audioIntroWelcome .intro-logo {
      display: block;
      width: min(260px, 64vw);
      height: auto;
    }
    #audioIntroWelcome .intro-note {
      margin: 2px 0 0;
      font-weight: 900;
      line-height: 1.35;
    }
    #audioIntroWelcome .intro-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    #audioIntroWelcome .intro-actions .btn {
      min-width: 150px;
    }
    @keyframes ssbdIntroCardIn {
      0% { opacity: 0; transform: translateY(18px) rotate(-.5deg) scale(.965); }
      72% { opacity: 1; transform: translateY(-2px) rotate(.18deg) scale(1.006); }
      100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
    }
    @keyframes ssbdIntroCardOut {
      to { opacity: 0; transform: translateY(8px) scale(.985); }
    }
    @keyframes ssbdIntroBackdropIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ssbdIntroBubbleSettle {
      0% { opacity: 0; transform: translateY(8px) rotate(.4deg); }
      100% { opacity: 1; transform: translateY(0) rotate(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      #audioIntroWelcome,
      #audioIntroWelcome.is-leaving,
      #audioIntroWelcome .intro-bubble,
      #audioIntroWelcome::backdrop { animation: none; opacity: 1; transform: none; }
    }
    @media (max-width: 520px) {
      #audioIntroWelcome .intro-shell { padding: 20px; }
      #audioIntroWelcome .intro-bubble { --felt-h: 170px; padding: 26px 30px 38px !important; }
      #audioIntroWelcome .intro-actions { display: grid; }
      #audioIntroWelcome .intro-actions .btn { width: 100%; }
    }
  `;
  document.head.append(style);
}

function buildWelcome() {
  if (!shouldShow() || document.getElementById("audioIntroWelcome")) return;
  installStyles();

  const dlg = document.createElement("dialog");
  dlg.id = "audioIntroWelcome";
  dlg.className = "intro-dialog";
  dlg.setAttribute("aria-labelledby", "audioIntroWelcomeTitle");

  const shell = document.createElement("div");
  shell.className = "intro-shell";

  const bubble = document.createElement("div");
  bubble.className = "speech intro-bubble";

  const title = document.createElement("p");
  title.id = "audioIntroWelcomeTitle";
  title.className = "intro-kicker";
  title.textContent = "WELCOME TO";

  const logo = document.createElement("img");
  logo.className = "intro-logo";
  logo.src = "/logo.webp";
  logo.alt = "Same Same but Different";
  logo.width = 340;
  logo.height = 263;

  const note = document.createElement("p");
  note.className = "intro-note";
  note.textContent = "A tiny fanfare for absolutely no reason.";

  bubble.append(title, logo, note);

  const actions = document.createElement("div");
  actions.className = "intro-actions";

  const play = document.createElement("button");
  play.id = "audioIntroPlay";
  play.type = "button";
  play.className = "btn";
  play.textContent = "Play intro";

  const skip = document.createElement("button");
  skip.id = "audioIntroSkip";
  skip.type = "button";
  skip.className = "btn ghost";
  skip.textContent = "Skip intro";

  play.addEventListener("click", async () => {
    if (!window.SSBDAudio?.playIntro) return;
    play.disabled = true;
    play.textContent = "Playing…";
    const started = await window.SSBDAudio.playIntro();
    if (!started) {
      play.disabled = false;
      play.textContent = "Play intro";
    }
  });

  skip.addEventListener("click", () => {
    window.SSBDAudio?.skipIntro?.();
    closeWelcome();
  });

  actions.append(play, skip);
  shell.append(bubble, actions);
  dlg.append(shell);

  dlg.addEventListener("cancel", event => {
    event.preventDefault();
    skip.click();
  });

  document.addEventListener("ssbd:intro-ended", closeWelcome, {once: true});
  document.body.append(dlg);
  dlg.showModal();
  play.focus({preventScroll: true});
}

if (shouldShow()) buildWelcome();