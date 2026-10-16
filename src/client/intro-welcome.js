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
  }, 220);
}

function installStyles() {
  if (document.getElementById("audioIntroWelcomeStyles")) return;
  const style = document.createElement("style");
  style.id = "audioIntroWelcomeStyles";
  style.textContent = `
    #audioIntroWelcome {
      width: min(660px, calc(100vw - 28px));
      max-width: 660px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--ink);
      box-shadow: none;
      overflow: visible;
      opacity: 0;
      transform: translateY(34px) scale(.82) rotate(-2deg);
      animation: ssbdIntroPop .78s var(--ease-pop, cubic-bezier(.2,1.5,.4,1)) forwards;
    }
    #audioIntroWelcome::backdrop {
      background: rgba(66, 49, 38, .16);
      -webkit-backdrop-filter: blur(9px) saturate(.92);
      backdrop-filter: blur(9px) saturate(.92);
      animation: ssbdIntroBackdropIn .24s ease both;
    }
    #audioIntroWelcome.is-leaving {
      animation: ssbdIntroOut .22s ease forwards;
    }
    #audioIntroWelcome .intro-shell {
      display: grid;
      justify-items: center;
      gap: 14px;
      width: 100%;
      padding: 8px;
      text-align: center;
    }
    #audioIntroWelcome .intro-bubble {
      --felt-h: 272px;
      display: grid;
      grid-template-rows: auto 1fr auto;
      justify-items: center;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 272px;
      padding: 36px 54px 66px !important;
      text-align: center;
      transform-origin: 44% 88%;
      animation: ssbdBubbleWobble .82s .12s cubic-bezier(.16,1,.3,1) both;
    }
    #audioIntroWelcome .intro-kicker {
      align-self: start;
      margin: 0;
      color: var(--ink-soft);
      font-size: .78rem;
      font-weight: 900;
      letter-spacing: .17em;
      line-height: 1;
    }
    #audioIntroWelcome .intro-logo {
      display: block;
      width: min(238px, 55vw);
      height: auto;
      margin: -2px auto 0;
    }
    #audioIntroWelcome .intro-note {
      align-self: end;
      max-width: 430px;
      margin: 0;
      padding-inline: 10px;
      font-size: clamp(.92rem, 2.5vw, 1.02rem);
      font-weight: 900;
      line-height: 1.24;
      text-wrap: balance;
    }
    #audioIntroWelcome .intro-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      animation: ssbdActionsIn .4s .46s ease-out both;
    }
    #audioIntroWelcome .intro-actions .btn {
      min-width: 154px;
    }
    @keyframes ssbdIntroPop {
      0% { opacity: 0; transform: translateY(34px) scale(.82) rotate(-2deg); }
      48% { opacity: 1; transform: translateY(-12px) scale(1.06) rotate(1.2deg); }
      70% { transform: translateY(5px) scale(.985) rotate(-.5deg); }
      86% { transform: translateY(-2px) scale(1.012) rotate(.18deg); }
      100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
    }
    @keyframes ssbdBubbleWobble {
      0% { opacity: 0; transform: rotate(-3.5deg) scale(.9); }
      52% { opacity: 1; transform: rotate(2.2deg) scale(1.025); }
      72% { transform: rotate(-1deg) scale(.994); }
      88% { transform: rotate(.35deg) scale(1.004); }
      100% { opacity: 1; transform: rotate(0) scale(1); }
    }
    @keyframes ssbdActionsIn {
      from { opacity: 0; transform: translateY(10px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ssbdIntroOut {
      to { opacity: 0; transform: translateY(12px) scale(.96) rotate(.5deg); }
    }
    @keyframes ssbdIntroBackdropIn { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      #audioIntroWelcome,
      #audioIntroWelcome.is-leaving,
      #audioIntroWelcome .intro-bubble,
      #audioIntroWelcome .intro-actions,
      #audioIntroWelcome::backdrop {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }
    @media (max-width: 520px) {
      #audioIntroWelcome { width: min(96vw, 660px); }
      #audioIntroWelcome .intro-shell { padding: 2px; }
      #audioIntroWelcome .intro-bubble {
        --felt-h: 246px;
        min-height: 246px;
        padding: 32px 34px 62px !important;
      }
      #audioIntroWelcome .intro-logo { width: min(210px, 58vw); }
      #audioIntroWelcome .intro-actions { width: min(330px, 90vw); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      #audioIntroWelcome .intro-actions .btn { min-width: 0; width: 100%; padding-inline: 18px; }
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
  play.className = "btn sage";
  play.textContent = "Play intro";

  const skip = document.createElement("button");
  skip.id = "audioIntroSkip";
  skip.type = "button";
  skip.className = "btn danger";
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
