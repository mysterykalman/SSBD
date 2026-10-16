#!/usr/bin/env python3
"""Build Pam20Q from the accepted normalized SQLite baseline, with AI disabled.

This is a thin authoritative-input adapter around the existing Pam20Q pipeline. It
uses the accepted concepts/questions/answers schema directly, then applies the same
external, public-20Q, hierarchy, compile and reporting functions from build.py.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.dev-data/pam20q'
DEFAULT_DB = Path('/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')

spec = importlib.util.spec_from_file_location('pam20q_build', Path(__file__).with_name('build.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def load_authoritative_sqlite(d, path: Path) -> dict:
    s = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    s.row_factory = sqlite3.Row
    if s.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        raise SystemExit('authoritative SQLite quick_check failed')

    tables = {r[0] for r in s.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    required = {'concepts', 'questions', 'answers'}
    if not required.issubset(tables):
        raise SystemExit(f'authoritative SQLite missing tables: {sorted(required - tables)}')

    concepts = list(s.execute('SELECT row_id, concept_id, name FROM concepts ORDER BY row_id'))
    if len(concepts) != 53092:
        raise SystemExit(f'expected 53092 authoritative concepts, got {len(concepts)}')
    for r in concepts:
        cid = str(r['concept_id'] or '').strip()
        name = str(r['name'] or '').strip()
        if not cid or not name:
            raise SystemExit(f'blank authoritative concept at row {r["row_id"]}')
        d.execute('INSERT INTO concepts(concept_id,name,rank) VALUES(?,?,?)', (cid, name, int(r['row_id'])))
    d.commit()

    question_rows = list(s.execute('SELECT question_index, question_id, wording FROM questions ORDER BY question_index'))
    mapped_question_ids = set()
    accepted_rows_seen = 0
    accepted_cells_loaded = 0
    skipped_unmapped = 0
    query = '''
      SELECT c.concept_id, q.question_id, a.answer
      FROM answers a
      JOIN concepts c ON c.row_id = a.concept_row_id
      JOIN questions q ON q.question_index = a.question_index
      ORDER BY a.concept_row_id, a.question_index
    '''
    for r in s.execute(query):
        accepted_rows_seen += 1
        qid = str(r['question_id'] or '').strip()
        parsed = build.normalize_answer(r['answer'])
        if not parsed:
            continue
        probability, confidence = parsed
        canonical_qid = build.ALIASES.get(qid, qid)
        if not d.execute('SELECT 1 FROM questions WHERE question_id=?', (canonical_qid,)).fetchone():
            skipped_unmapped += 1
            continue
        mapped_question_ids.add(canonical_qid)
        if build.put(d, str(r['concept_id']), canonical_qid, probability, confidence, 'accepted', f'sqlite:answers:{qid}'):
            build.add_evidence(d, str(r['concept_id']), canonical_qid, probability, confidence, 'accepted', f'sqlite:answers:{qid}', accepted=1)
            accepted_cells_loaded += 1
    d.commit()
    s.close()
    return {
        'concepts': len(concepts),
        'source_questions': len(question_rows),
        'mapped_canonical_questions': len(mapped_question_ids),
        'answer_rows_seen': accepted_rows_seen,
        'accepted_cells_loaded': accepted_cells_loaded,
        'answer_rows_skipped_unmapped_question': skipped_unmapped,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-db', type=Path, default=DEFAULT_DB)
    p.add_argument('--work-dir', type=Path, default=WORK)
    p.add_argument('--questions', type=Path, default=ROOT / 'data/pam20q/final-canonical-questions.json')
    p.add_argument('--external', type=Path, action='append', default=[])
    p.add_argument('--public-reference', type=Path, default=ROOT / 'data/pam20q/reference/david-ar-20q')
    p.add_argument('--reset', action='store_true')
    a = p.parse_args()
    if not a.source_db.is_file():
        p.error(f'missing authoritative SQLite: {a.source_db}')

    a.work_dir.mkdir(parents=True, exist_ok=True)
    db_path = a.work_dir / 'build.sqlite'
    if a.reset and db_path.exists():
        db_path.unlink()
    d = build.db_connect(db_path)
    build.load_questions(d, a.questions)
    source = load_authoritative_sqlite(d, a.source_db)
    build.load_external(d, a.external)
    public_summary = build.load_public_reference(d, a.public_reference) if a.public_reference.exists() else {'targets': 0, 'safe_targets': 0, 'cells': 0}
    build.apply_hierarchy(d)
    compiled = build.compile_model(d, a.work_dir / 'compiled')
    build.write_report(d, compiled, a.work_dir / 'report.json', public_summary)

    report = json.loads((a.work_dir / 'report.json').read_text())
    report['authoritative_source'] = {
        'path': str(a.source_db),
        'sha256': file_sha256(a.source_db),
        **source,
    }
    report['populated_cells'] = report['total_concept_question_cells'] - report['unresolved_cells']
    report['populated_percentage'] = report['populated_cells'] / report['total_concept_question_cells']
    report['unresolved_percentage'] = report['unresolved_cells'] / report['total_concept_question_cells']
    report['ai_enrichment_ran'] = False
    (a.work_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
