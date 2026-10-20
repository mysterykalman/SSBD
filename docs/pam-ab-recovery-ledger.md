# Pam A+B recovery and factual-review ledger
Updated: 2026-10-19. Working branch: `feature/pam-question-redundancy`.

## Source-of-truth inventory
- **A, current production classic model:** 1,775 targets = 1,200 pinned classic + 200 extension + 375 quality profiles; 156 questions; 276,900 answer positions. Runtime built by `scripts/build-pam-classic.mjs`, `scripts/pam-classic-model.mjs`, `scripts/pam-quality-model.mjs`.
- **B, theme research:** 1,650 exact source names from `feature/pam-thematic-1650-knowledge-lab`, preserved in `data/pam20q/expansion` with original integrity manifests and original **candidate_unreviewed** status. The experiment identifies 1,352 plausible candidates and 298 deferred identities, **not 1,352 independently reviewed or approved targets**.
- **B, alternative general-knowledge pool:** 2,399 eligible unique source candidates after 370 rejects from the original 2,769 pool, restored in `data/pam20q/candidates/pam-2000-preflight-pool.json`. These are lexical/catalogue leads with `candidate_unreviewed` status, not approved additions.
- **B, earlier proposed 500:** 500 proposed profiles restored in `data/pam20q/research/quality-500-unreviewed.json`. Its last published comparison reported 224/500 exact and 219/500 softened first hunches and 336 new targets with no known separator. These are not release candidates until independently reviewed.
- **B, movie substitution:** 15 owner-approved titles are in the research roster editorial-selection file, but individual entity identities, answer claims, and gameplay approval remain pending.
- **Distinct final B count:** Cannot be certified by adding 1,650, 2,399 and 500. Pools overlap, and approved identity/answer records are absent. Zero **additional production-playable targets** have been approved in this checkpoint.
- **Additional questions:** The thematic question generator has research-only proposed prompts, but no complete, independently checked final question-by-target matrix. Zero **approved production questions** have been added in this checkpoint.

## Completed factual correction: habitat is not body temperature
The legacy extension profile gave `cold: yes` to `a snow leopard`, `a musk ox` and `an arctic fox` because they inhabit cold environments. The question `Is it cold?` refers to the thing itself, not its habitat. Removed the unsupported affirmative classification for all three targets; also removed the duplicate source-overlay assertion for the snow leopard. No arbitrary hard No or Probably No was substituted. A regression test requires the unsupported snow-leopard overlay cell to stay unknown.
All 156 production question strings now receive a terminal question mark in the **runtime view** without altering stored question IDs, original target names, answer weights or known-mask data. Imported source `questions.json` remains preserved.

## Verification ledger
| Gate | Verified completed | Still pending |
|---|---:|---|
| Part A, individually review all 1,775 × 156 factual answers | 0 complete target-wide reviews | 1,775 target-wide reviews |
| Part A, identified habitat/body temperature errors | 3 targets corrected | Full source-wide content review |
| Part B, preserve candidate work and editor notes | Recovered three intact candidate/evidence collections | Cross-pool identity and duplicate audit |
| Part B, approve new targets | 0 | 1,352 plausible thematic candidates and general pool need source-level review |
| Part B, approve reusable new questions | 0 | Must justify and answer them across old and new subjects |
| Validated new question/answer cells | 0 | Full integrated matrix |
| Production, full 1,775 + B gameplay simulation | Not executed for this combined knowledge base | Exact and softened simulations for every included target |
| CSV, JSON and runtime synchronized for expanded corpus | No | Re-export and compare after full integration |
| Merge or deploy | No | Explicitly prohibited |

## Acceptance note
The existing `pam-1775-targets-x-156-questions.csv` and `phase3-candidate-answer-matrix-1775x156.json` are diagnostic **candidate** exports, not proof of factual truth or of correspondence to the generated production model. In particular, the Phase 3 candidate matrix contains unreviewed Probably No estimates. Do not import it wholesale. `scripts/export-pam-bulk-matrix.mjs` can export the current runtime matrix for editing; its legacy flags explicitly do not certify factual review.

No report of COMPLETE is valid until both Parts A and B have source-checked per-target answers and exact/softened production gameplay tests, and CSV/JSON/runtime parity.
