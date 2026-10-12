import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(ROOT, process.env.MOM_WIKIDATA_STATIC_DIR || 'data/mom/wikidata');
const MASTER_GZIP = path.join(SOURCE_ROOT, 'master.csv.gz');
const MASTER_CSV = path.join(SOURCE_ROOT, 'master.csv');
const SHARD_DIR = path.join(SOURCE_ROOT, 'shards');
const OUT_DIR = path.join(ROOT, '.dev-data', 'trait-sources');
const OUT = path.join(OUT_DIR, 'wikidata-labelled-evidence.json');
const SUMMARY = path.join(OUT_DIR, 'wikidata-static.summary.json');
const PARTS_DIR = path.join(OUT_DIR, 'wikidata-static.parts');
const OUTPUT_SHARD_CONCEPTS = Math.max(1, Number(process.env.MOM_WIKIDATA_OUTPUT_SHARD_CONCEPTS || 500));

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeConcept(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en');
}

function csvFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
    .map(entry => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function parseConfidence(value) {
  if (value == null || String(value).trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readCsv(filename) {
  const bytes = fs.readFileSync(filename);
  const text = filename.toLowerCase().endsWith('.gz')
    ? zlib.gunzipSync(bytes).toString('utf8')
    : bytes.toString('utf8');
  return text.replace(/^\uFEFF/, '');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(PARTS_DIR, { recursive: true, force: true });
fs.mkdirSync(PARTS_DIR, { recursive: true });

const inputFiles = fs.existsSync(MASTER_GZIP)
  ? [MASTER_GZIP]
  : fs.existsSync(MASTER_CSV)
    ? [MASTER_CSV]
    : csvFiles(SHARD_DIR);

if (!inputFiles.length) {
  throw new Error(`Required static Wikidata source is missing. Expected ${path.relative(ROOT, MASTER_GZIP)}, ${path.relative(ROOT, MASTER_CSV)}, or CSV shards under ${path.relative(ROOT, SHARD_DIR)}.`);
}

const grouped = new Map();
const seen = new Set();
let inputRows = 0;
let acceptedRows = 0;
let duplicateRows = 0;
let rejectedRows = 0;

for (const filename of inputFiles) {
  const rows = parseCsv(readCsv(filename));
  const header = rows.shift() || [];
  const indexes = Object.fromEntries(header.map((value, index) => [normalizeHeader(value), index]));
  const conceptIndex = indexes.concept ?? indexes.canonicalanswer ?? indexes.name;
  const qidIndex = indexes.qid ?? indexes.wikidataqid;
  const propertyIndex = indexes.property ?? indexes.type;
  const valueIndex = indexes.value;
  const traitIndex = indexes.trait ?? indexes.normalizedtrait;
  const confidenceIndex = indexes.confidence;

  if (conceptIndex == null) throw new Error(`${filename} is missing a concept column`);
  if (traitIndex == null && (propertyIndex == null || valueIndex == null)) {
    throw new Error(`${filename} must contain trait, or both property and value columns`);
  }

  for (const row of rows) {
    inputRows++;
    const concept = String(row[conceptIndex] || '').trim();
    if (!concept) { rejectedRows++; continue; }

    const qid = qidIndex == null ? '' : String(row[qidIndex] || '').trim();
    let property = propertyIndex == null ? '' : String(row[propertyIndex] || '').trim();
    const value = valueIndex == null ? '' : String(row[valueIndex] || '').trim();
    let trait = traitIndex == null ? '' : String(row[traitIndex] || '').trim();

    if (!trait && property && value) trait = `${property}:${value}`;
    if (!property && trait.includes(':')) property = trait.slice(0, trait.indexOf(':')).trim();
    if (!trait) { rejectedRows++; continue; }

    const confidence = confidenceIndex == null ? undefined : parseConfidence(row[confidenceIndex]);
    const dedupeKey = `${normalizeConcept(concept)}|${qid}|${property}|${trait}`;
    if (seen.has(dedupeKey)) { duplicateRows++; continue; }
    seen.add(dedupeKey);
    acceptedRows++;

    const groupKey = normalizeConcept(concept);
    const current = grouped.get(groupKey) || { concept, qid, evidence: [] };
    if (!current.qid && qid) current.qid = qid;
    current.evidence.push({
      source: 'Wikidata static',
      type: property,
      trait,
      ...(confidence == null ? {} : { confidence })
    });
    grouped.set(groupKey, current);
  }
}

const records = [...grouped.values()]
  .map(record => ({
    ...record,
    evidence: record.evidence.sort((a, b) => `${a.type}\u0000${a.trait}`.localeCompare(`${b.type}\u0000${b.trait}`, 'en'))
  }))
  .sort((a, b) => a.concept.localeCompare(b.concept, 'en'));

if (!records.length || acceptedRows === 0) {
  throw new Error('Required static Wikidata source produced no usable evidence.');
}

for (let offset = 0, part = 1; offset < records.length; offset += OUTPUT_SHARD_CONCEPTS, part++) {
  const chunk = records.slice(offset, offset + OUTPUT_SHARD_CONCEPTS);
  const filename = path.join(PARTS_DIR, `part-${String(part).padStart(4, '0')}.jsonl`);
  fs.writeFileSync(filename, chunk.map(record => JSON.stringify(record)).join('\n') + '\n');
}

fs.writeFileSync(OUT, JSON.stringify(records));

const summary = {
  mode: 'static-offline',
  networkRequests: 0,
  required: true,
  sourceRoot: path.relative(ROOT, SOURCE_ROOT),
  inputFiles: inputFiles.map(filename => path.relative(ROOT, filename)),
  inputRows,
  acceptedRows,
  duplicateRows,
  rejectedRows,
  concepts: records.length,
  qids: records.filter(record => /^Q\d+$/.test(record.qid || '')).length,
  evidenceItems: records.reduce((sum, record) => sum + record.evidence.length, 0),
  outputShardConcepts: OUTPUT_SHARD_CONCEPTS,
  outputParts: Math.ceil(records.length / OUTPUT_SHARD_CONCEPTS),
  output: path.relative(ROOT, OUT),
  partsDirectory: path.relative(ROOT, PARTS_DIR)
};

fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
