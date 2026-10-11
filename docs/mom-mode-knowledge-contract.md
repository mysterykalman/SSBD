# Mom Mode knowledge contract

This file defines the frozen inputs and invariants for the Mom Mode knowledge build. Later enrichment and engine work must preserve these inputs unless there is an explicit product decision to replace them.

## Frozen inputs

### Master candidate inventory

The master candidate inventory contains exactly **50,000 unique canonical concepts**.

Composition at freeze time:

- Wikipedia Vital Articles: **49,460**
- Existing Pam knowledge used as non-duplicate top-up: **540**
- Total: **50,000**

Validation source file:

- `inventory.csv`
- rows including header: **50,001**
- SHA-256: `9b50c9924094fd5db3c599144f1443db0c294e4b0c1da82df776b70f0779aa1e`

Human-review workbook generated from the same inventory:

- `pam_50k_knowledge_inventory.xlsx`
- SHA-256: `26ee576f7a5bd117884d14d22b1e66e3a29743a2a921fb3ae28fadb14261b7c5`

The inventory is the candidate universe. Enrichment may add aliases, categories, traits, difficulty, and quality state, but must not silently replace, remove, rename, or reorder the frozen source without recording that as a deliberate inventory revision.

### Curated benchmark

The curated benchmark contains exactly **1,082 concepts** supplied for product validation.

Source workbook:

- `master_cultural_knowledge_pool.xlsx`
- SHA-256: `2b05c2b9f38995c3d3d2d4c3a58c9339e6673169d65d7b451dcb219198aaed55`

This set is the gold-standard human benchmark. It is not a random sample of the 50,000 and must not be diluted by generated concepts.

Current product targets:

| Difficulty | Pam target |
| --- | ---: |
| Core | 90–95% |
| Sweet Spot | ~90% |
| Hard but Fair | 80–85% |
| Long-tail / genuinely niche | lower is acceptable |

Pam should behave like a very knowledgeable, broadly informed adult, not a specialist in every field and not an omniscient search engine.

## Canonical concept schema

All future normalization and enrichment must conform to:

`src/client/mom-mode/knowledge.schema.json`

Required fields are:

- immutable `id`
- `canonical_name`
- `aliases`
- `category`
- `subcategory`
- `traits`
- `difficulty`
- `source`
- `quality_status`

Display names are not identifiers. Renaming a concept must not create a new concept ID.

## Mutation rules

1. The 50,000 inventory is read-only input during enrichment.
2. The 1,082 benchmark is read-only product truth during tuning.
3. Generated or enriched files are outputs and may be rebuilt, but only from an explicitly selected input revision.
4. No scheduled job or push-triggered workflow may commit a replacement knowledge snapshot.
5. `mom-knowledge-refresh.yml` is manual-only. A deliberate workflow dispatch is required before it can write `knowledge.generated.js`.
6. A future inventory revision must change the recorded hash and document the reason, counts added/removed, and benchmark impact.

## Current build boundary

The existing browser gameplay files (`knowledge.js`, `knowledge.general.js`, and `knowledge.generated.js`) remain the current runtime format. The canonical schema above is the contract for the new 50k normalization/enrichment pipeline. A later build step may compile canonical rows into the compact runtime `name/kind/yes/maybe/qid/weight` format used by the engine.
