# Pam20Q classic public-reference evaluation

## Status

The classic public model has been imported as pinned build-time reference data. No production gameplay files depend on Hugging Face, and AI enrichment was not run.

The authoritative Pam SQLite baseline remains `/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite` with 53,092 concepts. That file is intentionally outside GitHub, so the checked-in remote validation cannot enumerate the 452 SQLite-only identities. `scripts/pam20q/reconcile_inventory.py` produces the required deterministic 452-row explanation on the machine that has the baseline.

## Public reference

- Source: `david-ar/20q` at revision `2363b1f67ed554275dc2bd14032390325aa7ae29`
- Public questions: 156
- Public targets: 1200
- Matrix cells: 187,200
- Published model SHA-256: `2951edb8c699882522bb7bf5d473a9dba7b7e6ec9d0b61e7e131633c2e22b72c`
- Imported weight SHA-256: `3912f5798b7a802d8e158d262913445c54a85a66dd4749da6a6e6e8c3ac8e1d7`
- Four states: weak no, weak yes, strong no, strong yes; Pam keeps unknown separate.

## Question vocabulary

- Current Pam questions: 131
- Public questions: 156
- Exact equivalents: 9
- Semantic equivalents: 16
- Partial overlaps: 30
- Genuinely useful public additions: 20
- Redundant public questions: 32
- Poor-fit public questions: 49
- Proposed final Pam vocabulary: 150
- Pam questions retained without a useful public equivalent: 98

The final vocabulary keeps Pam’s named-entity/media questions and adds only broad classic physical/common-sense splits. The complete 156-row classification is in `docs/pam20q-public-reference/question-comparison.csv`.

## Public target mapping

- Exact matches: 147
- Safe normalized matches: 852
- Safe alias matches: 14
- Ambiguous matches: 0
- Unmatched targets: 187
- Safely mapped targets: 1013
- Public matrix cells available as seed evidence on this fallback-inventory validation: 44,572
- Public/Pam disagreements found against existing runtime evidence: 1221

These mapping counts are conservative and are regenerated against the 53,092-concept SQLite inventory when the local reconciliation command is run. Distinct concept IDs/QIDs are never merged solely because names normalize to the same text.

## Representation benchmark

- uint8 reference artifact: 187,200 raw bytes, 38,657 gzip bytes
- 2-bit reference artifact: 46,800 raw bytes, 33,998 gzip bytes
- 20-question win rate, uint8: 99.8%
- 20-question win rate, 2-bit: 99.8%
- 25-question win rate, uint8: 99.8%
- 25-question win rate, 2-bit: 99.8%
- Median successful turn, uint8 / 2-bit: 10 / 10
- Average successful turn, uint8 / 2-bit: 10.31 / 10.31
- Stumped rate at 25, uint8 / 2-bit: 0.2% / 0.2%
- Selected-question path disagreements: 0

The public source itself only has four states, so its uint8 form is a lossless expansion of those same four states. This benchmark proves encoding fidelity, not that future continuous AI probabilities can be collapsed to 2 bits without loss. Pam therefore keeps uint8 as the default until a populated Pam matrix can demonstrate equivalent gameplay after quantization.

## Full Pam structural size

At 53,092 concepts × 150 questions, Pam has 7,963,800 cells.
- uint8 dense matrix: 7,963,800 bytes before compression/header
- 2-bit values: 1,990,950 bytes
- Separate unknown mask: 995,475 bytes
- 2-bit + unknown mask: 2,986,425 bytes before compression/header

## Current seeded build, no AI

- Validation inventory concepts: 52,640
- Questions: 150
- Accepted SQLite cells: 0 (0 in remote CI because the accepted SQLite is local)
- Curated cells: 0
- Verified external cells: 269,210
- Public 20Q cells: 38,434
- Hierarchy cells: 83
- AI cells: 0
- Remaining unknown cells in fallback validation: 7,588,273
- Estimated remaining unknown cells at authoritative 53,092-concept scale: approximately 7,653,431
- Compiled uint8 gzip artifact in fallback validation: 81,845 bytes

No large-scale AI generation has been launched. The exact authoritative unknown-cell count, 452-row inventory report, authoritative public target mapping, and authoritative disagreement count are produced by the local baseline run before any API spend.
