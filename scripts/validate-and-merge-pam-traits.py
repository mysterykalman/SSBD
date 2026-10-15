#!/usr/bin/env python3
"""Validate ConceptNet trait candidates against Pam's immutable SQLite baseline
and merge them with already-validated Wikidata evidence into one candidate set.

Read-only: does not modify SQLite or runtime.
"""
import argparse
import csv
import json
import sqlite3
from collections import Counter
from pathlib import Path

PARENT = {
    'mammal':'animal','bird':'animal','fish':'animal','reptile':'animal','amphibian':'animal','insect':'animal',
    'tree':'plant','flower':'plant','country':'place','city':'place','building':'place','landmark':'place',
    'water_place':'place','mountain':'place','park':'place','car':'vehicle','aircraft':'vehicle','watercraft':'vehicle',
    'vehicle':'object','tool':'object','device':'object','furniture':'object','clothing':'object','container':'object',
    'toy':'object','musical_instrument':'object','weapon':'object','drink':'food_drink','fruit_food':'food_drink',
    'vegetable_food':'food_drink','meat':'food_drink','film':'media_work','tv_series':'media_work','book':'media_work',
    'novel':'book','play':'book','song':'media_work','album':'media_work','video_game':'media_work',
    'painting':'media_work','sculpture':'media_work','war':'event','disaster':'event','company':'organization',
    'brand':'organization','sports_team':'organization','emotion':'abstract'
}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline', default='/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')
    p.add_argument('--conceptnet', default='/Volumes/Samsung_T5/Pam-Knowledge/conceptnet-traits/conceptnet-trait-candidates.csv')
    p.add_argument('--wikidata', default='/Volumes/Samsung_T5/Pam-Knowledge/sqlite-validation/all.csv')
    p.add_argument('--output', default='/Volumes/Samsung_T5/Pam-Knowledge/merged-traits')
    args = p.parse_args()
    baseline, cnet, wd = map(Path, (args.baseline, args.conceptnet, args.wikidata))
    if not all(x.is_file() for x in (baseline, cnet, wd)):
        p.error('Missing baseline or candidate CSV')
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(f'file:{baseline}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    if db.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        p.error('Baseline integrity check failed')
    concepts = {r['row_id']: dict(r) for r in db.execute('SELECT row_id,concept_id,name,category FROM concepts')}
    qids = {}
    for r in db.execute('SELECT question_index,question_id FROM questions'):
        qids.setdefault(r['question_id'], []).append(r['question_index'])
    answers = {(r['concept_row_id'], r['question_index']): r['answer'] for r in db.execute('SELECT concept_row_id,question_index,answer FROM answers')}
    db.close()

    crows=[]; cc=Counter()
    with cnet.open(newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            cid=int(r['concept_row_id']); trait=r['trait']; concept=concepts.get(cid)
            if not concept:
                status,reason='needs-review','missing-concept'
            else:
                matches=qids.get(trait,[])
                if len(matches)!=1:
                    status,reason='needs-review','no-exact-trait-question-mapping'
                else:
                    ans=answers.get((cid,matches[0]))
                    if ans=='yes': status,reason='agree','existing-exact-positive-answer'
                    elif ans=='no': status,reason='conflict','existing-exact-negative-answer'
                    else: status,reason='new-candidate','no-established-answer'
            cc[status]+=1
            crows.append({**r,'concept_name':concept['name'] if concept else '', 'baseline_category':concept['category'] if concept else '', 'validation_status':status,'reason':reason})

    fields=list(crows[0]) if crows else []
    for label in ('all','agree','conflict','new-candidate','needs-review'):
        rows=crows if label=='all' else [r for r in crows if r['validation_status']==label]
        with (out/f'conceptnet-{label}.csv').open('w',newline='',encoding='utf-8') as f:
            w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(rows)

    merged={}
    for r in crows:
        if r['validation_status'] in ('agree','new-candidate'):
            key=(int(r['concept_row_id']),r['trait'])
            merged[key]={'concept_row_id':key[0],'trait':key[1],'sources':{'ConceptNet'},'status':r['validation_status'],'evidence_count':int(r['evidence_count'] or 0)}
    wdc=Counter()
    with wd.open(newline='',encoding='utf-8') as f:
        for r in csv.DictReader(f):
            st=r.get('validation_status','unknown'); wdc[st]+=1
            if st!='agree': continue
            cid=int(r['concept_row_id']); trait=r['trait']; key=(cid,trait)
            rec=merged.setdefault(key,{'concept_row_id':cid,'trait':trait,'sources':set(),'status':'agree','evidence_count':0})
            rec['sources'].add('Wikidata'); rec['status']='agree'

    mrows=[]; source_counts=Counter(); status_counts=Counter()
    for rec in merged.values():
        sources='+'.join(sorted(rec['sources']))
        source_counts[sources]+=1; status_counts[rec['status']]+=1
        mrows.append({'concept_row_id':rec['concept_row_id'],'trait':rec['trait'],'sources':sources,'status':rec['status'],'conceptnet_evidence_count':rec['evidence_count']})
    mrows.sort(key=lambda r:(r['concept_row_id'],r['trait']))
    with (out/'merged-candidate-traits.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=['concept_row_id','trait','sources','status','conceptnet_evidence_count']); w.writeheader(); w.writerows(mrows)

    # Detect internal trait/domain collisions for review. These are not necessarily errors.
    incompatible_pairs=[('person','place'),('person','object'),('animal','place'),('animal','object'),('plant','person'),('place','object'),('food_drink','person'),('media_work','person'),('organization','person')]
    by_concept={}
    for r in mrows: by_concept.setdefault(r['concept_row_id'],set()).add(r['trait'])
    collisions=[]
    for cid,traits in by_concept.items():
        for a,b in incompatible_pairs:
            if a in traits and b in traits:
                collisions.append({'concept_row_id':cid,'concept_name':concepts[cid]['name'],'trait_a':a,'trait_b':b})
    with (out/'domain-collisions.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=['concept_row_id','concept_name','trait_a','trait_b']); w.writeheader(); w.writerows(collisions)

    summary={
      'mode':'read-only-validate-and-merge',
      'conceptnet_validation':dict(cc),
      'wikidata_validation':dict(wdc),
      'merged_candidate_rows':len(mrows),
      'merged_concepts':len(by_concept),
      'source_combinations':dict(source_counts),
      'merged_statuses':dict(status_counts),
      'domain_collisions':len(collisions),
      'sqlite_modified':False,'runtime_modified':False,
      'next_step':'Review ConceptNet conflicts and domain collisions, then build an isolated enriched SQLite copy for benchmark testing.'
    }
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':
    main()
