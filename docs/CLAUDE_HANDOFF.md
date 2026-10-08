# Same Same but Different: Claude Takeover Brief

## Mission

Finish and stabilize the kid-facing word-connection game currently published at:

https://same-same-but-different.ekalman.chatgpt.site

The product should feel warm, bright, playful, and lightly 1980s-retro while remaining modern, readable, and friendly on mobile, tablet, and desktop. Do not expose the acronym “SSBD” in the product UI.

## Current known baseline

- Latest confirmed published version: v21.
- v21 added device-local Solo games, saved rounds/language, resume after reopening, an offline indicator, cached app-shell behavior, offline-only Solo gating, and some bot/history fixes.
- The last full-audit attempt did not complete because the execution environment hit its usage limit. Treat v21 as the baseline, not as a fully verified release.
- The browser/live-game/offline-refresh flow still needs end-to-end verification.
- Offline Solo history is local to the device and does not sync to multiplayer data.
- Existing D1 data must be preserved.

## Core game rules

1. A game has up to 20 moves.
2. Each move has two prompt words.
3. In Solo, the screen starts blank except for the instruction and the player’s first input. No words may be pre-populated as if already played.
4. The player enters one word. The bot independently chooses its word.
5. Both words are revealed at the same time.
6. The two revealed words become the exact prompts for the next move.
7. A word may not be reused by the same side. A player may not submit the same word twice in a row.
8. The bot must not submit a word already used in the game and must not use the player’s current submission as though it had seen it before its own choice.
9. A round may end early if the two submitted words are the same. Otherwise it proceeds until move 20.
10. Every completed round must produce a valid next state or a clear end-of-game state. Never show “waiting for the other player” in Solo.

## Must-fix product issues

### Solo state integrity

- Fresh Solo game must have empty input and no fabricated prior words.
- Initial Solo bot word must be selected independently, then revealed with the player’s word.
- Subsequent bot choices must be contextually related to both prompt words, not merely a random word from a canned chain.
- Bot choices must vary between new games. Avoid repeating the same deterministic sequence.
- Bot must never repeat its own prior word or any word already used in the current game.
- Solo must never display multiplayer labels, join/wait messaging, player presence, or “Family game” status.
- New round must reset transient input while preserving only intentional game history.

### Multiplayer state integrity

- Both players enter words privately.
- Reveal happens simultaneously only after both submissions exist.
- Before reveal, do not show the other player’s word in history or current UI.
- The next prompt is exactly the two revealed words, in a stable order.
- Reconnect, refresh, and duplicate submissions must be idempotent.

### Word quality

- Reject blank, whitespace-only, overlong, or clearly invalid input.
- Normalize case and harmless punctuation without changing the displayed friendly form.
- Prevent duplicate words using normalized comparison.
- Add unobtrusive spell assistance: native spellcheck first, then a “Did you mean?” suggestion only when confidence is high. Never silently replace the player’s word.
- If a word is valid but unusual, allow it rather than blocking play.
- Use a curated, age-appropriate association set or scoring system so bot words make sense with both prompts.

### History

- Make the word combination visually obvious and fun: `WORD 1 + WORD 2 → WORD 3 + WORD 4`.
- Show player/bot labels only after reveal.
- Show username and date/time, or “Solo” and date/time, in a compact readable header.
- Keep move numbering and progress clear.
- Make current move visually distinct without excessive scrolling.

### Offline Solo

- Solo must work without network after the app shell and language data have been cached once.
- Starting, playing, refreshing, closing, and reopening a Solo game must work offline.
- Persist active game, history, language, and completion state in local storage/IndexedDB with schema versioning.
- Never make an offline Solo request depend on D1 or an API route.
- Clearly label offline status without alarming the player.

### Language

- English/French toggle must be visible, keyboard/touch accessible, and remembered between sessions.
- Switching language must update UI strings and the Solo word pool without destroying an active game unless explicitly confirmed.
- Do not pretend that arbitrary English/French multiplayer play is safely auto-translated. If cross-language multiplayer is implemented, keep original words visible, show the translation as secondary context, and use a reliable context-aware translation boundary.

### Responsive visual polish

- Kid-facing typography: large, rounded, friendly, high contrast, generous line height.
- Bright warm palette with playful retro accents, not corporate dashboard styling.
- Buttons must be large enough for touch and have obvious pressed, disabled, focus, success, and error states.
- Audit margins, padding, kerning, line wrapping, and card widths at narrow portrait mobile, landscape mobile, tablet, and desktop.
- Long words must wrap safely without breaking cards or causing horizontal scroll.
- Respect reduced-motion preferences while keeping feedback clear.
- Winning and round-complete animations should be short, celebratory, and never block input.

## Recommended implementation order

1. Add/verify a finite-state machine for Solo and multiplayer. Write transition tests before visual changes.
2. Fix Solo initialization, round transitions, bot selection, duplicate rules, and end states.
3. Add deterministic seeded test fixtures plus varied production randomness.
4. Add word normalization, validation, spell suggestions, and contextual bot scoring.
5. Verify persistence and offline behavior with network disabled and after refresh/reopen.
6. Fix responsive layout and kid-friendly visual system.
7. Add bilingual strings and language persistence.
8. Add notifications/toasts, animations, and accessibility states.
9. Run full browser smoke tests on mobile-sized, tablet, and desktop viewports.
10. Publish only after the complete acceptance matrix passes.

## Acceptance test matrix

- Fresh Solo: blank start, submit one word, bot responds, simultaneous reveal.
- Solo moves 1–20: every next prompt equals the prior reveal; no duplicate bot words; varied but sensible bot choices.
- Solo refresh: active move and history survive refresh; no multiplayer UI appears.
- Offline Solo: disable network, start new game, play several moves, refresh, reopen, complete game.
- Multiplayer: create, join, both submit, simultaneous reveal, next prompt correctness.
- Duplicate attempts: same player repeated word blocked with friendly explanation.
- Invalid input: blank, whitespace, punctuation-only, too-long, and misspelled cases behave safely.
- Language: English/French switch persists, active game is not silently corrupted.
- Responsive: 320px portrait, 667px landscape, tablet, and desktop; no overflow or clipped controls.
- Accessibility: keyboard navigation, visible focus, screen-reader labels, reduced motion, contrast.
- Notifications: success/error/offline/reconnect messages are readable, dismissible, and non-blocking.

## Multi-agent plan for Claude

Use multiple focused agents to reduce repeated context and credit use. Give each agent a disjoint write scope and require tests plus a changed-file list.

### Agent 1: state-machine and rules

Own game state, Solo/multiplayer transitions, round boundaries, duplicate rules, and end states. Add unit tests. Do not change visual CSS.

### Agent 2: bot and word quality

Own word normalization, curated word data, contextual scoring, seeded test fixtures, bot variety, duplicate prevention, and spell suggestions. Do not change persistence or layout.

### Agent 3: offline and persistence

Own service worker/app-shell caching, local persistence, schema migration, refresh/reopen behavior, and offline error handling. Do not change game rules.

### Agent 4: UI and responsive design

Own typography, retro palette, component states, responsive breakpoints, history presentation, and animations. Do not change game logic.

### Agent 5: localization and accessibility

Own English/French strings, language persistence, keyboard support, labels, reduced motion, and contrast. Do not rewrite state logic.

### Agent 6: verification

Run the acceptance matrix in a real browser at mobile, tablet, and desktop sizes, including offline mode. File concrete defects and verify fixes. This agent should not make broad refactors.

### Integrator agent

Merge in dependency order: state machine → bot/data → persistence/offline → UI → localization/accessibility → verification. Resolve conflicts manually, run the full test suite, and publish one release only after all acceptance tests pass.

## Claude operating instructions

- Do not claim completion without browser evidence.
- Do not publish an intermediate build as the final release.
- Preserve D1 schema/data and existing multiplayer records.
- Keep Solo fully local and functional offline.
- Prefer small, reviewable commits.
- Use one shared acceptance checklist and mark each item with evidence.
- If a requirement is ambiguous, preserve the player’s words and make the UI explain the state rather than guessing silently.

## Suggested first prompt for Claude

“Take over this repository using `docs/CLAUDE_HANDOFF.md` as the source of truth. First inspect the current code and run the existing tests. Then delegate the disjoint workstreams to multiple agents as described in the handoff. Do not publish until the full acceptance matrix passes in a real browser at mobile, tablet, desktop, and offline Solo conditions. Report exact files changed, tests run, browser scenarios verified, and the final deployment URL.”




---

## Status update: reconstruction, rework and verification (2026-10-07)

Takeover work on branch `claude/confident-edison-75ygtk` (issue #1). The brief
above is unchanged; this section records what was built, why, and how it was
verified.

### What was found
- **Compiled output only.** The repository held only compiled output, with no
  source, manifest or tests.
- **Not the v21 the brief describes.** That output did **not** contain the v21
  features above: no service worker, and Solo still ran on the server through
  D1.
- **Original kept.** It is preserved unchanged in `reference/baseline-dist/`
  (see `reference/README.md`).
- **Baseline defects:**
  - The Solo bot received the player's current word, which leaked it and made
    matches nearly impossible.
  - Family games sent the other player's word for the open round.
  - Concurrent final submissions could collide.

### Reconstructed source (all new)
| Area | Files |
|---|---|
| Tooling | `package.json`, `package-lock.json`, `eslint.config.js`, `jsconfig.json`, `.gitignore` |
| Shared game logic | `src/shared/rules.js` (move state machine), `solo.js` (device-local Solo), `bot.js` (contextual bot), `words.js` (cleaning, keys, validation, speller), `types.js` (JSDoc types), `lexicon/{data,vocab,index}.js` |
| Server | `src/server/api.js` (family games), `db.js` (Postgres access); `api/index.js` (Vercel Function); `vercel.json`; `supabase/migrations/` |
| Client | `src/client/index.html`, `styles.css`, `app.js`, `i18n.js`, `store.js`, `sw.js`, `diagnostics.js`, `manifest.webmanifest`, `icons/` (favicon and app icons) |
| Scripts | `scripts/build.mjs` (writes the static `dist/`), `dev-server.mjs` (mirrors Vercel locally), `postgres-local.mjs` (throwaway PostgreSQL), `smoke.mjs` (deployment check) |
| Tests | `test/*.test.mjs` (unit and API integration), `test/e2e/*.test.mjs` (Playwright, Chromium) |
| Docs | `README.md`, `docs/ACCEPTANCE.md`, this section, `reference/README.md` |

`dist/` is generated by `npm run build` and committed as the deploy artifact.
Never edit it by hand.

### Game rules as implemented
- **Moves.** Up to 20 moves. Move 1 starts blank; the instruction and the input
  are the only things on screen.
- **Revealing.** Each side locks one word. Both words are revealed together and
  become, in slot order, the exact prompt pair for the next move.
- **Ending.** The same underlying word is a match and ends the game at once,
  with no next round. That covers the identical word (ignoring case, accents,
  spaces, hyphens and apostrophes) and ordinary grammatical inflections: CAR/CARS,
  CHILD/CHILDREN, MOUSE/MICE, RUN/RUNNING/RAN, WRITE/WRITTEN, WALK/WALKED,
  BIG/BIGGER. Synonyms, related words and derivations are different answers, and
  the game continues with them as the next pair: CAR/VEHICLE, COUCH/SOFA, RUN/JOG,
  BAKE/BAKER, HAPPY/HAPPINESS, SNOW/SNOWMAN. Move 20 without a match ends in a
  friendly "Game over!".
- **Showing the words.** The reveal always shows both words exactly as typed. An
  inflected match gets playful copy: "Plural schmural. Same same!" or "Close
  enough. Same same!".
- **Player duplicates.** A side may not reuse its own words, including their
  inflections ("car" then "cars"): `SAME_AS_LAST`, `ALREADY_USED`. The other
  side's words are allowed.
- **Bot duplicates.** The bot never reuses any game word, or any inflection of
  one.
- **Bot independence.** The bot locks its word when a move opens, before the
  player types. It submits exactly one word per round and is deterministic per
  game (a refresh never re-rolls it).

- **Validation.** Blank, punctuation-only, digits and symbols are refused, as
  are words over 24 letters and phrases over 3 words. **One-letter words are
  allowed.** A word is never silently changed.
- **Speller.** Native spellcheck is on. A "Did you mean?" suggestion appears only
  for typical slips (swapped, missing, doubled or sound-alike letter) and never
  replaces the player's word.

### How "same underlying word" is decided (`src/shared/morph.js`)
- **Deterministic, no AI judgement.** Each answer maps to a small set of possible
  base forms; two answers match when the sets overlap. The same input always gets
  the same ruling.
- **How the base forms are built:**
  - irregular tables (children → child, mice → mouse, ran → run, written → write,
    better → good; French yeux → œil)
  - suffix rules (-s/-es/-ies/-ves plurals, -ing, -ed; French plurals,
    feminine forms and regular -er verbs)
- **Guards against over-matching:**
  - A suffix rule fires only when the result is a known word (lexicon plus
    spelling vocabulary), so "baker" never becomes "bake" and "evening" never
    becomes "even".
  - Comparatives (-er/-est) apply only to a curated adjective list.
  - A short exception list keeps words like *glasses*, *building* and *morning*
    as words of their own.
- **Known limits:**
  - Words outside the vocabulary only lose a plural "s".
  - Irregular verbs not in the table aren't recognised.
  - Ambiguous forms resolve generously: "leaves" matches both "leaf" and
    "leave".
  - Plural-only nouns ("glasses" the spectacles, "news") never match their
    singular.
  - Ambiguous irregulars are read one way. "Left" is the direction (it never
    matches "leave"). "Saw" matches "see", but "saws" is only the tool.
  - Derivations never match ("runner" ≠ "run").
  - French verb conjugation is only covered for regular -er verbs.

### How the bot chooses (`src/shared/bot.js`)
- **Goal.** The word an ordinary person, including a child, would most likely
  think of after seeing these exact two words.
- **Per-side scoring.** `rankCandidates` scores every candidate against each
  prompt separately:
  - a common phrase or compound: 0.95 to 1.0
  - named in the prompt's own curated list: 0.9
  - the candidate's list names the prompt: 0.8
  - three or two shared neighbours: 0.55 or 0.45
  - one shared neighbour: 0.25
  - a common tag only: 0.1
- **Hard rule.** Both prompts must independently reach
  `BOT_TUNING.minPerSide` (0.45), or the candidate is rejected. A strong link to
  one word never makes up for a missing link to the other.
- **Ranking:** 0.40 × weakest side, 0.30 × human likelihood (curated
  first-associations and familiarity), 0.15 × average, 0.10 × obviousness,
  0.05 × novelty.
- **Penalties:**
  - Recency, by concept: last round is rejected; two rounds ago −0.25; 3–5
    rounds −0.12; 6–8 rounds −0.05.
  - Answers built on a prompt word ("snow" for "snowman"): −0.25.
- **Choosing.** A weighted pick among the best few (55/30/15, all within 85% of
  the top score), so it stays coherent but isn't predictable.
- **Both words, always.** Relating to both prompts is an invariant, not a
  preference. When nothing reaches tier 1, the bot moves down a bounded ladder.
  Every tier requires a relationship to each prompt on its own, and no tier
  accepts a "lopsided" candidate: one that is direct to one word (≥ 0.8) but
  under 0.45 for the other, which is the FACE-for-SOCKS + EYE pattern.
  - **Tier 2:** both sides ≥ 0.25 (a shared neighbour or better), with the
    weaker side at least half the stronger.
  - **Tier 3:** both sides ≥ 0.25, with the weaker side at least 45% of the
    stronger.
  - **Tier 4:** both sides at least share a category, the weaker side at least
    25% of the stronger, and no direct side.
  - **Tier 5:** balanced two- and three-step paths from each prompt (none
    through the other prompt).

  Fallback picks are labelled "loose" ("Gary stretched a little").
- **Measured on 3,000 random pairs per language:**
  - Tier 1 handles 28%, tier 2 62%, tiers 3–4 7%.
  - Zero lopsided picks.
  - About 2.5% of random pairs have no meaningful two-sided word anywhere in the
    curated data (KING + CRY, BATTERY + CREAM). There Gary uses the balanced
    tier-5 bridge, the only option that keeps both the "one word per round" and
    "never one-sided" rules. A test checks that this only happens when tiers 1–4
    are empty. Adding curated links is what shrinks it further.
- **The single exception.** If a prompt means nothing to the game's vocabulary
  (nonsense such as "zorblax", or a lone letter), no relationship to it can
  exist, so the bot answers from the known prompt. The bot first tries base forms
  ("snowmen") and confident spelling fixes ("freind" → friend).
- **No special cases.** There is no pair-specific logic anywhere. PAIR (socks +
  eye, boots + glasses, shoe + ear) and SLED (winter + snowman, hill + snow) come
  out of the general scoring over the curated links. A test also checks that
  `bot.js` names none of these words.
- **Tuning.** All weights live in `BOT_TUNING`, so a future difficulty setting
  can adjust them.
- **Examples:**
  - WINTER + SNOWMAN → scarf, cold or sled
  - SNOW + SCARF → winter, cold or mitten
  - FABRIC + MITTEN → scarf, wool or glove
  - SOCKS + EYE → pair (never "face")
  - COLD + HAIR → hat (never "snow")
  - HAND + GLOVE → finger or mitten

### The "s" bug: root cause and fix
- **Cause 1:** `validateWord` in `src/shared/words.js` rejected any word shorter
  than two letters (code `TOO_SHORT`), so "s", "a", "I" and "é" were refused.
- **Cause 2:** the rejection message sat *below* the Lock button. On phones it
  was off-screen or behind the on-screen keyboard (reproduced at 390×844 and
  320×640), so the submission looked silently ignored.
- **Fix:**
  - One-letter words are allowed (`MIN_KEY_LENGTH = 1`), with the same
    duplicate rules.
  - Feedback now sits directly above the input, scrolls into view, and is tied
    to the input with `aria-describedby`/`aria-invalid`.
  - `src/client/diagnostics.js` traces each submission: raw, trimmed and
    normalised value, validation and duplicate result, button state, Enter or
    button, result and reason. It runs only with `?debug=1`,
    `localStorage.ssbd_debug = "1"`, or in automated browsers, and is never shown
    in the UI.

### Reveal flow (single state transition)
- **Sequence:** SUBMIT → COUNTDOWN (3, 2, 1, "Same time!") → REVEAL → **Keep
  playing** → NEXT TURN, all in one modal (`#revealModal`, created per reveal and
  then removed).
- **Phases:** exposed on `#app[data-phase]`, in the order playing, countdown,
  revealing, ready, then playing again or gameOver.
- **Saved immediately, shown later.** The revealed move is saved to game state
  and storage at once (the pending pair). The board, word trail and progress
  trail keep rendering `boardView()`, the turn as it was before the reveal (the
  current pair).
- **Keep playing promotes it.** Only Keep playing marks the reveal seen and
  promotes the pair, exactly once.
- **Interruptions:**
  - A refresh mid-reveal replays the reveal.
  - A seen reveal never replays.
  - Escape works only once the reveal is ready.
  - Reduced motion skips the countdown.
- **Endings.** On a match or at move 20, the final reveal shows first, then
  Continue leads to the ending. Focus lands on the ending heading, not on Play
  again, so a doubled Enter can't skip it.

### Gary from Accounting (Solo opponent)
- **What he is.** Gary is the Solo opponent's presentation layer
  (`src/client/gary.js`). The word engine (`src/shared/bot.js`) still chooses
  every word, deterministically and independently of the player.
- **Presentation only.** Gary's lines never touch game state, storage of games,
  scoring or the network. Tests check this: `gary.js` imports nothing from
  `shared/`, `store.js` or the API, and the saved game holds no Gary data.
- **Identity.**
  - "GARY'S WORD" in the reveal; "GARY" on trail chips.
  - An SVG badge in the mode chip and game list, drawn in the app's own palette:
    ink outlines, peach, coral nose, grape tie.
  - Never "bot", "online", "joined", or "typing…".
  - Family games never show Gary.
- **Intro.** "MEET YOUR RIVAL / Gary from Accounting / Hi. I'm Gary. I do words
  now. Apparently. / sigh 😑 / Fine, Gary. Let's play." It shows once, on the
  first Solo game (`localStorage.ssbd_gary_met`). Reopen it via the profile badge
  → "Meet Gary again".
- **Typing.** His word is typed in letter by letter: 50–90 ms each, capped near
  0.9 s. The chip is pre-sized so nothing shifts. Screen readers get the whole
  word at once, and there is a single announcement after the reveal completes.
  Reduced motion shows everything at once.
- **Remarks.** On about 30% of ordinary reveals Gary adds a short remark, before
  or after his word, drawn from the resigned, competitive, dramatic and minimal
  pools. Recent lines are not repeated (per game, session storage).
- **Special moments.**
  - A match: "..." then "well that's inconvenient" or "fine. you win this one 😑"
    (70%).
  - Rare one-offs around move 10 and near move 20.
  - Solo game over: "finally", then after a beat "...same time tomorrow?".
- **French.** Dry and simple; "Je fais des mots maintenant. Apparemment." keeps
  the odd phrasing.

### UI changes
- **History.** Newest first, with a separate "Now playing" row for the open
  round. It shows only your own locked word; the other side stays "?". Each row
  reads `A + B → C + D`.
- **Progress.** The striped bar is gone. 20 stepping stones (✓ played, numbered
  current, outlined future), labelled "Move N of 20" and "N moves to go". It is a
  semantic `progressbar` with value text, and the stones light up as a finale.
- **Game over.** A sleepy token that droops and yawns, then rests, with warm copy
  ("Game over! You made it through all 20 moves!") and Play again, Return home
  and View history. A match gets confetti.
- **Tone.** "Different, so keep going" is now "Nice connection! The trail
  continues." All copy is reviewed and localised (French in the "tu" register).
- **Badges.** Players are circular first-letter badges (accent-aware); the bot
  is "B" in English and "R" in French. No emoji avatars.
- **Layout.** Connectors are in normal flow and glued to the next word. Overlap
  checks run at 4 viewports and at doubled text size.

### Copy and presentation updates (latest)
- **Homepage.** The copy is now a quick premise ("Try to read each other's minds. No pressure. Just your entire friendship.").
  - **Play Solo** gets the cake joke, a "Play Gary" button and "Plays offline too. Fancy.".
  - **Play Together** gets "Time to investigate." and the buttons "Start a game" and "Join a game".
  - **Your games** shows "Nothing here yet. Suspiciously peaceful." when empty.
  - All of it is in English and French.
- **No emoji in interface copy.** That includes Gary's lines. Visual personality comes from the illustration, colour and badges. The ✓ and ★ marks inside the progress stones and the win badge are drawn marks in designed components, not emoji in copy.
- **Inflected matches look like exact wins.** Each player sees their own typed word on both sides of the reveal, the win screen and the trail, so VEGETABLES/VEGETABLE never reveals a difference. The stored submissions keep the words exactly as typed, and the matching rule is unchanged.
- **Family name entry: root cause.** The server inserted rows by position (`INSERT INTO players VALUES(?,?,?,?,?)`). Against a production table that carries an extra column from an earlier release, every insert failed. The error was then swallowed by a retry loop meant for recovery-code collisions and returned as an untranslated code, so the player saw the generic "Oops! That didn't work."
  - Every INSERT now names its columns.
  - Only real collisions are retried, and real errors are logged.
  - Player create, game create and join failures each have their own friendly message, and a join failure is no longer mislabelled as "game full".

### Notifications
- **What's covered.** In-app only, for family games: your turn, reveal ready,
  player joined, match, game complete, rematch.
- **Storage and dedupe.** Read and unread state is kept in Postgres
  (`notifications.read_at`). Ids are deterministic and inserted with
  `ON CONFLICT DO NOTHING`, so retries, races and refreshes never duplicate.
- **UI.** A bell with an unread count (not colour alone). The panel has loading,
  empty and error/retry states. Opening an item marks it read; "Mark all as
  read" is there too.
- **Never shown for Solo**, and hidden offline.
- **No phone or browser push.** True push needs a push service and keys this
  runtime does not provide, so it was not faked.

### Family games and data
- **Schema.** `supabase/migrations/20261007150000_family_games.sql`: the same six
  tables and columns as the D1 releases, plus `notifications.seq`. Rows shaped
  like older releases (uppercase words, UUID round ids, `COMPLETE` statuses,
  legacy `BOT` members) load unchanged and are covered by tests.
- **Privacy.** The other side's word is never sent before both words are in, in
  `GET /api/game`, submit, dashboard, notifications or errors (a leak scan over
  4 moves checks this).
- **Robustness.**
  - Submissions are idempotent.
  - Stale and duplicate requests return the current state.
  - Concurrent final submissions reveal exactly once.
  - An interrupted reveal finishes on the next read.
  - A submission that can't be confirmed returns `NOT_SAVED` instead of success.
- **Rematch.** `POST /api/games/rematch` is idempotent: one rematch per finished
  game, the same players and language, a fresh state.

### Offline Solo
- **Caching.** A versioned app-shell service worker precaches the shell. The API
  is never cached. Navigations are network-first (cached shell only offline), and a
  new worker takes over at once and deletes older caches (see "Service-worker
  updates" below).
- **Storage.** Solo lives only on the device (`localStorage`, schema-versioned)
  and never calls the API. Old data is migrated or backed up, never dropped.
  Saves merge safely across tabs, and the active game is never pruned.
- **Verified offline:**
  - start a new game, play many moves, refresh, close and reopen, complete it
  - one-letter words
  - moves 19 and 20, with no move 21 after game over
  - language persistence
  - family features disabled, with a friendly explanation

### Tests run (final)
Final run on the last commit of the branch:

- `npm run build`: OK.
- `npm run lint`: clean.
- `npm run typecheck` (tsc, checkJs strict on `src/shared`, `src/server` and
  `src/client/store.js`): clean.
- `npm test`, unit and API integration: **140/140 pass**.

  | File | Tests |
  |---|---|
  | rules | 21 |
  | solo-rules | 14 |
  | solo | 12 |
  | words | 6 |
  | lexicon | 18 |
  | api | 21 |
  | api-integrity | 21 |
  | store | 17 |
  | i18n | 10 |

- `npm run test:e2e` (Playwright, Chromium): **55/55 pass**. The suites are
  `reveal`, `solo`, `offline`, `family`, `input`, `a11y`, `layout` and
  `visual`.

Reveal regression coverage (`test/e2e/reveal.test.mjs`):

- **Frozen-board monitor.** An in-page MutationObserver checks every DOM
  mutation while the modal is open. It fails if the pending pair is on the board
  or in the trail, if the move counter or progress stones move, if a trail row is
  added, or if countdown content is still visible during the reveal.
- **The monitor really fails.** Deliberately disabling the freeze makes both
  core tests fail.
- **The two tests you specified:**
  - "When the reveal modal is open, the pending next pair is not rendered in the
    active game card"
  - "After Keep playing is pressed, the modal disappears and the pending pair
    becomes the active pair exactly once"
- **Full 20-move Solo games at 390×844 and 1280×860.** Each reveal is checked
  for the modal staying inside the viewport, no overlapping parts, "A + B" kept
  on one line, countdown removed, and no horizontal overflow. After that come the
  final reveal, then game over, a refresh, and Play again.
- **Other cases:** a match then the win, one-letter "s", refresh mid-reveal,
  Escape, French copy, reduced motion, family games (both players), and long
  words.

Root causes fixed during final verification (each with a regression test):

- **Reveal test timeout (test bug).** The test reused the same player word,
  which the game correctly rejects as same-as-last. It also leaked
  MutationObservers between moves.
- **Intermittent keyboard-language failure (real app bug).** The 30 ms re-focus
  after starting Solo pulled focus away from a control the player had just moved
  to.
- **Older suites.** These were migrated to the modal flow without weakening
  assertions (8 old-flow assertions replaced, 47 added).

### Browser scenarios verified
Every scenario below ran in Chromium against `scripts/dev-server.mjs` (static
`dist/`, the `vercel.json` routes, `api/index.js`) on a real local PostgreSQL.

- **Viewports:** 320×640, 390×844, 667×375 (landscape), 768×1024, 1280×800 and
  1280×860, in EN and FR, plus 200% text size.
- **Solo:**
  - a blank start
  - bot independence (a locked word is never re-rolled by refresh or by what
    the player types)
  - the reveal modal flow
  - full 20-move games, then game over, then Play again
  - a match and the win
  - duplicate and invalid input, one-letter words, and suggestions that never
    auto-replace
- **Offline Solo** (network off after one cached visit):
  - new game, many moves, refresh, close and reopen, moves 19 and 20, game over
  - one-letter words
  - French
  - zero `/api/` requests
  - family features disabled
- **Family games:**
  - create, join by code and by link, private words (leak scan of HTML, storage
    and API), simultaneous reveal for both players, next prompt in a stable
    order
  - refresh while locked, double-submit idempotency, a third player refused
  - match, rematch, notifications (unread and read, no duplicates)
- **Accessibility:**
  - keyboard-only play, visible focus, labelled dialogs and progress, one live
    announcement per reveal
  - reduced motion, WCAG AA contrast (including the modal), touch targets of at
    least 44px
- **Visual:** overlap checks for chips, connectors, badges, stones, buttons and
  the modal at every viewport, with short, long, accented and one-letter words.
- **Reviewed by eye:** screenshots at 390×844 and 1280×860 of home, Solo start,
  countdown, reveal, next turn and game over.

### Known limitations
- **No release or deployment.** Nothing has been promoted to production. The
  Supabase migration has not been applied from here (see "Backend" below).
- **Browsers covered.** Verification ran in Chromium only. iOS Safari, Firefox,
  real touch devices and real screen readers are untested.
- **Push notifications.** None (see above).
- **Solo stays on the device.** Solo history does not sync between devices, as
  intended. Solo games played on the server by older releases are still playable
  but are not moved to the device.
- **No translation in family games.** Words are shown as typed.
- **Fallback bot picks.** When nothing in the data links both prompts, the bot
  falls back to a word tied to one prompt. These picks are labelled "the bot
  stretched a little".
- **Very large text.** At 200% text size on a 320px phone, long words break
  mid-word. Nothing overlaps or scrolls sideways.
- **Rejected third player.** A third player trying to join a full game still
  gets a browser console log of the expected 409.

## Backend: Vercel Functions + Supabase Postgres (latest)

The Cloudflare Worker and D1 were replaced. Nothing Cloudflare- or D1-specific remains
(`worker.js`, the embedded-asset build, the D1 shim and the old `migrations/` are gone).

- **Shape.** Vercel serves the static `dist/`. `vercel.json` rewrites `/api/*` to the
  function in `api/index.js` (Node.js, region `cle1` next to Supabase `us-east-2`) and
  deep links to `index.html`. The function calls the same `handleApi()` as before, so
  every route, request body and response shape is unchanged. Solo never calls it.
- **Database access.** `pg` with a small pool, from the server-side `POSTGRES_URL`
  (Supabase's pooled, transaction-mode connection string). No named prepared
  statements (the transaction pooler does not support them). TLS is required; the
  optional `POSTGRES_CA_CERT` adds certificate verification. No Supabase API keys.
- **Migration.** `supabase/migrations/20261007150000_family_games.sql`. Additive and
  idempotent. RLS is enabled on all six tables with no policies, and all grants are
  revoked from `anon` and `authenticated`, so Supabase's Data API cannot read or write
  game data. The function connects as the owner. `game_players.player_id` and
  `submissions.player_id` have no foreign key, because legacy Solo games use the
  `BOT` sentinel.
- **Concurrency (Postgres runs requests in parallel, D1 did not).**
  - Every multi-statement write is one transaction (`store.tx`).
  - Duplicate-safe inserts use deterministic keys and `ON CONFLICT DO NOTHING`
    (submission per player per round, next round `${game}:${n}`, notification ids,
    rematch id derived from the finished game).
  - A submission is committed on its own; only then is the game re-read, as one
    REPEATABLE READ snapshot. Whichever of two simultaneous submissions commits
    second always sees both words. "Save + read + reveal" in one transaction would
    lose reveals (each request would see only its own word); a mutation test
    confirms the race tests catch exactly that.
  - Reveal progress is gated on `UPDATE rounds … WHERE status = 'OPEN' RETURNING`;
    only the request that closed the round opens the next one and notifies.
  - Joins lock the game row (`FOR UPDATE`); `UNIQUE(game_id, slot)` is the backstop.
  - Join-code and recovery-code collisions use `ON CONFLICT DO NOTHING RETURNING`
    and retry with a new code, so a collision never aborts the transaction.
  - Mark-read is one `UPDATE … WHERE read_at IS NULL`; the first read time is kept.
- **Unavailable state.** If `/api/*` answers without JSON, or with `NO_DATABASE`,
  `DB_UNAVAILABLE` or `SCHEMA_MISSING`, Play Together shows "Playing together is
  taking a break right now. Solo still works." with a Try again button (EN/FR).
  `/api/health` returns `{ok, db}` and reports a missing schema.
- **Tests.** Unit, API and race tests run against a real local PostgreSQL 16 (one
  throwaway cluster per test file, a fresh migrated database per test), or any
  Postgres in `TEST_DATABASE_URL`. Race tests use two independent connection pools
  (like two function instances) and check the database directly.
- **Setup still needed (not done from here):** apply the migration to the
  Supabase project; set `POSTGRES_URL` (pooled) for Preview and Production in Vercel;
  then `npm run smoke -- <preview-url> --write`.


## Gary plays to converge (latest)

Gary's objective is semantic convergence: predict what the human will type for the two words on
the table and pick the word most likely to make both players say the same thing, now or on the
next move. "Relates to both words" is only the entry ticket.

- **Two separate models** (`src/shared/bot.js`):
  - *Candidates*: words that relate to both prompts (the existing tiers and the both-sides
    invariant are unchanged).
  - *Predicted human answers*: a probability list built differently: both words must bring the
    answer to mind (geometric mean of first-thought strengths, from the curated, ordered link
    lists), a category both words belong to is the strongest signal, everyday words beat rare
    ones, sideways swaps are halved, the trail theme nudges by up to 25%.
- **Ranking** (`BOT_TUNING.weights`): 50% similarity to the predicted human answers, 30% fit to
  both words (weaker side counts most), 15% semantic centre (balance between the two words plus
  the theme of the last three rounds of the trail), 5% personality (random, so it only ever breaks
  near-ties). The top-ranked candidate wins; no more 55/30/15 lottery.
- **Sideways swaps** (SISTER → BROTHER, DOG + CAT → MOUSE: another member of the same category
  that the other word doesn't suggest) count for less in both models. A category both words share
  is never sideways.
- **Lexicon**: an explicit "is a kind of" table (`CATEGORIES` in `lexicon/data.js`, e.g. family,
  pet, weather, fruit, colour, season, clothes; broad ones like animal/food weigh less), plus
  missing everyday words (wife, husband, relative, parent, child, kid, son, daughter, aunt, uncle,
  cousin, pretend, education, learn, lesson, fog).
- **Before → after** (200 seeds each): WIFE+BROTHER family/mom/sister → FAMILY; DOG+CAT
  tail/paw/fur → PET (animal ~20%); RAIN+SNOW boots/storm/cloud → WEATHER; SCHOOL+TEACHER
  book/read/class → EDUCATION (class next); SISTER+PLAY brother 100% → KID; BED+TIRED → SLEEP,
  APPLE+BANANA → FRUIT (already right, now deterministic).
- **Diagnostics (developer mode, required)**: `chooseResponse({…, explain: true})` returns the
  full decision: current pair, trail words, predicted human answers (with probabilities and why),
  the top candidates with every score part, the selected word and the reason. In the app, Solo
  records it per move when developer mode is on (localhost, `?debug=gary`, or
  `localStorage.ssbd_debug_gary = "1"`), shows a "Gary's decision" panel under the trail for the
  latest *revealed* move (never before the reveal), logs a collapsed console group per decision,
  and keeps `window.__garyDecisions`. Players and automated browsers never see it unless they opt
  in, and nothing extra is stored otherwise. Diagnostics never change Gary's word (tested).
- **Tests**: `test/convergence.test.mjs` checks the selection over 200 seeds, the predicted human
  answers and the ranking itself for WIFE+BROTHER, DOG+CAT, RAIN+SNOW, APPLE+BANANA, BED+TIRED,
  SCHOOL+TEACHER (tangential words like PLAY, TAIL, BOOTS, BOOK must rank well below the centre),
  SISTER+PLAY, sideways swaps, French, the bounded influence of the trail, the diagnostics shape
  (every score equals its documented weighted sum) and Solo recording. `test/e2e/gary-debug.test.mjs`
  checks the panel and that players never see it.

## Service-worker updates (latest)

The preview could show an older app shell, and the "A new version is ready" Reload could land on
stale content. Causes found in the previous worker and page:
- **Navigations were cache-first, forever.** Every in-app page was answered from the cached shell,
  so a fresh visit to a newer deployment showed the old frontend until the update flow finished.
- **Reload could activate nothing.** The banner was bound to the first new worker it saw. If
  another deploy landed first, that worker became redundant, and Reload just reloaded under the
  old active worker, which served the stale shell again.
- **Open tabs never checked for updates** on their own.

Now (`src/client/sw.js`, `registerServiceWorker` in `src/client/app.js`):
- Navigations (`/`, `/games/…`, `/join/…`, `/solo…`) are network-first with a 4 s timeout; the
  cached shell answers only when the network fails or hangs (offline Solo keeps working).
- A new worker calls `skipWaiting()` on install, `clients.claim()` on activate, and deletes every
  other `shell-*` cache. Safe because the app is one script and one stylesheet loaded at start-up.
- The page knows its own build (`<meta name="app-version">`, stamped by `scripts/build.mjs`). When
  the worker in control serves a different build, the open tab offers "A new version is ready";
  Reload activates any waiting worker first, then reloads (a network-first navigation, so always
  the newest shell). A page that is already current never gets the offer.
- Tabs call `registration.update()` when they become visible, come back online, and every 30 min.
- `/sw.js` is sent with `Cache-Control: no-store` (vercel.json) and registered with
  `updateViaCache: "none"`; `/api/*` is never intercepted or cached.
- Tests: `test/e2e/sw-update.test.mjs`: the real previous release (its cache-first, waiting
  worker, from git) followed by this deployment; a newer deployment seen by a fresh visit and by an
  open older tab's Reload; the worker never caching `/api/*` and Family mode using the live API.
  Putting cache-first navigation back makes the fresh-visit test fail.


## Convergence validation pass (latest)

Objective restated: "what is the player most likely to type?", not "which word forms the cleanest
semantic relationship?". The validation found the first convergence model still leaned structural:

- **SISTER + PLAY → KID 100% was structural.** Breakdown (old model): KID human 1.00 / fit 0.90
  (sister 0.90, play 0.90) / centre 0.55; GAME human 0.80 / fit 0.54 (sister 0.45, play 0.90) /
  centre 0.28; no trail, no penalties, no sideways flags. Two causes:
  1. The human model used a geometric mean of the two first-thought strengths, which itself rewards
     balance. Replaced by *generate-and-check*: a strong first thought of either word, kept if the
     other word finds it at least plausible (`plausible: 0.3`); zero if the other word doesn't
     suggest it at all.
  2. The human term counted every *related* predicted answer at 45% of an exact match, so a word
     sitting near several predictions beat the likeliest one. Now an exact match counts fully and
     closeness counts at `nextTurn: 0.4` × similarity.
  With those, GAME has the highest human likelihood (0.26 vs KID 0.13) but still lost on fit +
  centre, so structure is now strictly secondary: weights human 0.70 / fit 0.15 / centre 0.10 /
  personality 0.05, and only candidates within `humanMargin: 0.1` of the likeliest answer (after the
  game's own penalties) can win. Result: GAME (FAMILY next, near-tie).
- **Variability source.** Personality drew a fresh random number per game (the game's hidden seed),
  so identical visible states could flip near-ties (PET/ANIMAL, FAMILY/RELATIVE). Personality is
  now a hash of the complete state (language, pair, trail, used words). Same state → same word.
- **Convergence distance.** Each candidate carries `after`: expected word-graph hops (links,
  phrases, categories; capped at 4) from the word to the predicted human answer. `before` is the
  distance between the two words on the table. Shown in the diagnostics.
- **Diagnostics** add "Why #1 beat #2" (weighted per-term differences, e.g. "GAME beat FAMILY by
  +0.041 because human-likelihood +0.035 and personality +0.024 outweighed FAMILY's dual-word fit
  advantage 0.015 and semantic centre advantage 0.003"), the convergence distance, and a contender
  mark per candidate.
- **Tests** (`test/convergence-validation.test.mjs`, general samples, no hand-picked expectations):
  fixed-state determinism (17 states × 200 seeds), contextual variation (200 simulated trails per
  pair), convergence distance (Gary within 0.25 hops of the best eligible move on 100% of ~170
  sampled turns; a structure-only policy fails the same bar), human first (structure never overturns
  a human-likelihood lead above 0.1).
- **Older tests changed** because they encoded the structural objective: the "directly linked to
  both" share in the lexicon quality test is now a 75% sanity floor (it was 85%; human-first picks
  like GAME for SISTER + PLAY are a strong first thought of one word that plausibly fits the other),
  and the POMME + TERRE phrase test now checks VER's phrase strength in the ranking instead of
  forcing it to be picked (ARBRE is POMME's stronger first thought).

## Both words must matter (latest)

Playtesting found answers carried by one word only (JOGGING + SEA → TURTLE, LOBSTER + SAND → CASTLE,
CATCH + CASTLE → SANDBOX, SAND + SANDBOX → BOX). Causes: JOGGING and LOBSTER were not in the
vocabulary (Gary answered from the known word alone); CATCH + CASTLE has no word linked to both, so
the trail decided among one-shared-neighbour bridges; BOX was only penalised, not rejected.

The human-first model, contender rule, convergence distance, trail, personality and diagnostics are
unchanged. Added (`src/shared/bot.js`, `BOT_TUNING.support`; `supportRules: false` = previous model):
- **Per-word support** `supportA` / `supportB` (0..1, from the current pair only; the trail never
  changes it), `weakSideSupport = min`, `supportImbalance = |A − B|`.
- **Weak-side rules:** ≥ 0.40 no penalty; 0.25–0.40 a small tie-break penalty; 0.15–0.25 a
  meaningful penalty; < 0.15 not allowed to win, unless it leads the trail-free human likelihood by
  0.30 and nothing better supported is reasonably human-likely. Imbalance > 0.60 with weak side
  < 0.20 adds a strong one-sided penalty. Support penalties never affect who is a contender, so they
  only break near-ties; a clearly more human answer still wins.
- **Lazy decomposition:** a candidate that is a piece of a current word (BOX in SANDBOX) is rejected
  unless the other word supports it on its own (≥ 0.25). When the other word is the rest of the
  compound (SAND + SANDBOX), its support doesn't count. Lazy words never win, even as a last resort.
- **Fallback:** when no word in the data connects both words, Gary picks the best-supported weak
  bridge (weak side, then total support, then two-step paths), ignoring trail and personality.
- **Vocabulary:** lobster, jog (JOGGING resolves to it).
- **Diagnostics** per candidate: human likelihood, word A / B support, weak side, imbalance,
  centre, trail +, personality +, lazy −, support −, final, contender, and why a word couldn't win;
  plain-English notes ("BOX was rejected as a lazy decomposition of SANDBOX because SAND
  independently supported BOX at only 0.00 (SANDBOX = SAND + BOX).").
- **Tests:** `test/one-sided.test.mjs` (support from the pair only, human-first, weak-side, trail,
  lazy, determinism, same-turn convergence vs the previous model, no overcorrection).
- **Known limit:** the curated graph (~615 concepts) often has no word linking two unrelated
  words; then Gary can only offer a weak bridge, and unknown words still get answered from the
  known word. More curated links and vocabulary shrink both.

### Current turn in the Word Trail
The NOW PLAYING row now says "Match these two words!" / "Old rows are just your history." (FR:
"Trouve un mot pour ces deux-là !" / "Les lignes du dessous, c’est juste ton histoire."), its two
words are the biggest in the trail, finished rows sit quietly under "Earlier moves", and only the
newest finished row keeps "↑ Next round's words". Test: `test/e2e/trail-now.test.mjs`.

## Family room codes: AA00 (latest)

- Codes are exactly two uppercase letters and two digits (`AB12`), defined once in `src/shared/codes.js`
  (`JOIN_CODE_PATTERN`, `randomJoinCode`, `normalizeJoinCode`, `isJoinCode`) and used by the server and the join dialog.
- Typed codes are normalised (spaces removed, uppercased); anything else, including the old `ABCD-12` format, is
  rejected with `400 BAD_JOIN_CODE` before any lookup.
- A code is unique only among active rooms (`WAITING`/`ACTIVE`). Create and rematch skip codes in use (up to 25
  tries); joining only ever finds the active room with that code, so a finished room can never be joined by mistake.
- The waiting room shows the code big and centred, with no "Copy invite link" button.
- **Migration to apply in Supabase:** `supabase/migrations/20261008120000_short_join_codes.sql`. It swaps the
  full unique index for a partial one on active rooms and rewrites non-conforming codes. The server works before
  and after it, but old-format codes stay in the database until it runs.
- Tests: `test/room-codes.test.mjs`, `test/e2e/room-code.test.mjs`.

## Solo characters: Gary and Milo (latest)

- New Solo games from home open "Who do you want to play with?" (`#characterPicker`): two big radio cards,
  "Gary from Accounting / He was told there would be cake." and "Milo / Ready. Probably too ready.".
  The last choice is remembered (`localStorage.ssbd_character`) and preselected. "Play again" keeps the
  character, skips the picker and shows a rematch greeting; a new Solo from home can switch.
- One config system: `src/client/characters.js` (`CHARACTERS`: id, name, title, tagline, personality,
  voiceId, voiceStyle, art, intro, reaction pools, and `copy`, the character's own wording of shared Solo
  sentences). Portraits come from `characterArt(id)` in `gary-art.js` (`gary.webp`, `milo.webp`).
- Reaction pools per character: mismatch (by mood), close, strange, middle/near end of a long game,
  early match (move ≤ 3), match, late match (move ≥ 12), rematch, and the game-over goodbye. `revealKind()`
  decides close/strange from the lexicon (presentation only). Neither character's match lines repeat "high five".
- Shared copy is neutral (the picker, "{name}'s word", the match and win copy, "Match these two words!").
  Gary keeps the wording players already know; Milo has his own for the first-move help, "ready" line,
  reveal outcome, next pair, the Keep playing button, game over and loose-word note.
- **Same engine:** the game stores `character` (and `rematch`) for presentation only. `src/shared` never reads
  it, so both characters choose identical words with identical diagnostics (`test/characters-engine.test.mjs`).
  Every human-first, weak-side and lazy-answer invariant therefore holds for both. Old games without the field
  are Gary's. `?debug=gary` still works for both characters and shows which one was chosen.
- Tests: `test/gary.test.mjs` (config, pools, copy, tone), `test/characters-engine.test.mjs`,
  `test/e2e/characters.test.mjs` (picker, persistence, rematch, labels/avatars, no stray Gary with Milo, EN/FR).
  The e2e helper `startSolo(page, character?)` goes through the picker.

## Together mode fixes: names, keyboard, shared duplicates, win sync (latest)

- **Joining asks for the friend's own name.** "Join a game" (and an invite link) now asks for the room code
  first, checks it with `GET /api/games/lookup`, then asks "What should we call you?" (prefilled when the
  device already has a player, who may change it via `POST /api/player/name`), then joins. Previously the
  name dialog came first, so a friend could type the code into it ("ZLED-31" → badge "Z"). Names that look
  like room codes (AB12 or the old ABCD-12) are refused by the client and the server (`BAD_NAME`).
- **Played words are used up for everyone.** `checkWord` (src/shared/rules.js) checks both sides of every
  revealed move, so the server (Together), and Solo against Gary or Milo, all refuse a word anyone already
  played (same normalisation: case, spacing, punctuation, inflections). Your own last word keeps
  `SAME_AS_LAST`. The open move is never compared, so a same-move match still wins. Messages: Together
  "That word has already been played."; Gary "Already played. Gary checked. Twice."; Milo "Ooh, that
  one's taken! Got another one?" (character `copy.errALREADY_USED`).
- **Win sync.** The server already closes a round once (`UPDATE … WHERE status = 'OPEN'`). The client bug
  was ordering: a poll sent just before a submit could answer after it and put the older state back
  (un-locking a locked word, or replacing the win with the pre-match board, after which the end screen came
  without the reveal or confetti). `applyServerGame` now ignores any state older than the one on screen
  (`progressOf`: revealed moves, finished, joined, locked words). A player waiting on the other polls every
  second (otherwise 3.5 s), and re-checks at once on focus, `pageshow` and reconnect.
- **On-screen keyboard.** `interactive-widget=resizes-content` (Android) plus `visualViewport` (iOS): while
  the word box is focused on a touch screen and the visible height drops by over a quarter, `html.kb-open`
  hides the decorative parts (back row, progress, language note; title and instruction become visually
  hidden) and `keepPlayInView` keeps the two words, hint/error, input and Lock button in the visible area.
- Tests: `test/together.test.mjs` (server), `test/e2e/together.test.mjs` (two browser sessions: names,
  duplicates, wins in both orders, simultaneous submit, slow out-of-order network, reconnect, Gary/Milo
  duplicates, FR), `test/e2e/keyboard.test.mjs`, updated rules tests; e2e helper `joinRoom`.
