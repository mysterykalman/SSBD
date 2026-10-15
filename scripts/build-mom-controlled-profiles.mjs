import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { TRAITS, mapEvidence, featureRecords } from './mom-controlled-traits.mjs';
import {deriveProfileFacets} from './mom-profile-facets.mjs';

const ROOT = process.cwd();
const INVENTORY = path.resolve(ROOT, process.env.MOM_PROFILE_INVENTORY || '.dev-data/mom-playable-50k/playable_50k.jsonl');
const COVERAGE_EVIDENCE = path.resolve(ROOT, process.env.MOM_PROFILE_COVERAGE_EVIDENCE || '.dev-data/mom-trait-coverage/evidence.jsonl');
const DEFAULT_EXTRA = path.join(ROOT, '.dev-data', 'trait-sources', 'extra-public-evidence.json');
const EXTRA_FILES = process.env.MOM_PROFILE_EXTRA_FILES
  ? process.env.MOM_PROFILE_EXTRA_FILES.split(path.delimiter).filter(Boolean).map(file => path.resolve(ROOT, file))
  : [DEFAULT_EXTRA];
const OUT = path.resolve(ROOT, process.env.MOM_PROFILE_OUT_DIR || '.dev-data/mom-controlled-profiles');
const PROFILES_OUT = path.join(OUT, 'mom-controlled-profiles.json');
const SUMMARY_OUT = path.join(OUT, 'summary.json');
const WEAK_OUT = path.join(OUT, 'needs_enrichment.json');
const EVIDENCE_OUT = path.join(OUT, 'all-evidence.jsonl');
fs.mkdirSync(OUT, { recursive: true });

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
async function forEachJsonl(file, visit) {
  if (!fs.existsSync(file)) return;
  const input = fs.createReadStream(file, { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    await visit(JSON.parse(line));
  }
}
async function write(stream, text) {
  if (!stream.write(text)) await once(stream, 'drain');
}
async function finish(stream) {
  stream.end();
  await once(stream, 'finish');
}
function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'")
    .replace(/^the\s+/, '').replace(/\([^)]*\)/g, ' ').replace(/[_–—-]+/g, ' ')
    .replace(/[^a-z0-9']+/g, ' ').trim().replace(/\s+/g, ' ');
}

if (!fs.existsSync(INVENTORY)) throw new Error(`Missing playable inventory: ${INVENTORY}`);
const inventory = readJsonl(INVENTORY);
if (!inventory.length) throw new Error('Playable inventory is empty.');

const wantedEvidenceKeys = new Set();
for (const item of inventory) {
  for (const value of [item.name, ...(Array.isArray(item.aliases) ? item.aliases : [])]) {
    const key = normalize(value);
    if (key) wantedEvidenceKeys.add(key);
  }
}
const evidenceByName = new Map();
const evidenceStream = fs.createWriteStream(EVIDENCE_OUT, { encoding: 'utf8' });
let preservedEvidence = 0;
async function addEvidence(record) {
  const key = normalize(record.concept || record.name);
  if (!key || !record.trait) return;
  await write(evidenceStream, `${JSON.stringify(record)}\n`);
  preservedEvidence += 1;
  if (!wantedEvidenceKeys.has(key)) return;
  const list = evidenceByName.get(key) || [];
  list.push({ source: record.source || '', type: record.type || '', trait: record.trait });
  evidenceByName.set(key, list);
}

await forEachJsonl(COVERAGE_EVIDENCE, addEvidence);
for (const filename of EXTRA_FILES) {
  if (!fs.existsSync(filename)) continue;
  const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
  for (const row of Array.isArray(parsed) ? parsed : []) {
    for (const evidence of Array.isArray(row.evidence) ? row.evidence : []) {
      await addEvidence({ concept: row.concept, ...evidence });
    }
  }
}
await finish(evidenceStream);
console.log(`[mom profiles] indexed evidence for ${evidenceByName.size.toLocaleString()} lookup keys; preserved ${preservedEvidence.toLocaleString()} full evidence records`);

const featureById = new Map(featureRecords().map(feature => [feature.id, feature]));
const traitIds = new Set(TRAITS.map(trait => trait.id));
const counts = {};
let extraMatched = 0;
let needsEnrichment = 0;
let emitted = 0;
let firstProfile = true;
let firstWeak = true;
let facetedProfiles = 0;

inventory.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en'));
const profileStream = fs.createWriteStream(PROFILES_OUT, { encoding: 'utf8' });
const weakStream = fs.createWriteStream(WEAK_OUT, { encoding: 'utf8' });
await write(profileStream, `{"version":2,"traits":${JSON.stringify(TRAITS)},"objects":[\n`);
await write(weakStream, '[\n');

for (const item of inventory) {
  const name = String(item.name || '').trim();
  if (!name) continue;
  const aliases = Array.isArray(item.aliases) ? item.aliases : [];
  const keys = [...new Set([name, ...aliases].map(normalize).filter(Boolean))];
  const conceptEvidence = keys.flatMap(key => evidenceByName.get(key) || []);
  if (conceptEvidence.length) extraMatched += 1;
  const evidence = [
    ...(item.broadCategory ? [{ source: 'inventory taxonomy', type: 'category', trait: item.broadCategory }] : []),
    ...(item.sourceCategory ? [{ source: 'inventory taxonomy', type: 'category', trait: item.sourceCategory }] : []),
    ...conceptEvidence
  ];
  const traits = mapEvidence(evidence);
  for (const ev of conceptEvidence) {
    if (String(ev.type || '') === 'canonical-trait-id' && traitIds.has(String(ev.trait || ''))) {
      traits.add(String(ev.trait));
    }
  }
  const yes = [...traits].filter(id => traitIds.has(id)).sort();
  const facets = deriveProfileFacets({base:item.facets,evidence:conceptEvidence,traits:yes});
  if (Object.values(facets).some(value => !Array.isArray(value))) {
    throw new Error(`Facet compiler contract violation for ${name}: every facet value must be an array.`);
  }
  if (Object.keys(facets).length) facetedProfiles += 1;
  const difficulty = item.difficulty || 'Unknown';
  const status = yes.length >= 5 ? 'Strong standardized profile' : yes.length >= 2 ? 'Partial standardized profile' : 'Needs enrichment';
  counts[status] = (counts[status] || 0) + 1;
  const evidenceSources = [...new Set(conceptEvidence.map(e => e.source).filter(Boolean))].sort();
  const profile = {
    name,
    aliases,
    key: item.key || normalize(name),
    qid: item.qid || '',
    difficulty,
    score: Number(item.score) || 0,
    sources: item.sources || [],
    broadCategory: item.broadCategory || '',
    sourceCategory: item.sourceCategory || '',
    facets,
    traits: yes,
    features: yes.map(id => featureById.get(id)).filter(Boolean),
    evidenceCount: conceptEvidence.length,
    evidenceSources,
    status
  };
  await write(profileStream, `${firstProfile ? '' : ',\n'}${JSON.stringify(profile)}`);
  firstProfile = false;
  emitted += 1;

  if (status === 'Needs enrichment') {
    needsEnrichment += 1;
    const weak = { name, difficulty, traitCount: yes.length, evidenceCount: conceptEvidence.length };
    await write(weakStream, `${firstWeak ? '' : ',\n'}${JSON.stringify(weak)}`);
    firstWeak = false;
  }
  if (emitted % 5000 === 0) console.log(`[mom profiles] compiled ${emitted.toLocaleString()} / ${inventory.length.toLocaleString()} profiles`);
}

await write(profileStream, '\n]}\n');
await write(weakStream, '\n]\n');
await Promise.all([finish(profileStream), finish(weakStream)]);

const summary = { total: emitted, counts, extraMatched, needsEnrichment, preservedEvidence, facetedProfiles, outputDir: path.relative(ROOT, OUT), extraFiles: EXTRA_FILES.map(file => path.relative(ROOT, file)) };
fs.writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
