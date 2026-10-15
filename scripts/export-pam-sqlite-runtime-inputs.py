#!/usr/bin/env python3
"""Export the accepted Pam SQLite baseline as deterministic runtime inputs.

This adapter is intentionally lossless for the answer matrix. It does not alter
SQLite. It emits:
  - inventory.jsonl: one row per accepted baseline concept
  - baseline-profiles.json: profiles preserving every yes/no/sometimes answer by
    exact question_id
  - enriched-profiles.json: the same profiles plus approved enrichment facts
    when --approved-evidence is supplied

The runtime compiler already understands profile.traits/yes, profile.no and
profile.maybe, so this avoids reconstructing accepted Pam knowledge from sparse
positive-only evidence.
"""
import argparse
import json
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = Path('/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')
DEFAULT_OUT = Path('/Volumes/Samsung_T5/Pam-Knowledge/validated-enrichment/runtime-ab/sqlite-baseline-inputs')


def normalize(value):
    text = unicodedata.normalize('NFKC', str(value or ''))
    return ' '.join(text.casefold().replace('_', ' ').split())


def qid_from_concept_id(value):
    value = str(value or '').strip()
    if value.startswith('wd:') and re.fullmatch(r'Q\d+', value[3:]):
        return value[3:]
    return ''


def load_approved(path):
    if not path:
        return []
    filename = Path(path)
    if not filename.is_file():
        raise SystemExit(f'Missing approved enrichment evidence: {filename}')
    data = json.loads(filename.read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise SystemExit('Approved enrichment evidence must be a JSON array')
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default=str(DEFAULT_DB))
    parser.add_argument('--output-dir', default=str(DEFAULT_OUT))
    parser.add_argument('--approved-evidence')
    args = parser.parse_args()

    db = Path(args.database)
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    if not db.is_file():
        parser.error(f'Missing Pam baseline SQLite: {db}')

    con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    if con.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        raise SystemExit('Pam baseline SQLite quick_check failed')

    concepts = [dict(r) for r in con.execute(
        'SELECT row_id, concept_id, name, category, subcategory FROM concepts ORDER BY row_id'
    )]
    questions = {
        int(r['question_index']): str(r['question_id'])
        for r in con.execute('SELECT question_index, question_id FROM questions')
    }
    question_ids = set(questions.values())

    answers = defaultdict(lambda: {'yes': set(), 'no': set(), 'sometimes': set()})
    answer_counts = Counter()
    for r in con.execute('SELECT concept_row_id, question_index, answer FROM answers ORDER BY concept_row_id, question_index'):
        qid = questions.get(int(r['question_index']))
        answer = str(r['answer'] or '')
        if not qid or answer not in ('yes', 'no', 'sometimes'):
            continue
        answers[int(r['concept_row_id'])][answer].add(qid)
        answer_counts[answer] += 1
    con.close()

    inventory_path = out / 'inventory.jsonl'
    baseline_profiles_path = out / 'baseline-profiles.json'
    enriched_profiles_path = out / 'enriched-profiles.json'

    objects = []
    by_qid = {}
    by_name = defaultdict(list)
    with inventory_path.open('w', encoding='utf-8') as f:
        for rank, r in enumerate(concepts, 1):
            name = str(r['name'] or '').strip()
            if not name:
                continue
            qid = qid_from_concept_id(r.get('concept_id'))
            key = normalize(name)
            truth = answers[int(r['row_id'])]
            inventory = {
                'rank': rank,
                'name': name,
                'aliases': [],
                'key': key,
                'difficulty': 'Unknown',
                'sourceCategory': str(r.get('subcategory') or ''),
                'broadCategory': str(r.get('category') or ''),
                'facets': {},
                'sourceCount': 1,
                'sources': ['Pam SQLite baseline'],
                'score': 1,
                'qid': qid,
                'reason': 'Accepted Pam SQLite baseline concept',
            }
            f.write(json.dumps(inventory, ensure_ascii=False, separators=(',', ':')) + '\n')
            profile = {
                'name': name,
                'aliases': [],
                'key': key,
                'qid': qid,
                'difficulty': 'Unknown',
                'score': 1,
                'sources': ['Pam SQLite baseline'],
                'broadCategory': str(r.get('category') or ''),
                'sourceCategory': str(r.get('subcategory') or ''),
                'facets': {},
                'traits': sorted(truth['yes']),
                'no': sorted(truth['no']),
                'maybe': sorted(truth['sometimes']),
            }
            idx = len(objects)
            objects.append(profile)
            if qid:
                by_qid[qid] = idx
            by_name[key].append(idx)

    baseline_doc = {'version': 3, 'source': 'Pam SQLite accepted truth matrix', 'objects': objects}
    baseline_profiles_path.write_text(json.dumps(baseline_doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')

    enriched_objects = json.loads(json.dumps(objects, ensure_ascii=False))
    approved = load_approved(args.approved_evidence)
    applied = 0
    skipped = Counter()
    touched = set()
    for row in approved:
        if not isinstance(row, dict):
            skipped['malformed_row'] += 1
            continue
        concept_name = str(row.get('concept') or '').strip()
        qid = str(row.get('qid') or '').strip()
        idx = by_qid.get(qid) if qid else None
        if idx is None:
            matches = by_name.get(normalize(concept_name), [])
            if len(matches) == 1:
                idx = matches[0]
            elif len(matches) > 1:
                skipped['ambiguous_name'] += 1
                continue
        if idx is None:
            skipped['missing_concept'] += 1
            continue
        evidence_rows = row.get('evidence') if isinstance(row.get('evidence'), list) else []
        for evidence in evidence_rows:
            trait = str((evidence or {}).get('trait') or '').strip()
            if not trait or trait not in question_ids:
                skipped['unknown_question_id'] += 1
                continue
            profile = enriched_objects[idx]
            yes = set(profile.get('traits') or [])
            no = set(profile.get('no') or [])
            maybe = set(profile.get('maybe') or [])
            if trait in yes:
                skipped['already_yes'] += 1
                continue
            if trait in no:
                skipped['explicit_no_conflict'] += 1
                continue
            yes.add(trait)
            maybe.discard(trait)
            profile['traits'] = sorted(yes)
            profile['no'] = sorted(no)
            profile['maybe'] = sorted(maybe)
            applied += 1
            touched.add(idx)

    enriched_doc = {'version': 3, 'source': 'Pam SQLite accepted truth matrix plus approved enrichment', 'objects': enriched_objects}
    enriched_profiles_path.write_text(json.dumps(enriched_doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')

    summary = {
        'mode': 'pam-sqlite-lossless-runtime-adapter',
        'database': str(db),
        'concepts': len(objects),
        'question_ids': len(question_ids),
        'baseline_answer_counts': dict(answer_counts),
        'baseline_answer_rows': sum(answer_counts.values()),
        'approved_concept_rows': len(approved),
        'approved_facts_applied': applied,
        'approved_concepts_touched': len(touched),
        'approved_skipped': dict(skipped),
        'inventory': str(inventory_path),
        'baseline_profiles': str(baseline_profiles_path),
        'enriched_profiles': str(enriched_profiles_path),
        'database_modified': False,
    }
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
