# Pam: next 500 target expansion

Status: **NOT PRODUCTION READY**. This branch is a staging area and contains no newly approved targets.

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
