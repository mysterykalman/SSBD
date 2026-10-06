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

## Status update: source reconstruction and verification (2026-10-06)

This section records the takeover work on branch `claude/confident-edison-75ygtk`
(issue #1). The brief above is unchanged.

### What was found
- The repository held only compiled output, with no source, package manifest or
  tests. That compiled output did **not** contain the v21 features described
  above: no service worker, no device-local Solo. Solo still ran on the server
  through D1.
- The original compiled output is preserved unchanged in
  `reference/baseline-dist/` (see `reference/README.md`).

### What was reconstructed (new source tree)
- `package.json`, `package-lock.json`, `.gitignore`
- `src/shared/`: `rules.js` (move state machine), `words.js` (cleaning,
  comparison keys, validation, speller), `bot.js` (contextual bot), `solo.js`
  (device-local Solo), and `lexicon/` (`data.js` with 566 curated EN/FR
  concepts, `vocab.js` with spelling words, `index.js`)
- `src/server/`: `api.js` (family-game API on D1, schema unchanged),
  `worker.js` (Worker entry with the embedded app shell)
- `src/client/`: `index.html`, `styles.css`, `app.js`, `i18n.js`, `store.js`,
  `sw.js`, `manifest.webmanifest`, `icon.svg`
- `scripts/`: `build.mjs` (emits `dist/`), `dev-server.mjs` (runs the built
  worker on Node), `d1-sqlite.mjs` (D1 shim)
- `test/`: `rules`, `solo-rules`, `solo`, `words`, `lexicon`, `api`, `store`
  and `i18n` unit/integration tests, plus `test/e2e/` browser tests (`solo`,
  `offline`, `family`, `layout`, `a11y`)
- `README.md`, `docs/ACCEPTANCE.md`, `reference/README.md`
- `dist/` is generated by `npm run build`. Never edit it by hand.

### Key fixes compared with the baseline
- **Bot independence.** The baseline passed the player's current word into the
  bot's exclusion list. That leaked the word to the bot and made matches nearly
  impossible. The Solo bot now locks its word when a move opens, before the
  player types.
- **Leak before reveal.** In family games the baseline returned the other
  player's word for the open round. Now only `mine` and `otherLocked` are sent
  until both words are in.
- **Concurrent submissions.** Simultaneous final submissions could fail on the
  UNIQUE constraint. Reveals now happen exactly once, using guarded updates and
  INSERT OR IGNORE. Retried or duplicate submissions are idempotent, and an
  interrupted reveal finishes on the next read.
- **Device-local Solo.** Solo now runs fully on the device (no D1 or API) and
  works offline. It uses a versioned app-shell service worker, persistence
  with schema versioning that migrates or backs up old data instead of deleting
  it, and merges safely across tabs.
- **Contextual, varied bot.** The bot scores candidates against both prompts
  using a curated association graph, with seeded randomness per game. It never
  reuses any game word, including its plural or singular form.
- **Validation and duplicates.** Validation codes are shared by client and
  server. Duplicate checks are per side and ignore case, accents and
  hyphens/spaces.
- **Speller.** High-confidence "Did you mean?" suggestions only, never
  auto-replaced.
- **UI and language.** New warm retro UI with a clear word trail
  (`A + B → C + D`). Full EN/FR (French in the "tu" register). Accessibility
  covers keyboard play, labels, live regions, contrast and reduced motion.

### Tests run (last run)
- `npm run build`: OK.
- `npm test`: 99/99 pass (rules 19, solo-rules 13, solo 9, words 5, lexicon 11,
  api 21, store 13, i18n 8).
- `npm run test:e2e`: 24/24 pass (Chromium). The suites are solo, offline,
  family, layout (320/667/768/1280, EN and FR) and a11y.
- An independent browser verification pass covered every acceptance matrix
  item; see `docs/ACCEPTANCE.md`. It filed 7 polish defects, and all 6
  actionable ones were fixed with regression tests:
  - false spelling suggestions
  - FR offline pill overlapping the logo
  - long-word fragments
  - landscape reveal scrolling off screen
  - phone toasts covering the header
  - stacked connectivity toasts

  The 7th, an informational console log on an expected 409, was not changed.

### Known limitations
- **No published release.** This environment has no access to the hosting
  platform behind `same-same-but-different.ekalman.chatgpt.site`, and its
  network policy blocks that site, so nothing was deployed and the live site
  was not compared. `dist/server/index.js` is a single-file Worker exporting
  `{fetch}` that expects a D1 binding named `DB`.
- **Browsers covered.** Verification ran in Chromium only. iOS Safari, Firefox,
  real touch devices and real screen readers were not tested.
- **Solo stays on the device.** Solo history does not sync between devices, as
  intended. Solo games played on the server by older releases are still
  playable (as "legacy" games) but are not moved to the device.
- **No translation in family games.** Words are shown as typed. A game in
  another language than the UI is labelled, not translated.
- **Rejected third player.** A third player trying to join a full game sees a
  friendly message, but the browser still logs a 409 in the console.
- **Speller coverage.** The speller knows about 2k words per language. Words
  outside that list get no suggestion, which is a safe failure.
