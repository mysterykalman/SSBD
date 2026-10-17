# SSBD full gameplay and responsive QA plan

Status: audit specification, NOT a completed audit. Do not merge or deploy on the basis of the existing responsive smoke checks.

## Audit principle
Test real interaction sequences. A screenshot of a landing page is not evidence that gameplay works. Every issue must have a reproducible route, viewport, state, actions, expected/actual behaviour, screenshot, and severity. Never mark a state PASS if the automation could not enter it.

## Viewport matrix
Portrait: 320x568, 360x640, 375x667, 390x844, 393x852, 414x896, 430x932.
Tablet: 768x1024, 820x1180, 1024x1366.
Landscape: 667x375, 844x390, 932x430, 1024x768.
Desktop: 1280x720, 1440x900, 1920x1080.
Also run browser zoom at 200%, keyboard-only focus, and reduced-motion mode on representative widths.

## Coverage matrix
### Global
Homepage with no saved games, one resumable game, multiple resumable games, completed/expired games excluded; welcome animation and its replay/skip; music controls and both sliders at 0/50/100; sound off/on; How to Play; logo; back navigation; history; reload/resume; PWA install; offline Solo; errors/loading/empty states; mobile keyboard open; browser Back/Forward.

### Solo
Gary and Milo separately. Fresh round; enter words; submit; bot thinking; simultaneous reveal; wrong spelling/suggestion; empty input; duplicate player word; duplicate bot word; 20-move warning and end; match/win; loss; comments; Keep Playing; retry; refresh/resume; history; offline mode. Check both characters' dialogue and visual assets.

### Play Together
Create room; join from separate isolated browser contexts; valid/invalid 4-character code; player name prompt; rename via avatar; two simultaneous players; waiting for opponent; simultaneous reveal; divergent words; convergent words; win visible to both; draw / Close Enough agreement; duplicate word rejection; one player disconnects/reconnects; late join; reload/resume; expired room; mobile keyboard. Capture both players at the same point in each round.

### Don't Tell Me (Pam)
Intro open/close; secret entry validation; each category option; all six answer choices; question 1, midgame, late game, 20-question limit; hunch; keep asking; guess now; correct and incorrect final answer; scoring/rank/streak; play again; reload; rules; long secret word; long question text. Use deterministic adapter fixtures when necessary to force rare states. Do not assume answering Yes seven times covers the game.

### Odd One In
Every difficulty / character (Owen, Zoe, Martin, Professor Braine); initial grid; select 1/2/3/4 tiles; clear selection; submit; wrong guess; one-away/near miss if supported; correct group; multiple groups solved; remaining words; completed puzzle; exhausted mistakes; replay/new puzzle; instructions; back navigation; narrow viewport and landscape; long words and localization.

## Automated checks on EVERY captured state
Document and container horizontal overflow; actual bounding-box intersection between clickable controls; hit-test at centre and corners (elementFromPoint); minimum touch target; clipping and occlusion; text wrapping; keyboard focus visible; aria labels; disabled/hidden state correctness; errors in page console; failed HTTP requests; broken images; unhandled promise rejections; tap/click success; transitions actually occur; screenshot before and after action.

## Evidence format
Write artifacts/full-audit/<run-id>/report.json with one entry per scenario and viewport. Fields: mode, scenario, viewport, browser, preconditions, actions, expected, actual, status PASS/FAIL/BLOCKED, consoleErrors, requestErrors, layoutFindings, screenshotPaths, reproducibleSteps. Generate a contact sheet per mode and an HTML report grouping findings by severity. Preserve screenshots for failures plus representative PASS states, not hundreds of redundant home screens.

## Execution gates
1. Confirm local server is serving current branch/build, and print branch SHA and page asset build identifier. A 200 response alone is insufficient.
2. Test Pam end-to-end first and validate all six controls, hunch, guess, result.
3. Test Odd One In all four difficulty paths and solved/failed outcomes.
4. Test Solo with both bots through win/loss/limit.
5. Test Play Together with two independent sessions, disconnect/reconnect and shared result.
6. Global dialogs, audio, navigation, accessibility, orientation and visual inspection.
7. Fix findings by severity, rerun failing cases and full regression.
8. Require a human review of representative screenshots. No merge/deploy without explicit approval.

## Severity
P0: data loss, security/privacy, cannot enter/play core mode.
P1: controls overlap/block, broken win/reveal, incorrect state, inaccessible gameplay.
P2: confusing interaction, text clipping, bad mobile spacing, inconsistent feedback.
P3: polish, minor visual inconsistencies.

## Known status (October 2026)
Initial 30 route-width smoke tests pass. Archive 4 has 123 files and shows Pam through question seven at ten widths with no script-reported gameplay errors. No full-game result captured; other modes and many dialogs not yet audited. Treat all untested scenarios as NOT TESTED, not PASS.
