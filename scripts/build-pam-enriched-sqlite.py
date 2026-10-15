#!/usr/bin/env python3
"""Build an isolated Pam SQLite candidate from clean traits and benchmark it.

Never mutates the immutable baseline. Only exact question_id == trait mappings are
written as yes answers. Existing answers are preserved and conflicts are skipped.
"""
import argparse
import csv
import hashlib
import json
import shutil
import sqlite3
from collections import Counter
from pathlib import Path


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline', default='/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')
    p.add_argument('--traits', default='/Volumes/Samsung_T5/Pam-Knowledge/clean-candidates/clean-candidate-traits.csv')
    p.add_argument('--output-dir', default='/Volumes/Samsung_T5/Pam-Knowledge/enriched-candidate')
    p.add_argument('--filename', default='pam-enriched-candidate.sqlite')
    args = p.parse_args()

    baseline = Path(args.baseline)
    traits = Path(args.traits)
    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    target = outdir / args.filename
    if not baseline.is_file() or not traits.is_file():
        p.error('Missing baseline or clean trait CSV')

    source_sha = sha256(baseline)
    shutil.copy2(baseline, target)
    if sha256(target) != source_sha:
        p.error('Copied baseline checksum mismatch')

    db = sqlite3.connect(target)
    db.row_factory = sqlite3.Row
    if db.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        p.error('Candidate copy failed integrity check before writes')

    qmap = {}
    for r in db.execute('SELECT question_index,question_id FROM questions'):
        qmap.setdefault(r['question_id'], []).append(r['question_index'])
    existing = {(r['concept_row_id'], r['question_index']): r['answer']
                for r in db.execute('SELECT concept_row_id,question_index,answer FROM answers')}
    concepts = {r['row_id'] for r in db.execute('SELECT row_id FROM concepts')}

    rows = list(csv.DictReader(traits.open(newline='', encoding='utf-8')))
    stats = Counter()
    applied = []
    skipped = []

    db.execute('BEGIN')
    try:
        for row in rows:
            cid = int(row['concept_row_id'])
            trait = row['trait'].strip()
            if cid not in concepts:
                stats['missing_concept'] += 1
                skipped.append({**row, 'reason': 'missing-concept'})
                continue
            matches = qmap.get(trait, [])
            if len(matches) != 1:
                stats['no_exact_question'] += 1
                skipped.append({**row, 'reason': 'no-exact-question-id'})
                continue
            qi = matches[0]
            current = existing.get((cid, qi))
            if current == 'yes':
                stats['already_yes'] += 1
                continue
            if current == 'no':
                stats['existing_no_conflict'] += 1
                skipped.append({**row, 'reason': 'existing-no-conflict'})
                continue
            if current not in (None, 'sometimes'):
                stats['existing_other'] += 1
                skipped.append({**row, 'reason': f'existing-{current}'})
                continue
            db.execute('INSERT OR REPLACE INTO answers(concept_row_id,question_index,answer) VALUES(?,?,?)', (cid, qi, 'yes'))
            existing[(cid, qi)] = 'yes'
            stats['inserted_yes'] += 1
            applied.append({**row, 'question_index': qi, 'previous_answer': current or ''})
        db.commit()
    except Exception:
        db.rollback()
        raise

    integrity = db.execute('PRAGMA integrity_check').fetchone()[0]
    counts = {r['name']: r['n'] for r in db.execute("""
      SELECT 'concepts' AS name,count(*) n FROM concepts
      UNION ALL SELECT 'answers',count(*) FROM answers
      UNION ALL SELECT 'facets',count(*) FROM facets
      UNION ALL SELECT 'questions',count(*) FROM questions
    """)}
    yes_count = db.execute("SELECT count(*) FROM answers WHERE answer='yes'").fetchone()[0]
    no_count = db.execute("SELECT count(*) FROM answers WHERE answer='no'").fetchone()[0]
    sometimes_count = db.execute("SELECT count(*) FROM answers WHERE answer='sometimes'").fetchone()[0]
    db.close()

    fields = list(rows[0].keys()) if rows else ['concept_row_id','trait']
    with (outdir / 'applied.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields + ['question_index','previous_answer'])
        w.writeheader(); w.writerows(applied)
    with (outdir / 'skipped.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields + ['reason'])
        w.writeheader(); w.writerows(skipped)

    summary = {
        'mode': 'isolated-enriched-sqlite-candidate',
        'baseline': str(baseline),
        'baseline_sha256': source_sha,
        'candidate': str(target),
        'candidate_sha256': sha256(target),
        'input_trait_rows': len(rows),
        'stats': dict(stats),
        'integrity_check': integrity,
        'counts': counts,
        'answer_counts': {'yes': yes_count, 'no': no_count, 'sometimes': sometimes_count},
        'baseline_modified': False,
        'runtime_modified': False,
        'safe_write_rule': 'Only exact question_id == trait mappings; existing no answers are never overwritten.'
    }
    (outdir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
