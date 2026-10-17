let oddOneInMusicActive = false;

function syncOddOneInMusic() {
  const active = document.body.classList.contains("conn-mode-open");
  if (active && !oddOneInMusicActive) window.SSBDAudio?.startGameMusic?.();
  oddOneInMusicActive = active;
}

new MutationObserver(syncOddOneInMusic).observe(document.body, {attributes: true, attributeFilter: ["class"]});
syncOddOneInMusic();
