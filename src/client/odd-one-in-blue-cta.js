function applyOddOneInCtaColour() {
  const button = document.querySelector('[data-mode="connections"] .mode-actions .btn');
  if (!button) return;
  button.classList.add("sage");
}

new MutationObserver(applyOddOneInCtaColour).observe(document.documentElement, {childList: true, subtree: true});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyOddOneInCtaColour, {once: true});
else applyOddOneInCtaColour();
