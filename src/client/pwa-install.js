// Shared install button for Home and Pam. User-initiated only; no autoplay or game-state changes.
(() => {
  "use strict";
  const apple = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = () => /Android/i.test(navigator.userAgent);
  const mac = () => /Macintosh|Mac OS X/i.test(navigator.userAgent) && !apple();
  const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  let installEvent, button, sheet;
  function guide() {
    if (apple()) return ["Make yourself at home.", "On iPhone or iPad, install SSBD using Safari. It will open in its own app window.", ["Open this page in Safari.", "Tap Share (the square with the upward arrow).", "Choose Add to Home Screen, then tap Add."]];
    if (android()) return ["SSBD has a new home.", "Install SSBD from Chrome to get its own icon and app window.", ["Open this page in Chrome.", "Open the three-dot browser menu.", "Choose Install app or Add to Home screen, then confirm."]];
    if (mac()) return ["Give SSBD a spot in your Dock.", "On a Mac, SSBD opens separately from your browser.", ["In Safari, choose File, then Add to Dock.", "Confirm the name and select Add.", "Launch SSBD from the Dock, Spotlight or Applications."]];
    return ["Take SSBD with you.", "Install SSBD as an app on your device.", ["Open your browser's Install app option in its address bar or menu.", "Choose Install and confirm.", "Launch SSBD from your app launcher."]];
  }
  function showGuide() {
    if (!sheet) {
      sheet = document.createElement("dialog");
      sheet.className = "pwa-install-dialog";
      sheet.setAttribute("aria-labelledby","pwaInstallTitle");
      sheet.innerHTML = '<div class="pwa-install-panel"><p class="pwa-install-eyebrow">YOUR GAME. YOUR DEVICE.</p><h2 id="pwaInstallTitle"></h2><p class="pwa-install-lead"></p><ol class="pwa-install-steps"></ol><p class="pwa-install-foot">Open SSBD from its installed icon for the standalone experience.</p><button type="button" class="pwa-install-close">Got it</button></div>';
      sheet.querySelector("button").addEventListener("click", () => sheet.close());
      sheet.addEventListener("click", e => { if (e.target === sheet) sheet.close(); });
      document.body.append(sheet);
    }
    const [title, lead, steps] = guide();
    sheet.querySelector("h2").textContent = title;
    sheet.querySelector(".pwa-install-lead").textContent = lead;
    sheet.querySelector("ol").replaceChildren(...steps.map(value => {
      const li = document.createElement("li"); li.textContent = value; return li;
    }));
    sheet.querySelector(".pwa-install-foot").textContent = mac()
      ? "Chrome users can use the Install icon in the address bar or the browser menu."
      : "Open SSBD from its installed icon for the standalone experience.";
    sheet.showModal();
  }
  async function beginInstall() {
    if (installEvent) {
      const event = installEvent;
      installEvent = null;
      try {
        await event.prompt();
        if ((await event.userChoice)?.outcome === "accepted") return;
      } catch { /* Expired native prompt falls back to browser instructions. */ }
    }
    showGuide();
  }
  function sync() {
    if (button) button.hidden = standalone();
    if (standalone() && sheet?.open) sheet.close();
  }
  function init() {
    const actions = document.querySelector(".top-actions");
    if (!actions || document.querySelector("#pwaInstallBtn")) return;
    button = document.createElement("button");
    Object.assign(button,{id:"pwaInstallBtn",type:"button",className:"pwa-install-trigger",textContent:"Install app"});
    button.setAttribute("aria-label","Install Same Same but Different");
    button.addEventListener("click",beginInstall);
    actions.insertBefore(button,actions.querySelector("#profileBtn") || null);
    sync();
    // Pam runs in a separate HTML document that does not register the main game's service worker.
    if (/^\/mom(?:-mode)?(?:\/|$)/.test(location.pathname) && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).catch(() => {});
  }
  addEventListener("beforeinstallprompt",event => {event.preventDefault();installEvent = event;});
  addEventListener("appinstalled",() => {installEvent = null;sync();});
  matchMedia("(display-mode: standalone)").addEventListener?.("change",sync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
