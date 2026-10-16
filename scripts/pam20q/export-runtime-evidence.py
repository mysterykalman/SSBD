#!/usr/bin/env python3
"""Export the current Pam runtime's known cells as normalized supporting evidence.

The current runtime is already compiled from static Wikidata plus the repository's
ConceptNet/WordNet/CSKG and curated-source pipeline. This adapter lets the new 20Q
pretrainer reuse those known facts without coupling the new model to the old runtime.
"""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--runtime", type=Path, default=ROOT / "src/client/mom-mode/knowledge.runtime.json")
    p.add_argument("--out", type=Path, default=ROOT / ".dev-data/pam20q/existing-runtime-evidence.csv")
    args = p.parse_args()
    data = json.loads(args.runtime.read_text())
    questions = data["questions"]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with args.out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["concept_id", "concept", "question_id", "probability", "confidence", "source"])
        for concept in data["concepts"]:
            for idx in concept.get("yes", []):
                w.writerow([concept["id"], concept["name"], questions[idx]["id"], "0.99", "0.92", "existing-runtime-known-yes"]); n += 1
            for idx in concept.get("no", []):
                w.writerow([concept["id"], concept["name"], questions[idx]["id"], "0.01", "0.92", "existing-runtime-known-no"]); n += 1
            for idx in concept.get("maybe", []):
                w.writerow([concept["id"], concept["name"], questions[idx]["id"], "0.50", "0.82", "existing-runtime-known-sometimes"]); n += 1
    print(f"wrote {n} supporting evidence rows to {args.out}")

if __name__ == "__main__":
    main()
