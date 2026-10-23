# Pam expanded-knowledge gameplay pilot (research only)

This checkpoint runs a real, reproducible 20-question inference simulation with 16 named subjects from **cities, people, films and brands**. It does **not** approve these subjects against the 1,650 frozen roster, and is not wired into production.

| Test measure | Result |
|---|---:|
| Distinct pilot targets | 16 |
| Reusable topic and distinguishing questions | 24 |
| Candidate × question combinations | 384 |
| Explicitly known answers | 144 |
| Properly unknown answers | 240 |
| Exact-answer games correctly solved | **16/16** |
| One softened third-answer games correctly solved | **16/16** |
| Questions needed | **7 per target** |

Examples of actual successful guesses: Paris, Toronto, Albert Einstein, Marie Curie, Jurassic Park (1993 film), The Matrix (1999 film), Apple Inc., and LEGO.

Data: `data/pam20q/expansion/thematic-pilot-16.json`.
Model adapter: `scripts/pam-thematic-pilot.mjs`.
Repeatable tests: `test/pam-thematic-pilot.test.mjs` using the real `scripts/pam-thematic-reasoner.mjs`.

**Important boundary:** The pilot has only 16 subjects, and those names/attributes have not been individually corroborated against authoritative source documents. It tests whether question-based recognition can work with explicitly scoped knowledge, not whether 1,352 new subjects are production ready or identifiable among 1,775 original targets. To move beyond the pilot, reconcile IDs with the frozen roster, source-check each positive/negative cell, then run the same engine on the full combined model and its unknown masks.

## Subsequent question-selection correction
The real thematic reasoning module applied a severe 97.5% repeated-family penalty after **just one** prior question, because `every()` was true for a one-item history. This favoured poorly scoped questions about cities while Pam was identifying people and films. Corrected the rule to require **at least two earlier same-family questions** before applying that penalty.

Reran the full 16-target pilot before and after this isolated code change:

| Metric | Before | After |
|---|---:|---:|
| Exact games identified | 16/16 | 16/16 |
| Soft-answer games identified | 16/16 | 16/16 |
| Average questions | 7 | 7 |
| Out-of-scope / unknown answers | 8 | **4** |

This improves question relevance without adding unsupported knowledge. Added a repeatable regression assertion to the pilot test. This change affects the **experimental thematic reasoner**, not the live legacy Pam engine.
