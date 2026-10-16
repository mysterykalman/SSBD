#!/usr/bin/env python3
"""Build Pam20Q from the accepted normalized SQLite baseline.

This remains a thin authoritative-input adapter around the existing Pam20Q pipeline.
The AI path is opt-in and uses build.py's established question selection, prompt,
structured response call, precedence rules and cell application. This adapter adds
strict batch validation, retry/backoff, model-aware cache keys and run metrics so the
one-time enrichment can be resumed safely without weakening stronger evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import sqlite3
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.dev-data/pam20q'
DEFAULT_DB = Path('/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')
AI_PIPELINE_VERSION = 'pam20q-ai-validated-v1'

spec = importlib.util.spec_from_file_location('pam20q_build', Path(__file__).with_name('build.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

AI_STATS = {
    'pipeline_version': AI_PIPELINE_VERSION,
    'model': None,
    'batches_attempted': 0,
    'batches_accepted': 0,
    'batch_retry_attempts': 0,
    'cached_batches_reused': 0,
    'api_requests': 0,
    'malformed_outputs': 0,
    'rejected_cells': 0,
    'accepted_ai_cells_this_run': 0,
    'token_usage': 'not exposed by the existing build.py openai_call helper',
    'elapsed_generation_seconds': 0.0,
}


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
    source_id_counts = Counter(str(r['concept_id'] or '').strip() for r in concepts)
    duplicate_source_ids = {cid: count for cid, count in source_id_counts.items() if cid and count > 1}
    seen = Counter()
    internal_by_row = {}
    for r in concepts:
        source_cid = str(r['concept_id'] or '').strip()
        name = str(r['name'] or '').strip()
        if not source_cid or not name:
            raise SystemExit(f'blank authoritative concept at row {r["row_id"]}')
        seen[source_cid] += 1
        internal_cid = source_cid if seen[source_cid] == 1 else f'{source_cid}::sqlite-row-{int(r["row_id"])}'
        internal_by_row[int(r['row_id'])] = internal_cid
        d.execute('INSERT INTO concepts(concept_id,name,rank) VALUES(?,?,?)', (internal_cid, name, int(r['row_id'])))
    d.commit()
    if d.execute('SELECT COUNT(*) FROM concepts').fetchone()[0] != 53092:
        raise SystemExit('failed to preserve all 53092 authoritative row identities')

    question_rows = list(s.execute('SELECT question_index, question_id, wording FROM questions ORDER BY question_index'))
    mapped_question_ids = set()
    accepted_rows_seen = accepted_cells_loaded = skipped_unmapped = 0
    query = '''
      SELECT c.row_id AS concept_row_id, c.concept_id AS source_concept_id, q.question_id, a.answer
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
        internal_cid = internal_by_row[int(r['concept_row_id'])]
        ref = f'sqlite:answers:{qid}:row={int(r["concept_row_id"])}'
        if build.put(d, internal_cid, canonical_qid, probability, confidence, 'accepted', ref):
            build.add_evidence(d, internal_cid, canonical_qid, probability, confidence, 'accepted', ref, accepted=1)
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
        'duplicate_source_concept_ids': len(duplicate_source_ids),
        'additional_rows_using_duplicate_source_ids': sum(v - 1 for v in duplicate_source_ids.values()),
        'duplicate_source_id_counts': duplicate_source_ids,
    }


def _validate_ai_response(batch, output):
    if not isinstance(output, dict) or set(output) != {'concepts'} or not isinstance(output['concepts'], list):
        raise ValueError('AI response must contain only a concepts array')
    expected_by_name = {}
    for item in batch:
        name = item['concept']
        if name in expected_by_name:
            raise ValueError(f'duplicate display name inside AI batch: {name!r}')
        expected_by_name[name] = item
    seen_concepts = set()
    total_answers = 0
    for item in output['concepts']:
        if not isinstance(item, dict) or set(item) != {'concept', 'answers'}:
            raise ValueError('AI concept result has invalid keys')
        name = item.get('concept')
        if name not in expected_by_name or name in seen_concepts:
            raise ValueError(f'unknown or duplicate concept in AI response: {name!r}')
        seen_concepts.add(name)
        answers = item.get('answers')
        if not isinstance(answers, list):
            raise ValueError(f'answers must be an array for {name!r}')
        expected_qids = {q['question_id'] for q in expected_by_name[name]['questions']}
        seen_qids = set()
        for answer in answers:
            if not isinstance(answer, dict) or set(answer) != {'question_id', 'yes_probability', 'confidence'}:
                raise ValueError(f'invalid answer structure for {name!r}')
            qid = answer.get('question_id')
            if qid not in expected_qids or qid in seen_qids:
                raise ValueError(f'unknown or duplicate question {qid!r} for {name!r}')
            seen_qids.add(qid)
            for key in ('yes_probability', 'confidence'):
                value = answer.get(key)
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= float(value) <= 1:
                    raise ValueError(f'invalid {key} for {name!r}/{qid!r}')
            total_answers += 1
        if seen_qids != expected_qids:
            missing = sorted(expected_qids - seen_qids)
            raise ValueError(f'incomplete AI response for {name!r}; missing {len(missing)} questions')
    if seen_concepts != set(expected_by_name):
        raise ValueError(f'incomplete AI response; missing {len(set(expected_by_name) - seen_concepts)} concepts')
    return total_answers


def _validated_process_batch(d, batch, model, key, dry):
    cache_material = {
        'pipeline_version': AI_PIPELINE_VERSION,
        'model': model,
        'batch': batch,
    }
    request_hash = hashlib.sha256(json.dumps(cache_material, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:24]
    old = d.execute('SELECT status,response_json FROM ai_batches WHERE batch_key=?', (request_hash,)).fetchone()
    if old and old['status'] == 'complete':
        output = json.loads(old['response_json'])
        _validate_ai_response(batch, output)
        before = d.execute("SELECT COUNT(*) FROM cells WHERE source_kind='ai'").fetchone()[0]
        build.apply_ai(d, batch, output, 'cache:' + request_hash)
        after = d.execute("SELECT COUNT(*) FROM cells WHERE source_kind='ai'").fetchone()[0]
        AI_STATS['cached_batches_reused'] += 1
        AI_STATS['accepted_ai_cells_this_run'] += max(0, after - before)
        return 0

    payload = {
        'task': 'Estimate ordinary-human YES probabilities for every supplied unknown question.',
        'canonical_question_count': d.execute('SELECT COUNT(*) FROM questions').fetchone()[0],
        'concepts': batch,
    }
    d.execute(
        'INSERT OR REPLACE INTO ai_batches VALUES(?,?,?,?,?)',
        (request_hash, 'pending', json.dumps(payload), None, int(time.time())),
    )
    d.commit()
    AI_STATS['batches_attempted'] += 1
    if dry:
        return 1

    last_error = None
    for attempt in range(1, 6):
        if attempt > 1:
            AI_STATS['batch_retry_attempts'] += 1
            time.sleep(min(30, 2 ** (attempt - 1)))
        try:
            AI_STATS['api_requests'] += 1
            output = build.openai_call(payload, model, key)
            expected_answers = _validate_ai_response(batch, output)
            before = d.execute("SELECT COUNT(*) FROM cells WHERE source_kind='ai'").fetchone()[0]
            build.apply_ai(d, batch, output, f'openai:{model}:{request_hash}')
            after = d.execute("SELECT COUNT(*) FROM cells WHERE source_kind='ai'").fetchone()[0]
            accepted = max(0, after - before)
            AI_STATS['accepted_ai_cells_this_run'] += accepted
            AI_STATS['rejected_cells'] += max(0, expected_answers - accepted)
            d.execute(
                "UPDATE ai_batches SET status='complete',response_json=?,updated_at=? WHERE batch_key=?",
                (json.dumps(output, separators=(',', ':')), int(time.time()), request_hash),
            )
            d.commit()
            AI_STATS['batches_accepted'] += 1
            return 1
        except ValueError as exc:
            AI_STATS['malformed_outputs'] += 1
            last_error = exc
        except Exception as exc:
            last_error = exc
    d.execute(
        "UPDATE ai_batches SET status='retryable_failure',response_json=?,updated_at=? WHERE batch_key=?",
        (json.dumps({'error_type': type(last_error).__name__, 'error': str(last_error)[:2000]}), int(time.time()), request_hash),
    )
    d.commit()
    raise RuntimeError(f'AI batch {request_hash} failed after 5 attempts: {last_error}')


def _install_ai_guards(model):
    AI_STATS['model'] = model
    build.process_batch = _validated_process_batch


def _source_summary_from_existing_report(work_dir: Path, source_db: Path):
    report_path = work_dir / 'report.json'
    if report_path.exists():
        prior = json.loads(report_path.read_text())
        source = prior.get('authoritative_source')
        if source and source.get('sha256') == file_sha256(source_db):
            return source
    return {'path': str(source_db), 'sha256': file_sha256(source_db), 'concepts': 53092}


def _sparse_profile_metrics(d):
    rows = list(d.execute('''
      SELECT c.concept_id,c.name,COUNT(x.question_id) resolved
      FROM concepts c LEFT JOIN cells x ON x.concept_id=c.concept_id
      GROUP BY c.concept_id,c.name
      ORDER BY resolved ASC,c.rank ASC,c.concept_id ASC
    '''))
    weak = [r for r in rows if r['resolved'] < 100]
    very_sparse = [r for r in rows if r['resolved'] < 50]
    return {
        'concepts_with_fewer_than_100_resolved_questions': len(weak),
        'concepts_with_fewer_than_50_resolved_questions': len(very_sparse),
        'sparsest_20': [
            {'concept_id': r['concept_id'], 'name': r['name'], 'resolved_questions': r['resolved']}
            for r in rows[:20]
        ],
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-db', type=Path, default=DEFAULT_DB)
    p.add_argument('--work-dir', type=Path, default=WORK)
    p.add_argument('--questions', type=Path, default=ROOT / 'data/pam20q/final-canonical-questions.json')
    p.add_argument('--external', type=Path, action='append', default=[])
    p.add_argument('--public-reference', type=Path, default=ROOT / 'data/pam20q/reference/david-ar-20q')
    p.add_argument('--model', default=os.getenv('PAM20Q_MODEL', 'gpt-6-astra'))
    p.add_argument('--batch-concepts', type=int, default=40)
    p.add_argument('--weak-confidence', type=float, default=0.70)
    p.add_argument('--max-ai-batches', type=int)
    p.add_argument('--run-ai', action='store_true')
    p.add_argument('--dry-run-ai', action='store_true')
    p.add_argument('--reset', action='store_true')
    a = p.parse_args()
    if not a.source_db.is_file():
        p.error(f'missing authoritative SQLite: {a.source_db}')
    if file_sha256(a.source_db) != '174ddee278356be17df88fb49627c1a10e668cb4c16ec8baf30cf2f212ac6506':
        raise SystemExit('authoritative SQLite SHA-256 mismatch')

    a.work_dir.mkdir(parents=True, exist_ok=True)
    db_path = a.work_dir / 'build.sqlite'
    if a.reset and db_path.exists():
        db_path.unlink()
    fresh = not db_path.exists()
    d = build.db_connect(db_path)

    if fresh or d.execute('SELECT COUNT(*) FROM concepts').fetchone()[0] == 0:
        build.load_questions(d, a.questions)
        source = load_authoritative_sqlite(d, a.source_db)
        build.load_external(d, a.external)
        public_summary = build.load_public_reference(d, a.public_reference) if a.public_reference.exists() else {'targets': 0, 'safe_targets': 0, 'cells': 0}
        build.apply_hierarchy(d)
    else:
        concepts = d.execute('SELECT COUNT(*) FROM concepts').fetchone()[0]
        questions = d.execute('SELECT COUNT(*) FROM questions').fetchone()[0]
        if concepts != 53092 or questions != 150:
            raise SystemExit(f'resume database has wrong dimensions: {concepts} concepts x {questions} questions')
        source = _source_summary_from_existing_report(a.work_dir, a.source_db)
        public_summary = {'resumed_existing_build': True}

    started = time.monotonic()
    if a.run_ai:
        _install_ai_guards(a.model)
        build.run_ai(d, a.model, a.batch_concepts, a.weak_confidence, a.max_ai_batches, a.dry_run_ai)
    AI_STATS['elapsed_generation_seconds'] = round(time.monotonic() - started, 3)

    if not a.dry_run_ai:
        build.apply_hierarchy(d)
    compiled = None if a.dry_run_ai else build.compile_model(d, a.work_dir / 'compiled')
    build.write_report(d, compiled, a.work_dir / 'report.json', public_summary)

    report = json.loads((a.work_dir / 'report.json').read_text())
    report['authoritative_source'] = {'path': str(a.source_db), 'sha256': file_sha256(a.source_db), **source}
    report['populated_cells'] = report['total_concept_question_cells'] - report['unresolved_cells']
    report['populated_percentage'] = report['populated_cells'] / report['total_concept_question_cells']
    report['unresolved_percentage'] = report['unresolved_cells'] / report['total_concept_question_cells']
    report['ai_enrichment_ran'] = report['cells_estimated_by_ai'] > 0
    report['ai_run'] = AI_STATS
    report['profile_sparsity'] = _sparse_profile_metrics(d)
    (a.work_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
