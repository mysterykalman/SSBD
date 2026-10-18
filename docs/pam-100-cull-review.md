# Pam — candidate deduplication and usability cull

**Result:** 100 proposed additions retained, 400 excluded from the 500-candidate batch. This is a provisional technical shortlist, **not** a production release or complete factual approval.

- Current validated production model: **1,775 answers**.
- Technically retained for editorial review: **100 new answers**.
- Potential total upon final approval and implementation: **1,875 answers**.
- Latest complete culling run: [GitHub Actions #39084429737](https://github.com/mysterykalman/SSBD/actions/runs/39084429737).
- Persistent, inspectable list of all 100, with categories and source groups: [pam-100-provisional.json](../data/pam20q/candidates/pam-100-provisional.json).

## What was cross-referenced

The 500 proposed candidates were compared with all 1,775 original Pam answers and one another. Normalized names strip surrounding articles and formatting without assuming that different species or material types are synonyms. Likely synonymous or nested labels were flagged for review rather than automatically declared identical.

The cull also rejects candidates that fail **either** a fully known-answer game or one in which one strong yes and one strong no are softened, candidates whose softening coverage is untested, flagged broad/interpretive names, and candidates sharing no directly contradictory known trait with another retained candidate in the same category. It then rebuilds Pam's model with the smaller selection and repeats these games until the set stabilizes. At the end it reruns all 1,775 original targets and requires zero correctness regressions.

The cull deliberately does not turn unknown cells into negative evidence, change the 156 question meanings, or automatically approve obscure targets merely because they pass self-play. Factual review by target remains a separate gate.

## Exact measured count

| Screening stage | Count |
| --- | ---: |
| Original 500-candidate expansion | 500 |
| Correct in exact oracle games, before culling | 224 |
| Correct in softened-answer oracle games, before culling | 219 |
| Correct in **both** | 208 |
| Both correct, with softening coverage and initial normalized/editorial checks cleared | 201 |
| After eliminating known-answer pairwise ambiguity among proposed targets | 161 |
| After seven passes of retesting the reduced model | **100** |
| Excluded from the proposed addition | **400** |
| Accuracy regressions on original 1,775 | **0** |
| Original guesses that changed, without correctness regression | 1 |

**Additional overlapping checks:** 10 candidate names normalized to a name already in the 1,775-target baseline; 14 had one or more initial editorial flags. These counts overlap and are not independent deductions from the 500.

The first reduced game set contained 161 candidates. Its seven test passes were: 161 → 126 → 111 → 106 → 103 → 101 → 100, then zero remaining failures. The final 100 passed the exact and softened simulated game under the reduced model, including both softened response types, and none damaged previously correct guesses for the original 1,775.

## Remaining 100 by category

| Pam category | Answers |
| --- | ---: |
| Animal | 43 |
| Vegetable | 17 |
| Mineral | 11 |
| Other | 29 |
| **Total** | **100** |

Of the original 541-name diversified editorial source, **24** are represented in the retained 100. Many remaining words still involve specialized animals, plants or minerals. **Recognizability, spelling, exact real-world traits, ambiguous referents, and appropriate family difficulty still require editorial review.** The objective above is technical usability, not a certification that all 100 are familiar to every player.

The CI run's **pam-500-culled-final-count** artifact includes the names of all rejected entries with specific reasons, complete per-word exact/softened diagnostics, the retained profiles, and possible normalized legacy matches. Its artifact retention period is 30 days; the retained 100-name JSON is permanently versioned on this feature branch.

## Required implementation change: missing punctuation

All **156** base Pam question texts lack a trailing question mark in `data/pam20q/reference/classic/questions.json`.

To avoid touching the frozen ontology or modifying answer-matrix question IDs, the feature branch now fixes punctuation **at display time** in `src/client/mom-mode/engine.js`. Each question receives a single final `?` unless it already ends with one. The adapter and app already render the engine's `q.text`, so the same corrected text appears in actual question screens and question history.

The test `test/pam-question-punctuation.test.mjs` checks all 156 rendered questions, their unchanged source wording and index correspondence, actual gameplay prompts, and the unchanged weight and known-answer matrices. This has passed on [GitHub Actions #39084429737](https://github.com/mysterykalman/SSBD/actions/runs/39084429737). The fix is **committed only on the feature branch**, not yet deployed.

## Approval boundary

The batch file `quality-500.json` is not an approved list of 100 and **must not** be copied directly into production. The saved `pam-100-provisional.json` has `review_status: "candidate_unreviewed"` and intentionally isn't loaded by Pam's production data loader.

**Next phase:** complete editorial factual review for the 100; promote their full reviewed profiles via a dedicated flexible-count integration (100 additional, not 500) with the answer-matrix layout unchanged; pass full production tests and deploy only then. Until that step, the only live count remains **1,775**.
