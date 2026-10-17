const STYLE_ID = "oddOneInBlueCtaStyle";

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mode="connections"] .mode-actions .btn {
      background-image: url("/felt/btn-blue.webp") !important;
    }
  `;
  document.head.append(style);
}

installStyle();
