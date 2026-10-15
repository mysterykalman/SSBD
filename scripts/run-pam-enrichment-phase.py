#!/usr/bin/env python3
"""Run Pam external-enrichment adjudication and emit promotion-ready artifacts.

This runner is intentionally conservative. It never mutates the immutable baseline.
It consumes the existing offline Wikidata/ConceptNet candidate artifacts, repairs
provenance visibility, adjudicates exact trait mappings, derives hierarchy-aware
compatibility from the canonical controlled trait vocabulary, builds approved /
rejected / residual-review exports, creates an isolated SQLite candidate, and
writes a compact promotion summary for the existing controlled runtime pipeline.
"""
import argparse
import csv
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE = Path('/Volumes/Samsung_T5/Pam-Knowledge')

ROOT_DOMAINS = {
    'living','person','animal','plant','place','object','food_drink','media_work',
    'event','organization','abstract'
}
SUSPICIOUS_ROOT_PAIRS = {
    frozenset(('person','object')), frozenset(('person','place')),
    frozenset(('person','animal')), frozenset(('person','plant')),
    frozenset(('animal','place')), frozenset(('animal','object')),
    frozenset(('plant','person')), frozenset(('place','media_work')),
    frozenset(('person','media_work')), frozenset(('person','organization')),
}
TITLEISH = re.compile(r'^(?:the\s+)?(?:[0-9]{4}|[A-Z][\w\'’.-]*(?:\s+[A-Z][\w\'’.-]*)*)$')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def rows(path):
    with Path(path).open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def write_csv(path, data, fields):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        w.writeheader()
        w.writerows(data)


def load_trait_hierarchy(path):
    text = Path(path).read_text(encoding='utf-8')
    parents = {}
    for m in re.finditer(r"t\('([^']+)'\s*,.*?\s*,\s*'[^']+'\s*(?:,\s*\[([^\]]*)\])?\)", text):
        tid = m.group(1)
        plist = re.findall(r"'([^']+)'", m.group(2) or '')
        parents[tid] = plist
    if not parents:
        raise SystemExit('Could not parse canonical trait hierarchy')
    return parents


def ancestors(trait, parents):
    out, stack = set(), [trait]
    while stack:
        cur = stack.pop()
        for p in parents.get(cur, []):
            if p not in out:
                out.add(p)
                stack.append(p)
    return out


def roots_for(trait, parents):
    chain = {trait, *ancestors(trait, parents)}
    return {x for x in chain if x in ROOT_DOMAINS}


def compatible_traits(traits, parents):
    roots = set().union(*(roots_for(t, parents) for t in traits)) if traits else set()
    for a in roots:
        for b in roots:
            if a < b and frozenset((a, b)) in SUSPICIOUS_ROOT_PAIRS:
                return False, f'suspicious-root-collision:{a}+{b}'
    return True, 'hierarchy-compatible'


def normalize(v):
    text = unicodedata.normalize('NFKC', str(v or ''))
    return ' '.join(text.casefold().replace('_', ' ').split())


def load_profiles(path):
    if not path.is_file():
        return {}, {}, False
    doc = json.loads(path.read_text(encoding='utf-8'))
    objects = doc.get('objects') or []
    if not objects:
        return {}, {}, False
    by_qid, by_name = {}, defaultdict(list)
    for profile in objects:
        qid = str(profile.get('qid') or '').strip()
        if qid:
            by_qid[qid] = profile
        for name in [profile.get('name'), *(profile.get('aliases') or [])]:
            key = normalize(name)
            if key:
                by_name[key].append(profile)
    return by_qid, by_name, True


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', default=str(DEFAULT_BASE))
    p.add_argument('--baseline')
    p.add_argument('--output')
    p.add_argument('--profiles', default=str(ROOT/'.dev-data/mom-controlled-profiles/mom-controlled-profiles.json'))
    args = p.parse_args()

    base = Path(args.root)
    baseline = Path(args.baseline or base/'baseline/pam-films-v6.sqlite')
    out = Path(args.output or base/'validated-enrichment')
    out.mkdir(parents=True, exist_ok=True)
    if not baseline.is_file():
        p.error(f'Missing baseline: {baseline}')

    parents = load_trait_hierarchy(ROOT/'scripts/mom-controlled-traits.mjs')
    profile_path = Path(args.profiles)
    by_qid_profile, by_name_profile, profiles_loaded = load_profiles(profile_path)

    con = sqlite3.connect(f'file:{baseline}?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    if con.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        p.error('Baseline quick_check failed')
    concepts = {
        int(r['row_id']): dict(r)
        for r in con.execute('SELECT row_id,concept_id,name,category,subcategory FROM concepts')
    }
    qmap = defaultdict(list)
    qword = {}
    for r in con.execute('SELECT question_index,question_id,wording,metadata_json FROM questions'):
        qmap[r['question_id']].append(r['question_index'])
        qword[r['question_id']] = r['wording']
    answers = {
        (int(r['concept_row_id']), int(r['question_index'])): r['answer']
        for r in con.execute('SELECT concept_row_id,question_index,answer FROM answers')
    }
    con.close()
    baseline_hash_before = sha256(baseline)

    cnet_file = base/'conceptnet-traits/conceptnet-trait-candidates.csv'
    wd_file = base/'sqlite-validation/all.csv'
    quarantine_file = base/'clean-candidates/quarantined-traits.csv'
    merged_file = base/'merged-traits/merged-candidate-traits.csv'
    for required in (cnet_file, wd_file, merged_file):
        if not required.is_file():
            p.error(f'Missing required input: {required}')

    cnet_rows = rows(cnet_file)
    wd_rows = rows(wd_file)
    merged_rows = rows(merged_file)
    quarantine_rows = rows(quarantine_file) if quarantine_file.is_file() else []

    evidence = defaultdict(list)
    for r in cnet_rows:
        try:
            cid = int(r['concept_row_id'])
        except Exception:
            continue
        detail = []
        try:
            detail = json.loads(r.get('evidence_json') or '[]')
        except Exception:
            detail = []
        if not detail:
            detail = [{'relation':'','object_term':'','object_uri':''}]
        for ev in detail:
            evidence[(cid, r['trait'])].append({
                'source':'ConceptNet',
                'relation':ev.get('relation',''),
                'object':ev.get('object_term',''),
                'object_id':ev.get('object_uri',''),
                'qid':'',
                'evidence_count':1,
                'candidate_evidence_count':int(r.get('evidence_count') or len(detail) or 1),
            })

    for r in wd_rows:
        try:
            cid = int(r['concept_row_id'])
        except Exception:
            continue
        evidence[(cid, r['trait'])].append({
            'source':'Wikidata',
            'relation':r.get('property',''),
            'object':r.get('value',''),
            'object_id':r.get('source_qid',''),
            'qid':r.get('qid',''),
            'evidence_count':1,
            'prior_validation':r.get('validation_status',''),
            'prior_reason':r.get('reason',''),
        })

    # Canonical decision universe: every ConceptNet and Wikidata candidate, plus
    # the previously merged and quarantined rows. This intentionally includes
    # the Wikidata needs-review set and ConceptNet conflicts instead of silently
    # dropping them before adjudication.
    uniq = {}
    for source_rows in (merged_rows, quarantine_rows, cnet_rows, wd_rows):
        for r in source_rows:
            try:
                key = (int(r['concept_row_id']), r['trait'])
            except Exception:
                continue
            if not key[1]:
                continue
            uniq.setdefault(key, r)

    traits_by_concept = defaultdict(set)
    for cid, trait in uniq:
        traits_by_concept[cid].add(trait)

    adjudicated = []
    for (cid, trait), srcrow in sorted(uniq.items()):
        concept = concepts.get(cid)
        if not concept:
            continue
        evs = evidence.get((cid, trait), [])
        sources = sorted({e['source'] for e in evs})
        exact = qmap.get(trait, [])
        current = answers.get((cid, exact[0])) if len(exact) == 1 else None

        qid = ''
        if str(concept.get('concept_id','')).startswith('wd:'):
            qid = str(concept['concept_id'])[3:]
        profile = by_qid_profile.get(qid) if qid else None
        if not profile:
            matches = by_name_profile.get(normalize(concept['name']), [])
            if len(matches) == 1:
                profile = matches[0]
        existing_traits = set(profile.get('traits') or []) if profile else set()
        existing_elsewhere = trait in existing_traits

        status = 'needs-human-review'
        reason = 'insufficient-exact-evidence'
        confidence = 'low'
        if current == 'no':
            status = 'reject'
            reason = 'baseline-explicit-no'
            confidence = 'high'
        elif len(exact) != 1:
            status = 'reject'
            reason = 'no-unique-exact-question-id'
            confidence = 'high'
        elif not evs:
            status = 'needs-human-review'
            reason = 'missing-provenance'
            confidence = 'low'
        else:
            compatible, compat_reason = compatible_traits(traits_by_concept[cid], parents)
            lexical_title_risk = bool(TITLEISH.match(str(concept['name']))) and not qid and len(sources) == 1
            exact_wd = any(
                e['source'] == 'Wikidata' and e.get('qid') and ('wd:' + e['qid']) == concept.get('concept_id')
                for e in evs
            )
            cnet_taxonomic = any(e['source'] == 'ConceptNet' and e.get('relation') == 'IsA' for e in evs)
            if not compatible:
                status = 'reject'
                reason = compat_reason
                confidence = 'high'
            elif lexical_title_risk and not exact_wd:
                status = 'reject'
                reason = 'title-or-name-polysemy-without-exact-identity'
                confidence = 'high'
            elif exact_wd and current in ('yes', None, 'sometimes'):
                status = 'approve'
                reason = 'exact-qid-taxonomic-evidence'
                confidence = 'high'
            elif cnet_taxonomic and current == 'yes':
                status = 'approve'
                reason = 'conceptnet-taxonomy-confirms-existing-positive'
                confidence = 'high'
            elif cnet_taxonomic and len(sources) > 1:
                status = 'approve'
                reason = 'independent-taxonomic-source-agreement'
                confidence = 'high'
            elif profiles_loaded and existing_elsewhere and cnet_taxonomic:
                status = 'approve'
                reason = 'controlled-profile-plus-taxonomic-evidence'
                confidence = 'medium-high'
            else:
                status = 'needs-human-review'
                reason = 'single-source-or-non-taxonomic-evidence'
                confidence = 'medium'

        affects_runtime = status == 'approve' and profiles_loaded and not existing_elsewhere
        adjudicated.append({
            'concept_row_id':cid,
            'concept_name':concept['name'],
            'concept_id':concept['concept_id'],
            'qid':qid,
            'baseline_category':concept['category'],
            'baseline_subcategory':concept.get('subcategory',''),
            'trait':trait,
            'question_wording':qword.get(trait,''),
            'status':status,
            'confidence':confidence,
            'reason':reason,
            'sources':'|'.join(sources),
            'evidence_count':len(evs),
            'evidence_json':json.dumps(evs, ensure_ascii=False, separators=(',',':')),
            'existing_answer':current or '',
            'already_in_controlled_profile':str(existing_elsewhere).lower() if profiles_loaded else 'unknown',
            'new_vs_known':'known' if current == 'yes' else 'new',
            'affects_sqlite':str(status == 'approve' and current != 'yes').lower(),
            'affects_controlled_runtime':str(affects_runtime).lower() if profiles_loaded else 'unknown',
        })

    fields = list(adjudicated[0]) if adjudicated else []
    approved = [r for r in adjudicated if r['status'] == 'approve']
    rejected = [r for r in adjudicated if r['status'] == 'reject']
    residual = [r for r in adjudicated if r['status'] == 'needs-human-review']
    write_csv(out/'approved.csv', approved, fields)
    write_csv(out/'rejected.csv', rejected, fields)
    write_csv(out/'needs-human-review.csv', residual, fields)
    write_csv(out/'all-adjudicated.csv', adjudicated, fields)

    # Emit the schema consumed by build-mom-controlled-profiles.mjs:
    # [{"concept":"...","evidence":[{"source","type","trait",...}]}]
    runtime_by_concept = {}
    for r in approved:
        bucket = runtime_by_concept.setdefault(
            r['concept_name'],
            {'concept':r['concept_name'], 'qid':r['qid'], 'evidence':[]},
        )
        for e in json.loads(r['evidence_json']):
            bucket['evidence'].append({
                'source':e['source'],
                'type':e.get('relation',''),
                'trait':r['trait'],
                'value':e.get('object',''),
                'objectId':e.get('object_id',''),
                'confidence':r['confidence'],
                'adjudicationReason':r['reason'],
            })
    runtime_rows = [runtime_by_concept[k] for k in sorted(runtime_by_concept, key=normalize)]
    (out/'approved-runtime-evidence.json').write_text(
        json.dumps(runtime_rows, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )

    candidate_dir = out/'sqlite-candidate'
    candidate_dir.mkdir(exist_ok=True)
    approved_trait_csv = out/'approved-traits-for-sqlite.csv'
    write_csv(
        approved_trait_csv,
        [
            {'concept_row_id':r['concept_row_id'], 'trait':r['trait'], 'sources':r['sources'], 'status':'approved'}
            for r in approved
        ],
        ['concept_row_id','trait','sources','status'],
    )
    subprocess.run([
        sys.executable,
        str(ROOT/'scripts/build-pam-enriched-sqlite.py'),
        '--baseline', str(baseline),
        '--traits', str(approved_trait_csv),
        '--output-dir', str(candidate_dir),
    ], check=True)
    subprocess.run([
        sys.executable,
        str(ROOT/'scripts/benchmark-pam-enriched-sqlite.py'),
        '--baseline', str(baseline),
        '--candidate', str(candidate_dir/'pam-enriched-candidate.sqlite'),
        '--applied', str(candidate_dir/'applied.csv'),
        '--output', str(out/'sqlite-benchmark'),
    ], check=True)

    baseline_hash_after = sha256(baseline)
    sqlite_summary = json.loads((candidate_dir/'summary.json').read_text())
    bench_summary = json.loads((out/'sqlite-benchmark/summary.json').read_text())
    counts = Counter(r['status'] for r in adjudicated)
    new_approved = sum(1 for r in approved if r['new_vs_known'] == 'new')
    runtime_changes = (
        sum(1 for r in approved if r['affects_controlled_runtime'] == 'true')
        if profiles_loaded else None
    )
    recommendation = (
        'PROMOTE_TO_CONTROLLED_PIPELINE_FOR_RUNTIME_A_B'
        if approved and not residual and bench_summary.get('integrity') == 'pass'
        else (
            'PROMOTE_APPROVED_ONLY; HOLD_RESIDUAL'
            if approved and bench_summary.get('integrity') == 'pass'
            else 'DO_NOT_PROMOTE'
        )
    )
    summary = {
        'mode':'canonical-offline-enrichment-adjudication',
        'baseline_sha256_before':baseline_hash_before,
        'baseline_sha256_after':baseline_hash_after,
        'baseline_unchanged':baseline_hash_before == baseline_hash_after,
        'candidate_rows':len(adjudicated),
        'candidate_universe':{
            'conceptnet_rows':len(cnet_rows),
            'wikidata_rows':len(wd_rows),
            'merged_rows':len(merged_rows),
            'quarantined_rows':len(quarantine_rows),
            'unique_concept_trait_pairs':len(uniq),
        },
        'approved':counts['approve'],
        'rejected':counts['reject'],
        'needs_human_review':counts['needs-human-review'],
        'new_approved_facts':new_approved,
        'approved_concepts':len({r['concept_row_id'] for r in approved}),
        'controlled_profiles_loaded':profiles_loaded,
        'controlled_profiles_path':str(profile_path),
        'controlled_runtime_new_traits':runtime_changes,
        'sqlite':sqlite_summary,
        'sqlite_benchmark':bench_summary,
        'recommendation':recommendation,
        'next_runtime_step':(
            'Use approved-runtime-evidence.json as an additional controlled-profile evidence source, '
            'rebuild isolated baseline/enriched runtimes, then run scripts/mom-runtime-ab-benchmark.mjs before promotion.'
        ),
    }
    (out/'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
