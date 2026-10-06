# Same Same but Different

A warm, playful word-connection game for kids and families. Two words appear;
each side picks one word that connects them; both words are revealed together
and become the next two prompts. Say the same word to win, within 20 moves.

See [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) for the product brief
and [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) for the verified acceptance matrix.

## Layout

```
src/shared/        Game logic shared by the browser and the server
  rules.js         Move state machine, duplicate rules, end states, seeded RNG
  words.js         Cleaning, comparison keys, validation, "Did you mean?" speller
  bot.js           Contextual Solo bot (scores candidates against both prompts)
  solo.js          Device-local Solo games (bot locks its word before you type)
  lexicon/         Curated English/French association graph + spelling vocabulary
src/server/
  api.js           Family-game API on Cloudflare D1 (schema unchanged)
  worker.js        Worker entry: API + embedded app shell
src/client/        Browser app (HTML, CSS, JS, service worker, manifest)
scripts/
  build.mjs        Builds dist/ (single-file worker + static mirror)
  dev-server.mjs   Runs the built worker on Node with SQLite standing in for D1
  d1-sqlite.mjs    Minimal D1-compatible wrapper over node:sqlite
test/              Unit + API integration tests (node:test)
test/e2e/          Real-browser tests (Playwright + Chromium)
migrations/        D1 schema (unchanged)
reference/         The compiled build that was in the repo before reconstruction
```

## Develop

Requires Node 22.5+.

```sh
npm install
npm test            # unit + API integration tests
npm run test:e2e    # builds, then runs browser tests (Solo, offline, family, layout, keyboard)
npm run dev         # build and serve on http://localhost:8787 with a local SQLite database
```

Set `CHROMIUM_PATH` if Playwright can't find a browser. Set `SHOTS_DIR=/some/dir`
to save layout screenshots during `npm run test:e2e`.

## Deploy

`npm run build` writes `dist/server/index.js`, a single-file Worker that
exports `{fetch}` and expects a D1 binding named `DB`. The app shell is
embedded in the worker; `dist/` also contains a static copy of the same files.
The D1 schema and existing data are untouched; the worker only runs the same
`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` statements as earlier
releases.

## Data and privacy

- Solo games are stored only on the device (`localStorage`, schema-versioned)
  and never call the API, so they work offline and do not sync.
- Family games are stored in D1. A player's word for the open move is never
  sent to the other player before both words are locked in.
