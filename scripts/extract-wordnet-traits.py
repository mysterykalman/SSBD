import csv
import json
import os
import re
import sys

import wn

ROOT = os.getcwd()
INVENTORY = os.path.join(ROOT, '.dev-data', 'mom-playable-50k', 'playable_50k.csv')
OUT = os.path.join(ROOT, '.dev-data', 'trait-sources', 'wordnet-evidence.json')


def norm(value):
    value = str(value or '').strip().lower().replace('_', ' ')
    value = re.sub(r'^the\s+', '', value)
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'[^a-z0-9\' -]+', ' ', value)
    value = re.sub(r'[-\s]+', ' ', value).strip()
    return value


def labels(synset, limit=4):
    try:
        return [str(x).replace('_', ' ') for x in synset.lemmas()][:limit]
    except Exception:
        return []


def related(synset, method):
    try:
        return list(getattr(synset, method)())
    except Exception:
        return []


if not os.path.exists(INVENTORY):
    raise SystemExit(f'Missing inventory: {INVENTORY}')

os.makedirs(os.path.dirname(OUT), exist_ok=True)

try:
    oewn = wn.Wordnet('oewn:2025+')
except Exception:
    wn.download('oewn:2025+')
    oewn = wn.Wordnet('oewn:2025+')

with open(INVENTORY, newline='', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))

results = []
matched = 0
skipped_named = 0
for i, row in enumerate(rows, 1):
    name = row.get('Canonical answer', '').strip()
    qid = (row.get('Wikidata QID') or '').strip()
    if not name:
        continue
    # WordNet is lexical knowledge. Never attach a generic lexical sense directly
    # to a named/QID entity; named entities are handled by Wikidata/CSKG identity.
    if qid:
        skipped_named += 1
        continue

    try:
        synsets = oewn.synsets(name, pos='n')
        if not synsets and ' ' in name:
            synsets = oewn.synsets(name.replace(' ', '_'), pos='n')
        if not synsets:
            synsets = oewn.synsets(name)
    except Exception:
        synsets = []

    noun_synsets = [s for s in synsets if getattr(s, 'pos', None) == 'n'] or list(synsets)
    if not noun_synsets:
        continue

    # OEWN returns senses in lexical order. Taking one sense is deliberately
    # conservative: combining several senses recreates the homonym-merging bug.
    syn = noun_synsets[0]
    traits = set()

    for lemma in labels(syn):
        if norm(lemma) != norm(name):
            traits.add(f'alias:{lemma}')

    frontier = [(syn, 0)]
    seen = set()
    while frontier:
        node, depth = frontier.pop(0)
        node_id = getattr(node, 'id', None) or repr(node)
        if node_id in seen or depth >= 6:
            continue
        seen.add(node_id)
        for hyper in related(node, 'hypernyms')[:6]:
            hyper_labels = labels(hyper, 2)
            if hyper_labels:
                traits.add(f'isa:{hyper_labels[0]}')
            frontier.append((hyper, depth + 1))

    for method, prefix in (
        ('part_meronyms', 'hasa'),
        ('substance_meronyms', 'madeof'),
        ('member_meronyms', 'hasmember'),
        ('part_holonyms', 'partof'),
        ('substance_holonyms', 'partof'),
        ('member_holonyms', 'memberof'),
    ):
        for target in related(syn, method)[:8]:
            target_labels = labels(target, 1)
            if target_labels:
                traits.add(f'{prefix}:{target_labels[0]}')

    if traits:
        matched += 1
        results.append({
            'concept': name,
            'synset': str(getattr(syn, 'id', '') or ''),
            'traits': sorted(traits)[:60],
        })
    if i % 10000 == 0:
        print(f'WordNet processed {i:,}; matched {matched:,}; skipped named {skipped_named:,}', file=sys.stderr)

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False)

print(json.dumps({'concepts': len(rows), 'matched': matched, 'skippedNamed': skipped_named, 'output': OUT}))
