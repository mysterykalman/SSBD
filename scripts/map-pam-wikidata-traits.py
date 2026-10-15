#!/usr/bin/env python3
"""Convert extracted Wikidata evidence to conservative Pam trait candidates.

Read-only with respect to baseline SQLite and original Parquet evidence.
Writes a standalone CSV that the existing static Wikidata builder can ingest
when explicitly selected. No inferred negative answers and no automatic deploy.
"""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path

# Exact matches only. Broad or ambiguous Wikidata labels are intentionally
# excluded. Each mapping corresponds to a stable Pam gameplay trait.
TYPE_TRAITS = {
    "mammal": "mammal", "bird": "bird", "fish": "fish",
    "reptile": "reptile", "amphibian": "amphibian", "insect": "insect",
    "tree": "tree", "flower": "flower",
    "country": "country", "sovereign state": "country",
    "city": "city", "town": "city",
    "mountain": "mountain", "mountain peak": "mountain",
    "river": "water_place", "lake": "water_place", "ocean": "water_place",
    "national park": "park",
    "building": "building", "skyscraper": "building",
    "car": "car", "automobile": "car", "truck": "car",
    "aircraft": "aircraft", "ship": "watercraft", "boat": "watercraft",
    "vehicle": "vehicle", "tool": "tool", "furniture": "furniture",
    "toy": "toy", "musical instrument": "musical_instrument",
    "video game": "video_game", "film": "film", "feature film": "film",
    "television series": "tv_series",
    "novel": "novel", "book": "book", "play": "play",
    "song": "song", "album": "album",
    "painting": "painting", "sculpture": "sculpture",
}
MATERIAL_TRAITS = {
    "wood": "wood", "glass": "glass", "plastic": "plastic",
    "paper": "paper", "cardboard": "paper",
    "fabric": "fabric", "textile": "fabric",
}
ALLOWED_PROPERTIES = {"P31", "P279", "P186"}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", default="/Volumes/Samsung_T5/Pam-Knowledge/full-extraction/wikidata-evidence.parquet")
    parser.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/trait-candidates")
    args = parser.parse_args()
    import duckdb
    source = Path(args.evidence)
    out = Path(args.output)
    if not source.is_file():
        parser.error(f"Evidence file missing: {source}")
    out.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    con.execute("SET memory_limit='4GB'")
    con.execute("SET threads=4")
    rows = con.execute("""
        SELECT concept_row_id, qid, name, category, property_id, object_qid, object_label
        FROM read_parquet(?)
        WHERE property_id IN ('P31','P279','P186') AND object_label IS NOT NULL
        ORDER BY concept_row_id, property_id, object_qid
    """, [str(source)]).fetchall()
    con.close()
    candidates = {}
    excluded = Counter()
    for row_id, qid, name, category, prop, object_qid, label in rows:
        normalized = label.strip().casefold()
        if prop in ("P31", "P279"):
            trait = TYPE_TRAITS.get(normalized)
        else:
            trait = MATERIAL_TRAITS.get(normalized)
            # "made from material" alone does not imply the material is the
            # predominant one. Review material claims rather than promoting.
            if trait:
                excluded["material_requires_majority_review"] += 1
                continue
        if not trait:
            excluded[f"unmapped_{prop}"] += 1
            continue
        key = (row_id, trait)
        candidates.setdefault(key, {
            "concept": name, "qid": qid, "property": prop,
            "value": label, "trait": trait, "confidence": "0.85",
            "source_qid": object_qid, "concept_row_id": row_id,
            "category": category, "status": "candidate_only",
        })
    fields = ["concept", "qid", "property", "value", "trait", "confidence",
              "source_qid", "concept_row_id", "category", "status"]
    path = out / "wikidata-trait-candidates.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(candidates.values())
    by_trait = Counter(item["trait"] for item in candidates.values())
    summary = {
        "mode": "review-only",
        "source": str(source),
        "candidates": len(candidates),
        "concepts": len({item["concept_row_id"] for item in candidates.values()}),
        "by_trait": dict(sorted(by_trait.items())),
        "excluded": dict(sorted(excluded.items())),
        "outputs": [str(path)],
        "answers_modified": 0,
        "runtime_modified": False,
        "baseline_modified": False,
        "caution": "Candidate mappings are not validated against existing answers. Do not deploy or replace existing master CSV.",
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
