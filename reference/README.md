# Reference build

`baseline-dist/` is the compiled output that was in the repository before the
source tree was reconstructed (issue #1). It is kept unchanged for comparison
until the rebuilt app is verified. Note it does **not** contain the v21
features described in `docs/CLAUDE_HANDOFF.md` (device-local Solo, service
worker, offline indicator): Solo there still runs on the server through D1.

The live app is built from `src/` with `npm run build`, which writes `dist/`.
