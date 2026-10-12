# Static Wikidata enrichment

Wikidata is optional enrichment for Pam. The normal 50k build must never depend on the live Wikidata API.

The normal pipeline reads local CSV files from `data/mom/wikidata/shards/` and compiles them into the existing `.dev-data/trait-sources/wikidata-labelled-evidence.json` contract. If the directory is empty or missing, the build continues without Wikidata.

## CSV format

Each row is one fact. Required columns are `concept` plus either `trait`, or both `property` and `value`.

Recommended columns:

```csv
concept,qid,property,value,trait,confidence
Nintendo Switch,Q19610114,manufacturer,Nintendo,manufacturer:Nintendo,1
Albert Einstein,Q937,occupation,physicist,occupation:physicist,1
```

`qid` and `confidence` are optional. Identical concept/property/trait rows are deduplicated deterministically.

## Working with a larger export

Put a spreadsheet export at `data/mom/wikidata/master.csv`, then run:

```bash
node scripts/shard-mom-wikidata-csv.mjs
```

By default this creates CSV shards of 500 concepts under `data/mom/wikidata/shards/`. Change the shard size with `MOM_WIKIDATA_CSV_SHARD_CONCEPTS`.

Build the offline evidence pack with:

```bash
node scripts/build-mom-static-wikidata.mjs
```

If `master.csv` exists the builder uses it directly; otherwise it reads the checked-in shard CSVs. It makes zero network requests.

The legacy live extractor remains in `scripts/extract-mom-wikidata-labelled-traits.mjs` only as a one-off/manual refresh utility. It is not part of the normal 50k CI path.
