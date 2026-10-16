# Pam pre-trained 20 Questions model

## Purpose

This branch defines a one-time pretraining system for Pam. It is intentionally separate from production gameplay.

The model is a frozen matrix:

`concept × canonical question → probability an ordinary human answers YES`

The probability is behavioural rather than encyclopedic. A value near 1 means a typical player would strongly tend to answer Yes. A value near 0 means a typical player would strongly tend to answer No. A value around 0.5 represents genuine ambiguity or "sometimes" behaviour.

The shipped runtime requires no LLM, API, database, or internet connection.

## Canonical question set

`data/pam20q/canonical-questions.json` contains 131 canonical questions. The set consolidates the existing broad and everyday Pam questions with the strongest controlled subtype questions from `scripts/mom-controlled-traits.mjs`.

The selection favours questions that split large parts of the candidate set, are intuitive for ordinary players, and add distinct information. Narrow trivia questions and highly correlated variants are intentionally excluded.

Important hierarchy relationships are explicit in the question metadata, including:

- `mammal → animal → living`
- `city → place`
- `aircraft → vehicle → object`
- `film → media_work`
- `song → music_work → media_work`

With the current 52,648-concept inventory, the target matrix contains 6,896,888 concept/question cells.

## Evidence precedence

The build database retains provenance for every evidence row. Cell precedence is:

1. accepted Pam SQLite evidence
2. verified external/offline evidence
3. safe hierarchy propagation
4. AI estimates

Accepted evidence therefore cannot be overwritten by AI. Missing data is always unknown. Absence of evidence never becomes a negative.

Accepted answers are converted as follows:

- Yes: 0.99
- No: 0.01
- Sometimes / depends: 0.50

The associated confidence is stored separately from the probability.

## Existing public-source evidence

The repository's current Pam runtime already contains known cells compiled from the existing static Wikidata and public-source pipeline, including ConceptNet, WordNet, CSKG, and curated inputs.

Run:

```bash
python3 scripts/pam20q/export-runtime-evidence.py
```

This writes `.dev-data/pam20q/existing-runtime-evidence.csv`. It can be supplied to the new pretrainer as supporting external evidence. Additional normalized offline evidence CSV or JSONL files can be passed with repeated `--external` arguments.

External evidence format:

```text
concept_id,concept,question_id,probability,confidence,source
```

`answer` may be supplied instead of `probability` using Yes/No/Sometimes semantics.

## Accepted SQLite input

The builder intentionally supports more than one historical Pam SQLite layout.

A normalized table may contain:

```text
concept_id, name, question_id, answer
```

or a numeric `probability`/`value`/`response` field.

A wide table may contain `concept_id` or `name` plus question-ID columns. Known legacy question IDs are mapped to the new canonical IDs where safe.

No source row is modified. Imported provenance is stored in the local build database.

## AI enrichment

AI enrichment is a build-time operation only. The builder sends only cells that are unknown or weakly supported. Strong accepted and external cells are not re-asked.

Requests are grouped by concept and aggressively batched. Each response is cached in the local build SQLite database using a deterministic request hash. Re-running an interrupted build reuses completed batches.

The prompt explicitly asks for ordinary-human 20 Questions behaviour, including common-use interpretations such as tomato/vegetable and fictional-character/person ambiguity.

The structured result for each estimated cell is equivalent to:

```json
{
  "concept": "airplane",
  "question_id": "flies",
  "yes_probability": 0.995,
  "confidence": 0.99
}
```

The API response is normalized into the evidence table before compilation.

## Consistency rules

Strong positive subtype evidence is propagated upward through safe hierarchy edges. For example, a high probability for `aircraft` can establish a high probability for `vehicle` and then `object`.

If a strong child conflicts with a strong parent negative, the conflict is recorded in the `contradictions` table. Strong accepted or verified external parent evidence is never silently overwritten.

The builder does not infer child negatives from parent absence and does not manufacture negative facts from missing source data.

## Building

First export the existing runtime evidence:

```bash
python3 scripts/pam20q/export-runtime-evidence.py
```

A no-AI structural build is useful for validating ingestion and compilation:

```bash
python3 scripts/pam20q/build.py \
  --source-db /path/to/accepted-pam.sqlite \
  --external .dev-data/pam20q/existing-runtime-evidence.csv \
  --skip-ai \
  --reset
```

To inspect the first AI request without sending it:

```bash
python3 scripts/pam20q/build.py \
  --source-db /path/to/accepted-pam.sqlite \
  --external .dev-data/pam20q/existing-runtime-evidence.csv \
  --dry-run-ai \
  --max-ai-batches 1 \
  --reset
```

For the full one-time enrichment:

```bash
OPENAI_API_KEY=... \
PAM20Q_MODEL=gpt-6-astra \
python3 scripts/pam20q/build.py \
  --source-db /path/to/accepted-pam.sqlite \
  --external .dev-data/pam20q/existing-runtime-evidence.csv \
  --reset
```

If the process is interrupted, rerun the same command without `--reset`. Completed AI batches are reused from `.dev-data/pam20q/build.sqlite`.

## Frozen artifact

The compiler writes:

- `.dev-data/pam20q/compiled/pam20q.v1.bin.gz`
- `.dev-data/pam20q/compiled/pam20q.v1.manifest.json`
- `.dev-data/pam20q/report.json`

The binary matrix is concept-major and uses one byte per cell before gzip compression:

- `0..254`: YES probability, decoded as `byte / 254`
- `255`: unknown

The uncompressed 52,648 × 131 matrix is 6,896,888 bytes plus a 16-byte header. The final compressed size is measured by the build report rather than estimated.

The manifest dictionary-encodes concept and question IDs and includes a SHA-256 checksum. Compilation is deterministic, including deterministic gzip timestamps.

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

The source-specific counts cannot be finalized until the accepted Pam SQLite database and the selected external evidence files are supplied to the build. The known inventory-level baseline is 52,648 concepts, 131 canonical questions, and 6,896,888 total cells.

## Production isolation

Nothing in this branch changes Pam's current game engine, service worker, runtime loader, or production knowledge files. The generated artifact stays under `.dev-data/` until a separate production-integration decision is made.
