# Pam real-data combined knowledge checkpoint (22 October 2026)

## Data actually processed

The reproducible GitHub Actions job `research-benchmark` run 39883432414 finished successfully, using the **actual frozen 1,650-name thematic roster** and the **original 1,775-name production list**. These numbers are measured, not illustrative.

| Measure | Verified value |
|---|---:|
| Original names | 1,775 |
| Recovered research candidate names | 1,650 |
| Exact-name collisions | 1 |
| Distinct names in combined list | 3,424 |
| Workbook-derived experimental questions | 351 |
| Candidate x question positions | 579,150 |
| Known positions in recovered research | 104,374 |
| Unknown positions | 474,776 |
| Distinct-answer singletons | 147 |
| Candidates sharing profiles | 1,503 |
| Stratified candidates actually played against all 1,650 candidates | 33 |
| Correct within 20 questions, exact response | 0/33 |
| Correct with softened every third response | 0/33 |

The lone exact spelling conflict is `Dove` (brand, PAM-1326) versus an original `Dove`. This is a **referent collision**, not necessarily a duplicate identity; do not simply remove it without checking.

The largest repeated-profile groups include 100 historic sites, 100 natural landmarks, 100 built landmarks, 80 sculptures and 80 rock musicians. Source research is incomplete for distinguishing individual subjects.

## Actual implementation

- `scripts/pam-real-roster-quickcheck.mjs` computes these numbers from the frozen source and writes a detailed JSON artifact. It tests the first, middle and last target in each of 11 categories against the full 1,650-candidate pool.
- `scripts/pam-real-roster-benchmark.mjs` additionally supports expanded per-target diagnostic runs, outputting individual guess outcomes.
- `scripts/pam-combined-research.mjs` creates a real, single research-only matrix from the 1,775 original targets and unique expanded names. It preserves every original answer/known-mask byte, while leaving unverified cross-cohort questions explicitly unknown.
- `test/pam-combined-research.test.mjs` passed in GitHub Actions; the combined data has not been mistakenly classified as live gameplay.
- Fixed 14 source-backed animal fact corrections whose previous indices pointed to the wrong original targets after deduplication; the corresponding reviewed-corrections tests passed.

## Remaining defects and limitations

The live game is **not** production-ready for these 1,649 net new identities: no full combined 20-question engine integration, human factual approval or novel-question approval has been completed. The existing roster-based experiment identifies zero of its sampled targets; 1,503 have indistinguishable profiles, so model tuning alone cannot overcome missing facts.

The full GitHub CI workflow is **not green**. One older selection-regression gate still fails with six specific wrong-first-guess targets and slightly excessive repeated question families. A separate knowledge audit flags five legacy contradictions involving fictional or deceased subjects. Neither should be concealed by relaxing checks.

GitHub Actions run: https://github.com/mysterykalman/SSBD/actions/runs/39883432414
