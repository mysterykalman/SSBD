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
  api.js           Family-game API (request/response contract unchanged)
  db.js            Postgres access: pooled query(), tx(), snapshot()
api/index.js       Vercel Function: every /api/* request
src/client/        Browser app (HTML, CSS, JS, service worker, manifest)
scripts/
  build.mjs        Builds the static app into dist/
  dev-server.mjs   Local server that mirrors Vercel (dist/ + vercel.json + api/index.js)
  postgres-local.mjs  Throwaway local PostgreSQL for development and tests
  smoke.mjs        Smoke check for a deployment: npm run smoke -- <url>
supabase/migrations/  Postgres schema for Family mode (apply once to Supabase)
vercel.json        Build, /api rewrite, SPA deep links, cache headers, function region
test/              Unit, API integration and race tests (node:test, real PostgreSQL)
test/e2e/          Real-browser tests (Playwright + Chromium)
reference/         The compiled build that was in the repo before reconstruction
```

## Develop

Requires Node 22.5+ and a PostgreSQL server installation (the tests and `npm run dev`
start a throwaway local cluster with `initdb`/`pg_ctl`; set `PG_BIN` if they are not
on the usual path, or `TEST_DATABASE_URL` to use an existing Postgres you can create
databases in).

```sh
npm install
npm test            # unit, API integration and race tests against real PostgreSQL
npm run test:race   # just the concurrency/idempotency tests
npm run test:e2e    # builds, then runs browser tests (Solo, offline, family, layout, keyboard)
npm run dev         # build and serve on http://localhost:8787 with a throwaway local database
```

`POSTGRES_URL=… npm run dev` uses that database instead (it never applies migrations
to it). Set `CHROMIUM_PATH` if Playwright can't find a browser. Set
`SHOTS_DIR=/some/dir` to save layout screenshots during `npm run test:e2e`.

## Deploy (Vercel + Supabase)

- **Frontend:** Vercel runs `npm run build` and serves `dist/` (see `vercel.json`).
  Deep links (`/games/…`, `/join/…`, `/solo/…`) are rewritten to `index.html`.
- **API:** `api/index.js` is a Vercel Function (Node.js); `vercel.json` sends every
  `/api/*` request to it. Its region is `cle1` (Cleveland, AWS us-east-2), next to
  the Supabase project.
- **Database:** Supabase Postgres. Apply `supabase/migrations/*.sql` once (Supabase
  SQL editor or `supabase db push`). The function reads one server-side variable:
  - `POSTGRES_URL` (required): Supabase's **pooled** connection string (Supavisor,
    transaction mode, port 6543). TLS is required.
  - `POSTGRES_CA_CERT` (optional): Supabase's CA certificate (PEM), to verify the
    server certificate as well as encrypt.
  No Supabase API keys are used, and nothing database-related reaches the browser.
- **Check a deployment:** `npm run smoke -- <url>` (read-only); add `--write` to also
  create a throwaway player and game. `VERCEL_BYPASS=<token>` passes Vercel's
  deployment-protection bypass header.

## Data and privacy

- Solo games are stored only on the device (`localStorage`, schema-versioned)
  and never call the API, so they work offline and do not sync.
- Family games are stored in Supabase Postgres, reachable only through the
  Vercel Function (RLS on with no policies, and no grants for the `anon` and
  `authenticated` roles). A player's word for the open move is never sent to the
  other player before both words are locked in.
