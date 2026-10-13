# Static Wikidata knowledge

Wikidata is a checked-in, static knowledge source for Pam. Normal brain builds use the local dataset and never contact the live Wikidata API.

The canonical source is `data/mom/wikidata/master.csv.gz`. `scripts/build-mom-static-wikidata.mjs` reads it and compiles `.dev-data/trait-sources/wikidata-labelled-evidence.json`, which is consumed by the controlled-profile and runtime pipeline.

The static source is required. If it is missing, malformed, or produces no usable records, the build fails instead of silently dropping Wikidata knowledge.

## CSV format

Each row is one fact. Required columns are `concept` plus either `trait`, or both `property` and `value`.

Recommended columns:

```csv
concept,qid,property,value,trait,confidence
Nintendo Switch,Q19610114,manufacturer,Nintendo,manufacturer:Nintendo,1
Albert Einstein,Q937,occupation,physicist,occupation:physicist,1
```

`qid` and `confidence` are optional. Identical concept/property/trait rows are deduplicated deterministically.

## Updating the static dataset

For maintenance, place an uncompressed export at `data/mom/wikidata/master.csv` and use:

```bash
node scripts/shard-mom-wikidata-csv.mjs
```

The sharder can produce smaller human-readable CSV files under `data/mom/wikidata/shards/`. The production source should then be regenerated as `master.csv.gz` and committed.

Build the evidence pack with:

```bash
node scripts/build-mom-static-wikidata.mjs
```

The builder reports `networkRequests: 0`. There is no live Wikidata fetch step in the normal or manual knowledge workflows.
