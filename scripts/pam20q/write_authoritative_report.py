#!/usr/bin/env python3
"""Write compact, reviewable authoritative Pam20Q baseline outputs."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.dev-data/pam20q'
DOCS = ROOT / 'docs/pam20q-authoritative-baseline'


def normalize_name(value):
    s = str(value or '').strip().casefold().replace('_', ' ')
    s = re.sub(r"[^\w\s'-]+", ' ', s, flags=re.UNICODE)
    return ' '.join(s.split())


def main():
    build = json.loads((WORK / 'report.json').read_text(encoding='utf-8'))
    reconciliation = json.loads((WORK / 'inventory-reconciliation/missing-concepts.json').read_text(encoding='utf-8'))
    reconciliation_summary = json.loads((WORK / 'inventory-reconciliation/summary.json').read_text(encoding='utf-8'))
    benchmark = json.loads((WORK / 'benchmark.json').read_text(encoding='utf-8'))
    DOCS.mkdir(parents=True, exist_ok=True)

    rows = []
    for r in reconciliation:
        rows.append({
            'concept_name': r['concept_name'],
            'sqlite_concept_id': r['sqlite_concept_identifier'],
            'qid': r.get('qid', ''),
            'normalized_name': normalize_name(r['concept_name']),
            'alternate_or_alias_match_exists': bool(r.get('exists_under_other_normalized_name_or_alias')),
            'reason_for_discrepancy': r.get('reason_missing_from_fallback', ''),
            'retained_in_pam20q': bool(r.get('retain_in_pam20q', True)),
            'alternate_fallback_matches': r.get('alternate_fallback_matches', []),
        })
    if len(rows) != 452:
        raise SystemExit(f'expected 452 reconciliation rows, got {len(rows)}')
    if any(not r['retained_in_pam20q'] for r in rows):
        raise SystemExit('authoritative reconciliation contains an undocumented exclusion')

    csv_path = DOCS / 'sqlite-only-452.csv'
    with csv_path.open('w', newline='', encoding='utf-8') as f:
        fields = ['concept_name','sqlite_concept_id','qid','normalized_name','alternate_or_alias_match_exists','reason_for_discrepancy','retained_in_pam20q','alternate_fallback_matches']
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            rr = dict(r)
            rr['alternate_fallback_matches'] = json.dumps(rr['alternate_fallback_matches'], ensure_ascii=False, separators=(',', ':'))
            w.writerow(rr)

    compact_benchmark = {k: v for k, v in benchmark.items() if k != 'rows'}
    (DOCS / 'benchmark.json').write_text(json.dumps(compact_benchmark, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (DOCS / 'build-report.json').write_text(json.dumps(build, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (DOCS / 'reconciliation-summary.json').write_text(json.dumps(reconciliation_summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    total = build['total_concept_question_cells']
    populated = total - build['unresolved_cells']
    source = build.get('authoritative_source', {})
    lines = [
        '# Pam20Q authoritative pre-AI baseline', '',
        f"- Authoritative concepts: {build['total_concepts']:,}",
        f"- Canonical questions: {build['canonical_question_count']}",
        f"- Total cells: {total:,}",
        f"- SQLite-seeded cells: {build.get('cells_seeded_from_accepted_pam_data',0):,}",
        f"- Curated evidence cells: {build.get('cells_seeded_from_curated_pam_evidence',0):,}",
        f"- External-evidence cells: {build.get('cells_supported_by_external_sources',0):,}",
        f"- Public 20Q cells: {build.get('cells_seeded_from_public_20q',0):,}",
        f"- Hierarchy-derived cells: {build.get('cells_inferred_from_hierarchy',0):,}",
        f"- AI cells: {build.get('cells_estimated_by_ai',0):,}",
        f"- Unknown cells: {build['unresolved_cells']:,}",
        f"- Contradictions: {build['contradiction_count']:,}",
        f"- Populated: {100*populated/total:.4f}%",
        f"- Unresolved: {100*build['unresolved_cells']/total:.4f}%",
        f"- Raw uint8 artifact bytes: {build['compiled_raw_matrix_bytes']:,}",
        f"- Compressed uint8 artifact bytes: {build['compiled_artifact_size_bytes']:,}",
        f"- Artifact SHA-256: `{build['compiled_sha256']}`",
        f"- SQLite SHA-256: `{source.get('sha256','')}`", '',
        '## Inventory reconciliation', '',
        f"All {len(rows)} SQLite identities absent by same identity from the fallback comparison are retained. See `sqlite-only-452.csv` for concept name, SQLite ID, QID, normalized name, alternate/alias status, discrepancy reason and retention decision.", '',
        '## Deterministic seeded gameplay benchmark', '',
        f"- Benchmark concepts: {benchmark['benchmarkConcepts']:,}",
        f"- Present concepts: {benchmark['presentConcepts']:,}",
        f"- Missing concept rate: {100*benchmark['missingConceptRate']:.2f}%",
        f"- 20-question win rate, present concepts: {100*benchmark['winRate20Present']:.2f}%",
        f"- 25-question win rate, present concepts: {100*benchmark['winRate25Present']:.2f}%",
        f"- Median successful turn: {benchmark['medianSuccessfulTurn']}",
        f"- Average successful turn: {benchmark['averageSuccessfulTurn']}",
        f"- Stumped rate, present concepts: {100*benchmark['stumpedRatePresent']:.2f}%",
        f"- Unknown-heavy question rate: {100*benchmark['unknownHeavyQuestionRate']:.2f}%",
        f"- Repeated question-family rate: {100*benchmark['repeatedQuestionFamilyRate']:.2f}%", '',
        'Category-level results and the worst-performing concepts are in `benchmark.json`.', '',
        'AI enrichment was not run. This report is the frozen pre-AI comparison baseline.'
    ]
    (DOCS / 'README.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps({'reconciliation_rows': len(rows), 'docs': str(DOCS), 'artifact_sha256': build['compiled_sha256']}, indent=2))


if __name__ == '__main__':
    main()
