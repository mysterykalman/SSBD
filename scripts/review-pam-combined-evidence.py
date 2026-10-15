#!/usr/bin/env python3
"""Produce read-only, reviewable ConceptNet + Wikidata enrichment reports.

Never guesses semantic mappings from natural-language questions; only exact
question IDs qualify for automatic agreement/conflict checks.
"""
import argparse
import csv
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path

FACT = {"IsA", "UsedFor", "AtLocation", "HasProperty", "MadeOf", "CapableOf", "PartOf", "HasA", "ReceivesAction"}
ASSOCIATION = {"RelatedTo", "Synonym"}
CAUTION = {"Antonym", "DistinctFrom", "Causes"}
MAX_PER_CONCEPT_RELATION = 25


def sql_literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    p.add_argument("--conceptnet", default="/Volumes/Samsung_T5/Pam-Knowledge/conceptnet-extraction/conceptnet-evidence.parquet")
    p.add_argument("--wikidata", default="/Volumes/Samsung_T5/Pam-Knowledge/sqlite-validation/all.csv")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/combined-enrichment")
    p.add_argument("--memory", default="4GB")
    p.add_argument("--threads", type=int, default=4)
    args = p.parse_args()
    import duckdb

    baseline, evidence, wikidata = map(Path, (args.baseline, args.conceptnet, args.wikidata))
    if not all(x.is_file() for x in (baseline, evidence, wikidata)):
        p.error("Missing baseline, ConceptNet Parquet, or Wikidata validation CSV")
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    sq = sqlite3.connect(f"file:{baseline}?mode=ro", uri=True)
    sq.row_factory = sqlite3.Row
    if sq.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        p.error("SQLite integrity check failed")
    concepts = {r["row_id"]: (r["name"], r["category"]) for r in sq.execute("SELECT row_id,name,category FROM concepts")}
    question_ids = defaultdict(list)
    for r in sq.execute("SELECT question_index,question_id FROM questions"):
        question_ids[r["question_id"]].append(r["question_index"])
    answers = {}
    for r in sq.execute("SELECT concept_row_id,question_index,answer FROM answers"):
        answers[(r["concept_row_id"], r["question_index"])] = r["answer"]
    sq.close()

    db = duckdb.connect()
    db.execute(f"SET memory_limit={sql_literal(args.memory)}")
    db.execute(f"SET threads={int(args.threads)}")
    db.execute(f"SET temp_directory={sql_literal(str(out))}")
    db.execute(f"CREATE VIEW evidence AS SELECT * FROM read_parquet({sql_literal(str(evidence))})")

    ranked = out / "ranked-conceptnet-evidence.parquet"
    db.execute(f"""
      COPY (
        SELECT *, row_number() OVER (
          PARTITION BY concept_row_id, relation ORDER BY object
        ) AS evidence_rank
        FROM evidence
      ) TO {sql_literal(str(ranked))} (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    counts = dict(db.execute("SELECT relation,count(*) FROM evidence GROUP BY relation").fetchall())
    concept_count = db.execute("SELECT count(DISTINCT concept_row_id) FROM evidence").fetchone()[0]
    total = sum(counts.values())

    sample = db.execute(f"""
      SELECT concept_row_id, relation, subject_term, object_term, subject, object
      FROM evidence
      WHERE relation IN ('IsA','UsedFor','AtLocation','HasProperty','MadeOf','CapableOf','PartOf','HasA','ReceivesAction')
      QUALIFY row_number() OVER (
        PARTITION BY concept_row_id, relation ORDER BY object
      ) <= {MAX_PER_CONCEPT_RELATION}
      ORDER BY concept_row_id,relation,object
    """).fetchall()

    with (out / "conceptnet-factual-review.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["concept_row_id","concept_name","baseline_category","relation","subject_term","object_term","subject_uri","object_uri","status","reason"])
        reviewed = 0
        for cid, relation, subj, obj, subj_uri, obj_uri in sample:
            name, category = concepts.get(cid, ("", ""))
            w.writerow([cid,name,category,relation,subj,obj,subj_uri,obj_uri,"needs-review","no-verified-question-mapping"])
            reviewed += 1

    with (out / "conceptnet-relation-summary.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["relation","relationships","handling"])
        for relation, count in sorted(counts.items(), key=lambda x: -x[1]):
            handling = "fact-review" if relation in FACT else ("association-only" if relation in ASSOCIATION else "caution-no-answer-promotion")
            w.writerow([relation,count,handling])

    wd = Counter()
    wd_examples = []
    with wikidata.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            status = r.get("validation_status", "unknown")
            wd[status] += 1
            if status == "needs-review":
                wd_examples.append(r)

    with (out / "wikidata-classification-review.csv").open("w", newline="", encoding="utf-8") as f:
        fields = list(wd_examples[0]) if wd_examples else ["validation_status"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(r for r in wd_examples if r.get("reason") == "domain-category-mismatch")

    summary = {
      "mode":"read-only-combined-review",
      "baseline_concepts":len(concepts),
      "conceptnet_relationships":total,
      "conceptnet_concepts":concept_count,
      "conceptnet_fact_relationships":sum(v for k,v in counts.items() if k in FACT),
      "conceptnet_association_relationships":sum(v for k,v in counts.items() if k in ASSOCIATION),
      "conceptnet_factual_review_rows":reviewed,
      "conceptnet_factual_review_cap_per_concept_relation":MAX_PER_CONCEPT_RELATION,
      "wikidata_validation":dict(wd),
      "wikidata_classification_review_rows":sum(r.get("reason") == "domain-category-mismatch" for r in wd_examples),
      "auto_promoted":0,
      "sqlite_modified":False,
      "runtime_modified":False,
      "next_step":"Map specific question IDs and adjudicate conflicts before creating a candidate runtime."
    }
    (out / "summary.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps(summary,indent=2))
    db.close()


if __name__ == "__main__":
    main()
