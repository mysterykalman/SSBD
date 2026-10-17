// Solo is no longer presented as a beta anywhere in player-facing UI.
function removeSoloBeta() {
  document.querySelectorAll('.beta-badge').forEach(node => node.remove());
}

const observer = new MutationObserver(removeSoloBeta);
observer.observe(document.documentElement, {childList: true, subtree: true});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', removeSoloBeta, {once: true});
} else {
  removeSoloBeta();
}
