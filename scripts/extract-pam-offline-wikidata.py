#!/usr/bin/env python3
"""Extract offline Wikidata evidence for Pam without changing the baseline.

Requires duckdb in the Python environment. All large outputs and temporary files
stay on the external volume. Does not overwrite answers or classifications.
"""
import argparse
import csv
import json
import shutil
import sqlite3
from pathlib import Path

PROPERTIES = {
    "P31": "instance of", "P279": "subclass of", "P361": "part of",
    "P527": "has part", "P186": "made from material",
    "P106": "occupation", "P495": "country of origin", "P136": "genre",
}
URI = "http://www.wikidata.org/entity/"
SUBJECTS = (
    "abstract", "actual_20q_answers", "animal", "common_concepts",
    "concrete_concepts", "event", "everyday_things", "food_drink",
    "media_work", "named_cultural_knowledge", "object", "organization",
    "person", "place", "plant", "unknown",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    parser.add_argument("--wikidata", default="/Volumes/Samsung_T5/Wikidata")
    parser.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/full-extraction")
    parser.add_argument("--memory", default="4GB")
    args = parser.parse_args()

    import duckdb

    baseline = Path(args.baseline)
    wikidata = Path(args.wikidata)
    output = Path(args.output)
    triplets = sorted((wikidata / "triplets").glob("part_*.parquet"))
    labels = wikidata / "extractions/entity_labels.parquet"
    if not baseline.is_file() or not labels.is_file() or len(triplets) != 81:
        raise SystemExit("Missing baseline, labels, or expected 81 triplet partitions.")
    if output.resolve() == baseline.parent.resolve():
        raise SystemExit("Output must be separate from the baseline directory.")
    output.mkdir(parents=True, exist_ok=True)
    (output / "temp").mkdir(exist_ok=True)

    sqlite = sqlite3.connect(f"file:{baseline}?mode=ro", uri=True)
    if sqlite.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        raise SystemExit("Baseline failed SQLite quick_check.")
    concepts = sqlite.execute(
        "SELECT row_id, substr(concept_id, 4), name, category "
        "FROM concepts WHERE concept_id GLOB 'wd:Q[0-9]*'"
    ).fetchall()
    if len(concepts) < 38000:
        raise SystemExit(f"Unexpected Wikidata concept count: {len(concepts)}")
    targets = output / "targets.csv"
    with targets.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(("concept_row_id", "qid", "name", "category"))
        writer.writerows(concepts)

    db = duckdb.connect(str(output / "extraction.duckdb"))
    db.execute(f"SET memory_limit='{args.memory}'")
    db.execute("SET threads=4")
    db.execute("SET preserve_insertion_order=false")
    db.execute("SET temp_directory=?", [str(output / "temp")])
    db.execute("CREATE OR REPLACE TABLE targets AS SELECT * FROM read_csv_auto(?, all_varchar=true)", [str(targets)])
    db.execute("CREATE OR REPLACE TABLE properties(property_id VARCHAR, property_name VARCHAR)")
    db.executemany("INSERT INTO properties VALUES (?, ?)", list(PROPERTIES.items()))

    print(f"Scanning {len(triplets)} partitions for {len(concepts):,} concepts...", flush=True)
    glob = str(wikidata / "triplets/part_*.parquet")
    db.execute("""
        CREATE OR REPLACE TABLE evidence_ids AS
        SELECT DISTINCT
            CAST(c.concept_row_id AS INTEGER) AS concept_row_id,
            c.qid, c.name, c.category,
            p.property_id, p.property_name,
            regexp_extract(t.object, '(Q[0-9]+)$', 1) AS object_qid
        FROM read_parquet(?) t
        JOIN targets c ON t.subject = ? || c.qid
        JOIN properties p ON t.predicate = 'http://www.wikidata.org/prop/direct/' || p.property_id
        WHERE starts_with(t.object, ?)
          AND regexp_full_match(regexp_extract(t.object, '(Q[0-9]+)$', 1), 'Q[0-9]+')
    """, [glob, URI, URI])
    count = db.execute("SELECT count(*) FROM evidence_ids").fetchone()[0]
    print(f"Extracted {count:,} distinct relationships.", flush=True)
    if count == 0:
        raise SystemExit("No direct-property matches. Check Wikidata predicate URI format.")

    print("Resolving object labels...", flush=True)
    db.execute("""
        CREATE OR REPLACE TABLE needed AS
        SELECT DISTINCT object_qid FROM evidence_ids
    """)
    db.execute("""
        CREATE OR REPLACE TABLE object_labels AS
        SELECT regexp_extract(l.entity, '(Q[0-9]+)$', 1) AS qid,
               min(l.label) AS label
        FROM read_parquet(?) l
        JOIN needed n ON l.entity = ? || n.object_qid
        WHERE l.label IS NOT NULL AND trim(l.label) <> ''
        GROUP BY 1
    """, [str(labels), URI])
    db.execute("""
        CREATE OR REPLACE VIEW labelled AS
        SELECT e.*, l.label AS object_label
        FROM evidence_ids e
        LEFT JOIN object_labels l ON e.object_qid = l.qid
    """)
    db.execute("COPY (SELECT * FROM labelled ORDER BY concept_row_id, property_id, object_qid) TO ? (FORMAT PARQUET, COMPRESSION ZSTD)", [str(output / "wikidata-evidence.parquet")])
    db.execute("COPY (SELECT * FROM labelled WHERE object_label IS NULL ORDER BY concept_row_id LIMIT 10000) TO ? (FORMAT CSV, HEADER TRUE)", [str(output / "missing-labels-sample.csv")])

    # All 16 subject tables are classifications, not answer tables.
    # Count by explicit membership, not merely by concepts.category.
    memberships = []
    for subject in SUBJECTS:
        table = "subject_" + subject
        n = sqlite.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0]
        memberships.append((subject, n))
        member_csv = output / f"members-{subject}.csv"
        with member_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(("concept_row_id",))
            writer.writerows(sqlite.execute(f'SELECT concept_row_id FROM "{table}"'))
        db.execute(f"""
            CREATE OR REPLACE TEMP TABLE member_{subject} AS
            SELECT CAST(concept_row_id AS INTEGER) AS concept_row_id
            FROM read_csv_auto(?, all_varchar=true)
        """, [str(member_csv)])
        member_csv.unlink()

    report = []
    for subject, total in memberships:
        matched, relationships, labelled = db.execute(f"""
            SELECT count(DISTINCT e.concept_row_id), count(*), count(e.object_label)
            FROM labelled e
            JOIN member_{subject} m USING(concept_row_id)
        """).fetchone()
        report.append({
            "subject": subject, "total_concepts": total,
            "concepts_with_evidence": matched,
            "relationships": relationships, "labelled_relationships": labelled,
        })
    with (output / "subject-coverage.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(report[0]))
        writer.writeheader()
        writer.writerows(report)

    # Candidate review only: no category changes or automatic answers.
    # Explicitly identify obvious science-vs-organization inconsistencies.
    db.execute("""
        COPY (
            SELECT concept_row_id, qid, name, category,
                   string_agg(DISTINCT object_label, '; ' ORDER BY object_label) AS wikidata_types
            FROM labelled
            WHERE category = 'organization'
              AND property_id IN ('P31', 'P279')
              AND lower(object_label) IN (
                  'nucleon', 'fermion', 'elementary particle', 'subatomic particle',
                  'chemical element', 'atom', 'molecule'
              )
            GROUP BY concept_row_id, qid, name, category
            ORDER BY name
        ) TO ? (FORMAT CSV, HEADER TRUE)
    """, [str(output / "classification-review.csv")])

    labelled_count = db.execute("SELECT count(object_label) FROM labelled").fetchone()[0]
    distinct_concepts = db.execute("SELECT count(DISTINCT concept_row_id) FROM labelled").fetchone()[0]
    summary = {
        "mode": "offline-evidence-only",
        "baseline": str(baseline),
        "baseline_modified": False,
        "concepts_with_wikidata_id": len(concepts),
        "concepts_with_evidence": distinct_concepts,
        "relationships": count,
        "labelled_relationships": labelled_count,
        "unlabelled_relationships": count - labelled_count,
        "subject_tables_audited": len(report),
        "properties": PROPERTIES,
        "outputs": ["wikidata-evidence.parquet", "subject-coverage.csv",
                    "classification-review.csv", "missing-labels-sample.csv"],
        "answers_modified": 0,
        "classifications_modified": 0,
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2), flush=True)
    db.close()
    sqlite.close()


if __name__ == "__main__":
    main()
