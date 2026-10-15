#!/usr/bin/env python3
"""Compare Pam baseline SQLite with an isolated enriched candidate.

Reports only measurable database-level changes. Does not mutate either database
and does not pretend to run game logic that is not available in SQLite.
"""
import argparse
import csv
import json
import sqlite3
from collections import Counter
from pathlib import Path


def load_db(path: Path):
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        raise SystemExit(f"Integrity check failed: {path}")
    counts = {
        "concepts": con.execute("SELECT count(*) FROM concepts").fetchone()[0],
        "answers": con.execute("SELECT count(*) FROM answers").fetchone()[0],
        "facets": con.execute("SELECT count(*) FROM facets").fetchone()[0],
        "questions": con.execute("SELECT count(*) FROM questions").fetchone()[0],
    }
    answer_counts = dict(con.execute("SELECT answer,count(*) FROM answers GROUP BY answer").fetchall())
    by_concept = dict(con.execute("SELECT concept_row_id,count(*) FROM answers GROUP BY concept_row_id").fetchall())
    qids = {r["question_index"]: r["question_id"] for r in con.execute("SELECT question_index,question_id FROM questions")}
    return con, counts, answer_counts, by_concept, qids


def answer_rows(con):
    return {
        (int(r[0]), int(r[1]), str(r[2]))
        for r in con.execute("SELECT concept_row_id,question_index,answer FROM answers")
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    p.add_argument("--candidate", default="/Volumes/Samsung_T5/Pam-Knowledge/enriched-candidate/pam-enriched-candidate.sqlite")
    p.add_argument("--applied", default="/Volumes/Samsung_T5/Pam-Knowledge/enriched-candidate/applied.csv")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/enriched-benchmark")
    args = p.parse_args()

    baseline, candidate, applied = map(Path, (args.baseline, args.candidate, args.applied))
    if not baseline.is_file() or not candidate.is_file() or not applied.is_file():
        p.error("Missing baseline, candidate, or applied.csv")
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    bcon, bcounts, bans, bby, bq = load_db(baseline)
    ccon, ccounts, cans, cby, cq = load_db(candidate)

    baseline_rows = answer_rows(bcon)
    candidate_rows = answer_rows(ccon)
    added = candidate_rows - baseline_rows
    missing = baseline_rows - candidate_rows

    with applied.open(newline="", encoding="utf-8") as f:
        applied_rows = list(csv.DictReader(f))

    added_yes = [r for r in added if r[2] == "yes"]
    changed_concepts = sorted({r[0] for r in added})
    per_question = Counter(cq.get(r[1], str(r[1])) for r in added_yes)
    per_concept_gain = {cid: cby.get(cid, 0) - bby.get(cid, 0) for cid in changed_concepts}

    with (out / "added-answers.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["concept_row_id", "question_index", "question_id", "answer"])
        for cid, qidx, ans in sorted(added, key=lambda r: (r[0], r[1], r[2])):
            w.writerow([cid, qidx, cq.get(qidx, ""), ans])

    with (out / "missing-answers.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["concept_row_id", "question_index", "question_id", "answer"])
        for cid, qidx, ans in sorted(missing, key=lambda r: (r[0], r[1], r[2])):
            w.writerow([cid, qidx, bq.get(qidx, ""), ans])

    with (out / "question-gains.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["question_id", "added_yes"])
        for qid, n in per_question.most_common():
            w.writerow([qid, n])

    summary = {
        "mode": "read-only-baseline-vs-candidate-benchmark",
        "baseline_counts": bcounts,
        "candidate_counts": ccounts,
        "baseline_answer_counts": bans,
        "candidate_answer_counts": cans,
        "added_answer_rows": len(added),
        "added_yes_rows": len(added_yes),
        "missing_or_changed_baseline_rows": len(missing),
        "changed_concepts": len(changed_concepts),
        "applied_csv_rows": len(applied_rows),
        "question_gains": dict(per_question),
        "max_added_answers_per_concept": max(per_concept_gain.values(), default=0),
        "integrity": "pass" if not missing and bcounts["concepts"] == ccounts["concepts"] and bcounts["questions"] == ccounts["questions"] else "fail",
        "baseline_modified": False,
        "candidate_modified": False,
        "note": "This is a database-level benchmark only. Gameplay/runtime quality still requires a separate game-facing A/B test."
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    bcon.close(); ccon.close()

if __name__ == "__main__":
    main()
