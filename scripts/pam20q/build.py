#!/usr/bin/env python3
"""Build Pam's frozen 20 Questions probability model.

This is a pre-release build tool only. Gameplay never imports this module and never
calls a network service. The build database preserves provenance and checkpoints;
the shipped artifact is a compact deterministic probability matrix.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import os
import sqlite3
import struct
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUESTIONS = ROOT / "data/pam20q/canonical-questions.json"
DEFAULT_WORK = ROOT / ".dev-data/pam20q"
UNKNOWN = 255
MAX_KNOWN = 254

# Accepted evidence always wins. Hierarchy/external/AI only fill or strengthen cells
# below it. Values are intentionally spaced to make precedence explicit.
RANK = {"accepted": 100, "external": 80, "hierarchy": 70, "ai": 50}

ALIASES = {
    "alive": "living", "food": "food_drink", "food_drink": "food_drink",
    "air": "aircraft", "fly": "flies", "swim": "swims", "fur": "fur_hair",
    "big": "larger_than_person", "danger": "dangerous", "naturalPlace": "natural_place",
    "sea": "watercraft", "rail": "rail_vehicle", "road": "road_vehicle",
    "wearable": "clothing", "upperBody": "clothing", "legwear": "clothing",
    "household": "home", "indoors": "home", "work": "school_office", "school": "school_office",
    "water": "water_associated", "fruit": "fruit_food", "vegetable": "vegetable_food",
    "preparedFood": "prepared_food", "specificPerson": "real_person",
    "fictional": "fictional", "music": "music", "sports": "sports",
    "communication": "communication", "reading": "reading", "writing": "writing",
    "cutting": "cutting", "cleaning": "cleaning", "medical": "medical",
    "battery": "battery", "bedroom": "bedroom", "cold": "cold", "hot": "hot",
    "edible": "edible", "fragile": "fragile", "frozen": "frozen", "handle": "handle",
    "light": "light", "liquid": "liquid", "opens": "opens_closes", "outdoors": "outdoors",
    "salty": "salty", "screen": "screen", "sound": "sound", "wheels": "wheels"
}


def db_connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS concepts(
          concept_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          rank INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS questions(
          question_id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          qgroup TEXT NOT NULL,
          parents_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cells(
          concept_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          probability REAL NOT NULL CHECK(probability BETWEEN 0 AND 1),
          confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
          source_kind TEXT NOT NULL,
          source_ref TEXT NOT NULL DEFAULT '',
          precedence INTEGER NOT NULL,
          PRIMARY KEY(concept_id, question_id)
        );
        CREATE TABLE IF NOT EXISTS evidence(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          concept_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          probability REAL NOT NULL,
          confidence REAL NOT NULL,
          source_kind TEXT NOT NULL,
          source_ref TEXT NOT NULL DEFAULT '',
          accepted INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS ai_batches(
          batch_key TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          request_json TEXT NOT NULL,
          response_json TEXT,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS contradictions(
          concept_id TEXT NOT NULL,
          child_question_id TEXT NOT NULL,
          parent_question_id TEXT NOT NULL,
          child_probability REAL NOT NULL,
          parent_probability REAL NOT NULL,
          status TEXT NOT NULL,
          PRIMARY KEY(concept_id, child_question_id, parent_question_id)
        );
        """
    )
    return db


def load_questions(db: sqlite3.Connection, path: Path) -> list[dict]:
    payload = json.loads(path.read_text())
    qs = payload["questions"]
    ids = {q["id"] for q in qs}
    if not 80 <= len(qs) <= 150:
        raise SystemExit(f"canonical question count must stay within 80-150; got {len(qs)}")
    for q in qs:
        missing = [p for p in q.get("parents", []) if p not in ids]
        if missing:
            raise SystemExit(f"unknown parent(s) for {q['id']}: {missing}")
        db.execute(
            "INSERT OR REPLACE INTO questions(question_id,text,qgroup,parents_json) VALUES(?,?,?,?)",
            (q["id"], q["text"], q["group"], json.dumps(q.get("parents", []), separators=(",", ":"))),
        )
    db.commit()
    return qs


def normalize_answer(value) -> tuple[float, float] | None:
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        f = float(value)
        if 0 <= f <= 1:
            return f, 0.98
    s = str(value).strip().lower()
    if not s or s in {"unknown", "blank", "null", "none", "?"}:
        return None
    if s in {"y", "yes", "true", "1"}:
        return 0.99, 0.995
    if s in {"n", "no", "false", "0"}:
        return 0.01, 0.995
    if s in {"s", "sometimes", "maybe", "depends", "it depends"}:
        return 0.50, 0.90
    try:
        f = float(s)
        if 0 <= f <= 1:
            return f, 0.98
    except ValueError:
        pass
    return None


def put_cell(db, concept_id, question_id, p, confidence, source_kind, source_ref="") -> bool:
    qid = ALIASES.get(question_id, question_id)
    if not db.execute("SELECT 1 FROM questions WHERE question_id=?", (qid,)).fetchone():
        return False
    precedence = RANK[source_kind]
    current = db.execute(
        "SELECT precedence,confidence FROM cells WHERE concept_id=? AND question_id=?",
        (concept_id, qid),
    ).fetchone()
    if current and (current["precedence"] > precedence or
                    (current["precedence"] == precedence and current["confidence"] >= confidence)):
        return False
    db.execute(
        """INSERT INTO cells(concept_id,question_id,probability,confidence,source_kind,source_ref,precedence)
           VALUES(?,?,?,?,?,?,?)
           ON CONFLICT(concept_id,question_id) DO UPDATE SET
             probability=excluded.probability, confidence=excluded.confidence,
             source_kind=excluded.source_kind, source_ref=excluded.source_ref,
             precedence=excluded.precedence""",
        (concept_id, qid, max(0.0, min(1.0, p)), max(0.0, min(1.0, confidence)), source_kind, source_ref, precedence),
    )
    return True


def table_columns(db, table: str) -> set[str]:
    safe = table.replace('"', '""')
    return {r[1] for r in db.execute(f'PRAGMA table_info("{safe}")')}


def source_tables(src: sqlite3.Connection) -> list[str]:
    return [r[0] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]


def ingest_source_sqlite(db: sqlite3.Connection, source: Path) -> dict:
    """Import accepted Pam data without assuming one historical schema.

    Supports normalized tables and wide subject tables. A normalized answer table needs
    concept_id + question_id + one of answer/value/response/probability. A wide table
    needs concept_id and columns whose names match canonical/aliased question IDs.
    """
    src = sqlite3.connect(source)
    src.row_factory = sqlite3.Row
    qids = {r[0] for r in db.execute("SELECT question_id FROM questions")}
    accepted_columns = qids | set(ALIASES)
    concept_count = seeded = 0
    seen_concepts = set()

    for table in source_tables(src):
        cols = table_columns(src, table)
        id_col = next((c for c in ("concept_id", "id", "key") if c in cols), None)
        name_col = next((c for c in ("name", "concept", "label", "display_name") if c in cols), None)
        if not id_col and not name_col:
            continue
        safe = table.replace('"', '""')
        rows = src.execute(f'SELECT * FROM "{safe}"')
        normalized = "question_id" in cols and any(c in cols for c in ("answer", "value", "response", "probability"))
        value_col = next((c for c in ("answer", "value", "response", "probability") if c in cols), None)
        confidence_col = "confidence" if "confidence" in cols else None
        for row in rows:
            cid = str(row[id_col] if id_col else row[name_col]).strip()
            name = str(row[name_col] if name_col else cid).strip()
            if not cid or not name:
                continue
            if cid not in seen_concepts:
                db.execute("INSERT OR IGNORE INTO concepts(concept_id,name,rank) VALUES(?,?,0)", (cid, name))
                seen_concepts.add(cid)
            if normalized:
                parsed = normalize_answer(row[value_col])
                if parsed:
                    p, conf = parsed
                    if confidence_col and row[confidence_col] is not None:
                        conf = float(row[confidence_col])
                    qid = str(row["question_id"])
                    if put_cell(db, cid, qid, p, conf, "accepted", f"sqlite:{table}"):
                        seeded += 1
                        db.execute("INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref,accepted) VALUES(?,?,?,?,?,?,1)",
                                   (cid, ALIASES.get(qid, qid), p, conf, "accepted", f"sqlite:{table}"))
            else:
                for col in cols & accepted_columns:
                    parsed = normalize_answer(row[col])
                    if not parsed:
                        continue
                    p, conf = parsed
                    if put_cell(db, cid, col, p, conf, "accepted", f"sqlite:{table}:{col}"):
                        seeded += 1
                        db.execute("INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref,accepted) VALUES(?,?,?,?,?,?,1)",
                                   (cid, ALIASES.get(col, col), p, conf, "accepted", f"sqlite:{table}:{col}"))
    db.commit()
    concept_count = db.execute("SELECT COUNT(*) FROM concepts").fetchone()[0]
    src.close()
    return {"concepts": concept_count, "seeded": seeded}


def ingest_inventory_csv(db: sqlite3.Connection, path: Path) -> int:
    count = 0
    with path.open(newline="", encoding="utf-8-sig") as f:
        for i, row in enumerate(csv.DictReader(f), start=1):
            cid = str(row.get("concept_id") or row.get("id") or row.get("name") or "").strip()
            name = str(row.get("name") or row.get("concept") or cid).strip()
            if not cid or not name:
                continue
            rank = int(float(row.get("rank") or i))
            db.execute("INSERT OR IGNORE INTO concepts(concept_id,name,rank) VALUES(?,?,?)", (cid, name, rank))
            count += 1
    db.commit()
    return count


def ingest_external(db: sqlite3.Connection, paths: list[Path]) -> int:
    """Import normalized offline evidence from Wikidata/ConceptNet/WordNet/etc.

    CSV/JSONL fields: concept_id or concept/name, question_id, probability OR answer,
    confidence, source. This intentionally does not turn absence into a negative.
    """
    added = 0
    name_to_id = {r["name"].casefold(): r["concept_id"] for r in db.execute("SELECT concept_id,name FROM concepts")}
    for path in paths:
        if path.suffix.lower() in {".jsonl", ".ndjson"}:
            rows = (json.loads(line) for line in path.read_text().splitlines() if line.strip())
        else:
            fh = path.open(newline="", encoding="utf-8-sig")
            rows = csv.DictReader(fh)
        for row in rows:
            cid = str(row.get("concept_id") or "").strip()
            if not cid:
                cid = name_to_id.get(str(row.get("concept") or row.get("name") or "").strip().casefold(), "")
            qid = str(row.get("question_id") or row.get("trait") or "").strip()
            if not cid or not qid:
                continue
            parsed = normalize_answer(row.get("probability") if row.get("probability") not in (None, "") else row.get("answer"))
            if not parsed:
                continue
            p, conf = parsed
            if row.get("confidence") not in (None, ""):
                conf = float(row["confidence"])
            source = str(row.get("source") or path.name)
            db.execute("INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref,accepted) VALUES(?,?,?,?,?,?,0)",
                       (cid, ALIASES.get(qid, qid), p, conf, "external", source))
            if conf >= 0.75 and put_cell(db, cid, qid, p, conf, "external", source):
                added += 1
        if path.suffix.lower() not in {".jsonl", ".ndjson"}:
            fh.close()
    db.commit()
    return added


def propagate_hierarchy(db: sqlite3.Connection) -> tuple[int, int]:
    """Safely propagate strong positive subtype evidence upward and flag contradictions."""
    qs = {r["question_id"]: json.loads(r["parents_json"]) for r in db.execute("SELECT * FROM questions")}
    inferred = contradictions = 0
    changed = True
    while changed:
        changed = False
        rows = list(db.execute("SELECT concept_id,question_id,probability,confidence FROM cells WHERE probability>=0.90"))
        for row in rows:
            for parent in qs.get(row["question_id"], []):
                current = db.execute("SELECT probability,precedence FROM cells WHERE concept_id=? AND question_id=?", (row["concept_id"], parent)).fetchone()
                target = min(0.995, max(0.90, row["probability"] * 0.995))
                if current and current["probability"] <= 0.25:
                    db.execute("INSERT OR REPLACE INTO contradictions VALUES(?,?,?,?,?,?)",
                               (row["concept_id"], row["question_id"], parent, row["probability"], current["probability"], "flagged"))
                    contradictions += 1
                    if current["precedence"] >= RANK["external"]:
                        continue
                if put_cell(db, row["concept_id"], parent, target, min(row["confidence"], 0.97), "hierarchy", f"child:{row['question_id']}"):
                    inferred += 1
                    changed = True
    db.commit()
    return inferred, contradictions


def unresolved_for_concept(db, cid: str, weak_threshold: float) -> list[dict]:
    rows = db.execute(
        """SELECT q.question_id,q.text,c.confidence,c.precedence
           FROM questions q LEFT JOIN cells c ON c.question_id=q.question_id AND c.concept_id=?
           WHERE c.concept_id IS NULL OR (c.precedence<? AND c.confidence<?)
           ORDER BY q.rowid""",
        (cid, RANK["external"], weak_threshold),
    )
    return [{"question_id": r["question_id"], "question": r["text"]} for r in rows]


def response_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if isinstance(content.get("text"), str):
                return content["text"]
    raise ValueError("Responses API payload did not contain output text")


def call_openai(request_payload: dict, model: str, api_key: str) -> dict:
    schema = {
        "type": "object",
        "properties": {
            "concepts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "concept": {"type": "string"},
                        "answers": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "question_id": {"type": "string"},
                                    "yes_probability": {"type": "number", "minimum": 0, "maximum": 1},
                                    "confidence": {"type": "number", "minimum": 0, "maximum": 1}
                                },
                                "required": ["question_id", "yes_probability", "confidence"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["concept", "answers"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["concepts"],
        "additionalProperties": False
    }
    body = {
        "model": model,
        "store": False,
        "input": [
            {"role": "system", "content": "You are pretraining a classic 20 Questions knowledge model. Estimate how an ordinary person would answer, not pedantic encyclopedic truth. Tomato/vegetable should follow common usage; fictional characters can count as people when ordinary players would treat them that way. Return calibrated YES likelihoods. Do not invent questions."},
            {"role": "user", "content": json.dumps(request_payload, separators=(",", ":"))}
        ],
        "text": {"format": {"type": "json_schema", "name": "pam20q_batch", "strict": True, "schema": schema}}
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        raw = json.loads(resp.read())
    return json.loads(response_text(raw))


def enrich_ai(db: sqlite3.Connection, model: str, batch_concepts: int, weak_threshold: float,
              max_batches: int | None, dry_run: bool) -> tuple[int, int]:
    key = os.getenv("OPENAI_API_KEY", "")
    if not dry_run and not key:
        raise SystemExit("OPENAI_API_KEY is required for AI enrichment")
    concepts = list(db.execute("SELECT concept_id,name FROM concepts ORDER BY rank,concept_id"))
    estimated = calls = 0
    batch = []
    for c in concepts:
        qs = unresolved_for_concept(db, c["concept_id"], weak_threshold)
        if qs:
            batch.append({"concept_id": c["concept_id"], "concept": c["name"], "questions": qs})
        if len(batch) < batch_concepts:
            continue
        n, did_call = process_ai_batch(db, batch, model, key, dry_run)
        estimated += n; calls += did_call; batch = []
        if max_batches is not None and calls >= max_batches:
            break
    if batch and (max_batches is None or calls < max_batches):
        n, did_call = process_ai_batch(db, batch, model, key, dry_run)
        estimated += n; calls += did_call
    return estimated, calls


def process_ai_batch(db, batch: list[dict], model: str, key: str, dry_run: bool) -> tuple[int, int]:
    digest = hashlib.sha256(json.dumps(batch, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:24]
    existing = db.execute("SELECT status,response_json FROM ai_batches WHERE batch_key=?", (digest,)).fetchone()
    if existing and existing["status"] == "complete":
        payload = json.loads(existing["response_json"])
        return apply_ai_response(db, batch, payload, f"cache:{digest}"), 0
    request_payload = {"task": "Estimate ordinary-human YES probabilities for every supplied question.", "concepts": batch}
    db.execute("INSERT OR REPLACE INTO ai_batches VALUES(?,?,?,?,?)", (digest, "pending", json.dumps(request_payload), None, int(time.time())))
    db.commit()
    if dry_run:
        return 0, 1
    try:
        payload = call_openai(request_payload, model, key)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        db.execute("UPDATE ai_batches SET status=?,updated_at=? WHERE batch_key=?", (f"error:{type(exc).__name__}", int(time.time()), digest))
        db.commit()
        raise
    db.execute("UPDATE ai_batches SET status='complete',response_json=?,updated_at=? WHERE batch_key=?", (json.dumps(payload, separators=(",", ":")), int(time.time()), digest))
    added = apply_ai_response(db, batch, payload, f"openai:{model}:{digest}")
    db.commit()
    return added, 1


def apply_ai_response(db, batch: list[dict], payload: dict, source_ref: str) -> int:
    id_by_name = {x["concept"]: x["concept_id"] for x in batch}
    allowed = {x["concept_id"]: {q["question_id"] for q in x["questions"]} for x in batch}
    added = 0
    for item in payload.get("concepts", []):
        cid = id_by_name.get(item.get("concept"))
        if not cid:
            continue
        for a in item.get("answers", []):
            qid = a.get("question_id")
            if qid not in allowed[cid]:
                continue
            p = float(a["yes_probability"]); conf = float(a["confidence"])
            if put_cell(db, cid, qid, p, conf, "ai", source_ref):
                added += 1
                db.execute("INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref,accepted) VALUES(?,?,?,?,?,?,0)",
                           (cid, qid, p, conf, "ai", source_ref))
    return added


def compile_model(db: sqlite3.Connection, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    concepts = list(db.execute("SELECT concept_id,name FROM concepts ORDER BY rank,concept_id"))
    questions = list(db.execute("SELECT question_id,text FROM questions ORDER BY rowid"))
    qindex = {q["question_id"]: i for i, q in enumerate(questions)}
    matrix = bytearray([UNKNOWN]) * (len(concepts) * len(questions))
    cindex = {c["concept_id"]: i for i, c in enumerate(concepts)}
    for r in db.execute("SELECT concept_id,question_id,probability FROM cells"):
        ci = cindex.get(r["concept_id"]); qi = qindex.get(r["question_id"])
        if ci is None or qi is None:
            continue
        matrix[ci * len(questions) + qi] = max(0, min(MAX_KNOWN, round(float(r["probability"]) * MAX_KNOWN)))
    header = b"PAM20Q1\0" + struct.pack("<II", len(concepts), len(questions))
    raw = header + bytes(matrix)
    matrix_path = out_dir / "pam20q.v1.bin.gz"
    with gzip.open(matrix_path, "wb", compresslevel=9, mtime=0) as f:
        f.write(raw)
    sha = hashlib.sha256(matrix_path.read_bytes()).hexdigest()
    manifest = {
        "format": "pam20q-dense-u8-gzip", "version": 1,
        "concept_count": len(concepts), "question_count": len(questions),
        "matrix_file": matrix_path.name, "unknown_sentinel": UNKNOWN,
        "probability_scale": {"min": 0, "max": MAX_KNOWN, "decode": "p = byte / 254; 255 = unknown"},
        "concepts": [{"id": c["concept_id"], "name": c["name"]} for c in concepts],
        "questions": [{"id": q["question_id"], "text": q["text"]} for q in questions],
        "sha256": sha
    }
    (out_dir / "pam20q.v1.manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
    return {"bytes": matrix_path.stat().st_size, "raw_bytes": len(raw), "sha256": sha}


def report(db: sqlite3.Connection, compiled: dict | None, out: Path) -> dict:
    concepts = db.execute("SELECT COUNT(*) FROM concepts").fetchone()[0]
    questions = db.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    total = concepts * questions
    counts = {r["source_kind"]: r["n"] for r in db.execute("SELECT source_kind,COUNT(*) n FROM cells GROUP BY source_kind")}
    resolved = db.execute("SELECT COUNT(*) FROM cells").fetchone()[0]
    contradictions = db.execute("SELECT COUNT(*) FROM contradictions").fetchone()[0]
    payload = {
        "total_concepts": concepts,
        "canonical_question_count": questions,
        "total_concept_question_cells": total,
        "cells_seeded_from_accepted_pam_data": counts.get("accepted", 0),
        "cells_inferred_from_hierarchy": counts.get("hierarchy", 0),
        "cells_supported_by_external_sources": counts.get("external", 0),
        "cells_estimated_by_ai": counts.get("ai", 0),
        "unresolved_cells": max(0, total - resolved),
        "contradiction_count": contradictions,
        "compiled_artifact_size_bytes": compiled["bytes"] if compiled else None,
        "compiled_raw_matrix_bytes": compiled["raw_bytes"] if compiled else None,
        "compiled_sha256": compiled["sha256"] if compiled else None
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    return payload


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--work-dir", type=Path, default=DEFAULT_WORK)
    p.add_argument("--questions", type=Path, default=DEFAULT_QUESTIONS)
    p.add_argument("--source-db", type=Path, help="accepted Pam SQLite database")
    p.add_argument("--inventory-csv", type=Path, default=ROOT / "docs/pam-knowledge-fill/all-concepts.csv")
    p.add_argument("--external", type=Path, action="append", default=[], help="normalized offline evidence CSV/JSONL; repeatable")
    p.add_argument("--model", default=os.getenv("PAM20Q_MODEL", "gpt-6-astra"))
    p.add_argument("--batch-concepts", type=int, default=40)
    p.add_argument("--weak-confidence", type=float, default=0.70)
    p.add_argument("--max-ai-batches", type=int)
    p.add_argument("--dry-run-ai", action="store_true")
    p.add_argument("--skip-ai", action="store_true")
    p.add_argument("--reset", action="store_true")
    args = p.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)
    db_path = args.work_dir / "build.sqlite"
    if args.reset and db_path.exists():
        db_path.unlink()
    db = db_connect(db_path)
    load_questions(db, args.questions)

    if args.inventory_csv.exists():
        ingest_inventory_csv(db, args.inventory_csv)
    if args.source_db:
        if not args.source_db.exists():
            raise SystemExit(f"source db not found: {args.source_db}")
        ingest_source_sqlite(db, args.source_db)
    for ext in args.external:
        if not ext.exists():
            raise SystemExit(f"external evidence not found: {ext}")
    if args.external:
        ingest_external(db, args.external)

    propagate_hierarchy(db)
    if not args.skip_ai:
        enrich_ai(db, args.model, args.batch_concepts, args.weak_confidence, args.max_ai_batches, args.dry_run_ai)
        if not args.dry_run_ai:
            propagate_hierarchy(db)

    compiled = None
    if not args.dry_run_ai:
        compiled = compile_model(db, args.work_dir / "compiled")
    payload = report(db, compiled, args.work_dir / "report.json")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
