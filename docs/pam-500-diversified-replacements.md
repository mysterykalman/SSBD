# Pam 500: diversified replacement candidate review

**Status:** Not production-approved. No merge or deployment is authorized until all release gates pass.

## Why this work exists

The original 500-candidate group had 408 profiles without a known contradictory answer against at least one other new profile. That is a serious limitation of its 156-question evidence. The old selection leaned heavily on many nearly identical species, foods and specialty equipment.

## Editorial replacement pool

`data/pam20q/candidates/diverse-500.mjs` adds **548 concrete candidate entries across 15 distinct families**, including rocks and minerals, gemstones, snow and ice, landscapes, atmospheric events, body parts, ideas, office supplies, bathroom items, cleaning tools, crafts, party supplies, toys, gardening products and medical/first-aid items.

The user-facing objective is familiar, readily imaginable concepts with real distinguishing traits. The catalogue makes only specific, conservative factual claims; a missing trait remains unknown unless a categorical contradiction can be established. **Candidate inclusion is not factual sign-off.** Names, classifications, sizes and ambiguous use-cases require editorial review before approval.

### Evidence references

- U.S. Geological Survey, *Rock Types*, https://www.usgs.gov/educational-resources/whats-new-weeks-9-12: distinguishes granite, basalt, pumice, volcanic glass/obsidian, rock-forming processes and sedimentary rocks.
- National Weather Service, glossary, https://forecast.weather.gov/glossary.php: reference for distinguishing weather and hydrometeor concepts such as hail, lightning, tornadoes, rainbow, snow and fog.

These sources provide category-level factual support. They do **not** independently certify every target and trait in the new pool. Everyday-object traits such as `has buttons`, `opens`, `made of plastic` or `held when used` are cautiously marked only when consistently true of the named object.

## Measured experiment

Source: [GitHub Actions run 39081213887](https://github.com/mysterykalman/SSBD/actions/runs/39081213887), with candidates generated in an isolated, test-only build. The complete runtime contains the unmodified previous 1,775 targets and 500 unreviewed candidates.

| Measure | Before diversified catalogue | First diversified run |
| --- | ---: | ---: |
| Exact new-target guesses | 146/500 | **209/500** |
| Softened new-target guesses | 154/500 | **196/500** |
| New targets with no known opposite-polarity evidence against another new target | 408 | **282** |
| New targets with no known opposite-polarity evidence against an existing target | 0 | **1** (must be eliminated) |
| Accuracy regressions across original 1,775 | 0 | **0** |
| Selected names from diversified catalogue | 0 | **322/500** |
| Conservative independent subset estimate in source pool | 160 | **282** |

A missing opposite-polarity trait is an evidence gap, not proof of mathematical indistinguishability under unknown-mask scoring. Values refer to the model selection and tests in the linked run, not the production site.

## What is changing next

- Reject every candidate without at least one known contradictory trait against the existing 1,775 (no exceptions).
- Penalize candidates that collide with *many* already-selected peers, not merely candidates that collide with at least one.
- Keep the full 500 generated for testing but add category-specific guess metrics and a per-target factual review queue. Do not inject synthetic yes/no values to inflate play statistics.
- Remove stale or exotic near-duplicates whenever readily recognizable candidates can improve the set.
- Only mark a 500-pack `review_status: "approved"` after checking factual assertions, 500/500 exact, 500/500 softened and 0/1,775 baseline regressions, plus the full build checks.

## Files and controls

- Source catalogues: `data/pam20q/quality/catalogue-500.mjs` and `data/pam20q/candidates/diverse-500.mjs`
- Deterministic candidate generator: `scripts/generate-pam-500.mjs`
- Separability report and ranked factual review prompts: `scripts/audit-pam-500-separability.mjs`
- Full oracle gameplay: `test/pam-500-expansion-gameplay.test.mjs`
- CI: `.github/workflows/pam-500-expansion.yml`
- Release guard: `scripts/pam-quality-model.mjs` rejects `candidate_unreviewed` in default builds, including Vercel production even if the test flag is accidentally present.

No release should be triggered based solely on increased source count, reduced collision counts, a successful bundle build or partial gameplay gains.
