#!/usr/bin/env python3
"""Compare Wikidata trait candidates with Pam controlled profiles.

Produces review buckets only. Does not modify profiles, answers, runtime, or SQLite.
"""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path


def normalize(value):
    return " ".join(str(value or "").strip().casefold().replace("_", " ").split())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidates", default="/Volumes/Samsung_T5/Pam-Knowledge/trait-candidates/wikidata-trait-candidates.csv")
    parser.add_argument("--profiles", default=".dev-data/mom-controlled-profiles/mom-controlled-profiles.json")
    parser.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/trait-validation")
    args = parser.parse_args()

    candidates_path = Path(args.candidates)
    profiles_path = Path(args.profiles)
    output = Path(args.output)
    if not candidates_path.is_file():
        raise SystemExit(f"Missing candidates: {candidates_path}")
    if not profiles_path.is_file():
        raise SystemExit(f"Missing controlled profiles: {profiles_path}")
    output.mkdir(parents=True, exist_ok=True)

    profile_doc = json.loads(profiles_path.read_text(encoding="utf-8"))
    profiles = profile_doc.get("objects") or []
    by_qid = {}
    by_name = {}
    for profile in profiles:
        qid = str(profile.get("qid") or "").strip()
        if qid:
            by_qid[qid] = profile
        names = [profile.get("name"), *(profile.get("aliases") or [])]
        for name in names:
            key = normalize(name)
            if key:
                by_name.setdefault(key, []).append(profile)

    rows = list(csv.DictReader(candidates_path.open(encoding="utf-8")))
    results = []
    counts = Counter()
    for row in rows:
        qid = str(row.get("qid") or "").strip()
        name = row.get("concept") or ""
        trait = str(row.get("trait") or "").strip()
        profile = by_qid.get(qid) if qid else None
        match_method = "qid" if profile else ""
        if not profile:
            matches = by_name.get(normalize(name), [])
            if len(matches) == 1:
                profile = matches[0]
                match_method = "unique_name"
            elif len(matches) > 1:
                status = "needs-review"
                reason = "ambiguous-name-match"
                counts[status] += 1
                results.append({**row, "validation_status": status, "reason": reason, "match_method": "ambiguous_name", "existing_traits": ""})
                continue

        if not profile:
            status = "needs-review"
            reason = "no-controlled-profile-match"
            existing = []
        else:
            existing = profile.get("traits") or []
            if trait in existing:
                status = "agree"
                reason = "trait-already-present"
            else:
                status = "new-safe"
                reason = "profile-matched-trait-absent"

        counts[status] += 1
        results.append({
            **row,
            "validation_status": status,
            "reason": reason,
            "match_method": match_method,
            "existing_traits": ";".join(sorted(existing)),
        })

    fields = list(results[0].keys()) if results else []
    all_path = output / "wikidata-trait-validation.csv"
    with all_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(results)

    for status in ("agree", "new-safe", "needs-review"):
        subset = [r for r in results if r["validation_status"] == status]
        path = output / f"{status}.csv"
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(subset)

    summary = {
        "mode": "validation-only",
        "candidates": len(rows),
        "controlled_profiles": len(profiles),
        "counts": dict(sorted(counts.items())),
        "answers_modified": 0,
        "runtime_modified": False,
        "baseline_modified": False,
        "warning": "new-safe means matched profile + absent trait, not final approval. Review conflicts against current question answers before promotion."
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
