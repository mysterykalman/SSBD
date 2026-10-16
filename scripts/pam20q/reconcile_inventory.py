#!/usr/bin/env python3
"""Reconcile authoritative Pam SQLite concepts against the fallback CSV.

The SQLite database is authoritative. Distinct concept IDs are never collapsed merely
because their display names normalize to the same string. The report is deterministic
and is designed to explain the known 53,092 vs 52,640 inventory discrepancy.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = Path("/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite")
DEFAULT_FALLBACK = ROOT / "docs/pam-knowledge-fill/all-concepts.csv"
DEFAULT_OUT = ROOT / ".dev-data/pam20q/inventory-reconciliation"


def norm(text: str) -> str:
    text = str(text or "").strip().casefold()
    text = text.replace("_", " ")
    text = re.sub(r"[^\w\s'-]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def qid_from_id(value: str) -> str:
    value = str(value or "").strip()
    m = re.search(r"(?:^|:)Q(\d+)$", value, flags=re.I)
    return f"Q{m.group(1)}" if m else ""


def split_aliases(value: str) -> list[str]:
    value = str(value or "").strip()
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()]
    except Exception:
        pass
    return [x.strip() for x in re.split(r"[|;]", value) if x.strip()]


def load_fallback(path: Path):
    rows = []
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for i, row in enumerate(reader, 1):
            cid = str(row.get("concept_id") or row.get("id") or row.get("key") or "").strip()
            name = str(row.get("name") or row.get("concept") or row.get("label") or cid).strip()
            rank_raw = row.get("rank") or row.get("row_id") or i
            try:
                rank = int(float(rank_raw))
            except Exception:
                rank = i
            aliases = []
            for key in ("aliases", "alias", "alternate_names", "aka"):
                aliases.extend(split_aliases(row.get(key, "")))
            qid = str(row.get("qid") or "").strip() or qid_from_id(cid)
            rows.append({"concept_id": cid, "name": name, "norm": norm(name), "rank": rank, "qid": qid, "aliases": aliases})
    return rows


def load_sqlite(path: Path):
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        raise SystemExit("Pam baseline SQLite quick_check failed")
    columns = {r[1] for r in con.execute("PRAGMA table_info(concepts)")}
    required = {"row_id", "concept_id", "name"}
    if not required.issubset(columns):
        raise SystemExit(f"concepts table missing columns: {sorted(required-columns)}")
    rows = [dict(r) for r in con.execute("SELECT row_id, concept_id, name FROM concepts ORDER BY row_id")]
    con.close()
    for row in rows:
        row["concept_id"] = str(row.get("concept_id") or "").strip()
        row["name"] = str(row.get("name") or "").strip()
        row["norm"] = norm(row["name"])
        row["qid"] = qid_from_id(row["concept_id"])
    return rows


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--database", type=Path, default=DEFAULT_DB)
    p.add_argument("--fallback", type=Path, default=DEFAULT_FALLBACK)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    a = p.parse_args()
    if not a.database.is_file():
        p.error(f"missing authoritative SQLite: {a.database}")
    if not a.fallback.is_file():
        p.error(f"missing fallback inventory: {a.fallback}")

    source = load_sqlite(a.database)
    fallback = load_fallback(a.fallback)
    by_id = {r["concept_id"]: r for r in fallback if r["concept_id"]}
    by_norm = defaultdict(list)
    by_qid = defaultdict(list)
    alias_norm = defaultdict(list)
    for r in fallback:
        by_norm[r["norm"]].append(r)
        if r["qid"]:
            by_qid[r["qid"]].append(r)
        for alias in r["aliases"]:
            alias_norm[norm(alias)].append(r)

    missing = []
    for row in source:
        cid, name, nname, qid = row["concept_id"], row["name"], row["norm"], row["qid"]
        if cid and cid in by_id:
            continue
        normalized_matches = by_norm.get(nname, []) if nname else []
        qid_matches = by_qid.get(qid, []) if qid else []
        alias_matches = alias_norm.get(nname, []) if nname else []
        safe_alias = alias_matches[0] if len({x["concept_id"] for x in alias_matches}) == 1 and alias_matches else None

        if qid_matches:
            reason = "same_qid_under_different_fallback_identity"
        elif normalized_matches:
            reason = "same_normalized_name_under_different_identity"
        elif safe_alias:
            reason = "present_as_unambiguous_fallback_alias"
        else:
            reason = "not_present_in_fallback_snapshot"

        alternate = []
        for match in qid_matches + normalized_matches + ([safe_alias] if safe_alias else []):
            if match and match["concept_id"] not in {x["concept_id"] for x in alternate}:
                alternate.append(match)

        missing.append({
            "concept_name": name,
            "sqlite_concept_identifier": cid,
            "sqlite_row_id": row["row_id"],
            "qid": qid,
            "exists_under_other_normalized_name_or_alias": bool(alternate),
            "alternate_fallback_matches": [
                {"concept_id": x["concept_id"], "name": x["name"], "qid": x["qid"], "rank": x["rank"]}
                for x in alternate
            ],
            "reason_missing_from_fallback": reason,
            "retain_in_pam20q": True,
            "retention_reason": "accepted SQLite identity is authoritative; do not collapse by display-name normalization",
        })

    a.out.mkdir(parents=True, exist_ok=True)
    (a.out / "missing-concepts.json").write_text(json.dumps(missing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    csv_path = a.out / "missing-concepts.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as fh:
        fieldnames = [
            "concept_name", "sqlite_concept_identifier", "sqlite_row_id", "qid",
            "exists_under_other_normalized_name_or_alias", "reason_missing_from_fallback",
            "retain_in_pam20q", "alternate_fallback_matches",
        ]
        w = csv.DictWriter(fh, fieldnames=fieldnames)
        w.writeheader()
        for r in missing:
            rr = {k: r[k] for k in fieldnames}
            rr["alternate_fallback_matches"] = json.dumps(rr["alternate_fallback_matches"], ensure_ascii=False, separators=(",", ":"))
            w.writerow(rr)

    summary = {
        "authoritative_sqlite_concepts": len(source),
        "fallback_inventory_rows": len(fallback),
        "sqlite_concepts_not_matched_by_same_identity": len(missing),
        "expected_authoritative_count": 53092,
        "expected_fallback_count": 52640,
        "expected_discrepancy": 452,
        "count_checks": {
            "authoritative": len(source) == 53092,
            "fallback": len(fallback) == 52640,
            "discrepancy": len(missing) == 452,
        },
        "ambiguous_or_alternate_identity_matches": sum(1 for r in missing if r["exists_under_other_normalized_name_or_alias"]),
        "retained": sum(1 for r in missing if r["retain_in_pam20q"]),
        "excluded": sum(1 for r in missing if not r["retain_in_pam20q"]),
        "outputs": {"json": str(a.out / "missing-concepts.json"), "csv": str(csv_path)},
    }
    (a.out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    if not all(summary["count_checks"].values()):
        raise SystemExit("inventory reconciliation count check failed")


if __name__ == "__main__":
    main()
