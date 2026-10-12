# Mom Runtime Intelligence Inventory

Baseline branch: `integration/all-current-work`
Baseline SHA: `6a58eff818853801c96538ec21f818c14f95f30a`

This document freezes the intelligence-integration starting point for the full Mom playable demo. It distinguishes what is already live in the browser from what exists only in the development pipeline.

## Runtime-live intelligence

| Layer | Runtime status | Current source |
| --- | --- | --- |
| Base everyday 20Q knowledge | Live | `src/client/mom-mode/knowledge.js` |
| Curated/general knowledge | Live | `src/client/mom-mode/knowledge.general.js` |
| Generated Wikidata snapshot | Live | `src/client/mom-mode/knowledge.generated.js` |
| Bayesian belief/update engine | Live | `src/client/mom-mode/engine.js` |
| Natural question ranking | Live | `src/client/mom-mode/deduction.js` |
| Structured facet compiler | Live | `src/client/mom-mode/facets.js` |
| Yes / No / Maybe / Unknown semantics | Live | `engine.js` truth matrix, with missing evidence retained as unknown |
| Hunch / confidence / one-guess rules | Live | `engine.js` |
| Mom browser adapter/game loop | Live | `adapter.js`, `app.js` |
| Hashed/minified Mom build assets | Live | `scripts/build.mjs` |

The generated snapshot report currently records 4,545 generated concepts and 831 generated question traits. This is useful for engineering validation but is not the full intelligence target.

## Pipeline intelligence not yet live in the browser

| Layer | Pipeline status | Current source/output |
| --- | --- | --- |
| Deterministic playable 50k inventory | Implemented, development-only | `scripts/build-mom-playable-50k.mjs` -> `.dev-data/mom-playable-50k/playable_50k.jsonl` |
| Controlled trait taxonomy | Implemented | `scripts/mom-controlled-traits.mjs` |
| Full trait/evidence coverage analysis | Implemented, development-only output | `scripts/analyze-mom-trait-coverage.mjs` -> `.dev-data/mom-trait-coverage/evidence.jsonl` |
| Public extra trait extraction | Implemented | `scripts/extract-mom-extra-public-traits.py` |
| Labelled Wikidata trait extraction | Implemented | `scripts/extract-mom-wikidata-labelled-traits.mjs` |
| Controlled-profile compilation | Implemented, development-only output | `scripts/build-mom-controlled-profiles.mjs` -> `.dev-data/mom-controlled-profiles/mom-controlled-profiles.json` |
| Full-evidence sidecar | Implemented, development-only output | `.dev-data/mom-controlled-profiles/all-evidence.jsonl` |
| 50k aliases from candidate reconciliation | Implemented in pipeline | `mom-playable-candidates.mjs` / playable inventory |
| 50k structured facets | Schema/plumbing started | `facets` supported through candidate/profile pipeline, but broad source population remains incomplete |
| 50k human-likelihood priors | Not yet compiled for runtime | Existing candidate scores/weights can provide inputs, but category-balanced runtime priors are not built |
| Full curated benchmark against 50k runtime | Not yet possible | Current benchmark documents only partial runtime coverage because controlled profiles were absent |

## Critical integration gap

`.dev-data` is intentionally not committed. The production `npm run build` currently consumes only checked-in browser source files. There is no build step that converts the deterministic 50k inventory plus controlled profiles into a compact deployable runtime artifact.

Therefore, the next architecture must create a deterministic **runtime compiler** whose output is safe to check in or regenerate reliably before the browser build. The browser must not depend directly on raw `.dev-data` evidence files.

## Source-of-truth rules to preserve

1. Missing evidence remains Unknown. It must never be converted to No merely to improve benchmark results.
2. Explicit and safe inferred negatives may become No only where the relationship is defensible.
3. Full evidence remains a development/audit source. The browser runtime should contain only the compact facts required to play.
4. The existing curated/base/general knowledge must be merged into the 50k runtime rather than discarded.
5. Aliases may validate or resolve a secret answer but must never leak the secret into Pam's belief state.
6. Database row counts must not determine starting probability mass. Runtime priors need broad-category balancing plus concept-level commonness.
7. Dynamic facets are ordinary questions in the same Bayes truth matrix, not answer-specific special cases.

## Next step

Define the compact runtime concept/question schema and deterministic compiler contract before attempting to package the 50k knowledge into the browser.
