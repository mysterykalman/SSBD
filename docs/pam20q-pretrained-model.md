# Pam pre-trained 20 Questions model

## Purpose

This branch defines a one-time pretraining system for Pam, separate from production gameplay.

The model is a frozen matrix:

`concept × canonical question → probability an ordinary human answers YES`

The probabilities are behavioural rather than encyclopedic. The shipped runtime requires no LLM, API, database, or internet connection.

## Canonical question set

`data/pam20q/canonical-questions.json` contains 131 canonical questions selected from Pam's existing general questions and strongest controlled traits. The set favours broad information gain, intuitive human answers, semantic distinctness, and useful narrowing power.

Explicit hierarchy includes:

- `mammal → animal → living`
- `city → place`
- `aircraft → vehicle → object`
- `film → media_work`
- `song → music_work → media_work`

The checked-in fallback inventory currently parses to 52,640 concepts, producing 6,895,840 cells at 131 questions. The accepted Pam SQLite database is authoritative for a full build and may add concepts beyond that fallback inventory. Historical documentation that described 52,648 concepts should therefore not be treated as the build-time source of truth.

## Evidence precedence

The build database retains provenance for every evidence row. Cell precedence is:

1. accepted Pam SQLite evidence
2. verified external/offline evidence
3. safe hierarchy propagation
4. AI estimates

Accepted evidence cannot be overwritten by AI. Missing data remains unknown. Absence of evidence never becomes a negative.

Accepted answers are converted to probabilities as follows:

- Yes: 0.99
- No: 0.01
- Sometimes / depends: 0.50

Confidence is stored separately from probability.

## Existing external evidence

The current Pam runtime already contains known cells compiled from the static Wikidata and public-source pipeline, including ConceptNet, WordNet, CSKG, and curated inputs.

Export those known cells into the new normalized evidence format with:

```bash
python3 scripts/pam20q/export-runtime-evidence.py
```

This writes `.dev-data/pam20q/existing-runtime-evidence.csv`. Additional offline CSV or JSONL evidence can be supplied with repeated `--external` arguments.

Normalized evidence fields are:

```text
concept_id,concept,question_id,probability,confidence,source
```

`answer` can be used instead of `probability` with Yes/No/Sometimes semantics.

## Accepted SQLite input

The builder supports both normalized and wide historical Pam SQLite layouts.

A normalized table can contain:

```text
concept_id,name,question_id,answer
```

or a numeric `probability`, `value`, or `response` field.

A wide table can contain `concept_id` or `name` plus question-ID columns. Known legacy question IDs are mapped to canonical IDs where safe. The source database is never modified.

## AI enrichment

AI enrichment occurs only during the one-time build. Strong accepted and external cells are not re-asked. Unknown and weak cells are batched by concept, and every completed request/response is cached in `.dev-data/pam20q/build.sqlite` using a deterministic request hash.

The prompt asks for ordinary-human 20 Questions behaviour, including common-use interpretations such as tomato/vegetable and fictional-character/person ambiguity.

Each estimate is normalized to:

```json
{
  "concept": "airplane",
  "question_id": "flies",
  "yes_probability": 0.995,
  "confidence": 0.99
}
```

## Consistency

Strong positive subtype evidence propagates upward through safe hierarchy edges. A strong `aircraft` probability can therefore support `vehicle`, then `object`.

If a strong child conflicts with a strong parent negative, the conflict is recorded in the `contradictions` table. Strong accepted or verified external parent evidence is never silently overwritten.

No child negatives are inferred from missing parent evidence, and no source absence is converted to No.

## Build commands

Export existing runtime evidence:

```bash
python3 scripts/pam20q/export-runtime-evidence.py
```

Validate ingestion and compilation without AI:

```bash
python3 scripts/pam20q/build.py \
  --source-db /path/to/accepted-pam.sqlite \
  --external .dev-data/pam20q/existing-runtime-evidence.csv \
  --skip-ai \
  --reset
```

Inspect the first AI batch without sending it:

```bash
python3 scripts/pam20q/build.py \
  --source-db /path/to/accepted-pam.sqlite \
  --external .dev-data/pam20q/existing-runtime-evidence.csv \
  --dry-run-ai \
  --max-ai-batches 1 \
  --reset
```

Run the full one-time enrichment:

```bash
OPENAI_API_KEY=... \
PAM20Q_MODEL=gpt-6-astra \
python3 scripts/pam20q/build.py \
  --source-db /path/to/accepted-pam.sqlite \
  --external .dev-data/pam20q/existing-runtime-evidence.csv \
  --reset
```

If interrupted, rerun without `--reset`. Completed AI batches are reused.

## Frozen artifact

The compiler writes:

- `.dev-data/pam20q/compiled/pam20q.v1.bin.gz`
- `.dev-data/pam20q/compiled/pam20q.v1.manifest.json`
- `.dev-data/pam20q/report.json`

The matrix is concept-major and uses one byte per cell before gzip compression:

- `0..254`: YES probability, decoded as `byte / 254`
- `255`: unknown

The binary has a 16-byte header. Concept and question IDs are dictionary-encoded in the manifest, which also carries a SHA-256 checksum. Gzip output is deterministic.

## Report

`report.json` contains:

- total concepts
- canonical question count
- total concept/question cells
- cells seeded from accepted Pam data
- cells inferred from hierarchy
- cells supported by external sources
- cells estimated by AI
- unresolved cells
- contradiction count
- compiled artifact size
- raw matrix size
- compiled SHA-256

The source-specific counts are finalized only when the authoritative accepted Pam SQLite database and selected offline evidence files are supplied.

## Production isolation

Nothing in this branch changes Pam's current game engine, service worker, runtime loader, or production knowledge files. Generated artifacts stay under `.dev-data/` until a separate production-integration decision is made.
