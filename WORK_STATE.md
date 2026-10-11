# Work State

## Current checkpoint
- Branch: integration/all-current-work
- Current HEAD before Phase 2 commit: b62cca2678b41eb6538f8f3787fce21b6b2d8752
- Last completed phase: Phase 1, repository consolidation and baseline
- Current phase: Phase 4, Mom benchmark
- Status: PHASE 3 COMPLETE; PHASE 4 STARTING

## Phase 2 completed work
- Repaired accidental truncation introduced in the Phase 1 commit for account.js, Mom tests, multiple Mom workflows, and labelled Wikidata extraction, restoring the complete pre-Phase-1 source and safely reapplying the intended Phase 1 fixes.
- Added a pure playable-candidate reconciler so higher-scored duplicate candidates replace metadata correctly while preserving alternate spellings/aliases.
- Changed the Mom trait analyzer to use machine-readable JSONL inventory/evidence rather than relying on capped human-readable report examples.
- Changed the controlled-profile compiler to consume the complete evidence sidecar, preserving evidence beyond the report sample.
- Tightened controlled-trait taxonomy so fictional characters do not inherit broad real-person/living semantics and generic work wording does not over-map media.
- Added fixture-driven regression tests covering candidate score replacement, alias preservation, fictional-character taxonomy, generic-work mapping, duplicate ConceptNet aggregation, and full evidence preservation.
- Restored full workflow bodies and retained consolidated branch filters.
- Restored complete account API and applied TypeScript-safe PostgreSQL error-code narrowing.
- Restored complete Mom-mode tests and aligned one stale copy assertion to current approved copy without changing product copy.

## Validation passing
- npm run lint -- --no-warn-ignored
- npm run typecheck
- node --test test/mom-mode.test.mjs test/mom-knowledge-pipeline.test.mjs (7/7)
- npm run build (38 static files)

## Known blockers
- Full public-source enrichment datasets are not present in this sandbox checkout, so Phase 2 uses deterministic offline fixtures for pipeline correctness. Full source refresh remains a later validation step when source assets are available.

## Do not undo
- Complete evidence JSONL is the machine-readable source of truth; human-readable coverage CSV is diagnostic only.
- Missing full source datasets must not cause the pipeline code to regress back to truncated Example traits.

## Exact next action
Commit the repaired baseline plus Phase 2 pipeline work, publish it to integration/all-current-work, then start Phase 3 by auditing Mom engine truth-state handling so missing evidence is unknown rather than false.

## Phase 3 completed
- Missing Mom traits now remain explicit unknown evidence (`NaN`) instead of being treated as negative evidence.
- Hard yes/no compatibility never eliminates candidates for unknown traits.
- Added safe, defensible root/category exclusions and artwork subtype exclusions without restoring missing-as-false behavior.
- Preserved human-intent gating after person/animal/food/place answers.
- Calibrated late-round hunch confidence only for a clearly separated leader, preserving the single-guess and player-defer mechanics.
- Trusted Phase 2 representative before-score: 7/16. During Phase 3 iteration the full representative set was intentionally not rerun repeatedly; targeted sparse-evidence checks recovered Venus de Milo and Mona Lisa as wins at turn 17.
- Several culturally sparse concepts remain intentionally underdetermined where the knowledge vectors are identical or near-identical; those are benchmark/data-quality cases for Phase 4, not a reason to convert unknowns into No.

### Phase 3 validation
- `node --test test/mom-mode-engine.test.mjs`: 12/12 pass.
- `git diff --check`: pass.
- `npm run lint -- --no-warn-ignored`: pass.
- `npm run typecheck`: pass.

## Phase 4 final benchmark checkpoint
- Stable pre-benchmark HEAD: af85776593dcf84d8e654b4d9fb2a9514ae48a33
- Trusted Phase 2 representative before-score: 7/16.
- Curated fixture: 1,081 normalized canonical items from 1,082 source rows.
- Runtime coverage before self-play: 173/1,081 (16.0%); 908 items are absent from the checked-in runtime knowledge in this sandbox. The optional controlled-profile artifact is not present.
- Corrected `Harder but fair` classification: 15 rows under Primary Category; it is not a tier.
- Final full-run command: `MOM_BENCHMARK_RUN=1 node --test test/mom-benchmark-suite.test.mjs`.
- Expected output: `.dev-data/mom-benchmark/report.json` and `report.csv`, with all 1,081 rows represented and self-play performed only for runtime-present rows.
- Next action after completion: summarize coverage/win/path/failure metrics, address only systemic issues revealed by the run, rerun only if materially required, validate, commit Phase 4, then stop before Phase 5.
