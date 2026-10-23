# Full recovered 1,650-roster reconciliation and all-cohort benchmark

This is the next step beyond the hand-picked 16-target pilot. It uses the **actual frozen 1,650-target thematic roster**, **all 1,775 original targets** and the real experimental question compilation and oracle logic.

Run locally from the repository root:

```bash
node --test test/pam-real-roster-benchmark.test.mjs
node scripts/pam-real-roster-benchmark.mjs artifacts/pam-real-roster-benchmark.json
```

It produces the exact-name overlaps with the old game, real net new target count, per-category breakdown, question-bank size, known/unknown cells, identical-answer signatures, and per-target exact and softened attempts across all 1,650 candidates. The full trials are saved separately for diagnosis. The process fails on any malformed roster, unexpected shape or duplicate.

**What it cannot prove:** names in the frozen roster have not been individually approved, semantic question facts are inferred from existing workbook labels, and games run in the thematic experimental engine rather than in a fully merged 1,775+1,650 production engine. No changes to live answers, production questions, or UI result from this diagnostic. Do not call the new targets production ready until those factual and integration gates are passed.
