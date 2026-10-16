const STYLE_ID = "homepageFourModeGrid";

const css = `
@media (min-width: 681px) {
  .home-grid.start-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-auto-rows: 1fr;
    gap: 24px;
    align-items: stretch;
  }
  .home-grid.start-grid > .mode-card {
    height: 100%;
    min-height: 100%;
  }
  .home-grid.start-grid > .solo-card {
    grid-column: auto !important;
  }
}

.games {
  margin-top: 36px !important;
}

.conn-launch.mode-card {
  display: flex;
  flex-direction: column;
}
.conn-launch .mode-stage.conn-launch-stage {
  --wash: #fbe6c3;
  display: flex;
  align-items: flex-end;
  justify-content: space-evenly;
  gap: 10px;
  height: 200px;
  padding: 0 20px;
  overflow: visible;
  background: radial-gradient(90% 120% at 50% 100%, var(--wash), transparent 75%);
}
.conn-launch .conn-launch-standee.standee {
  width: 82px;
  height: 100px;
  margin: 0 0 26px;
  border-radius: 44px 44px 16px 16px;
  flex: 0 0 auto;
}
.conn-launch .conn-launch-standee > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  object-position: 50% 0;
}
.conn-launch .conn-launch-standee::after {
  --felt-h: 28px;
  width: 82px;
  min-width: 82px;
  max-width: 82px;
  min-height: 28px;
  bottom: -14px;
  padding: 2px 6px 6px;
  font-size: .52rem;
  letter-spacing: .055em;
  overflow: visible;
  text-overflow: clip;
}
.conn-launch .mode-body {
  padding: 20px 28px 28px;
}
.conn-launch .start-copy {
  display: grid;
  gap: 8px;
}
.conn-launch .mode-actions {
  margin-top: auto;
  padding-top: 12px;
}

@media (max-width: 680px) {
  .home-grid.start-grid {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-auto-rows: auto;
  }
  .home-grid.start-grid > .solo-card {
    grid-column: auto !important;
  }
  .conn-launch .mode-stage.conn-launch-stage {
    height: 172px;
    padding: 0 12px;
    gap: 8px;
  }
  .conn-launch .conn-launch-standee.standee {
    width: 68px;
    height: 84px;
    margin-bottom: 24px;
    border-radius: 36px 36px 14px 14px;
  }
  .conn-launch .conn-launch-standee::after {
    --felt-h: 26px;
    width: 70px;
    min-width: 70px;
    max-width: 70px;
    bottom: -13px;
    font-size: .46rem;
    letter-spacing: .04em;
    padding-inline: 4px;
  }
}

@media (max-width: 420px) {
  .conn-launch .mode-stage.conn-launch-stage {
    padding-inline: 8px;
    gap: 5px;
  }
  .conn-launch .conn-launch-standee.standee {
    width: 62px;
    height: 78px;
  }
  .conn-launch .conn-launch-standee::after {
    width: 64px;
    min-width: 64px;
    max-width: 64px;
    font-size: .42rem;
    letter-spacing: .025em;
  }
}
`;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.append(style);
}

function normalizeOddOneInCard() {
  const card = document.querySelector('.home-grid.start-grid [data-mode="connections"]');
  if (!card || card.dataset.homeGridNormalized === "true") return;

  const body = card.querySelector(":scope > .mode-body");
  const cast = body?.querySelector(":scope > .conn-launch-cast");
  if (!body || !cast) return;

  cast.classList.add("mode-stage", "conn-launch-stage");
  cast.classList.remove("conn-launch-cast");
  card.insertBefore(cast, body);

  const standees = [...cast.querySelectorAll(".conn-launch-standee")];
  const labels = ["OWEN", "ZOE", "MARTIN", "PROF. BRAINE"];
  standees.forEach((standee, index) => {
    if (labels[index]) standee.dataset.name = labels[index];
  });

  const title = body.querySelector("#connectionsTitle");
  const paragraphs = [...body.querySelectorAll(":scope > p")];
  if (paragraphs.length) {
    const copy = document.createElement("div");
    copy.className = "start-copy";
    paragraphs.forEach(paragraph => copy.append(paragraph));
    title?.after(copy);
  }

  const button = body.querySelector(":scope > button");
  if (button) {
    const actions = document.createElement("div");
    actions.className = "mode-actions";
    actions.append(button);
    body.append(actions);
  }

  card.dataset.homeGridNormalized = "true";
}

function applyHomepageRefinement() {
  installStyles();
  normalizeOddOneInCard();
}

const observer = new MutationObserver(applyHomepageRefinement);
observer.observe(document.documentElement, {childList: true, subtree: true});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyHomepageRefinement, {once: true});
} else {
  applyHomepageRefinement();
}
