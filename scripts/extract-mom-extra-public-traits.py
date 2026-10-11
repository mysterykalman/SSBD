import csv
import glob
import json
import os
import re
from collections import Counter, defaultdict

ROOT = os.getcwd()
INVENTORY = os.path.join(ROOT, '.dev-data', 'mom-playable-50k', 'playable_50k.csv')
SOURCE_ROOT = os.path.join(ROOT, '.dev-data', 'trait-sources')
OUT = os.path.join(SOURCE_ROOT, 'extra-public-evidence.json')

MATERIALS = {
    'stone', 'wood', 'wooden', 'rattan', 'fabric', 'crochet', 'wool', 'leather',
    'velvet', 'metal', 'steel', 'iron', 'aluminum', 'aluminium', 'paper', 'cardboard',
    'plastic', 'glass', 'ceramic', 'cloth', 'textile'
}
LOCATION_PREDICATES = {
    'in', 'inside', 'on', 'on top of', 'at', 'near', 'under', 'underneath', 'beside',
    'next to', 'attached to', 'in front of', 'behind'
}


def norm(value):
    value = str(value or '').strip().lower().replace('_', ' ')
    value = re.sub(r'^the\s+', '', value)
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'[^a-z0-9\' -]+', ' ', value)
    return re.sub(r'[-\s]+', ' ', value).strip()


def variants(value):
    raw = str(value or '').strip().replace('_', ' ')
    out = {norm(raw)}
    for part in re.findall(r'\(([^)]*)\)', raw):
        out.add(norm(part))
    out.add(norm(re.sub(r'\([^)]*\)', '', raw)))
    return {x for x in out if x}


def typed_attribute(attr):
    a = norm(attr)
    if not a:
        return ''
    if a in MATERIALS or any(m in a.split() for m in MATERIALS):
        return f'material:{a}'
    return f'attribute:{a}'


with open(INVENTORY, newline='', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))

canonical = {norm(r.get('Canonical answer')): r.get('Canonical answer', '').strip() for r in rows if r.get('Canonical answer')}
evidence = defaultdict(set)
source_counts = Counter()


def add(raw_name, source, trait):
    key = norm(raw_name)
    if key not in canonical or not trait:
        return False
    evidence[key].add(f'{source}\t{trait}')
    source_counts[source] += 1
    return True


# PACO: derive stable object-level attributes from repeated annotations instead of
# treating a one-off visual observation as an intrinsic trait.
paco_files = glob.glob(os.path.join(SOURCE_ROOT, 'paco', '**', '*.json'), recursive=True)
paco_seen_files = 0
for filename in paco_files:
    try:
        with open(filename, encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        continue
    if not isinstance(data, dict) or not data.get('categories') or not data.get('attributes'):
        continue
    paco_seen_files += 1
    cats = {int(c['id']): c.get('name', '') for c in data.get('categories', []) if 'id' in c}
    attrs = {int(a['id']): a.get('name', '') for a in data.get('attributes', []) if 'id' in a}
    totals = Counter()
    counts = defaultdict(Counter)
    for ann in data.get('annotations', []):
        cid = ann.get('category_id')
        if cid not in cats:
            continue
        aids = [x for x in ann.get('attribute_ids', []) if x in attrs]
        if not aids:
            continue
        totals[cid] += 1
        for aid in set(aids):
            counts[cid][aid] += 1
    for cid, attr_counts in counts.items():
        total = totals[cid]
        if total < 5:
            continue
        names = variants(cats[cid])
        for aid, count in attr_counts.items():
            if count < 5 or count / total < 0.25:
                continue
            trait = typed_attribute(attrs[aid])
            for name in names:
                add(name, 'PACO', trait)


# Visual Genome object attributes. Keep only attributes repeatedly associated with
# the same named object so image-specific colours/conditions do not become facts.
vg_attr = os.path.join(SOURCE_ROOT, 'visual-genome', 'attributes.json')
if os.path.exists(vg_attr):
    totals = Counter()
    counts = defaultdict(Counter)
    try:
        with open(vg_attr, encoding='utf-8') as f:
            images = json.load(f)
        for image in images:
            for obj in image.get('attributes', []):
                names = obj.get('names') or []
                attrs = obj.get('attributes') or []
                for raw_name in names[:3]:
                    key = norm(raw_name)
                    if key not in canonical:
                        continue
                    totals[key] += 1
                    for attr in set(norm(x) for x in attrs if x):
                        if attr:
                            counts[key][attr] += 1
        for key, attr_counts in counts.items():
            total = totals[key]
            for attr, count in attr_counts.items():
                if count >= 4 and (count / max(1, total) >= 0.18 or count >= 20):
                    add(key, 'Visual Genome', typed_attribute(attr))
    except Exception as exc:
        print(f'Visual Genome attributes skipped: {exc}')


# Visual Genome relationships. Only retain frequent relation/object pairs. Spatial
# relations are typed as location evidence so the controlled mapper can use them.
vg_rel = os.path.join(SOURCE_ROOT, 'visual-genome', 'relationships.json')
if os.path.exists(vg_rel):
    rel_counts = defaultdict(Counter)
    try:
        with open(vg_rel, encoding='utf-8') as f:
            images = json.load(f)
        for image in images:
            for rel in image.get('relationships', []):
                predicate = norm(rel.get('predicate'))
                subj = rel.get('subject') or {}
                obj = rel.get('object') or {}
                snames = subj.get('names') or ([subj.get('name')] if subj.get('name') else [])
                onames = obj.get('names') or ([obj.get('name')] if obj.get('name') else [])
                for s in snames[:2]:
                    skey = norm(s)
                    if skey not in canonical:
                        continue
                    for o in onames[:2]:
                        oval = norm(o)
                        if predicate and oval:
                            prefix = 'atlocation' if predicate in LOCATION_PREDICATES else 'relation'
                            rel_counts[skey][f'{prefix}:{predicate}:{oval}'] += 1
        for key, pairs in rel_counts.items():
            for pair, count in pairs.items():
                if count >= 5:
                    add(key, 'Visual Genome', pair)
    except Exception as exc:
        print(f'Visual Genome relationships skipped: {exc}')


records = []
for key, items in evidence.items():
    rows_out = []
    for item in sorted(items):
        source, trait = item.split('\t', 1)
        rows_out.append({'source': source, 'type': trait.split(':', 1)[0], 'trait': trait})
    records.append({'concept': canonical[key], 'evidence': rows_out})

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False)

print(json.dumps({
    'concepts': len(canonical),
    'matchedConcepts': len(records),
    'evidenceItems': sum(len(r['evidence']) for r in records),
    'sources': dict(source_counts),
    'pacoFilesParsed': paco_seen_files,
    'output': OUT,
}, indent=2))
