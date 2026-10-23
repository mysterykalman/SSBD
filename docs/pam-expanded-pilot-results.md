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
