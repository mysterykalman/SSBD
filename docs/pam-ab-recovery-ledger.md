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
The legacy extension profile gave `cold: yes` to `a snow leopard`, `a musk ox` and `an arctic fox` because they inhabit cold environments. The question `Is it cold?` refers to the thing itself, not its habitat. Removed the unsupported affirmative classification for all three targets; also removed the duplicate source-overlay assertion for the snow leopard. Removing those explicit affirmative overrides exposes the pre-existing hard-No fallback (`states.fill(2)`) in the 200-target extension compiler. These fallback negatives are **not independently reviewed** and must not be described as validated. A regression test confirms that the source-backed overlay itself no longer asserts an unsupported cold trait on an unknown synthetic input; the actual production profile still needs a known-mask repair and gameplay revalidation before its answer can be certified.
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

## Second reviewed factual-error batch (Part B research)
The 500-target unapproved source pool was cross-checked for explicit named contradictions. **100 distinct candidates** received **107 individual cell corrections**: 98 specifically enumerated four-limbed / two-legged animals were erroneously answered `No` to `Does it have legs?`; 4 fish-eating birds were misclassified as fish; 2 insect-eating vertebrates were misclassified as insects; a cormorant's carnivory was corrected; a bladderwort's nonexistent roots corrected; and jackfruit's commercial availability corrected. Details, old values, new values and evidence are recorded in `data/pam20q/research/quality-500-corrections-2026-10-19.json`.

This is a **trait-scoped factual correction batch**, not 100 fully validated 156-question rows. The wider 500-profile candidate dataset remains unapproved and is deliberately disconnected from live Pam. The new test verifies every correction and guards against reintroducing the audited contradictions. General anatomical facts were judged individually against the explicit target names, not used to populate all unexamined targets by category.

## Complete candidate-matrix structural audit (Part A, not factual certification)
Every one of the 1,775 diagnostic proposal rows was checked for row index, question length, state symbols and exact fingerprint collisions across 156 positions. Structural errors: **0**. Proposed state totals: Y 14,157, N 77,263, P 44,427, Q 141,053. There are **444** distinct proposed fingerprints; **1518** names participate in 187 duplicate-profile groups (maximum group size 67). The `Q` state represents **Probably No**, not independently verified absence or legitimate unknown. Raw source questions lack punctuation, but the runtime now appends `?` without altering IDs. Complete collision groups and all question distributions are in `data/pam20q/exports/phase3-candidate-structural-audit.json`.

**Do not confuse structural screening with Part A's required 1,775 individual × 156-question factual reviews.** No existing row has been certified fully reviewed by this audit, and this speculative candidate matrix is not imported into production.

## Recovered Part B research/question development implementation
Imported the existing 27 experimental Pam question, verified-evidence, editorial-review, and benchmark modules and five focused thematic tests from `feature/pam-thematic-1650-knowledge-lab`, preserving source blobs and keeping their original proof/approval gates. The 345-question draft-generator logic in `scripts/pam-thematic-lab.mjs` is therefore available alongside the original 1,650-theme roster and existing 156 classic questions. The draft count is an earlier experimental proposal, **not an approved 345-question bank**. `scripts/pam-merge-reviewed-expansion.mjs` refuses unreviewed source records, and the existing production `scripts/build-pam-classic.mjs` still loads only the original 1,775 classic targets. These modules are recovered for audit, not yet a merged production game.

## Production-pinned 1,200-base structural audit
Decoded the **actual** pinned binary `data/pam20q/reference/classic/weights.u2states.bin`, independently of all experimental candidate exports. Exactly **187,200** values across 1,200 targets and 156 questions, with **25451 Yes, 104334 No, 5759 Probably Yes and 51656 Probably No**. No invalid state values; all targets had an affirmative opening classification. **101** targets had more than one affirmative Animal/Vegetable/Mineral/Other classification. This does not necessarily mean an error, because the four historical categories can overlap. Other apparent exceptions are legitimate: `a cadaver` is classified mammal and not warm-blooded, and furniture and trouser legs need not have feet. All cases are in `data/pam20q/exports/pinned-1200-source-structural-audit.json`; `test/pam-pinned-source-audit.test.mjs` protects these known exceptions. This is structural and relationship review, **not** 1,200 individually source-verified target profiles.

The original 200 extension profiles remain unapproved for full factual accuracy because `scripts/pam-classic-model.mjs` seeds all unmentioned cells as hard No using `states.fill(2)`. Correcting this globally would alter gameplay and must be validated first. Unknown cells must not be converted to No merely for convenience.

## Checkpoint: complete-row reviews and live-data corrections (2026-10-20)
This checkpoint reviews all 156 original questions individually for **two named, pinned-classic targets**: `friendship` and `mail (snail mail)`. Both complete before/after answer sequences and notes are preserved in `data/pam20q/reviews/classic-batch-001.json`. The reviewer treated physical questions literally; flexible answers for subjective or variable traits were softened, rather than invented. The same file records **33 additional, named target/question corrections** with old states, new states, source question text, and individual rationales. It contains **96 changed answer cells** across 21 distinct pinned targets. Remaining unchanged values on the two complete rows have been considered question-by-question, but are not claims of independent third-party corroboration of every commonplace fact.

The new `applyReviewedPamCorrections` function is inserted at the end of the **actual production compilation chain** and the complete CSV exporter; its drift guard ensures only approved, explicitly named target/question cells are replaced. A regression test asserts all 312 full-review cells match recorded reviewed answers, every scoped correction applies, and no other weight or known-mask value changes. These are live edits, unlike the former 500-candidate corrections, but do not constitute a completed A+B integration.

**Updated factual progress:** Part A full target-row review 2/1,775 (312/276,900 review cells), 33 further scoped corrections; Part B target approvals remain 0; additional approved questions remain 0. Complete integrated 20Q gameplay and CI acceptance still require execution, with no unsupported passing claim.

## Checkpoint: full 156-question reviews expanded to 24 targets (2026-10-20)
An additional 22 concrete classic targets were reviewed individually against all 156 existing questions, including concepts, arts, money, physical behaviours and named colours, expanding the actual versioned **full-row review ledger to 24/1,775 targets (3744 question-by-target answers reviewed)**. The machine-readable review document stores an original and reviewed 156-position state sequence per named target, with interpretations and exceptions noted. The magic row is now complete, so its four former cell-only corrections were consolidated rather than duplicated. There are currently 29 remaining separate cell-specific corrections, and 124 changed live production answer cells in this batch. A specific historical source corroborates the movie's pre-1926 existence: https://www.history.com/this-day-in-history/december-28/first-commercial-movie-screened . This is source-specific review of the selected targets, not third-party verification of all 3,744 judgments.

**Part A is still incomplete**: 1751 original targets remain without complete 156-question review. The model-assisted reviews are versioned evidence, not a substitute for later release signoff, end-to-end game simulations, or the remaining Part B.
