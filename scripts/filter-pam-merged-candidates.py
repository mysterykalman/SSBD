#!/usr/bin/env python3
"""Quarantine unsafe merged traits without modifying the immutable baseline.

This is a conservative staging filter, not a proof of semantic correctness.
"""
import argparse
import csv
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path

DOMAINS = {
    "person": "person", "real_person": "person", "actor": "person",
    "musician": "person", "athlete": "person", "politician": "person",
    "scientist": "person", "writer": "person", "artist": "person", "chef": "person",
    "animal": "animal", "mammal": "animal", "bird": "animal", "fish": "animal",
    "reptile": "animal", "amphibian": "animal", "insect": "animal",
    "plant": "plant", "tree": "plant", "flower": "plant",
    "place": "place", "city": "place", "country": "place", "mountain": "place",
    "park": "place", "water_place": "place", "building": "place", "landmark": "place",
    "object": "object", "vehicle": "object", "car": "object", "aircraft": "object",
    "watercraft": "object", "device": "object", "tool": "object",
    "furniture": "object", "clothing": "object", "toy": "object",
    "container": "object", "weapon": "object", "musical_instrument": "object",
    "food_drink": "food_drink", "drink": "food_drink", "meat": "food_drink",
    "fruit_food": "food_drink", "vegetable_food": "food_drink",
    "media_work": "media_work", "film": "media_work", "tv_series": "media_work",
    "book": "media_work", "novel": "media_work", "play": "media_work",
    "song": "media_work", "album": "media_work", "painting": "media_work",
    "sculpture": "media_work", "video_game": "media_work",
    "event": "event", "war": "event", "disaster": "event",
    "organization": "organization", "company": "organization",
    "brand": "organization", "sports_team": "organization",
    "abstract": "abstract", "emotion": "abstract",
}
# Only these combinations are assumed potentially compatible.
COMPATIBLE = {
    frozenset(("animal", "food_drink")),
    frozenset(("plant", "food_drink")),
    frozenset(("object", "food_drink")),
    frozenset(("object", "place")),
    frozenset(("person", "media_work")),
    frozenset(("organization", "place")),
}
def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--merged", default="/Volumes/Samsung_T5/Pam-Knowledge/merged-traits/merged-candidate-traits.csv")
    p.add_argument("--conflicts", default="/Volumes/Samsung_T5/Pam-Knowledge/merged-traits/conceptnet-conflict.csv")
    p.add_argument("--baseline", default="/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/clean-candidates")
    args = p.parse_args()
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    for name in ("merged", "conflicts", "baseline"):
        if not Path(getattr(args, name)).is_file():
            p.error("Missing " + name + " input")
    con = sqlite3.connect(f"file:{Path(args.baseline)}?mode=ro", uri=True)
    if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        p.error("SQLite baseline integrity check failed")
    concepts = {int(r[0]): (r[1], r[2]) for r in con.execute("SELECT row_id,name,category FROM concepts")}
    con.close()
    with open(args.merged, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f)
        fields = rd.fieldnames or []
        rows = list(rd)
    if not rows or not {"concept_row_id", "trait"}.issubset(fields):
        p.error("Unexpected merged candidate schema")
    with open(args.conflicts, newline="", encoding="utf-8") as f:
        conflicts = list(csv.DictReader(f))
    conflict_ids = set()
    for r in conflicts:
        try:
            conflict_ids.add(int(r["concept_row_id"]))
        except (KeyError, ValueError):
            p.error("Conflict file missing valid concept_row_id")
    by_id = defaultdict(list)
    for row in rows:
        try:
            cid = int(row["concept_row_id"])
        except ValueError:
            p.error("Invalid concept_row_id in merged CSV")
        by_id[cid].append(row)
    unsafe = set(conflict_ids)
    reasons = defaultdict(set)
    for cid in conflict_ids:
        reasons[cid].add("existing-answer-conflict")
    collision_details = []
    for cid, group in by_id.items():
        domains = sorted({DOMAINS[r["trait"]] for r in group if r["trait"] in DOMAINS})
        incompatible = [
            (a, b) for i, a in enumerate(domains) for b in domains[i + 1:]
            if frozenset((a, b)) not in COMPATIBLE
        ]
        if incompatible:
            unsafe.add(cid)
            reasons[cid].add("incompatible-domain-evidence")
            collision_details.append((cid, concepts.get(cid, ("", ""))[0], "|".join(domains),
                                      "|".join(a + "+" + b for a, b in incompatible)))
    safe, quarantined = [], []
    for row in rows:
        cid = int(row["concept_row_id"])
        if cid in unsafe:
            quarantined.append({**row, "quarantine_reason": "|".join(sorted(reasons[cid]))})
        else:
            safe.append(row)
    def write(path, records, columns):
        with (out / path).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=columns)
            w.writeheader()
            w.writerows(records)
    write("clean-candidate-traits.csv", safe, fields)
    write("quarantined-traits.csv", quarantined, fields + ["quarantine_reason"])
    with (out / "collision-review.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(("concept_row_id", "concept_name", "domains", "incompatible_pairs"))
        w.writerows(sorted(collision_details))
    summary = {
        "mode": "read-only-conservative-filter",
        "input_rows": len(rows),
        "clean_rows": len(safe),
        "quarantined_rows": len(quarantined),
        "clean_concepts": len({r["concept_row_id"] for r in safe}),
        "quarantined_concepts": len(unsafe & set(by_id)),
        "direct_conflict_concepts": len(conflict_ids),
        "incompatible_domain_concepts": len(collision_details),
        "review_only": True,
        "automatic_approvals": 0,
        "baseline_modified": False,
        "runtime_modified": False,
        "note": "Clean means no detected cross-domain collision or known conflict; it does not establish factual correctness."
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
if __name__ == "__main__":
    main()
