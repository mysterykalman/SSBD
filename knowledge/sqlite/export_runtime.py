#!/usr/bin/env python3
"""Split the existing checked-in Pam runtime into subject-specific SQLite tables.

No network calls, inference, or live gameplay changes. Usage:
 python3 knowledge/sqlite/export_runtime.py
"""
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src/client/mom-mode/knowledge.runtime.json"
SCHEMA = ROOT / "knowledge/sqlite/schema.sql"
OUTPUT = ROOT / "knowledge/sqlite/pam-knowledge.sqlite"
REPORT = ROOT / "knowledge/sqlite/import-report.json"

SUBJECTS = {
    "person": ("people", "people"), "animal": ("animals", "animals"),
    "plant": ("plants", "plants"), "place": ("places", "places"),
    "food_drink": ("food", "foods"), "object": ("objects", "objects"),
    "media_work": ("media", "media"), "event": ("abstract", "abstract_concepts"),
    "organization": ("abstract", "abstract_concepts"),
    "abstract": ("abstract", "abstract_concepts"),
}
SUBJECT_DETAIL = {
    "people": "occupation", "animals": "animal_group",
    "plants": "plant_group", "places": "place_type",
    "foods": "food_group", "objects": "object_type",
    "media": "medium", "abstract_concepts": "abstract_type",
}
def main():
    data = json.loads(SOURCE.read_text())
    concepts = data["concepts"]
    questions = data["questions"]
    aliases = data.get("aliases", {})
    source_digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if OUTPUT.exists():
        OUTPUT.unlink()
    db = sqlite3.connect(OUTPUT)
    try:
        db.executescript(SCHEMA.read_text())
        db.execute("INSERT INTO sources(source_id,source_name,source_version,source_uri,imported_at) VALUES(?,?,?,?,?)",
                   ("runtime-baseline", "Checked-in approved-or-staging runtime", source_digest,
                    str(SOURCE.relative_to(ROOT)), "deterministic"))
        db.execute("CREATE TABLE concept_facets(concept_id TEXT NOT NULL REFERENCES concepts(concept_id), facet_key TEXT NOT NULL, facet_json TEXT NOT NULL, PRIMARY KEY(concept_id,facet_key))")
        db.execute("CREATE TABLE runtime_metadata(meta_key TEXT PRIMARY KEY, value_json TEXT NOT NULL)")
        db.execute("CREATE TABLE runtime_question_metadata(question_id TEXT PRIMARY KEY REFERENCES questions(question_id), metadata_json TEXT NOT NULL)")
        db.execute("CREATE TABLE concept_runtime_metadata(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), metadata_json TEXT NOT NULL)")
        db.execute("INSERT INTO runtime_metadata VALUES(?,?)", ("source_meta", json.dumps(data.get("meta", {}), sort_keys=True)))
        db.execute("INSERT INTO runtime_metadata VALUES(?,?)", ("facet_index", json.dumps(data.get("facetIndex", {}), sort_keys=True)))
        db.execute("INSERT INTO runtime_metadata VALUES(?,?)", ("source_sha256", json.dumps(source_digest)))
        for q in questions:
            db.execute("INSERT INTO questions(question_id,wording,subject_id,requires_json) VALUES(?,?,?,?)",
                       (q["id"], q["q"], None, json.dumps(q.get("requires"))))
            db.execute("INSERT INTO runtime_question_metadata VALUES(?,?)", (q["id"], json.dumps(q, sort_keys=True)))
        ids = []
        counts = {}
        for c in concepts:
            cid = c["id"]
            category = c.get("category") or "abstract"
            subject, table = SUBJECTS.get(category, ("abstract", "abstract_concepts"))
            counts[subject] = counts.get(subject, 0) + 1
            db.execute("INSERT INTO concepts(concept_id,canonical_name,primary_subject_id,identity_kind,external_id,review_status) VALUES(?,?,?,?,?,?)",
                       (cid, c["name"], subject, "entity" if cid.startswith("wd:") else "generic",
                        cid[3:] if cid.startswith("wd:") else None, "pending"))
            db.execute("INSERT INTO concept_subjects VALUES(?,?)", (cid, subject))
            db.execute(f"INSERT INTO {table}(concept_id,{SUBJECT_DETAIL[table]}) VALUES(?,?)",
                       (cid, c.get("subcategory") or category))
            db.execute("INSERT INTO concept_runtime_metadata VALUES(?,?)",
                       (cid, json.dumps({k: c.get(k) for k in ("category","subcategory","difficulty","prior")}, sort_keys=True)))
            for key, value in sorted(c.get("facets", {}).items()):
                db.execute("INSERT INTO concept_facets VALUES(?,?,?)", (cid, key, json.dumps(value, sort_keys=True)))
            ids.append(cid)
            for label, field in (("yes", "yes"), ("no", "no"), ("unknown", "maybe")):
                for qi in c.get(field, []):
                    qid = questions[qi]["id"]
                    fid = f"{cid}|{qid}"
                    eid = f"runtime:{fid}"
                    db.execute("INSERT INTO facts(fact_id,concept_id,question_id,answer,confidence,status) VALUES(?,?,?,?,?,?)",
                               (fid, cid, qid, label, None, "pending"))
                    db.execute("INSERT INTO evidence(evidence_id,source_id,source_record_id,subject_concept_id,literal_value,raw_payload) VALUES(?,?,?,?,?,?)",
                               (eid, "runtime-baseline", fid, cid, label, json.dumps({"question_index": qi, "answer": field})))
                    db.execute("INSERT INTO fact_evidence VALUES(?,?)", (fid, eid))
        for alias, indexes in aliases.items():
            for i in indexes if isinstance(indexes, list) else [indexes]:
                db.execute("INSERT OR IGNORE INTO aliases(concept_id,alias,locale,is_ambiguous) VALUES(?,?,?,?)",
                           (ids[i], alias, "en", int(isinstance(indexes, list))))
        db.commit()
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
        assert db.execute("SELECT count(*) FROM concepts").fetchone()[0] == len(concepts)
        assert db.execute("SELECT count(*) FROM questions").fetchone()[0] == len(questions)
        expected = sum(len(c.get(k, [])) for c in concepts for k in ("yes","no","maybe"))
        actual = db.execute("SELECT count(*) FROM facts").fetchone()[0]
        assert expected == actual, (expected, actual)
        report = {"source": str(SOURCE.relative_to(ROOT)), "source_sha256": source_digest,
                  "concepts": len(concepts), "questions": len(questions), "facts": actual,
                  "subjects": dict(sorted(counts.items())), "integrity": "ok",
                  "status": "staging only; not promoted to gameplay"}
        REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
        print(json.dumps(report, indent=2))
    finally:
        db.close()

if __name__ == "__main__":
    main()
