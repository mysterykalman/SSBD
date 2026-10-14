// Served as /mom-launch.js on the main page. The Mom Mode tile (link to /mom/, "Play Mom Mode →",
// Pam's portrait) is now rendered directly by renderHome in src/client/app.js and styled by the
// shared design system, so this script no longer patches the tile after it renders. It stays as an
// empty file so pages and service workers that still reference /mom-launch.js keep loading cleanly.
