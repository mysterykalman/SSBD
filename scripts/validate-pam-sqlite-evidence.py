#!/usr/bin/env python3
"""Audit Wikidata trait candidates against the immutable Pam SQLite baseline.

This is deliberately NOT an automatic approval step. Absence of a positive
answer is not evidence of a safe addition. The script never writes to SQLite.
"""
import argparse
import csv
import json
import sqlite3
from collections import Counter
from pathlib import Path

DOMAIN = {
    "city": {"place"}, "country": {"place"}, "mountain": {"place"},
    "water_place": {"place"}, "park": {"place"}, "building": {"place", "object"},
    "mammal": {"animal"}, "tree": {"plant"}, "flower": {"plant"},
    "film": {"media_work"}, "tv_series": {"media_work"},
    "novel": {"media_work"}, "book": {"media_work"},
    "play": {"media_work"}, "album": {"media_work"},
    "song": {"media_work"}, "painting": {"media_work"},
    "sculpture": {"media_work"}, "video_game": {"media_work"},
    "car": {"object"}, "vehicle": {"object"}, "aircraft": {"object"},
    "watercraft": {"object"}, "tool": {"object"}, "toy": {"object"},
    "furniture": {"object"}, "musical_instrument": {"object"},
}
# Domain categories are not always accurate; mismatches require human review,
# not an automatic 'conflict' or reassignment.
def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    p.add_argument("--candidates", default="/Volumes/Samsung_T5/Pam-Knowledge/trait-candidates/wikidata-trait-candidates.csv")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/sqlite-validation")
    args = p.parse_args()
    baseline, candidates, output = map(Path, (args.baseline, args.candidates, args.output))
    if not baseline.is_file() or not candidates.is_file():
        p.error("Missing baseline or candidates CSV")
    output.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(f"file:{baseline}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        p.error("Baseline integrity check failed")
    concepts = {r["row_id"]: dict(r) for r in db.execute(
        "SELECT row_id,concept_id,name,category FROM concepts"
    )}
    question_rows = list(db.execute(
        "SELECT question_index,question_id,wording,metadata_json FROM questions"
    ))
    # The baseline has no guaranteed one-to-one mapping from controlled trait
    # IDs to question IDs. Never guess a question by fuzzy wording.
    exact_questions = {}
    for q in question_rows:
        exact_questions.setdefault(q["question_id"], []).append(q["question_index"])
    answer_index = {}
    for r in db.execute("SELECT concept_row_id,question_index,answer FROM answers"):
        answer_index[(r["concept_row_id"], r["question_index"])] = r["answer"]

    results, counts = [], Counter()
    with candidates.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                cid = int(row["concept_row_id"])
            except (ValueError, KeyError):
                cid = -1
            concept = concepts.get(cid)
            trait = (row.get("trait") or "").strip()
            qid = (row.get("qid") or "").strip()
            if not concept or concept["concept_id"] != "wd:" + qid:
                status, reason = "needs-review", "concept-id-or-qid-mismatch"
            elif concept["category"] not in DOMAIN.get(trait, set()):
                status, reason = "needs-review", "domain-category-mismatch"
            else:
                matches = exact_questions.get(trait, [])
                if len(matches) != 1:
                    status, reason = "needs-review", "no-exact-trait-question-mapping"
                else:
                    answer = answer_index.get((cid, matches[0]))
                    if answer == "yes":
                        status, reason = "agree", "existing-exact-positive-answer"
                    elif answer == "no":
                        status, reason = "conflict", "existing-exact-negative-answer"
                    else:
                        status, reason = "needs-review", "no-established-answer"
            counts[status] += 1
            results.append({**row, "baseline_category": concept["category"] if concept else "",
                            "validation_status": status, "reason": reason})
    if not results:
        p.error("Candidate file is empty")
    fields = list(results[0])
    for label in ["all", "agree", "conflict", "needs-review"]:
        subset = results if label == "all" else [r for r in results if r["validation_status"] == label]
        with (output / (label + ".csv")).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(subset)
    summary = {
        "mode": "read-only-sqlite-validation",
        "candidates": len(results), "counts": dict(counts),
        "baseline_concepts": len(concepts),
        "questions": len(question_rows),
        "automatic_approvals": 0,
        "note": "Only exact trait/question ID matches are compared; no fuzzy matching, no inferred negatives.",
        "baseline_modified": False, "runtime_modified": False,
        "output": str(output),
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    db.close()

if __name__ == "__main__":
    main()
