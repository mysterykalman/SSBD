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
- Offline Solo history is local to the device and does not sync to multiplayer/D1 data.
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
| Server | `src/server/api.js` (family games on D1), `worker.js` (Worker entry, embedded shell), `virtual-assets.d.ts` |
| Client | `src/client/index.html`, `styles.css`, `app.js`, `i18n.js`, `store.js`, `sw.js`, `diagnostics.js`, `manifest.webmanifest`, `icon.svg` |
| Scripts | `scripts/build.mjs` (writes `dist/`), `dev-server.mjs` (runs the built worker on Node), `d1-sqlite.mjs` (D1 shim) |
| Tests | `test/*.test.mjs` (unit and API integration), `test/e2e/*.test.mjs` (Playwright, Chromium) |
| Docs | `README.md`, `docs/ACCEPTANCE.md`, this section, `reference/README.md` |

`dist/` is generated by `npm run build` and committed as the deploy artifact.
Never edit it by hand.

### Game rules as implemented
- **Moves.** Up to 20 moves. Move 1 starts blank; the instruction and the input
  are the only things on screen.
- **Revealing.** Each side locks one word. Both words are revealed together and
  become, in slot order, the exact prompt pair for the next move.
- **Ending.** Same word means a match and the game ends; matching ignores case,
  accents, spaces, hyphens and apostrophes. Move 20 without a match ends in a
  friendly "Game over!".
- **Player duplicates.** A side may not reuse its own words: `SAME_AS_LAST`,
  `ALREADY_USED`. The other side's words are allowed.
- **Bot duplicates.** The bot never reuses any game word, including plural and
  singular forms.
- **Bot independence.** The bot locks its word when a move opens, before the
  player types. It submits exactly one word per round and is deterministic per
  game (a refresh never re-rolls it).
- **Bot scoring.** It ranks candidates by connection to both prompts: direct
  links and common phrases first (186 EN, 124 FR phrases across 594 curated
  concepts), one-sided words only as a last resort. Openings vary between games
  and skip spooky words.
- **Validation.** Blank, punctuation-only, digits and symbols are refused, as
  are words over 24 letters and phrases over 3 words. **One-letter words are
  allowed.** A word is never silently changed.
- **Speller.** Native spellcheck is on. A "Did you mean?" suggestion appears only
  for typical slips (swapped, missing, doubled or sound-alike letter) and never
  replaces the player's word.

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

### Notifications
- **What's covered.** In-app only, for family games: your turn, reveal ready,
  player joined, match, game complete, rematch.
- **Storage and dedupe.** Read and unread state is kept in D1
  (`notifications.read_at`). Ids are deterministic with INSERT OR IGNORE, so
  retries, races and refreshes never duplicate.
- **UI.** A bell with an unread count (not colour alone). The panel has loading,
  empty and error/retry states. Opening an item marks it read; "Mark all as
  read" is there too.
- **Never shown for Solo**, and hidden offline.
- **No phone or browser push.** True push needs a push service and keys this
  runtime does not provide, so it was not faked.

### Family games and data
- **Schema.** The D1 schema is unchanged except one additive column,
  `games.rematch_of`. Existing rows load unchanged; old uppercase words, UUID
  round ids and `COMPLETE` statuses are covered by tests.
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
  is never cached. Updates wait for the player's Reload, so versions never mix.
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
Every scenario below ran in Chromium against the built worker through
`scripts/dev-server.mjs`.

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
- **No release or deployment.** This environment cannot reach the hosting
  platform behind `same-same-but-different.ekalman.chatgpt.site`, and its network
  policy blocks that site, so nothing was deployed and the live site was not
  compared. `dist/server/index.js` is a single-file Worker exporting `{fetch}`
  that expects a D1 binding named `DB`.
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
