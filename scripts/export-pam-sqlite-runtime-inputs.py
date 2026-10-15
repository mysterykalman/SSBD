#!/usr/bin/env python3
"""Export the accepted Pam SQLite baseline as deterministic runtime inputs.

This is a recovery adapter for local environments where historical .dev-data source
dumps are no longer present. It does not alter the SQLite database. It emits:
  - inventory.jsonl: one row per accepted baseline concept
  - evidence.jsonl: one row per baseline `yes` answer whose question_id is a
    canonical controlled runtime trait

The controlled trait IDs are parsed from scripts/mom-controlled-traits.mjs so the
adapter stays aligned with the game-facing vocabulary without duplicating it.
"""
import argparse
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = Path('/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')
DEFAULT_OUT = Path('/Volumes/Samsung_T5/Pam-Knowledge/validated-enrichment/runtime-ab/sqlite-baseline-inputs')


def normalize(value):
    return ' '.join(str(value or '').strip().casefold().replace('_', ' ').split())


def controlled_trait_ids(path):
    text = Path(path).read_text(encoding='utf-8')
    ids = set(re.findall(r"\bt\('([^']+)'", text))
    if not ids:
        raise SystemExit(f'Could not parse controlled trait IDs from {path}')
    return ids


def qid_from_concept_id(value):
    value = str(value or '').strip()
    if value.startswith('wd:') and re.fullmatch(r'Q\d+', value[3:]):
        return value[3:]
    return ''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default=str(DEFAULT_DB))
    parser.add_argument('--output-dir', default=str(DEFAULT_OUT))
    args = parser.parse_args()

    db = Path(args.database)
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    if not db.is_file():
        parser.error(f'Missing Pam baseline SQLite: {db}')

    traits = controlled_trait_ids(ROOT / 'scripts/mom-controlled-traits.mjs')
    con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    if con.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        raise SystemExit('Pam baseline SQLite quick_check failed')

    concepts = list(con.execute('SELECT row_id, concept_id, name FROM concepts ORDER BY row_id'))
    questions = {
        int(r['question_index']): (str(r['question_id']), str(r['wording'] or ''))
        for r in con.execute('SELECT question_index, question_id, wording FROM questions')
    }

    inventory_path = out / 'inventory.jsonl'
    with inventory_path.open('w', encoding='utf-8') as f:
        for rank, r in enumerate(concepts, 1):
            name = str(r['name'] or '').strip()
            if not name:
                continue
            row = {
                'rank': rank,
                'name': name,
                'aliases': [],
                'key': normalize(name),
                'difficulty': 'Unknown',
                'sourceCategory': '',
                'broadCategory': '',
                'facets': {},
                'sourceCount': 1,
                'sources': ['Pam SQLite baseline'],
                'score': 0,
                'qid': qid_from_concept_id(r['concept_id']),
                'reason': 'Accepted Pam SQLite baseline concept',
            }
            f.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')

    evidence_path = out / 'evidence.jsonl'
    evidence_count = 0
    represented_questions = set()
    query = '''
        SELECT a.concept_row_id, a.question_index, c.name
        FROM answers a
        JOIN concepts c ON c.row_id = a.concept_row_id
        WHERE a.answer = 'yes'
        ORDER BY a.concept_row_id, a.question_index
    '''
    with evidence_path.open('w', encoding='utf-8') as f:
        for r in con.execute(query):
            question_id, wording = questions.get(int(r['question_index']), ('', ''))
            if question_id not in traits:
                continue
            payload = {
                'concept': str(r['name']),
                'source': 'Pam SQLite baseline',
                'type': 'canonical-trait-id',
                'trait': question_id,
                'question': wording,
                'support': 1,
            }
            f.write(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
            evidence_count += 1
            represented_questions.add(question_id)
    con.close()

    summary = {
        'mode': 'pam-sqlite-baseline-runtime-adapter',
        'database': str(db),
        'concepts': len(concepts),
        'controlled_trait_count': len(traits),
        'baseline_yes_evidence_rows': evidence_count,
        'represented_controlled_traits': len(represented_questions),
        'inventory': str(inventory_path),
        'evidence': str(evidence_path),
        'database_modified': False,
    }
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
