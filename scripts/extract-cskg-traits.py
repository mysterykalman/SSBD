import argparse
import csv
import gzip
import json
import os
import re
import sys
from collections import defaultdict

USEFUL_RELATIONS = {
    '/r/IsA': 'isa',
    '/r/HasA': 'hasa',
    '/r/PartOf': 'partof',
    '/r/UsedFor': 'usedfor',
    '/r/CapableOf': 'capableof',
    '/r/AtLocation': 'atlocation',
    '/r/HasProperty': 'property',
    '/r/MadeOf': 'madeof',
    '/r/CreatedBy': 'createdby',
    '/r/LocatedNear': 'locatednear',
}


def configure_csv_field_limit():
    """Allow real KGTK rows whose metadata/sentence fields exceed csv's ~128 KB default."""
    limit = sys.maxsize
    while limit > 0:
        try:
            csv.field_size_limit(limit)
            return limit
        except OverflowError:
            limit //= 10
    raise RuntimeError('Unable to configure a usable CSV field size limit')


def norm(value):
    value = str(value or '').strip().lower().replace('_', ' ')
    value = re.sub(r'^the\s+', '', value)
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'[^a-z0-9\' -]+', ' ', value)
    return re.sub(r'[-\s]+', ' ', value).strip()


def clean_label(value):
    text = str(value or '').split('|', 1)[0].strip().strip('"')
    return text.replace('_', ' ')


def conceptnet_label(node):
    match = re.match(r'^/c/en/([^/]+)', str(node or ''))
    return match.group(1).replace('_', ' ') if match else ''


def wikidata_qid(node):
    text = str(node or '')
    for pattern in (r'^(?:wd:|wikidata:)(Q\d+)$', r'^http://www\.wikidata\.org/entity/(Q\d+)$'):
        match = re.match(pattern, text, re.I)
        if match:
            return match.group(1).upper()
    return ''


def open_text(filename):
    return gzip.open(filename, 'rt', encoding='utf-8', newline='') if filename.endswith('.gz') else open(filename, encoding='utf-8', newline='')


def load_inventory(filename):
    by_key = defaultdict(list)
    by_qid = {}
    with open(filename, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            name = (row.get('Canonical answer') or row.get('name') or '').strip()
            if not name:
                continue
            qid = (row.get('Wikidata QID') or row.get('qid') or '').strip().upper()
            item = {'name': name, 'qid': qid}
            by_key[norm(name)].append(item)
            if re.fullmatch(r'Q\d+', qid):
                by_qid[qid] = item
    return by_key, by_qid


def targets_for_node(node, label, by_key, by_qid):
    qid = wikidata_qid(node)
    if qid:
        target = by_qid.get(qid)
        return [target] if target else []

    cn_label = conceptnet_label(node)
    key = norm(cn_label or label)
    candidates = by_key.get(key, [])
    if not candidates:
        return []
    generic = [item for item in candidates if not item['qid']]
    if generic:
        return generic if len(generic) == 1 else []
    # A generic lexical node is not enough to choose among named/QID senses.
    return []


def row_value(row, *names):
    for name in names:
        if name in row and row[name] not in (None, ''):
            return row[name]
    return ''


def evidence_for_row(row, by_key, by_qid):
    relation = row_value(row, 'relation', 'rel')
    kind = USEFUL_RELATIONS.get(relation)
    if not kind:
        return []
    node1 = row_value(row, 'node1', 'start')
    node2 = row_value(row, 'node2', 'end')
    label1 = clean_label(row_value(row, 'node1;label', 'start;label', 'start_label')) or conceptnet_label(node1)
    label2 = clean_label(row_value(row, 'node2;label', 'end;label', 'end_label')) or conceptnet_label(node2)
    source = clean_label(row_value(row, 'source')) or 'CSKG'
    sentence = clean_label(row_value(row, 'sentence'))

    out = []
    for target in targets_for_node(node1, label1, by_key, by_qid):
        if label2:
            out.append((target['name'], {
                'source': f'CSKG:{source}', 'type': kind, 'trait': f'{kind}:{label2}',
                'relation': relation, 'node': node1, 'otherNode': node2,
                **({'qid': target['qid']} if target.get('qid') else {}),
                **({'sentence': sentence} if sentence else {})
            }))

    # Safe inverse relations. These describe a property of node2 rather than only a child/member.
    inverse_kind = {'/r/PartOf': 'hasa', '/r/AtLocation': 'contains'}.get(relation)
    if inverse_kind and label1:
        for target in targets_for_node(node2, label2, by_key, by_qid):
            out.append((target['name'], {
                'source': f'CSKG:{source}', 'type': inverse_kind, 'trait': f'{inverse_kind}:{label1}',
                'relation': relation, 'node': node2, 'otherNode': node1,
                **({'qid': target['qid']} if target.get('qid') else {}),
                **({'sentence': sentence} if sentence else {})
            }))
    return out


def load_existing(filename):
    if not filename or not os.path.exists(filename):
        return defaultdict(list)
    with open(filename, encoding='utf-8') as f:
        rows = json.load(f)
    out = defaultdict(list)
    for row in rows if isinstance(rows, list) else []:
        name = str(row.get('concept') or '').strip()
        if name:
            out[name].extend(row.get('evidence') or [])
    return out


def main():
    parser = argparse.ArgumentParser(description='Extract Pam-safe evidence from a CSKG KGTK TSV/TSV.GZ file.')
    parser.add_argument('--inventory', default='.dev-data/mom-playable-50k/playable_50k.csv')
    parser.add_argument('--cskg', default='.dev-data/trait-sources/cskg/cskg.tsv.gz')
    parser.add_argument('--output', default='.dev-data/trait-sources/extra-public-evidence.json')
    parser.add_argument('--replace', action='store_true', help='Do not merge with an existing output file.')
    args = parser.parse_args()

    if not os.path.exists(args.inventory):
        raise SystemExit(f'Missing inventory: {args.inventory}')
    if not os.path.exists(args.cskg):
        raise SystemExit(f'Missing CSKG file: {args.cskg}')

    configure_csv_field_limit()
    by_key, by_qid = load_inventory(args.inventory)
    merged = defaultdict(list) if args.replace else load_existing(args.output)
    seen = {name: {json.dumps(item, sort_keys=True, ensure_ascii=False) for item in items} for name, items in merged.items()}
    scanned = matched_edges = evidence_items = 0

    with open_text(args.cskg) as f:
        reader = csv.DictReader(f, delimiter='\t')
        required = {'node1', 'relation', 'node2'}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise SystemExit(f'CSKG header must contain {sorted(required)}; got {reader.fieldnames}')
        for row in reader:
            scanned += 1
            extracted = evidence_for_row(row, by_key, by_qid)
            if extracted:
                matched_edges += 1
            for concept, evidence in extracted:
                token = json.dumps(evidence, sort_keys=True, ensure_ascii=False)
                bucket = seen.setdefault(concept, set())
                if token in bucket:
                    continue
                bucket.add(token)
                merged[concept].append(evidence)
                evidence_items += 1

    records = [{'concept': name, 'evidence': merged[name]} for name in sorted(merged, key=lambda x: x.lower()) if merged[name]]
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False)

    print(json.dumps({
        'scannedEdges': scanned,
        'matchedEdges': matched_edges,
        'newEvidenceItems': evidence_items,
        'conceptsWithEvidence': len(records),
        'output': args.output,
    }))


if __name__ == '__main__':
    main()
