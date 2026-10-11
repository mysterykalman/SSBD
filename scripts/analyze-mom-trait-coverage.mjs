import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, '.dev-data', 'mom-playable-50k', 'playable_50k.csv');
const OUT_DIR = path.join(ROOT, '.dev-data', 'mom-trait-coverage');
const MCRAE_THINGS = path.join(ROOT, '.dev-data', 'trait-sources', 'seeing-what-tastes-good', 'data', 'mcrae-x-things.json');
const MCRAE_TAXONOMY = path.join(ROOT, '.dev-data', 'trait-sources', 'seeing-what-tastes-good', 'data', 'mcrae-x-things-taxonomy.json');
const CARDIFF_DIR = path.join(ROOT, '.dev-data', 'trait-sources', 'trait-concept-datasets');
const CONCEPTNET = path.join(ROOT, '.dev-data', 'trait-sources', 'conceptnet-assertions-5.7.0.csv.gz');

fs.mkdirSync(OUT_DIR, { recursive: true });

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/^the\s+/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
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

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

if (!fs.existsSync(INVENTORY)) throw new Error(`Missing inventory: ${INVENTORY}`);
const invRows = parseCsv(fs.readFileSync(INVENTORY, 'utf8').replace(/^\uFEFF/, ''));
const invHeader = invRows.shift();
const nameCol = invHeader.indexOf('Canonical answer');
const difficultyCol = invHeader.indexOf('Difficulty');
if (nameCol < 0) throw new Error('Inventory is missing Canonical answer');

const concepts = invRows.filter(r => r[nameCol]).map((r, i) => ({
  rank: i + 1,
  name: r[nameCol].trim(),
  key: normalize(r[nameCol]),
  difficulty: difficultyCol >= 0 ? r[difficultyCol] : '',
  traits: new Map(),
  sources: new Set(),
}));
const byKey = new Map(concepts.map(c => [c.key, c]));

function addEvidence(rawConcept, source, rawTrait, type = '') {
  const key = normalize(rawConcept).replace(/\b([a-z]+)\d+$/, '$1');
  const c = byKey.get(key);
  if (!c) return false;
  const trait = String(rawTrait ?? '').trim();
  if (!trait) return false;
  const evidenceKey = `${source}|${type}|${trait}`;
  c.traits.set(evidenceKey, { source, type, trait });
  c.sources.add(source);
  return true;
}

// McRae × THINGS positive concept-attribute pairs.
if (fs.existsSync(MCRAE_THINGS)) {
  const pairs = JSON.parse(fs.readFileSync(MCRAE_THINGS, 'utf8'));
  const taxonomy = fs.existsSync(MCRAE_TAXONOMY) ? JSON.parse(fs.readFileSync(MCRAE_TAXONOMY, 'utf8')) : {};
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    addEvidence(pair[0], 'McRae x THINGS', pair[1], taxonomy[pair[1]] ?? '');
  }
}

// Cardiff McRae + CSLB-derived trait datasets.
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
for (const file of walk(CARDIFF_DIR).filter(f => f.endsWith('.csv'))) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = rows.shift()?.map(x => x.trim().toLowerCase()) ?? [];
  const conceptI = header.indexOf('concept');
  const featureI = header.indexOf('feature');
  const typeI = header.indexOf('attribute type');
  if (conceptI < 0 || featureI < 0) continue;
  const lower = file.toLowerCase();
  const source = lower.includes('norms') ? 'CSLB trait norms' : 'McRae trait norms';
  for (const row of rows) addEvidence(row[conceptI], source, row[featureI], typeI >= 0 ? row[typeI] : '');
}

// ConceptNet: stream only English edges with relations useful for 20Q traits.
const USEFUL_RELATIONS = new Set([
  '/r/IsA','/r/InstanceOf','/r/HasProperty','/r/UsedFor','/r/CapableOf','/r/HasA','/r/PartOf','/r/AtLocation','/r/MadeOf','/r/CreatedBy','/r/DefinedAs','/r/ReceivesAction'
]);
function conceptFromUri(uri) {
  const m = String(uri ?? '').match(/^\/c\/en\/([^/]+)/);
  return m ? decodeURIComponent(m[1].replaceAll('_', ' ')) : '';
}
function labelFromUri(uri) {
  return conceptFromUri(uri);
}
if (fs.existsSync(CONCEPTNET)) {
  const input = fs.createReadStream(CONCEPTNET).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let lines = 0, useful = 0;
  for await (const line of rl) {
    lines += 1;
    const cols = line.split('\t');
    if (cols.length < 4) continue;
    const rel = cols[1];
    if (!USEFUL_RELATIONS.has(rel)) continue;
    const start = conceptFromUri(cols[2]);
    const end = conceptFromUri(cols[3]);
    if (!start || !end) continue;
    if (!byKey.has(normalize(start))) continue;
    const trait = `${rel.slice(3)}:${labelFromUri(cols[3])}`;
    if (addEvidence(start, 'ConceptNet', trait, rel.slice(3))) useful += 1;
    if (lines % 5000000 === 0) console.log(`ConceptNet lines ${lines.toLocaleString()}, matched edges ${useful.toLocaleString()}`);
  }
  console.log(`ConceptNet complete: ${lines.toLocaleString()} lines, ${useful.toLocaleString()} matched useful edges`);
}

function status(c) {
  const n = c.traits.size;
  if (n >= 5) return 'Strong public trait coverage';
  if (n >= 1) return 'Partial public trait coverage';
  return 'Needs help';
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalConcepts: concepts.length,
  strongCoverage: concepts.filter(c => status(c) === 'Strong public trait coverage').length,
  partialCoverage: concepts.filter(c => status(c) === 'Partial public trait coverage').length,
  needsHelp: concepts.filter(c => status(c) === 'Needs help').length,
  anyPublicTraitCoverage: concepts.filter(c => c.traits.size > 0).length,
  bySource: {},
  byDifficulty: {},
  thresholds: {
    strong: '5 or more distinct usable public trait assertions',
    partial: '1 to 4 distinct usable public trait assertions',
    needsHelp: '0 matched usable public trait assertions',
  },
};
for (const source of ['McRae x THINGS','McRae trait norms','CSLB trait norms','ConceptNet']) {
  summary.bySource[source] = concepts.filter(c => c.sources.has(source)).length;
}
for (const c of concepts) {
  const d = c.difficulty || 'Unknown';
  summary.byDifficulty[d] ??= { total: 0, strong: 0, partial: 0, needsHelp: 0 };
  summary.byDifficulty[d].total += 1;
  const s = status(c);
  if (s === 'Strong public trait coverage') summary.byDifficulty[d].strong += 1;
  else if (s === 'Partial public trait coverage') summary.byDifficulty[d].partial += 1;
  else summary.byDifficulty[d].needsHelp += 1;
}

const reportHeader = ['Rank','Canonical answer','Difficulty','Coverage status','Trait count','Sources','Example traits'];
const reportLines = [reportHeader.join(',')];
for (const c of concepts) {
  const examples = [...c.traits.values()].slice(0, 12).map(e => `${e.source}: ${e.trait}`).join(' | ');
  reportLines.push([c.rank,c.name,c.difficulty,status(c),c.traits.size,[...c.sources].sort().join(' | '),examples].map(csvEscape).join(','));
}
fs.writeFileSync(path.join(OUT_DIR, 'trait_coverage.csv'), reportLines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'needs_help.txt'), concepts.filter(c => status(c) === 'Needs help').map(c => c.name).join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
