#!/usr/bin/env python3
"""One-time pretrainer for Pam's frozen offline 20 Questions model.

AI enrichment is opt-in. Running this script without --run-ai never spends API calls.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import os
import re
import sqlite3
import struct
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QFILE = ROOT / "data/pam20q/final-canonical-questions.json"
FALLBACK_QFILE = ROOT / "data/pam20q/canonical-questions.json"
WORK = ROOT / ".dev-data/pam20q"
PUBLIC_REF = ROOT / "data/pam20q/reference/david-ar-20q"
UNKNOWN = 255
SCALE = 254
RANK = {
    "accepted": 100,
    "curated": 95,
    "external": 85,
    "public20q": 75,
    "hierarchy": 65,
    "ai": 50,
}
STATE_TO_P = {0: 0.25, 1: 0.75, 2: 0.02, 3: 0.98}
ALIASES = {
    "alive": "living", "food": "food_drink", "air": "aircraft", "fly": "flies",
    "swim": "swims", "fur": "fur_hair", "big": "larger_than_person",
    "danger": "dangerous", "naturalPlace": "natural_place", "sea": "watercraft",
    "rail": "rail_vehicle", "road": "road_vehicle", "wearable": "clothing",
    "upperBody": "clothing", "legwear": "clothing", "household": "home",
    "indoors": "home", "work": "school_office", "school": "school_office",
    "water": "water_associated", "fruit": "fruit_food", "vegetable": "vegetable_food",
    "preparedFood": "prepared_food", "specificPerson": "real_person", "opens": "opens_closes",
}


def db_connect(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    d = sqlite3.connect(path)
    d.row_factory = sqlite3.Row
    d.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS concepts(
            concept_id TEXT PRIMARY KEY, name TEXT NOT NULL, rank INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS questions(
            question_id TEXT PRIMARY KEY, text TEXT NOT NULL, qgroup TEXT NOT NULL, parents_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cells(
            concept_id TEXT, question_id TEXT, probability REAL, confidence REAL,
            source_kind TEXT, source_ref TEXT, precedence INTEGER,
            PRIMARY KEY(concept_id, question_id)
        );
        CREATE TABLE IF NOT EXISTS evidence(
            id INTEGER PRIMARY KEY, concept_id TEXT, question_id TEXT, probability REAL,
            confidence REAL, source_kind TEXT, source_ref TEXT, accepted INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS ai_batches(
            batch_key TEXT PRIMARY KEY, status TEXT, request_json TEXT, response_json TEXT, updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS contradictions(
            concept_id TEXT, child_question_id TEXT, parent_question_id TEXT,
            child_probability REAL, parent_probability REAL, status TEXT,
            PRIMARY KEY(concept_id, child_question_id, parent_question_id)
        );
    """)
    return d


def load_questions(d, path: Path):
    if not path.exists():
        path = FALLBACK_QFILE
    qs = json.loads(path.read_text(encoding="utf-8"))["questions"]
    ids = {q["id"] for q in qs}
    if not 80 <= len(qs) <= 150:
        raise SystemExit(f"question count outside 80-150: {len(qs)}")
    for q in qs:
        if any(parent not in ids for parent in q.get("parents", [])):
            raise SystemExit(f"bad parent on {q['id']}")
        d.execute(
            "INSERT OR REPLACE INTO questions VALUES(?,?,?,?)",
            (q["id"], q["text"], q["group"], json.dumps(q.get("parents", []))),
        )
    d.commit()


def normalize_answer(value):
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= float(value) <= 1:
        return float(value), 0.98
    s = str(value).strip().lower()
    if s in ("", "unknown", "blank", "null", "none", "?"):
        return None
    if s in ("y", "yes", "true", "1"):
        return 0.99, 0.995
    if s in ("n", "no", "false", "0"):
        return 0.01, 0.995
    if s in ("s", "sometimes", "maybe", "depends", "it depends"):
        return 0.50, 0.90
    try:
        x = float(s)
        return (x, 0.98) if 0 <= x <= 1 else None
    except ValueError:
        return None


def normalize_name(value: str) -> str:
    s = " ".join(str(value or "").strip().casefold().split())
    s = re.sub(r"^(?:a|an|the)\s+", "", s)
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)
    s = s.replace("-", " ")
    s = re.sub(r"[^\w\s']+", " ", s, flags=re.UNICODE)
    return " ".join(s.split())


def put(d, concept_id, question_id, probability, confidence, kind, ref=""):
    question_id = ALIASES.get(question_id, question_id)
    if not d.execute("SELECT 1 FROM questions WHERE question_id=?", (question_id,)).fetchone():
        return False
    current = d.execute(
        "SELECT precedence,confidence FROM cells WHERE concept_id=? AND question_id=?",
        (concept_id, question_id),
    ).fetchone()
    precedence = RANK[kind]
    if current and (
        current["precedence"] > precedence
        or (current["precedence"] == precedence and current["confidence"] >= confidence)
    ):
        return False
    d.execute(
        "INSERT OR REPLACE INTO cells VALUES(?,?,?,?,?,?,?)",
        (concept_id, question_id, max(0, min(1, probability)), max(0, min(1, confidence)), kind, ref, precedence),
    )
    return True


def add_evidence(d, concept_id, question_id, probability, confidence, kind, ref="", accepted=0):
    d.execute(
        "INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref,accepted) VALUES(?,?,?,?,?,?,?)",
        (concept_id, ALIASES.get(question_id, question_id), probability, confidence, kind, ref, accepted),
    )


def load_inventory(d, path: Path):
    with path.open(newline="", encoding="utf-8-sig") as fh:
        for i, row in enumerate(csv.DictReader(fh), 1):
            cid = str(row.get("concept_id") or row.get("id") or row.get("name") or "").strip()
            name = str(row.get("name") or row.get("concept") or cid).strip()
            if not cid or not name:
                continue
            try:
                rank = int(float(row.get("rank") or i))
            except Exception:
                rank = i
            d.execute("INSERT OR IGNORE INTO concepts VALUES(?,?,?)", (cid, name, rank))
    d.commit()


def table_columns(d, table):
    safe = table.replace('"', '""')
    return {r[1] for r in d.execute(f'PRAGMA table_info("{safe}")')}


def load_accepted_sqlite(d, path: Path):
    s = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    s.row_factory = sqlite3.Row
    valid = {r[0] for r in d.execute("SELECT question_id FROM questions")}
    wide = valid | set(ALIASES)
    for (table,) in s.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
        columns = table_columns(s, table)
        id_col = next((x for x in ("concept_id", "id", "key") if x in columns), None)
        name_col = next((x for x in ("name", "concept", "label", "display_name") if x in columns), None)
        if not id_col and not name_col:
            continue
        normalized = "question_id" in columns and any(x in columns for x in ("answer", "value", "response", "probability"))
        value_col = next((x for x in ("answer", "value", "response", "probability") if x in columns), None)
        safe_table = table.replace('"', '""')
        for row in s.execute(f'SELECT * FROM "{safe_table}"'):
            cid = str(row[id_col] if id_col else row[name_col]).strip()
            name = str(row[name_col] if name_col else cid).strip()
            if not cid:
                continue
            d.execute("INSERT OR IGNORE INTO concepts VALUES(?,?,0)", (cid, name))
            pairs = [(str(row["question_id"]), row[value_col])] if normalized else [(q, row[q]) for q in columns & wide]
            for qid, value in pairs:
                parsed = normalize_answer(value)
                if not parsed:
                    continue
                probability, confidence = parsed
                if put(d, cid, qid, probability, confidence, "accepted", f"sqlite:{table}"):
                    add_evidence(d, cid, qid, probability, confidence, "accepted", f"sqlite:{table}", accepted=1)
    d.commit()
    s.close()


def load_external(d, paths):
    exact_names = defaultdict(list)
    for r in d.execute("SELECT concept_id,name FROM concepts"):
        exact_names[str(r["name"]).casefold()].append(r["concept_id"])
    for path in paths:
        fh = None
        if path.suffix.lower() in (".jsonl", ".ndjson"):
            rows = (json.loads(x) for x in path.read_text(encoding="utf-8").splitlines() if x.strip())
        else:
            fh = path.open(newline="", encoding="utf-8-sig")
            rows = csv.DictReader(fh)
        for row in rows:
            cid = str(row.get("concept_id") or "").strip()
            if not cid:
                matches = exact_names.get(str(row.get("concept") or row.get("name") or "").strip().casefold(), [])
                if len(matches) == 1:
                    cid = matches[0]
            qid = str(row.get("question_id") or row.get("trait") or "").strip()
            if not cid or not qid:
                continue
            parsed = normalize_answer(row.get("probability") if row.get("probability") not in (None, "") else row.get("answer"))
            if not parsed:
                continue
            probability, confidence = parsed
            confidence = float(row.get("confidence") or confidence)
            source = str(row.get("source") or path.name)
            source_kind = str(row.get("source_kind") or "").strip().lower()
            kind = "curated" if source_kind == "curated" or "curated" in source.casefold() or "hand-written" in source.casefold() else "external"
            add_evidence(d, cid, qid, probability, confidence, kind, source)
            if confidence >= 0.75:
                put(d, cid, qid, probability, confidence, kind, source)
        if fh:
            fh.close()
    d.commit()


def load_public_reference(d, reference_dir: Path):
    qpath = reference_dir / "question-map.csv"
    if not qpath.exists():
        return {"targets": 0, "safe_targets": 0, "cells": 0}
    questions = json.loads((reference_dir / "questions.json").read_text(encoding="utf-8"))["questions"]
    targets = json.loads((reference_dir / "targets.json").read_text(encoding="utf-8"))["targets"]
    weights = (reference_dir / "weights.u2states.bin").read_bytes()
    if len(weights) != len(questions) * len(targets):
        raise SystemExit("public 20Q matrix dimensions do not match vocab")
    qmap = {}
    with qpath.open(newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if str(row.get("seedable", "")).lower() in ("true", "1", "yes") and row.get("pam_question_id"):
                qmap[int(row["public_index"])] = row["pam_question_id"]

    exact = defaultdict(list)
    normalized = defaultdict(list)
    for row in d.execute("SELECT concept_id,name FROM concepts"):
        exact[str(row["name"]).strip().casefold()].append(row)
        normalized[normalize_name(row["name"])].append(row)

    safe_targets = 0
    cell_count = 0
    for target_idx, target in enumerate(targets):
        matches = exact.get(str(target).strip().casefold(), [])
        if len(matches) != 1:
            matches = normalized.get(normalize_name(target), [])
        if len(matches) != 1:
            continue
        concept = matches[0]
        safe_targets += 1
        for public_q_idx, pam_qid in qmap.items():
            state = int(weights[public_q_idx * len(targets) + target_idx])
            probability = STATE_TO_P[state]
            confidence = 0.88 if state & 2 else 0.72
            ref = f"david-ar/20q:{target}:{questions[public_q_idx]}:state={state}"
            add_evidence(d, concept["concept_id"], pam_qid, probability, confidence, "public20q", ref)
            if put(d, concept["concept_id"], pam_qid, probability, confidence, "public20q", ref):
                cell_count += 1
    d.commit()
    return {"targets": len(targets), "safe_targets": safe_targets, "cells": cell_count}


def apply_hierarchy(d):
    parents = {r["question_id"]: json.loads(r["parents_json"]) for r in d.execute("SELECT * FROM questions")}
    changed = True
    while changed:
        changed = False
        for row in list(d.execute("SELECT concept_id,question_id,probability,confidence FROM cells WHERE probability>=.9")):
            for parent in parents.get(row["question_id"], []):
                current = d.execute(
                    "SELECT probability,precedence FROM cells WHERE concept_id=? AND question_id=?",
                    (row["concept_id"], parent),
                ).fetchone()
                if current and current["probability"] <= 0.25:
                    d.execute(
                        "INSERT OR REPLACE INTO contradictions VALUES(?,?,?,?,?,?)",
                        (row["concept_id"], row["question_id"], parent, row["probability"], current["probability"], "flagged"),
                    )
                    if current["precedence"] >= RANK["external"]:
                        continue
                if put(
                    d, row["concept_id"], parent,
                    max(0.90, min(0.995, row["probability"] * 0.995)),
                    min(0.97, row["confidence"]), "hierarchy", "child:" + row["question_id"],
                ):
                    changed = True
    d.commit()


def ai_questions(d, concept_id, weak):
    rows = d.execute("""
        SELECT q.question_id,q.text,q.qgroup,q.parents_json,c.confidence,c.precedence
        FROM questions q LEFT JOIN cells c
        ON c.question_id=q.question_id AND c.concept_id=?
        WHERE c.concept_id IS NULL OR (c.precedence<? AND c.confidence<?)
        ORDER BY q.rowid
    """, (concept_id, RANK["external"], weak))
    return [
        {"question_id": r["question_id"], "question": r["text"], "group": r["qgroup"], "parents": json.loads(r["parents_json"])}
        for r in rows
    ]


def concept_context(d, concept_id):
    known = [
        {"question_id": r["question_id"], "yes_probability": r["probability"], "confidence": r["confidence"], "source": r["source_kind"]}
        for r in d.execute(
            "SELECT question_id,probability,confidence,source_kind FROM cells WHERE concept_id=? ORDER BY precedence DESC,question_id",
            (concept_id,),
        )
    ]
    public_examples = [x for x in known if x["source"] == "public20q"]
    return known, public_examples


def openai_call(payload, model, key):
    answer = {
        "type": "object",
        "properties": {
            "question_id": {"type": "string"},
            "yes_probability": {"type": "number", "minimum": 0, "maximum": 1},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["question_id", "yes_probability", "confidence"],
        "additionalProperties": False,
    }
    schema = {
        "type": "object",
        "properties": {
            "concepts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "concept": {"type": "string"},
                        "answers": {"type": "array", "items": answer},
                    },
                    "required": ["concept", "answers"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["concepts"],
        "additionalProperties": False,
    }
    body = {
        "model": model,
        "store": False,
        "input": [
            {
                "role": "system",
                "content": (
                    "Pretrain a classic 20 Questions model. Estimate how an ordinary human player would answer, "
                    "not pedantic encyclopedic truth. Respect accepted evidence and hierarchy context. Common-use "
                    "interpretations matter: tomato/vegetable follows ordinary usage; fictional characters can count "
                    "as people when typical players would treat them that way. Return every supplied unknown question only."
                ),
            },
            {"role": "user", "content": json.dumps(payload, separators=(",", ":"))},
        ],
        "text": {"format": {"type": "json_schema", "name": "pam20q_batch", "strict": True, "schema": schema}},
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        method="POST",
    )
    raw = json.loads(urllib.request.urlopen(req, timeout=300).read())
    text = raw.get("output_text")
    if not text:
        text = next(c["text"] for item in raw.get("output", []) for c in item.get("content", []) if isinstance(c.get("text"), str))
    return json.loads(text)


def apply_ai(d, batch, payload, ref):
    ids = {x["concept"]: x["concept_id"] for x in batch}
    allowed = {x["concept_id"]: {q["question_id"] for q in x["questions"]} for x in batch}
    for item in payload.get("concepts", []):
        cid = ids.get(item.get("concept"))
        if not cid:
            continue
        for answer in item.get("answers", []):
            qid = answer.get("question_id")
            if qid not in allowed[cid]:
                continue
            probability = float(answer["yes_probability"])
            confidence = float(answer["confidence"])
            if put(d, cid, qid, probability, confidence, "ai", ref):
                add_evidence(d, cid, qid, probability, confidence, "ai", ref)
    d.commit()


def process_batch(d, batch, model, key, dry):
    request_hash = hashlib.sha256(json.dumps(batch, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:24]
    old = d.execute("SELECT status,response_json FROM ai_batches WHERE batch_key=?", (request_hash,)).fetchone()
    if old and old["status"] == "complete":
        apply_ai(d, batch, json.loads(old["response_json"]), "cache:" + request_hash)
        return 0
    payload = {
        "task": "Estimate ordinary-human YES probabilities for every supplied unknown question.",
        "canonical_question_count": d.execute("SELECT COUNT(*) FROM questions").fetchone()[0],
        "concepts": batch,
    }
    d.execute(
        "INSERT OR REPLACE INTO ai_batches VALUES(?,?,?,?,?)",
        (request_hash, "pending", json.dumps(payload), None, int(time.time())),
    )
    d.commit()
    if dry:
        return 1
    output = openai_call(payload, model, key)
    d.execute(
        "UPDATE ai_batches SET status='complete',response_json=?,updated_at=? WHERE batch_key=?",
        (json.dumps(output, separators=(",", ":")), int(time.time()), request_hash),
    )
    apply_ai(d, batch, output, f"openai:{model}:{request_hash}")
    return 1


def run_ai(d, model, batch_size, weak, max_batches, dry):
    key = os.getenv("OPENAI_API_KEY", "")
    if not dry and not key:
        raise SystemExit("OPENAI_API_KEY required")
    batch = []
    calls = 0
    for concept in d.execute("SELECT concept_id,name FROM concepts ORDER BY rank,concept_id"):
        questions = ai_questions(d, concept["concept_id"], weak)
        if questions:
            known, public_examples = concept_context(d, concept["concept_id"])
            batch.append({
                "concept_id": concept["concept_id"],
                "concept": concept["name"],
                "known_evidence": known,
                "public_20q_examples": public_examples,
                "questions": questions,
            })
        if len(batch) < batch_size:
            continue
        calls += process_batch(d, batch, model, key, dry)
        batch = []
        if max_batches and calls >= max_batches:
            return
    if batch and (not max_batches or calls < max_batches):
        process_batch(d, batch, model, key, dry)


def compile_model(d, out):
    out.mkdir(parents=True, exist_ok=True)
    concepts = list(d.execute("SELECT concept_id,name FROM concepts ORDER BY rank,concept_id"))
    questions = list(d.execute("SELECT question_id,text FROM questions ORDER BY rowid"))
    ci = {x["concept_id"]: i for i, x in enumerate(concepts)}
    qi = {x["question_id"]: i for i, x in enumerate(questions)}
    matrix = bytearray([UNKNOWN]) * (len(concepts) * len(questions))
    for row in d.execute("SELECT concept_id,question_id,probability FROM cells"):
        if row["concept_id"] in ci and row["question_id"] in qi:
            matrix[ci[row["concept_id"]] * len(questions) + qi[row["question_id"]]] = max(0, min(SCALE, round(row["probability"] * SCALE)))
    raw = b"PAM20Q1\0" + struct.pack("<II", len(concepts), len(questions)) + bytes(matrix)
    gz = gzip.compress(raw, compresslevel=9, mtime=0)
    model_path = out / "pam20q.v1.bin.gz"
    model_path.write_bytes(gz)
    sha = hashlib.sha256(gz).hexdigest()
    manifest = {
        "format": "pam20q-dense-u8-gzip", "version": 1,
        "concept_count": len(concepts), "question_count": len(questions),
        "matrix_file": model_path.name, "unknown_sentinel": UNKNOWN,
        "probability_scale": {"min": 0, "max": SCALE, "decode": "p = byte / 254; 255 = unknown"},
        "concepts": [{"id": x["concept_id"], "name": x["name"]} for x in concepts],
        "questions": [{"id": x["question_id"], "text": x["text"]} for x in questions],
        "sha256": sha,
    }
    (out / "pam20q.v1.manifest.json").write_text(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return len(gz), len(raw), sha


def write_report(d, compiled, path, public_summary):
    concepts = d.execute("SELECT COUNT(*) FROM concepts").fetchone()[0]
    questions = d.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    counts = {r["source_kind"]: r["n"] for r in d.execute("SELECT source_kind,COUNT(*) n FROM cells GROUP BY source_kind")}
    resolved = sum(counts.values())
    report = {
        "total_concepts": concepts,
        "canonical_question_count": questions,
        "total_concept_question_cells": concepts * questions,
        "cells_seeded_from_accepted_pam_data": counts.get("accepted", 0),
        "cells_seeded_from_curated_pam_evidence": counts.get("curated", 0),
        "cells_supported_by_external_sources": counts.get("external", 0),
        "cells_seeded_from_public_20q": counts.get("public20q", 0),
        "cells_inferred_from_hierarchy": counts.get("hierarchy", 0),
        "cells_estimated_by_ai": counts.get("ai", 0),
        "unresolved_cells": concepts * questions - resolved,
        "contradiction_count": d.execute("SELECT COUNT(*) FROM contradictions").fetchone()[0],
        "compiled_artifact_size_bytes": compiled[0] if compiled else None,
        "compiled_raw_matrix_bytes": compiled[1] if compiled else None,
        "compiled_sha256": compiled[2] if compiled else None,
        "public_20q_import": public_summary,
        "ai_enrichment_ran": counts.get("ai", 0) > 0,
    }
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--work-dir", type=Path, default=WORK)
    p.add_argument("--questions", type=Path, default=QFILE)
    p.add_argument("--source-db", type=Path)
    p.add_argument("--inventory-csv", type=Path, default=ROOT / "docs/pam-knowledge-fill/all-concepts.csv")
    p.add_argument("--external", type=Path, action="append", default=[])
    p.add_argument("--public-reference", type=Path, default=PUBLIC_REF)
    p.add_argument("--no-public-reference", action="store_true")
    p.add_argument("--model", default=os.getenv("PAM20Q_MODEL", "gpt-6-astra"))
    p.add_argument("--batch-concepts", type=int, default=40)
    p.add_argument("--weak-confidence", type=float, default=0.70)
    p.add_argument("--max-ai-batches", type=int)
    p.add_argument("--dry-run-ai", action="store_true")
    p.add_argument("--run-ai", action="store_true", help="Explicitly enable build-time AI enrichment")
    p.add_argument("--skip-ai", action="store_true", help="Compatibility alias; AI is skipped by default")
    p.add_argument("--reset", action="store_true")
    args = p.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)
    db_path = args.work_dir / "build.sqlite"
    if args.reset and db_path.exists():
        db_path.unlink()
    d = db_connect(db_path)
    load_questions(d, args.questions)
    if args.inventory_csv.exists():
        load_inventory(d, args.inventory_csv)
    if args.source_db:
        load_accepted_sqlite(d, args.source_db)
    load_external(d, args.external)
    public_summary = {"targets": 0, "safe_targets": 0, "cells": 0}
    if not args.no_public_reference and args.public_reference.exists():
        public_summary = load_public_reference(d, args.public_reference)
    apply_hierarchy(d)

    if args.run_ai:
        run_ai(d, args.model, args.batch_concepts, args.weak_confidence, args.max_ai_batches, args.dry_run_ai)
    if not args.dry_run_ai:
        apply_hierarchy(d)
    compiled = None if args.dry_run_ai else compile_model(d, args.work_dir / "compiled")
    write_report(d, compiled, args.work_dir / "report.json", public_summary)


if __name__ == "__main__":
    main()
