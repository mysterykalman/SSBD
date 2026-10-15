#!/usr/bin/env python3
"""Extract English ConceptNet relations for Pam's existing SQLite concepts.

Use --parquet /path/to/*.parquet after downloading CleverThis/conceptnet.
No network access, SQLite mutations, or automatic gameplay answers.
"""
import argparse
import csv
import json
import sqlite3
from pathlib import Path
from urllib.parse import unquote

RELATIONS = (
    "IsA", "UsedFor", "AtLocation", "HasProperty", "MadeOf",
    "CapableOf", "PartOf", "HasA", "RelatedTo", "Synonym",
    "DistinctFrom", "Antonym", "Causes", "ReceivesAction",
)
PREFIX = "http://conceptnet.io/c/en/"
def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--parquet", required=True, help="Downloaded Parquet glob or file")
    p.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/conceptnet-extraction")
    p.add_argument("--memory", default="4GB")
    args = p.parse_args()
    import duckdb
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    baseline = Path(args.baseline)
    if not baseline.is_file():
        p.error("Baseline not found")
    sq = sqlite3.connect(f"file:{baseline}?mode=ro", uri=True)
    if sq.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        p.error("SQLite baseline integrity check failed")
    targets = out / "conceptnet-targets.csv"
    # Exact lexical matches only; ambiguous aliases are deliberately excluded.
    aliases = {}
    for row_id, name in sq.execute("SELECT row_id,name FROM concepts"):
        key = name.strip().casefold().replace(" ", "_")
        if key:
            aliases.setdefault(key, set()).add(row_id)
    for row_id, alias, ambiguous in sq.execute("SELECT concept_row_id,alias,ambiguous FROM aliases"):
        if ambiguous:
            continue
        key = alias.strip().casefold().replace(" ", "_")
        if key:
            aliases.setdefault(key, set()).add(row_id)
    with targets.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(("term", "concept_row_id"))
        for term, ids in sorted(aliases.items()):
            if len(ids) == 1:
                w.writerow((term, next(iter(ids))))
    sq.close()
    db = duckdb.connect(str(out / "conceptnet.duckdb"))
    db.execute(f"SET memory_limit='{args.memory}'")
    db.execute("SET threads=4")
    db.execute("SET preserve_insertion_order=false")
    db.execute("SET temp_directory=?", [str(out)])
    db.execute("CREATE OR REPLACE TABLE targets AS SELECT term, CAST(concept_row_id AS INTEGER) AS concept_row_id FROM read_csv_auto(?, all_varchar=true)", [str(targets)])
    # Preflight: do not silently accept a different dataset layout.
    columns = {r[0] for r in db.execute("DESCRIBE SELECT * FROM read_parquet(?)", [args.parquet]).fetchall()}
    if not {"subject", "predicate", "object"}.issubset(columns):
        p.error("Parquet must contain subject, predicate, object")
    relations = [("http://conceptnet.io/r/" + rel, rel) for rel in RELATIONS]
    db.execute("CREATE OR REPLACE TABLE relations(uri VARCHAR, relation VARCHAR)")
    db.executemany("INSERT INTO relations VALUES (?,?)", relations)
    print("Scanning English ConceptNet triples against baseline terms...", flush=True)
    # ConceptNet URIs may have /n, /v etc. POS is preserved as part of
    # source URI; join on the first concept segment only.
    db.execute("""
        CREATE OR REPLACE TABLE evidence AS
        WITH english AS (
          SELECT subject, predicate, object,
                 split_part(substr(subject, length(?) + 1), '/', 1) AS subject_term,
                 split_part(substr(object, length(?) + 1), '/', 1) AS object_term
          FROM read_parquet(?)
          WHERE starts_with(subject, ?) AND starts_with(object, ?)
        )
        SELECT DISTINCT t.concept_row_id, e.subject, r.relation,
               e.object, e.subject_term, e.object_term
        FROM english e
        JOIN targets t ON t.term = e.subject_term
        JOIN relations r ON e.predicate = r.uri
    """, [PREFIX, PREFIX, args.parquet, PREFIX, PREFIX])
    evidence = out / "conceptnet-evidence.parquet"
    db.execute("COPY (SELECT * FROM evidence ORDER BY concept_row_id, relation, object) TO ? (FORMAT PARQUET, COMPRESSION ZSTD)", [str(evidence)])
    count, concepts = db.execute("SELECT count(*),count(DISTINCT concept_row_id) FROM evidence").fetchone()
    db.execute("COPY (SELECT relation, count(*) AS relationships, count(DISTINCT concept_row_id) AS concepts FROM evidence GROUP BY relation ORDER BY relationships DESC) TO ? (FORMAT CSV, HEADER TRUE)", [str(out / "relation-coverage.csv")])
    db.execute("COPY (SELECT * FROM evidence WHERE relation IN ('UsedFor','AtLocation','HasProperty','CapableOf','MadeOf') ORDER BY concept_row_id LIMIT 500) TO ? (FORMAT CSV, HEADER TRUE)", [str(out / "everyday-sample.csv")])
    summary = {
        "source": "CleverThis/conceptnet (offline Parquet)",
        "baseline": str(baseline), "relationships": count, "concepts": concepts,
        "relations": list(RELATIONS), "language": "en-to-en",
        "weights_available": False, "mode": "evidence-only",
        "sqlite_modified": False, "runtime_modified": False,
        "output": str(out)
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    db.close()

if __name__ == "__main__":
    main()
