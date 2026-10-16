function installAudioFeltStyles() {
  if (document.getElementById("audioFeltStyles")) return;
  const style = document.createElement("style");
  style.id = "audioFeltStyles";
  style.textContent = `
    .audio-settings-panel.audio-felt-panel {
      display: grid;
      gap: 14px;
      width: min(100%, 560px);
      color: var(--ink);
    }
    .audio-felt-panel .audio-settings-heading {
      margin: 0;
      font-size: 1.2rem;
    }
    .audio-felt-panel .audio-settings-hint {
      margin: -7px 0 0;
      color: var(--ink-soft);
      font-size: .9rem;
      line-height: 1.35;
    }
    .audio-felt-panel .audio-master.audio-master-felt {
      --felt-h: 42px;
      width: fit-content;
      min-height: 42px;
      padding: 5px 18px 9px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 900;
      color: var(--ink);
    }
    .audio-felt-panel .audio-master input[type="checkbox"] {
      appearance: none;
      width: 34px;
      height: 20px;
      margin: 0;
      border: 2px solid rgba(90,62,43,.28);
      border-radius: 999px;
      background: rgba(255,255,255,.55);
      box-shadow: inset 0 1px 3px rgba(63,39,24,.15);
      position: relative;
      transition: background .16s ease;
    }
    .audio-felt-panel .audio-master input[type="checkbox"]::after {
      content: "";
      position: absolute;
      width: 12px;
      height: 12px;
      top: 2px;
      left: 2px;
      border-radius: 50%;
      background: #f9edda;
      border: 1px dashed #b88d61;
      box-shadow: 0 1px 2px rgba(50,30,20,.2);
      transition: transform .16s ease;
    }
    .audio-felt-panel .audio-master input[type="checkbox"]:checked {
      background: var(--green);
    }
    .audio-felt-panel .audio-master input[type="checkbox"]:checked::after {
      transform: translateX(14px);
    }
    .audio-felt-panel .audio-channel.audio-setting-tile {
      width: 100%;
      min-height: 0;
      aspect-ratio: 1776 / 784;
      box-sizing: border-box;
      padding: clamp(18px, 4.1vw, 28px) clamp(26px, 6vw, 42px) clamp(22px, 5vw, 34px);
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      grid-template-areas:
        "label value"
        "hint value"
        "range range";
      align-items: center;
      gap: 2px 14px;
      text-align: left;
      text-transform: none;
      letter-spacing: normal;
      font-size: 1rem;
      line-height: 1.25;

      background-image: url("/felt/audio-panel-patch.png") !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      background-size: 100% 100% !important;
      background-color: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
    }
    .audio-felt-panel .audio-channel > label {
      grid-area: label;
      font-size: 1rem;
      font-weight: 900;
      text-transform: none;
    }
    .audio-felt-panel .audio-channel > small {
      grid-area: hint;
      display: block;
      color: var(--ink-soft);
      font-size: .78rem;
      font-weight: 800;
      line-height: 1.25;
      text-transform: none;
    }
    .audio-felt-panel .audio-range-row {
      grid-area: range;
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      align-items: center;
      gap: 12px;
      margin-top: 7px;
      width: 100%;
    }
    .audio-felt-panel .audio-value {
      grid-area: value;
      --felt-h: 38px;
      min-width: 72px;
      min-height: 38px;
      padding: 4px 14px 8px;
      font-size: .82rem;
      font-weight: 900;
      justify-self: end;
      position: relative;
      top: -14px;
    }
    .audio-felt-panel input[type="range"] {
      appearance: none;
      width: 100%;
      height: 32px;
      margin: 0;
      background: transparent;
      cursor: pointer;
    }
    .audio-felt-panel input[type="range"]::-webkit-slider-runnable-track {
      height: 12px;
      border-radius: 999px;
      border: 2px solid #d4b58f;
      background: linear-gradient(180deg, #f8ead4, #ead5b8);
      box-shadow: inset 0 2px 3px rgba(72,45,26,.16), 0 1px 0 rgba(255,255,255,.7);
    }
    .audio-felt-panel input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 28px;
      height: 28px;
      margin-top: -10px;
      border: 2px dashed #9d734b;
      border-radius: 50%;
      background: radial-gradient(circle at 38% 30%, #fff3d9 0 18%, #eeb064 55%, #c98035 100%);
      box-shadow: 0 3px 0 #aa6a2d, 0 5px 8px rgba(57,34,19,.22);
    }
    .audio-felt-panel input[type="range"]::-moz-range-track {
      height: 9px;
      border-radius: 999px;
      border: 2px solid #d4b58f;
      background: linear-gradient(180deg, #f8ead4, #ead5b8);
      box-shadow: inset 0 2px 3px rgba(72,45,26,.16);
    }
    .audio-felt-panel input[type="range"]::-moz-range-thumb {
      width: 25px;
      height: 25px;
      border: 2px dashed #9d734b;
      border-radius: 50%;
      background: #e9a653;
      box-shadow: 0 3px 0 #aa6a2d;
    }
    .audio-felt-panel.muted .audio-setting-tile,
    .audio-felt-panel.muted .audio-master-felt { filter: saturate(.45); opacity: .72; }
    @media (max-width: 560px) {
      .audio-felt-panel .audio-channel.audio-setting-tile {
        min-height: 0;
        padding: 18px 28px 24px;
      }
      .audio-felt-panel .audio-channel > small { font-size: .74rem; }
    }
  `;
  document.head.append(style);
}

function enhanceAudioPanel(panel) {
  if (!(panel instanceof Element) || panel.dataset.feltEnhanced === "1") return;
  panel.dataset.feltEnhanced = "1";
  panel.classList.add("audio-felt-panel");

  const master = panel.querySelector(".audio-master");
  master?.classList.add("pill", "teal", "audio-master-felt");

  const channels = [...panel.querySelectorAll(".audio-channel")];
  channels.forEach((channel, index) => {
    channel.classList.add("tile", "audio-setting-tile");
    const value = channel.querySelector(".audio-value");
    if (value) value.classList.add("pill", "sm", index === 0 ? "green" : "teal");
  });
}

function enhanceAllAudioPanels(root = document) {
  root.querySelectorAll?.(".audio-settings-panel").forEach(enhanceAudioPanel);
}

installAudioFeltStyles();
enhanceAllAudioPanels();

new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.(".audio-settings-panel")) enhanceAudioPanel(node);
      enhanceAllAudioPanels(node);
    }
  }
}).observe(document.documentElement, {childList: true, subtree: true});
