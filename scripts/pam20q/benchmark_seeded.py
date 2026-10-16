#!/usr/bin/env python3
"""Benchmark the authoritative seeded Pam20Q matrix with the existing 1,081-concept fixture.

The benchmark is development-only and deterministic. It uses the frozen Pam20Q build
SQLite, the same canonical benchmark concepts/categories used by Mom validation, and
information-gain question selection. Unknown cells never become No and remain eligible
on either branch of a question.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.dev-data/pam20q'


def norm(value):
    s = str(value or '').strip().casefold().replace('’', "'").replace('‘', "'").replace('–', '-').replace('—', '-')
    return ' '.join(s.split())


def classify_probability(value):
    p = float(value)
    if p >= 0.65:
        return 'yes'
    if p <= 0.35:
        return 'no'
    return 'unknown'


def median(values):
    return statistics.median(values) if values else None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--database', type=Path, default=WORK / 'build.sqlite')
    ap.add_argument('--fixture', type=Path, default=WORK / 'benchmark-fixture.json')
    ap.add_argument('--out', type=Path, default=WORK / 'benchmark.json')
    ap.add_argument('--worst-count', type=int, default=25)
    a = ap.parse_args()

    rows = json.loads(a.fixture.read_text(encoding='utf-8'))
    con = sqlite3.connect(a.database)
    con.row_factory = sqlite3.Row
    concepts = list(con.execute('SELECT concept_id,name FROM concepts ORDER BY rank,concept_id'))
    questions = list(con.execute('SELECT question_id,text,qgroup FROM questions ORDER BY rowid'))
    if len(questions) != 150:
        raise SystemExit(f'expected 150 questions, got {len(questions)}')

    concept_index = {r['concept_id']: i for i, r in enumerate(concepts)}
    by_name = defaultdict(list)
    for i, r in enumerate(concepts):
        by_name[norm(r['name'])].append(i)
    qindex = {r['question_id']: i for i, r in enumerate(questions)}

    yes_masks = [0] * len(questions)
    no_masks = [0] * len(questions)
    target_state = {}
    for r in con.execute('SELECT concept_id,question_id,probability FROM cells'):
        ci = concept_index.get(r['concept_id'])
        qi = qindex.get(r['question_id'])
        if ci is None or qi is None:
            continue
        state = classify_probability(r['probability'])
        if state == 'yes':
            yes_masks[qi] |= 1 << ci
        elif state == 'no':
            no_masks[qi] |= 1 << ci
        target_state[(ci, qi)] = state
    con.close()

    all_mask = (1 << len(concepts)) - 1
    results = []
    total_questions = 0
    unknown_heavy = 0
    repeated_family = 0

    for row in rows:
        matches = by_name.get(norm(row.get('item')), [])
        if len(matches) != 1:
            results.append({
                'item': row.get('item'), 'category': row.get('category') or 'Unclassified',
                'tier': row.get('tier') or '', 'present': False, 'ambiguous': len(matches) > 1,
                'turn20': None, 'turn25': None, 'win20': False, 'win25': False,
                'stumped': False, 'questionsAsked': 0, 'unknownAnswers': 0,
                'failureReason': 'ambiguous_identity' if len(matches) > 1 else 'missing_concept',
            })
            continue

        secret = matches[0]
        target_bit = 1 << secret
        candidates = all_mask
        asked = set()
        path = []
        success_turn = None
        previous_family = None
        unknown_answers = 0

        for turn in range(1, 26):
            if candidates == target_bit:
                success_turn = turn - 1
                break
            n = candidates.bit_count()
            best = None
            for qi, q in enumerate(questions):
                if qi in asked:
                    continue
                ymask = candidates & yes_masks[qi]
                nmask = candidates & no_masks[qi]
                y = ymask.bit_count()
                no = nmask.bit_count()
                known = y + no
                unk = n - known
                if y == 0 or no == 0:
                    gain = 0.0
                else:
                    py = (y + 0.5 * unk) / n
                    pn = 1.0 - py
                    expected = py * (y + unk) + pn * (no + unk)
                    gain = math.log2(n) - math.log2(max(1.0, expected))
                known_coverage = known / n if n else 0.0
                candidate = (gain, known_coverage, -qi, qi, ymask, nmask, unk)
                if best is None or candidate[:3] > best[:3]:
                    best = candidate
            if best is None:
                break
            gain, known_coverage, _, qi, ymask, nmask, unk = best
            asked.add(qi)
            state = target_state.get((secret, qi), 'unknown')
            family = questions[qi]['qgroup'] or 'attribute'
            if known_coverage < 0.5:
                unknown_heavy += 1
            if previous_family == family:
                repeated_family += 1
            previous_family = family
            total_questions += 1
            if state == 'yes':
                candidates = ymask | (candidates & ~(yes_masks[qi] | no_masks[qi]))
            elif state == 'no':
                candidates = nmask | (candidates & ~(yes_masks[qi] | no_masks[qi]))
            else:
                unknown_answers += 1
            path.append({
                'turn': turn, 'question_id': questions[qi]['question_id'],
                'family': family, 'answer': state, 'knownCoverage': known_coverage,
                'gain': gain, 'candidatesAfter': candidates.bit_count(),
            })
            if candidates == target_bit:
                success_turn = turn
                break

        win20 = success_turn is not None and success_turn <= 20
        win25 = success_turn is not None and success_turn <= 25
        results.append({
            'item': row.get('item'), 'category': row.get('category') or 'Unclassified',
            'tier': row.get('tier') or '', 'present': True, 'ambiguous': False,
            'matchedName': concepts[secret]['name'], 'turn20': success_turn if win20 else None,
            'turn25': success_turn if win25 else None, 'win20': win20, 'win25': win25,
            'stumped': not win25, 'questionsAsked': len(path), 'unknownAnswers': unknown_answers,
            'candidateCountAfter25': candidates.bit_count(),
            'failureReason': '' if win25 else 'not_unique_within_25', 'path': path,
        })

    present = [r for r in results if r['present']]
    successes = [r['turn25'] for r in present if r['win25']]
    wins20 = sum(r['win20'] for r in present)
    wins25 = sum(r['win25'] for r in present)

    categories = {}
    for category in sorted({r['category'] for r in results}):
        group = [r for r in results if r['category'] == category]
        gp = [r for r in group if r['present']]
        categories[category] = {
            'total': len(group), 'present': len(gp),
            'win20': sum(r['win20'] for r in gp), 'win25': sum(r['win25'] for r in gp),
            'winRate20Present': sum(r['win20'] for r in gp) / len(gp) if gp else 0,
            'winRate25Present': sum(r['win25'] for r in gp) / len(gp) if gp else 0,
            'missingRate': (len(group) - len(gp)) / len(group) if group else 0,
        }

    worst = sorted(
        results,
        key=lambda r: (
            0 if not r['present'] else 1,
            0 if r.get('stumped') else 1,
            -(r.get('candidateCountAfter25') or 0),
            -(r.get('unknownAnswers') or 0),
            str(r.get('item') or ''),
        ),
    )[:a.worst_count]

    summary = {
        'framework': 'pam20q-seeded-information-gain-v1',
        'benchmarkConcepts': len(results),
        'presentConcepts': len(present),
        'missingConcepts': len(results) - len(present),
        'missingConceptRate': (len(results) - len(present)) / len(results) if results else 0,
        'winsWithin20': wins20,
        'winRate20Present': wins20 / len(present) if present else 0,
        'winsWithin25': wins25,
        'winRate25Present': wins25 / len(present) if present else 0,
        'medianSuccessfulTurn': median(successes),
        'averageSuccessfulTurn': sum(successes) / len(successes) if successes else None,
        'stumpedCount': sum(r['stumped'] for r in present),
        'stumpedRatePresent': sum(r['stumped'] for r in present) / len(present) if present else 0,
        'totalQuestionsAsked': total_questions,
        'unknownHeavyQuestions': unknown_heavy,
        'unknownHeavyQuestionRate': unknown_heavy / total_questions if total_questions else 0,
        'repeatedQuestionFamilyCount': repeated_family,
        'repeatedQuestionFamilyRate': repeated_family / total_questions if total_questions else 0,
        'categoryPerformance': categories,
        'worstPerformingConcepts': [{k: v for k, v in r.items() if k != 'path'} for r in worst],
        'rows': results,
    }
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in summary.items() if k != 'rows'}, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
