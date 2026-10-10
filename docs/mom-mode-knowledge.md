# Mom Mode knowledge system

Mom Mode is a challenge game: the player wins by **stumping Pam**. Pam gets at most 20 turns. A question costs one turn and a wrong guess also costs one turn. A wrong guess is not terminal: that candidate is eliminated and Pam keeps reasoning with the remaining budget.

## Intelligence target

Pam should feel like a smart, broadly informed adult or teacher, not an omniscient search engine. Common concepts should be hard to use as stumps. Clever, ambiguous, obscure, or genuinely niche concepts should remain winnable.

The intended product curve is roughly:

| Choice | Pam target |
| --- | ---: |
| Very common | 90–95% win rate |
| Normal family-game concept | 75–85% |
| Clever but fair | 55–70% |
| Obscure | 30–50% |
| Extremely niche / outside the snapshot | <20% |

These are calibration targets, not hard-coded random failure rates. Pam does not throw games. She loses because the candidate universe, player answers, available discriminators, and 20-turn budget leave real uncertainty.

## Data architecture

Gameplay never queries Wikipedia or Wikidata. The browser loads a local generated table:

`src/client/mom-mode/knowledge.generated.js`

That table is merged with the hand-authored core knowledge in `knowledge.js`. The generated row shape is intentionally small:

- `name`
- `kind`
- `yes` / `maybe` trait IDs
- optional `qid`
- a mild `weight` used as a commonness prior
- source metadata

Question definitions are a separate feature table. Category-specific questions use `requires` gates, so Pam establishes a broad branch before asking detailed follow-ups. For example, birth year, nationality, and occupation questions stay locked until the player has confirmed that the answer is a specific real person.

## Wikimedia refresh

Run:

```bash
npm run mom:knowledge
```

The refresh script queries Wikidata for notable English-Wikipedia entities and builds a static snapshot. The default targets are 5,000 people, 1,500 fictional characters, and 2,500 places/landmarks. It derives game-friendly traits such as:

- living / deceased status
- gender when Wikidata explicitly supplies it
- broad occupation domain
- repeated occupations
- country association
- birth decade / broad era
- fictional universe and recurring entity type
- place type, country, and continent

The weekly/manual GitHub workflow `.github/workflows/mom-knowledge-refresh.yml` refreshes the snapshot, runs tests and a production build, and commits the new generated table when it changes.

Wikidata structured data is CC0. The gameplay snapshot uses structured Wikidata fields rather than copying Wikipedia article prose.

## Engine scaling

The engine evaluates question usefulness from sparse trait mass instead of scanning a dense concept × trait matrix for every possible question. This keeps question choice practical as the table grows into thousands of concepts.

Common entities receive only a mild prior advantage. This makes obvious answers easier without letting popularity overwhelm the player's actual responses.

## Win and loss rules

- Maximum: 20 turns.
- Questions and guesses both consume turns.
- A correct guess ends the game with a Pam win.
- A wrong guess removes that concept and play continues.
- If Pam exhausts the 20-turn budget without a confirmed answer, the player **stumps Mom**.
- `Probably`, `Probably not`, and `Not sure` remain soft/noisy evidence rather than being flattened into hard yes/no.
