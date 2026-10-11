# Mom Mode Phase 4 Benchmark Results

## Scope

Phase 4 repaired the curated benchmark categorization/harness and evaluated the complete curated gold set. The source contains 1,082 rows, which normalize to 1,081 canonical concepts because of one normalization collision.

The benchmark now treats `Harder but fair` as a **Primary Category**, not as a tier. It contains 15 concepts.

## Before baseline

The trusted Phase 2 representative general-knowledge baseline was **7/16 wins (43.8%)** using the corrected harness.

This 16-item score is retained as the development baseline. It is not presented as equivalent to the 1,081-item curated benchmark.

## Full curated benchmark

The final Phase 4 evaluation accounted for all 1,081 canonical rows and self-played every concept that is currently present in runtime knowledge.

| Metric | Result |
| --- | ---: |
| Curated canonical concepts | 1,081 |
| Runtime knowledge concepts | 4,801 |
| Curated concepts present at runtime | 173 |
| Curated concepts missing at runtime | 908 |
| Curated coverage | 16.0% |
| Pam wins among runtime-present concepts | 3 / 173 |
| Present-item win rate | 1.7% |
| Overall curated win rate | 0.3% |
| Runtime-present concepts that ended stumped | 170 / 173 |

The three runtime-present wins were **Mona Lisa**, **Venus de Milo**, and **Lego**.

### Quality-gate groups

| Group | Total | Present | Coverage | Wins | Win rate among present |
| --- | ---: | ---: | ---: | ---: | ---: |
| Core + Core/Sweet overlap | 1,005 | 158 | 15.7% | 3 | 1.9% |
| Sweet Spot + overlap | 123 | 18 | 14.6% | 0 | 0.0% |
| Harder but fair | 15 | 0 | 0.0% | 0 | n/a |

The configured quality gates are therefore **not met**. This is a real product/data result and must not be hidden by treating absent evidence as `No`, by inserting answer-specific benchmark traits, or by weakening the thresholds.

## Systemic findings

1. **Coverage is the dominant failure.** The checked-in runtime knowledge covers only 173 of the 1,081 curated concepts. The optional controlled-profile artifact was not present in the sandbox used for this run. The deterministic 50k pipeline exists, but its generated evidence/profile artifacts are development data and are not part of the checked-in runtime bundle evaluated here.

2. **Sparse evidence is the dominant deduction failure for concepts that are present.** 170 of 173 runtime-present concepts reached the 20-question limit without a safe guess. Phase 3 correctly stopped treating missing traits as negative evidence, exposing how little discriminating evidence many existing records actually contain.

3. **Unknown-vs-No must not be reverted to improve the score.** Doing so would manufacture false certainty and would make the benchmark look better for the wrong reason.

4. **Harder but fair is now measured correctly.** All 15 rows are classified by Primary Category. None are present in the current runtime knowledge, so the old vacuous/empty-category pass is eliminated.

5. **Benchmark runtime is material.** A two-shard evaluation of the 173 runtime-present rows took roughly 24 minutes per shard in parallel. During development, focused concept traces and targeted tests should remain the normal loop; the complete benchmark is a phase/release gate.

## Phase 4 conclusion

The benchmark harness itself is now trustworthy enough to expose the real state: Phase 3 fixed the semantics regression, but the current runtime knowledge does **not** yet meet the curated coverage or deduction-quality targets. Phase 4 does not mask this failure. The remaining gap is primarily a knowledge/evidence population problem and belongs to the next authorized work after Phase 4.

No Phase 5 work is included in this checkpoint.
