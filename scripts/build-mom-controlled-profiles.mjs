import fs from 'node:fs';
import path from 'node:path';
import { TRAITS, mapEvidence, featureRecords } from './mom-controlled-traits.mjs';

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, '.dev-data', 'mom-playable-50k', 'playable_50k.jsonl');
const COVERAGE_EVIDENCE = path.join(ROOT, '.dev-data', 'mom-trait-coverage', 'evidence.jsonl');
const EXTRA_FILES = [
  path.join(ROOT, '.dev-data', 'trait-sources', 'extra-public-evidence.json'),
  path.join(ROOT, '.dev-data', 'trait-sources', 'wikidata-labelled-evidence.json')
];
const OUT = path.join(ROOT, '.dev-data', 'mom-controlled-profiles');
fs.mkdirSync(OUT, { recursive: true });

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'")
    .replace(/^the\s+/, '').replace(/\([^)]*\)/g, ' ').replace(/[_–—-]+/g, ' ')
    .replace(/[^a-z0-9']+/g, ' ').trim().replace(/\s+/g, ' ');
}


if (!fs.existsSync(INVENTORY)) throw new Error('Run the playable inventory builder first.');
const inventory = readJsonl(INVENTORY);
const evidenceByName = new Map();
function addEvidence(record) {
  const key = normalize(record.concept || record.name);
  if (!key || !record.trait) return;
  const list = evidenceByName.get(key) || [];
  list.push(record);
  evidenceByName.set(key, list);
}
for (const record of readJsonl(COVERAGE_EVIDENCE)) addEvidence(record);
for (const filename of EXTRA_FILES) {
  if (!fs.existsSync(filename)) continue;
  const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
  for (const row of Array.isArray(parsed) ? parsed : []) {
    for (const evidence of Array.isArray(row.evidence) ? row.evidence : []) {
      addEvidence({ concept: row.concept, ...evidence });
    }
  }
}

const objects = [];
const counts = {};
const weak = [];
let extraMatched = 0;
for (const item of inventory) {
  const name = String(item.name || '').trim();
  if (!name) continue;
  const aliases = Array.isArray(item.aliases) ? item.aliases : [];
  const conceptEvidence = [...new Set([name, ...aliases].map(normalize))].flatMap(key => evidenceByName.get(key) || []);
  if (conceptEvidence.length) extraMatched += 1;
  const evidence = [
    ...(item.broadCategory ? [{ source: 'inventory taxonomy', type: 'category', trait: item.broadCategory }] : []),
    ...(item.sourceCategory ? [{ source: 'inventory taxonomy', type: 'category', trait: item.sourceCategory }] : []),
    ...conceptEvidence
  ];
  const traits = mapEvidence(evidence);
  const yes = [...traits].filter(id => TRAITS.some(t => t.id === id)).sort();
  const difficulty = item.difficulty || 'Unknown';
  const status = yes.length >= 5 ? 'Strong standardized profile' : yes.length >= 2 ? 'Partial standardized profile' : 'Needs enrichment';
  counts[status] = (counts[status] || 0) + 1;
  if (status === 'Needs enrichment') weak.push({ name, difficulty, traitCount: yes.length, evidenceCount: conceptEvidence.length });
  objects.push({ name, aliases, key: item.key || normalize(name), qid: item.qid || '', difficulty,
    score: Number(item.score) || 0, sources: item.sources || [], broadCategory: item.broadCategory || '',
    sourceCategory: item.sourceCategory || '', facets: item.facets && typeof item.facets === 'object' ? item.facets : {}, traits: yes,
    features: featureRecords(yes), evidenceCount: conceptEvidence.length,
    evidenceSources: [...new Set(conceptEvidence.map(e => e.source).filter(Boolean))].sort(), status });
}
objects.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(OUT, 'mom-controlled-profiles.json'), JSON.stringify({ version: 2, traits: TRAITS, objects }, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ total: objects.length, counts, extraMatched, needsEnrichment: weak.length }, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'needs_enrichment.json'), JSON.stringify(weak, null, 2) + '\n');
const allEvidence = [...evidenceByName.values()].flat().map(record => JSON.stringify(record)).sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.join(OUT, 'all-evidence.jsonl'), allEvidence.join('\n') + (allEvidence.length ? '\n' : ''));
console.log(JSON.stringify({ total: objects.length, counts, extraMatched, needsEnrichment: weak.length }, null, 2));
