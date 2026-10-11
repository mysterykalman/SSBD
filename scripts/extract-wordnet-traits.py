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
for i, row in enumerate(rows, 1):
    name = row.get('Canonical answer', '').strip()
    if not name:
        continue
    traits = set()
    try:
        synsets = oewn.synsets(name)
        if not synsets and ' ' in name:
            synsets = oewn.synsets(name.replace(' ', '_'))
    except Exception:
        synsets = []

    noun_synsets = [s for s in synsets if getattr(s, 'pos', None) == 'n'] or list(synsets)
    for syn in noun_synsets[:3]:
        try:
            lemmas = [str(x).replace('_', ' ') for x in syn.lemmas()]
            for lemma in lemmas[:4]:
                if norm(lemma) != norm(name):
                    traits.add(f'alias:{lemma}')
        except Exception:
            pass

        frontier = [(syn, 0)]
        seen = set()
        while frontier:
            node, depth = frontier.pop(0)
            node_id = getattr(node, 'id', lambda: repr(node))()
            if node_id in seen or depth >= 4:
                continue
            seen.add(node_id)
            try:
                hypers = node.hypernyms()
            except Exception:
                hypers = []
            for hyper in hypers[:4]:
                try:
                    labels = [str(x).replace('_', ' ') for x in hyper.lemmas()]
                except Exception:
                    labels = []
                if labels:
                    traits.add(f'isa:{labels[0]}')
                frontier.append((hyper, depth + 1))

    if traits:
        matched += 1
        results.append({'concept': name, 'traits': sorted(traits)[:20]})
    if i % 10000 == 0:
        print(f'WordNet processed {i:,}; matched {matched:,}', file=sys.stderr)

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False)

print(json.dumps({'concepts': len(rows), 'matched': matched, 'output': OUT}))
