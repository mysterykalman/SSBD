# Acceptance matrix: evidence

Status of every item in the acceptance matrix in `docs/CLAUDE_HANDOFF.md`,
verified on 2026-10-06 against the build from `npm run build`. The worker ran
locally (`scripts/dev-server.mjs`, SQLite standing in for D1) and was driven by
Playwright in Chromium 141. Two kinds of evidence back each item:

- the automated suites, which anyone can re-run with `npm test` and
  `npm run test:e2e`;
- an independent manual browser pass with its own scripts, written separately
  from those suites.

| # | Item | Result | Automated evidence | Independent browser pass |
|---|---|---|---|---|
| 1 | Fresh Solo: blank start, one word, bot responds, simultaneous reveal | PASS | `test/e2e/solo.test.mjs` "fresh Solo…", `test/solo-rules.test.mjs`, `test/solo.test.mjs` | Empty input, no prompt tiles, no history, no reveal on move 1. The reveal shows YOU and BOT labels, and the next prompt equals `[you, bot]`. |
| 2 | Solo moves 1–20: prompts chain, no duplicate bot words, varied and sensible bot | PASS | `test/rules.test.mjs` (property test, 400 games), `test/solo-rules.test.mjs` (60 EN + 60 FR games), `test/lexicon.test.mjs` (200-pair sweep per language), `test/solo.test.mjs` "reaches the 20-move limit" | 3 full 20-move games, checked after every move. Clean "20 moves played!" end. The 3 bot sequences differ. Every bot word relates to at least one prompt, and to both when the player plays related words. |
| 3 | Solo refresh: active move and history survive; no multiplayer UI | PASS | `test/e2e/solo.test.mjs` "survives refresh and reopening", `test/e2e/layout.test.mjs` move-1 checks | A refresh never changes the bot's locked word. A new tab or the bare URL reopens the active game. No waiting, family, join or friend wording at any point. |
| 4 | Offline Solo: start, play, refresh, reopen, complete | PASS | `test/e2e/offline.test.mjs` (6 tests: full offline game, deep links, finished state, FR offline, cache contents, update flow) | 0 `/api/` requests offline. Friendly "Offline · Solo still works" pill and toast. Family buttons disabled with an explanation. |
| 5 | Multiplayer: create, join, both submit, simultaneous reveal, next prompt | PASS | `test/api.test.mjs` (21 tests incl. leak scan, races, idempotency), `test/e2e/family.test.mjs` | Join by typed code and by `/join/CODE` link. The other player's word is absent from their page HTML, storage and every API response before the reveal. Order is identical on both screens. A third player is refused. |
| 6 | Duplicate attempts blocked with a friendly explanation | PASS | `test/rules.test.mjs`, `test/api.test.mjs`, `test/e2e/solo.test.mjs` | Same word in a different case gives "You just played…". Reuse is caught across accents and hyphens/spaces. |
| 7 | Invalid input: blank, whitespace, punctuation-only, too long, misspelled | PASS | `test/words.test.mjs`, `test/e2e/solo.test.mjs`, `test/e2e/a11y.test.mjs` | Blank, whitespace, `!!!`, digits, 25+ letters, 1 letter, 4 words, `<script>` and emoji are all rejected. "freind" shows "Did you mean FRIEND?" and is never auto-replaced. Real words such as "draft" get no false suggestion (fixed after the first pass). |
| 8 | Language EN/FR persists; active game not corrupted | PASS | `test/i18n.test.mjs`, `test/e2e/a11y.test.mjs`, `test/e2e/offline.test.mjs`, `test/e2e/solo.test.mjs`, `test/store.test.mjs` | Persists across reload and new tab. The active game keeps its word language and the bot's hidden word. An explicit "New game in French" button is offered. |
| 9 | Responsive: 320 portrait, 667 landscape, tablet, desktop | PASS | `test/e2e/layout.test.mjs` (4 viewports × EN/FR, tidy checks, offline-pill check) | No horizontal overflow or clipping. The FR offline pill overlapping the logo and orphaned long-word fragments were found and fixed after the first pass. |
| 10 | Accessibility: keyboard, focus, labels, reduced motion, contrast | PASS | `test/e2e/a11y.test.mjs` (keyboard play, dialogs, live regions, DOM audit, WCAG AA contrast) | Keyboard-only play works, with a visible focus ring. Reduced motion removes the animations. Contrast spot checks give 5.06–15.3:1. |
| 11 | Notifications readable, dismissible, non-blocking | PASS | `test/e2e/layout.test.mjs` connectivity-toast check, `test/e2e/offline.test.mjs` | 44px close button, auto-dismiss, typed word kept. Connectivity toasts now replace each other instead of stacking. |

Last full run: `npm test` passed 99/99 and `npm run test:e2e` passed 24/24.
