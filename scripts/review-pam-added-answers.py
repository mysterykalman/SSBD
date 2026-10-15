#!/usr/bin/env python3
"""Produce a human-reviewable report for the 37 newly added Pam answers.

Read-only. Joins added answers back to concept names/categories and available
source candidate evidence so we can decide which additions are credible before
any runtime integration.
"""
import argparse
import csv
import json
import sqlite3
from collections import defaultdict
from pathlib import Path


def load_csv(path):
    with Path(path).open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    p.add_argument("--added", default="/Volumes/Samsung_T5/Pam-Knowledge/enriched-benchmark/added-answers.csv")
    p.add_argument("--clean", default="/Volumes/Samsung_T5/Pam-Knowledge/clean-candidates/clean-candidate-traits.csv")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/added-answer-review")
    args = p.parse_args()

    baseline = Path(args.baseline)
    added_path = Path(args.added)
    clean_path = Path(args.clean)
    for path in (baseline, added_path, clean_path):
        if not path.is_file():
            p.error(f"Missing input: {path}")

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(f"file:{baseline}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        p.error("Baseline integrity check failed")

    concepts = {
        int(r["row_id"]): {
            "name": r["name"],
            "concept_id": r["concept_id"],
            "category": r["category"],
            "subcategory": r["subcategory"],
        }
        for r in con.execute("SELECT row_id,concept_id,name,category,subcategory FROM concepts")
    }
    con.close()

    clean_rows = load_csv(clean_path)
    evidence = defaultdict(list)
    for r in clean_rows:
        try:
            key = (int(r["concept_row_id"]), r["trait"])
        except (KeyError, ValueError):
            continue
        evidence[key].append(r)

    added_rows = load_csv(added_path)
    review = []
    missing_evidence = 0
    for r in added_rows:
        cid = int(r["concept_row_id"])
        qid = r["question_id"]
        concept = concepts.get(cid, {})
        evs = evidence.get((cid, qid), [])
        if not evs:
            missing_evidence += 1
        sources = sorted({e.get("source", "") for e in evs if e.get("source")})
        statuses = sorted({e.get("status", "") for e in evs if e.get("status")})
        review.append({
            "concept_row_id": cid,
            "concept_name": concept.get("name", ""),
            "concept_id": concept.get("concept_id", ""),
            "baseline_category": concept.get("category", ""),
            "baseline_subcategory": concept.get("subcategory", ""),
            "question_id": qid,
            "added_answer": r["answer"],
            "sources": "|".join(sources),
            "candidate_statuses": "|".join(statuses),
            "candidate_evidence_rows": len(evs),
            "decision": "REVIEW",
            "notes": "",
        })

    fields = [
        "concept_row_id", "concept_name", "concept_id", "baseline_category",
        "baseline_subcategory", "question_id", "added_answer", "sources",
        "candidate_statuses", "candidate_evidence_rows", "decision", "notes"
    ]
    with (out / "review.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(review)

    with (out / "review.txt").open("w", encoding="utf-8") as f:
        for row in review:
            f.write(
                f"{row['concept_row_id']} | {row['concept_name']} | "
                f"{row['baseline_category']} | {row['question_id']}=yes | "
                f"sources={row['sources'] or 'unknown'} | "
                f"evidence_rows={row['candidate_evidence_rows']}\n"
            )

    summary = {
        "mode": "read-only-human-semantic-review",
        "added_rows": len(review),
        "changed_concepts": len({r["concept_row_id"] for r in review}),
        "rows_with_candidate_evidence": len(review) - missing_evidence,
        "rows_missing_candidate_evidence": missing_evidence,
        "automatic_approvals": 0,
        "baseline_modified": False,
        "runtime_modified": False,
        "next_step": "Review these additions for semantic correctness before promotion or game-facing A/B integration."
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
