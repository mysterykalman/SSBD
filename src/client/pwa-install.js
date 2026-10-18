// Standalone SSBD installation and Pam's update notice. Browser install prompts are user initiated.
(() => {
  "use strict";
  const isAppleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const isMac = () => /Macintosh|Mac OS X/i.test(navigator.userAgent) && !isAppleMobile();
  const isPam = () => /^\/mom(?:-mode)?(?:\/|$)/.test(location.pathname);
  const isStandalone = () => navigator.standalone === true ||
    matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches;
  const COPY = {
    apple: {
      title: "Make yourself at home.",
      description: "Put SSBD on your Home Screen. It opens as its own app, with no browser address bar.",
      steps: ["Open SSBD in Safari and tap Share (the square with an upward arrow).",
        "Tap Add to Home Screen. If you see Open as Web App, leave it switched on.",
        "Tap Add, then launch SSBD from its new icon."],
      note: "On newer iOS and iPadOS versions, other browsers may also offer Add to Home Screen in their Share menu."
    },
    android: {
      title: "A new home for SSBD.",
      description: "Give SSBD its own app icon and a window without Chrome's address bar.",
      steps: ["Open SSBD in Chrome on your Android phone or tablet.",
        "Open Chrome's three-dot menu and select Install app or Add to Home screen.",
        "Confirm, then launch SSBD from your apps."],
      note: "The exact wording varies by browser and Android device."
    },
    mac: {
      title: "Make room in the Dock.",
      description: "SSBD can live in Applications and open separately from Safari.",
      steps: ["Open SSBD in Safari, then choose File > Add to Dock.",
        "Keep the SSBD name and select Add.",
        "Launch it from your Dock, Spotlight, or Applications."],
      note: "In Chrome, use the Install icon in the address bar or the browser's menu."
    },
    other: {
      title: "Take SSBD with you.",
      description: "If your browser supports web apps, SSBD can launch in its own window.",
      steps: ["Find Install app in your browser's address bar or menu.",
        "Confirm the installation.",
        "Open SSBD from your app launcher."],
      note: "Some browsers only offer a website shortcut; Chrome and Safari provide the best app experience."
    }
  };
  const currentCopy = () => COPY[isAppleMobile() ? "apple" : isAndroid() ? "android" : isMac() ? "mac" : "other"];
  let promptEvent = null;
  let installButton = null;
  let sheet = null;
  let updateNotice = null;

  function renderInstructions() {
    if (!sheet) {
      sheet = document.createElement("dialog");
      sheet.className = "pwa-install-dialog";
      sheet.setAttribute("aria-labelledby", "pwaInstallTitle");
      sheet.innerHTML = `<div class="pwa-install-panel">
        <h2 id="pwaInstallTitle" tabindex="-1">Install SSBD</h2>
        <ol class="pwa-install-steps" aria-label="Installation steps"></ol>
        <button type="button" class="btn primary big pwa-install-close">Got it</button>
      </div>`;
      sheet.querySelector("button").addEventListener("click", () => sheet.close());
      sheet.addEventListener("click", event => { if (event.target === sheet) sheet.close(); });
      sheet.addEventListener("close", () => {
        if (installButton && !isStandalone() && installButton.isConnected) installButton.focus({preventScroll: true});
      });
      document.body.append(sheet);
    }
    const copy = currentCopy();
    // Only the three actionable steps belong in the end-user installation sheet.
    sheet.querySelector("ol").replaceChildren(...copy.steps.map(step => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }));
    if (!sheet.open) sheet.showModal();
    sheet.querySelector("h2").focus({preventScroll: true});
  }

  async function requestInstall() {
    if (promptEvent) {
      const event = promptEvent;
      promptEvent = null;
      try {
        await event.prompt();
        const response = await event.userChoice;
        if (response?.outcome === "accepted") return;
      } catch { /* Expired native prompts fall back to manual guidance. */ }
    }
    renderInstructions();
  }

  function updateInstallState() {
    if (installButton) installButton.hidden = isStandalone();
    if (isStandalone() && sheet?.open) sheet.close();
  }

  function showUpdate(registration) {
    if (updateNotice?.isConnected) return;
    updateNotice = document.createElement("div");
    updateNotice.id = "pwaUpdateNotice";
    updateNotice.className = "pwa-update-notice";
    updateNotice.setAttribute("role", "status");
    const label = document.createElement("span");
    label.textContent = "Pam has a new version ready.";
    label.className = "pwa-update-label";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "btn small primary pwa-update-apply";
    apply.textContent = "Update";
    apply.addEventListener("click", async () => {
      apply.disabled = true;
      const waiting = registration.waiting;
      if (waiting) {
        const changed = new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, {once: true}));
        waiting.postMessage({type: "SKIP_WAITING"});
        await Promise.race([changed, new Promise(resolve => setTimeout(resolve, 3500))]);
      }
      location.reload();
    });
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "pwa-update-dismiss";
    dismiss.setAttribute("aria-label", "Dismiss update notice");
    dismiss.textContent = "×";
    dismiss.addEventListener("click", () => updateNotice.remove());
    updateNotice.append(label, apply, dismiss);
    document.body.append(updateNotice);
  }

  function registerPamWorker() {
    if (!("serviceWorker" in navigator)) return;
    const version = document.querySelector('meta[name="app-version"]')?.content;
    navigator.serviceWorker.register("/sw.js", {updateViaCache: "none"}).then(registration => {
      const check = async () => {
        if (!version || !navigator.serviceWorker.controller) return;
        try {
          const keys = (await caches.keys()).filter(key => key.startsWith("shell-"));
          if (keys.length && !keys.includes(`shell-${version}`)) showUpdate(registration);
          else if (registration.waiting) showUpdate(registration);
        } catch { /* Private modes may restrict Cache Storage. */ }
      };
      navigator.serviceWorker.addEventListener("controllerchange", check);
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", check);
      });
      const update = () => registration.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && navigator.onLine !== false) update();
      });
      window.addEventListener("online", update);
      setInterval(() => {
        if (!document.hidden && navigator.onLine !== false) update();
      }, 30 * 60 * 1000);
      check();
    }).catch(() => {});
  }

  function init() {
    const actions = document.querySelector(".top-actions");
    if (!actions || document.getElementById("pwaInstallBtn")) return;
    installButton = document.createElement("button");
    installButton.id = "pwaInstallBtn";
    installButton.type = "button";
    installButton.className = "pwa-install-trigger";
    installButton.setAttribute("aria-label", "Install Same Same but Different as an app");
    installButton.title = "Install SSBD";
    installButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="18" height="18">
      <path d="M12 3v12m-5-5 5 5 5-5M5 17v3h14v-3" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="pwa-install-long">Install app</span><span class="pwa-install-short">Install</span>`;
    installButton.addEventListener("click", requestInstall);
    actions.insertBefore(installButton, actions.querySelector("#profileBtn") || null);
    updateInstallState();
    if (isPam()) registerPamWorker();
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    promptEvent = event;
  });
  window.addEventListener("appinstalled", () => {
    promptEvent = null;
    updateInstallState();
    if (sheet?.open) sheet.close();
  });
  matchMedia("(display-mode: standalone)").addEventListener?.("change", updateInstallState);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once: true});
  else init();
})();
