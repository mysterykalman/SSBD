# Pam static knowledge database

This directory introduces a **staging schema**, not a populated production brain. No gameplay runtime has been switched.

## Architecture

- `schema.sql` defines the canonical SQLite 3 relational model.
- Each subject has a dedicated entity table. Shared `concepts` IDs allow one concept to belong to multiple subjects.
- `facts` records explicit `yes`, `no`, `unknown`, or `qualified` answers. Missing records are **unknown**, never false.
- `evidence` and `fact_evidence` retain source attribution, even when a fact is rejected.
- `releases` and `release_facts` describe immutable, approved knowledge snapshots.
- Generic vs named-entity identity is kept distinct. Aliases are never automatically proof of identity.

## Migration sequence (not yet performed)

1. Preserve the currently shipped runtime and its baseline audit in an immutable snapshot.
2. Export **all available checked-in** concept inventories, question definitions, runtime facts, controlled profiles, and static Wikidata into intermediate records. Do not call live knowledge APIs.
3. Preserve original IDs, QIDs, provenance, explicit negatives, question gates, and unresolved conflicts. Do not overwrite an existing fact when sources disagree; create a review item.
4. Validate per subject: row counts, referential integrity, identity collisions, missingness, category conflicts, and approved answer coverage.
5. Validate overall against production baseline (including zero-knowledge concepts, root-category conflicts, and the deterministic 1,081-game benchmark). Reject regressions.
6. Produce a compact read-only browser runtime from the **approved** SQLite snapshot, with a reproducible checksum.
7. Switch Pam to the snapshot only after tests pass. Keep the previous runtime available for rollback.

## Guardrails

- No CI job should fetch external datasets to produce production gameplay knowledge.
- A subject can be updated independently, but the published release must pass global checks.
- Do not publish a release with unreviewed conflicting facts.
- Do not treat the latest failed rebuild as the authoritative knowledge source.
- Keep database build/edit tools separate from the shipped browser runtime.

## Example query

```sql
SELECT c.canonical_name, q.wording, f.answer, f.qualification
FROM facts AS f
JOIN concepts AS c ON c.concept_id = f.concept_id
JOIN questions AS q ON q.question_id = f.question_id
WHERE c.concept_id = ? AND f.status = 'approved';
```

This schema is the first implementation step. **Data migration, audit tooling, browser integration, and production release remain pending.**
