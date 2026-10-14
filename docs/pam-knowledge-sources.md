# Pam knowledge sources

Pam's runtime should be rebuilt from durable source evidence. Do not hand-edit `knowledge.runtime.json` as the source of truth.

## ConceptNet

Status: already integrated.

`analyze-mom-trait-coverage.mjs` streams the local ConceptNet 5.7 assertions dump from:

`.dev-data/trait-sources/conceptnet-assertions-5.7.0.csv.gz`

Useful relations currently include `IsA`, `InstanceOf`, `HasProperty`, `UsedFor`, `CapableOf`, `HasA`, `PartOf`, `AtLocation`, `MadeOf`, `CreatedBy`, `DefinedAs`, and `ReceivesAction`.

The local dump is preferred to the public API for the 50k build. Lexical matching is routed through the identity-aware resolver so ambiguous names are not silently attached to an arbitrary QID concept.

## Open English WordNet

Status: integrated and hardened.

Run:

```bash
npm run mom:wordnet
```

The extractor uses Open English WordNet 2025+. It now:

- treats WordNet as generic lexical knowledge and skips QID/named entities
- uses one lexical sense rather than combining several homonyms
- follows hypernyms for `IsA` hierarchy
- extracts part, substance, and member meronyms
- extracts part, substance, and member holonyms
- records the selected synset ID with the evidence

Output:

`.dev-data/trait-sources/wordnet-evidence.json`

## CSKG

Status: identity-safe extractor added.

Place the published CSKG KGTK edge file at:

`.dev-data/trait-sources/cskg/cskg.tsv.gz`

Then run:

```bash
npm run mom:cskg
```

The extractor streams the TSV directly. KGTK is not required at runtime.

Supported relations currently include:

- `IsA`
- `HasA`
- `PartOf`
- `UsedFor`
- `CapableOf`
- `AtLocation`
- `HasProperty`
- `MadeOf`
- `CreatedBy`
- `LocatedNear`

CSKG evidence is merged into:

`.dev-data/trait-sources/extra-public-evidence.json`

Identity rules:

- Wikidata/QID nodes only match the same QID.
- Generic ConceptNet-style `/c/en/...` nodes prefer a generic non-QID concept.
- An ambiguous generic label is skipped rather than guessed.
- Safe inverse relations such as `PartOf` are converted into useful parent evidence where appropriate.

## Recommended build order

1. Build or refresh the playable inventory.
2. Generate WordNet evidence.
3. Keep the local ConceptNet dump available for trait analysis.
4. Generate other public evidence such as Visual Genome/PACO.
5. Merge CSKG evidence.
6. Run trait coverage analysis and controlled-profile compilation.
7. Compile `knowledge.runtime.json`.
8. Run `npm run mom:audit` and gameplay benchmarks.

## Design rule

Source graphs provide evidence, not final game answers. All evidence should continue through Pam's controlled trait mapper, safe-negative logic, identity resolution, and runtime compiler before it affects gameplay.
