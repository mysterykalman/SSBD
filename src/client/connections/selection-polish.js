const STYLE_ID = "oddOneInSelectionPolish";

if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .conn-tile[aria-pressed="true"] {
      --skin-img: url("/felt/tile-blue.webp") !important;
      --skin-slice: 72 184 74 132 fill !important;
      --skin-wt: 0.4138 !important;
      --skin-wr: 1.0575 !important;
      --skin-wb: 0.4253 !important;
      --skin-wl: 0.7586 !important;
      --skin-bt: 0.0115 !important;
      --skin-bb: 0.0115 !important;
      --skin-bl: 0.0115 !important;
      --skin-br: 0.0115 !important;
      --skin-center: #90b3d5 !important;
      outline: none !important;
      transform: translateY(-3px) scale(1.018) !important;
      filter: brightness(1.025) saturate(1.04) drop-shadow(0 8px 7px rgba(65,42,25,.22)) !important;
    }

    .conn-board.ready .conn-tile[aria-pressed="true"] {
      outline: none !important;
      filter: brightness(1.025) saturate(1.04) drop-shadow(0 8px 7px rgba(65,42,25,.22)) !important;
    }
  `;
  document.head.append(style);
}
