// Odd One In should always leave to the real homepage, just like the other modes.
// The native mode currently closes its in-page layer; intercept its "Games" exits
// and make the destination explicit so no previous app state can reappear underneath.

document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const navGames = target.closest('[data-conn-nav="games"]');
  const endGames = target.closest(".conn-end-actions .btn");
  const isEndGames = endGames && endGames.textContent?.trim() === "Games";

  if (!navGames && !isEndGames) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign("/");
}, true);
