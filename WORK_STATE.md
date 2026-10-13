# Work State

## Current checkpoint
- Branch: integration/all-current-work
- Current HEAD before Phase 2 commit: b62cca2678b41eb6538f8f3787fce21b6b2d8752
- Last completed phase: Phase 5, shared semantic context for Gary and Milo
- Current phase: Phase 5 complete
- Status: PHASE 5 COMPLETE; READY FOR PHASE 6

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
- Gary and Milo must continue to choose only from the core engine's already-approved quality window. Semantic context is a bounded ordering signal, not permission to admit weaker candidates.
- Solo fairness remains unchanged: the bot locks its word before seeing the player's open-round word.

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

## Phase 4 completed result
- Full curated set accounted for: 1,081 canonical concepts from 1,082 source rows.
- Runtime coverage: 173/1,081 (16.0%); 908 missing from checked-in runtime knowledge.
- Full self-play for all 173 runtime-present curated concepts: 3 wins, 170 stumped; 1.7% present-item win rate.
- Wins: Mona Lisa, Venus de Milo, Lego.
- Core coverage/win-present: 15.7% / 1.9%.
- Sweet Spot coverage/win-present: 14.6% / 0.0%.
- Harder but fair: 15 correctly classified Primary Category rows, 0 present, 0% coverage.
- Quality gates are not met; no thresholds were weakened and missing evidence was not converted to No.
- Root systemic finding: runtime/evidence population is the dominant blocker. The optional controlled-profile artifact was absent from this benchmark environment.
- Detailed results: docs/mom-phase4-benchmark.md.
- Final systemic follow-up: family-aware question gating, safe non-entity root negatives, and broader music taxonomy restored the representative general-knowledge gate from 7/16 at Phase 2 to 12/16 (75%), with the existing threshold unchanged.
- Fast validation after the follow-up: focused engine/general-knowledge tests pass, lint passes, typecheck passes.
- The 173-item runtime-present full self-play was not rerun after the final fixes under the approved skip-slow/repeat protocol; its 3/173 result is retained as a pre-final-fix checkpoint, not a final-engine score.

## Phase 5 completed
- Connected the existing shared `association-context` layer to the production Solo path used by Gary and Milo.
- Context is derived only from information already revealed to both players: current prompts plus prior revealed rounds.
- Contextual scoring runs only for strong/high-quality selections with at least two already-approved candidates and at least one revealed prior round.
- The contextual layer never widens the candidate pool, promotes recovery candidates, or overrides the core quality floor.
- Character differentiation is preserved by retaining the core engine's selected ordinal inside the contextually reordered approved pool. Milo receives a stronger context weight (0.10) than Gary (0.06), consistent with Milo following shared direction more closely.
- Added decision diagnostics for contextual ranking, recent semantic direction, dominant tags/categories/traits, and whether context changed the selected word.
- Added focused semantic integration tests covering contextual preference, no-history behaviour, determinism, and fair-state-only selection.
- Updated the Solo semantic-context workflow so production `solo.js`, integration tests, engine regressions, and Solo regressions are all covered.
- Corrected the older synthetic semantic-context fixture to satisfy the lexicon concept contract (`members`).
- Restored `test/solo.test.mjs` exactly from verified Git history after an intermediate connector edit replaced unrelated test content, then applied only the intended production-selector import/call change.

### Phase 5 validation
- `node --test test/association-context.test.mjs test/solo-semantic-context.test.mjs`: 7/7 pass in GitHub Actions.
- `node --test test/engine-2.5.test.mjs test/solo.test.mjs`: 27/27 pass in GitHub Actions.
- Existing Gary/Milo differentiation checks pass, including Milo consensus preference and Gary's ability to choose a less-obvious but still genuinely strong answer.
- Existing fairness, chaining, no-repeat, French vocabulary, unknown-input, morphology, and 20-turn Solo behaviour regressions pass.

## Exact next action
Begin Phase 6 from the Phase 5 checkpoint. Do not reopen Phases 2–5 unless a new regression directly points back to them.
