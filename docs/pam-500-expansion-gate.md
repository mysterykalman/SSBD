# Pam: next 500 target expansion

Status: **NOT PRODUCTION READY**. This branch is an unreviewed candidate/validation workspace; no additional target is approved for production.

## Frozen baseline

- Load the 1,775-target model through `loadPam1775Model(loadPamClassicModel)`.
- Preserve the names, order, 156-question matrix states and known-mask semantics of all 1,775 existing targets.
- Do not use the unrelated 52,648-item Mom runtime knowledge inventory as a source of approved Pam Classic targets without separate review.

## Required before merging

1. Select and independently verify 500 distinct, familiar, answerable targets absent from the baseline, with well-defined category and 156-question trait profiles. Keep ambiguous facts unknown rather than inventing a negative.
2. Maintain an auditable 500-profile artifact with provenance, including reviewed `yes`, `no`, and `weakYes` traits, plus explicit `knownMask` coverage.
3. Append those 500 profiles to the existing 1,775 without modifying existing cells; update count contracts, generator, runtime payload, tests and build to 2,275 targets.
4. Prove exact-name and category uniqueness, matrix size 156 × 2,275, previous 1,775 rows byte-identical, and loadability by the actual browser engine.
5. Run **500/500 exact full-model self-play**, **500/500 softened yes/no self-play**, and **0/1,775 regressions** against the current model. Fail the build if any criterion is not met. Keep evidence and failures in CI logs.
6. Verify that every new target can be sampled by production runtime selection logic, not merely found in the matrix, and that the game deploy bundle contains the model with 2,275 targets.
7. Run project lint, typecheck, all tests, build and available end-to-end or smoke tests; merge to main and confirm the production deployment only after all gates are green.

The existing 375-target pack is in `data/pam20q/quality/quality-375.part1..4`; loader in `scripts/pam-quality-model.mjs`, build in `scripts/build-pam-classic.mjs`, baseline regression in `test/pam-quality375.test.mjs`. Existing first-wave extensions are in `data/pam20q/extensions/`.

**No quality, regression or production claim is justified until these checks have actually run.**

## Measured diagnosis (2026-10-17)

The isolated deep-dive CI run [39079300718](https://github.com/mysterykalman/SSBD/actions/runs/39079300718) evaluated the committed 500 candidate profiles in the actual 2,275-target model.

| Measurement | Result |
| --- | ---: |
| Exact guesses for the 500 candidates | **134/500** |
| Guesses with one softened yes/no | **141/500** |
| Legacy targets whose final guess changed | 1/1,775 |
| Existing target correctness regressions | **0/1,775** |
| New targets with no known opposing answer against another new target | **431/500** |
| New targets with no known opposing answer against an old target | **0/500** |
| New targets with only one separating known question at best | 68/500 |
| New targets with two separating known questions at best | 1/500 |
| Average explicit strong yes / strong no / unknown cells | 10 / 87 / 55 |
| Animal / vegetable / mineral / other candidates | 176 / 96 / **0** / 228 |

A *separating known question* means both profiles explicitly know an answer to the same question and have opposing polarity. Having zero such questions is a serious evidence gap, **not** a formal proof that any pair can never receive different scores when one or both profiles have unknown cells. The count is computed across all 156 traits with the exact category/known-mask semantics of the runtime. The audit lives in `scripts/audit-pam-500-separability.mjs`; JSON results are saved as the `pam-500-separability` GitHub Actions artifact.

The main failure is distinguishability **within the proposed 500**. Adding more similar species, berries, utensils or wearables with generic family traits does not supply the missing facts. Adjustments that improved new-target accuracy have previously caused existing-target regressions, so any question-ranking changes must meet both gates rather than trade one cohort for the other.

### Non-negotiable next gates

1. Broaden the editorial shortlist away from dense clusters of near-identical nouns. Prefer familiar, unambiguous targets spanning different uses, sizes, materials and categories.
2. Curate target-specific, verifiably correct differentiators and negative answers. Do not turn unknown into no merely to win simulations.
3. Run the pairwise separability audit **before** expensive gameplay trials, and publish the nearest ambiguous neighbor for every remaining candidate.
4. Run 500/500 exact and 500/500 softened oracle simulations plus all 1,775 existing regression games. A passing checksum or model-length test does not qualify as gameplay readiness.
5. Complete build, typecheck, lint and end-to-end smoke checks; deploy only after all gates are green.

### Release safety

`scripts/generate-pam-500.mjs` emits `review_status: "candidate_unreviewed"`. The normal loader refuses to append unreviewed candidates to default builds; a controlled CI job can set `PAM_ALLOW_UNREVIEWED_500=1` for experimentation. Only a separately approved artifact may be included in a normal 2,275-target build. Do not set this opt-in in the production deployment environment. The isolated branch is `feature/pam-500-deep-dive`; the original `feature/pam-500-quality-expansion` branch remains separate.
