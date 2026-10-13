# Mom Mode knowledge system

Mom Mode is a challenge game: the player wins by **stumping Pam**. Pam gets at most 20 turns. A question costs one turn and a wrong guess also costs one turn. A wrong guess is not terminal: that candidate is eliminated and Pam keeps reasoning with the remaining budget.

## Intelligence target

Pam should feel like a very knowledgeable, broadly informed adult or teacher, not an omniscient search engine and not a specialist in every field. Common and culturally familiar concepts should be difficult to use as stumps. Truly niche concepts should remain plausible wins for the player.

The current product targets are:

| Choice | Pam target |
| --- | ---: |
| Core | 90–95% win rate |
| Sweet Spot | ~90% |
| Hard but Fair | 80–85% |
| Long-tail / genuinely niche | lower is acceptable |

These are calibration targets, not hard-coded random failure rates. Pam does not throw games. She loses because the candidate universe, player answers, available discriminators, and 20-turn budget leave real uncertainty.

The frozen input definitions, hashes, mutation rules, and canonical schema are recorded in `docs/mom-mode-knowledge-contract.md`.

## Data architecture

Gameplay never queries Wikipedia or Wikidata. The browser loads local knowledge tables and the engine reasons against those local candidates.

Current runtime files are:

- `src/client/mom-mode/knowledge.js`
- `src/client/mom-mode/knowledge.general.js`
- `src/client/mom-mode/knowledge.generated.js`

The compact runtime row shape is currently based on:

- `name`
- `kind`
- `yes` / `maybe` trait IDs
- optional `qid`
- a mild `weight` used as a commonness prior
- source metadata

The new 50k normalization and enrichment pipeline must use the canonical schema in:

`src/client/mom-mode/knowledge.schema.json`

A later build step may compile canonical rows into the compact runtime shape used by the browser.

Question definitions are a separate feature table. Category-specific questions use `requires` gates, so Pam establishes a broad branch before asking detailed follow-ups. For example, birth year, nationality, and occupation questions stay locked until the player has confirmed that the answer is a specific real person.

## Frozen knowledge inputs

Two inputs are now product truth:

1. A **50,000-concept master candidate inventory** for breadth.
2. A **1,082-concept curated benchmark** for product quality and calibration.

Enrichment may add aliases, traits, taxonomy, difficulty, and quality state. It must not silently redefine either frozen input.

## Wikimedia refresh

A legacy/manual snapshot refresh remains available through:

```bash
npm run mom:knowledge
```

The GitHub workflow `.github/workflows/mom-knowledge-refresh.yml` is **manual-only**. It has no scheduled trigger and no push trigger. This prevents generated knowledge from being silently rewritten by CI while the 50k pipeline is being normalized and benchmarked.

Wikidata structured data is CC0. The gameplay snapshot uses structured Wikidata fields rather than copying Wikipedia article prose.

## Engine scaling

The engine evaluates question usefulness from sparse trait mass instead of scanning a dense concept × trait matrix for every possible question. This keeps question choice practical as the table grows into thousands of concepts.

The 50k integration will preserve the same principle but should narrow hierarchically before fine-grained questioning rather than treating all 50,000 concepts as one undifferentiated flat set.

Common entities receive only a mild prior advantage. This makes obvious answers easier without letting popularity overwhelm the player's actual responses.

## Win and loss rules

- Maximum: 20 turns.
- Questions and guesses both consume turns.
- A correct guess ends the game with a Pam win.
- A wrong guess removes that concept and play continues.
- If Pam exhausts the 20-turn budget without a confirmed answer, the player **stumps Mom**.
- `Probably`, `Probably not`, and `Not sure` remain soft/noisy evidence rather than being flattened into hard yes/no.
