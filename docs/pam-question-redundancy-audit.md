# Pam 20 Questions question-selection redundancy audit

## Scope

This audit is limited to Pam's 20 Questions question-selection intelligence. It starts from the validated Pam knowledge bookmark `6ee0062` and treats the 1,775-target knowledge model as frozen.

The audit covers all 156 questions and all 1,775 targets. Natural-play simulations answer each question from the frozen matrix and commit Pam's first confidence hunch. The existing defer-and-recover test behaviour remains a separate regression gate for exact model quality.

## Baseline

At `6ee0062`, Pam's natural first-hunch performance across all 1,775 targets was:

| Metric | Baseline |
| --- | ---: |
| Correct first hunches | 1,754 / 1,775 |
| Accuracy | 98.82% |
| Average trait questions | 10.900 |
| Median trait questions | 11 |
| Average prompts including category | 11.900 |
| Median prompts including category | 12 |
| P90 prompts | 14 |
| P95 prompts | 15 |
| Maximum prompts | 20 |

Prompt-count distribution, including the opening category prompt:

| Prompts | Games |
| ---: | ---: |
| 8 | 52 |
| 9 | 93 |
| 10 | 161 |
| 11 | 521 |
| 12 | 390 |
| 13 | 264 |
| 14 | 155 |
| 15 | 51 |
| 16 | 66 |
| 17 | 5 |
| 20 | 17 |

All 375 protected quality targets were already correct on the first hunch. The baseline had 1,379 / 1,400 first-hunch correctness among the original 1,400 targets.

## What was repetitive

A broad family audit grouped questions that can feel repetitive when asked close together, such as size, colour, sound, life/anatomy, aquatic traits, temperature, food/taste, and related animal traits.

Across baseline simulations:

- 3,190 broad semantic-family repeat events occurred.
- 1,516 / 1,775 games, or 85.41%, revisited at least one broad semantic family.
- 736 repeat events occurred one question later, 643 two questions later, and 520 three questions later.
- 1,899 / 3,190 broad family repeats, or 59.53%, occurred within three question turns.
- True hard-twin occurrences were much rarer: 6 events in 6 games, or 0.34% of games.

This makes the problem primarily one of sequencing and clustering, rather than a question bank filled with literal duplicates.

### Where repetition concentrated

| Segment | Games | First-hunch accuracy | Avg prompts | Games with broad family repeat |
| --- | ---: | ---: | ---: | ---: |
| Animal | 348 | 95.69% | 10.833 | 79.02% |
| Vegetable | 142 | 97.18% | 10.451 | 92.96% |
| Mineral | 60 | 100.00% | 9.750 | 86.67% |
| Other | 1,225 | 99.84% | 12.476 | 86.29% |
| Original 1,200 | 1,200 | 98.33% | 11.488 | 85.17% |
| 200-target extension | 200 | 99.50% | 12.830 | 75.00% |
| Protected quality 375 | 375 | 100.00% | 12.723 | 91.73% |

The protected 375 showed the highest repeat density by cohort, while vegetable targets showed the highest repeat rate by category. Animal targets had the weakest baseline first-hunch accuracy, which argues against aggressive suppression rules that could remove useful discriminators.

## Verified semantic relationships

Wording alone was not enough to decide which questions should suppress one another. Each candidate pair was checked against the complete answer matrix and against actual simulated games.

Selected examples:

| Pair | Matrix polarity disagreement | Phi | Baseline game occurrence | Typical spacing |
| --- | ---: | ---: | ---: | --- |
| Makes noise / can be heard | 3.61% | 0.9081 | 10 | 4 adjacent, 7 within 3 turns |
| Alive / living | 3.72% | 0.9012 | 2 | gaps 1 and 3 |
| Warm-blooded / mammal | 3.89% | 0.8438 | 23 | all 23 adjacent |
| Feathers / wings | 1.52% | 0.7631 | 6 | 5 at gap 2 |
| Lives in water / salt-water | 2.03% | 0.7138 | 5 | 4 within 3 turns |
| Burn / combustible | 5.18% | 0.6990 | 4 | all within 3 turns |
| See through / clear | 2.48% | 0.7310 | 1 | adjacent |
| Fluffy / furry | 7.61% | 0.4173 | 1 | gap 2 |

The clearest real-play issue was `Is it warm blooded` followed by `Is it a mammal`: the pair appeared in 23 games and was adjacent in all 23.

### Answer-vector similarity

A stricter vector screen required at least 1,200 jointly known targets, at least 50 positive-union targets, phi of at least 0.85, and Jaccard overlap of at least 0.75. It identified six strongly correlated pairs, including noise/heard, alive/living, eat/tasty, spine/feet, warm-blooded/spine, and legs/feet.

Vector similarity was useful for discovering relationships, but it was rejected as a global production suppression rule. Correlation can reflect the target taxonomy rather than conversational redundancy. A data-only rule therefore risks suppressing distinct questions that happen to partition the 1,775 targets similarly.

## Logical implication audit

Several implications are very reliable in the frozen matrix:

| Implication | Support | Violation rate |
| --- | ---: | ---: |
| Bigger than sofa -> bigger than microwave | 265 | 0.00% |
| Not bigger than microwave -> not bigger than sofa | 1,209 | 0.00% |
| Mammal -> has a spine | 206 | 0.00% |
| Mammal -> warm blooded | 206 | 0.97% |
| Mammal -> alive | 206 | 0.49% |
| Smaller than golf ball -> smaller than loaf | 207 | 0.97% |

However, many intuitively obvious English implications are not reliable enough in the frozen matrix:

| Proposed implication | Violation rate |
| --- | ---: |
| Hot -> warm | 47.58% |
| Cold -> cool | 53.77% |
| Placed on head -> worn on head | 72.04% |
| Worn on head -> placed on head | 16.13% |
| Salt-water -> lives in water | 15.09% |
| Type of dog -> mammal | 27.78% |
| Rings -> makes noise | 17.65% |
| Produces light -> bright | 33.33% |

The reliable implication follow-ups also occurred infrequently in actual play. Broad implication suppression would therefore add rule complexity while creating avoidable conflict with the frozen model. It was not selected for production.

## Selector experiments

The safe design principle was to keep Pam's existing information score authoritative and treat repetition only as a secondary conversational preference.

Seven initial variants and six fine-tuning variants were simulated across all 1,775 targets. More aggressive family penalties reduced repetition further, but the experiment rejected any configuration that introduced a new previously-correct first-hunch miss.

The selected configuration uses:

- the original balance, certainty, and coverage score unchanged;
- a 99% information-score floor, so only questions scoring within 1% of the original best question may be reranked;
- mild temporary family penalties for related questions asked 1 to 3 question turns ago;
- stronger temporary penalties for 12 manually verified semantic pairs asked 1 to 4 question turns ago;
- no hard semantic suppression;
- no production implication rules;
- no global vector-similarity penalty;
- no changes to the knowledge matrix, answer weights, candidate-pool construction, hunch thresholds, or scoring rules.

### Selected before and after

The selected experiment, `fine-floor99-pairs`, produced:

| Metric | Baseline | Selected | Change |
| --- | ---: | ---: | ---: |
| Correct first hunches | 1,754 | 1,756 | +2 |
| First-hunch accuracy | 98.82% | 98.93% | +0.11 pp |
| Protected 375 first hunches | 375 / 375 | 375 / 375 | unchanged |
| Original 1,400 first hunches | 1,379 | 1,381 | +2 |
| New first-hunch regressions | 0 | 0 | unchanged |
| Average prompts | 11.900 | 11.904 | +0.004 |
| Median prompts | 12 | 12 | unchanged |
| Close targeted-family repeats | 929 | 836 | -10.0% |
| Verified semantic-pair events | 59 | 31 | -47.5% |
| Close verified semantic-pair events | 52 | 20 | -61.5% |
| Games with a verified semantic pair | 3.10% | 1.75% | -43.5% |
| Warm-blooded / mammal games | 23 | 2 | -91.3% |

The average-length increase is 0.004 prompts, equivalent to roughly seven additional questions across all 1,775 simulated games. This is operationally negligible, while the targeted repetitive sequences fall materially.

## Implementation

Production selection now computes the same base information score as before. It records the original best question, admits only candidates within 99% of that score into the conversational reranker, then applies recency penalties for verified families and semantic pairs. If no near-tied alternative is better after the penalty, the original information leader remains selected.

This structure keeps deduction primary and conversational variety secondary.

No hard pair is permanently removed. This is intentional. Even apparent twins such as alive/living and burn/combustible have non-zero disagreement in the frozen answer matrix, so permanent suppression could discard information the validated model currently relies on.

## Regression protection

`test/pam-question-redundancy.test.mjs` adds dedicated protections for this behaviour:

1. Natural first-hunch simulation across all 1,775 targets, with no new miss allowed relative to the `6ee0062` baseline.
2. 375 / 375 protected quality targets required to remain first-hunch correct.
3. Average prompt count capped at the safe tuning envelope.
4. Close targeted-family repetition capped below the baseline.
5. Close verified semantic-pair repetition capped below the baseline.
6. Warm-blooded / mammal occurrence capped at three games.
7. All 375 protected quality targets required to remain exact when one strong yes and one strong no are softened.

The branch CI also verifies that `data/pam20q` is unchanged from `6ee0062`, then runs the complete test suite and production build.

## Recommendation

Keep the selected near-tie reranker as the production approach for this branch. The audit does not support deleting traits, broad hard suppression, a general implication engine, or a global vector-similarity penalty.

The selected rule directly addresses the playtest complaint while maintaining Pam's existing deduction model. Future redundancy tuning should be evidence-led: add or adjust a semantic relationship only when it is both conversationally redundant and observed in matrix/simulation evidence, then rerun the same per-target regression gates.
