import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT = path.resolve(ROOT, process.env.MOM_WIKIDATA_MASTER || 'data/mom/wikidata/master.csv');
const OUT_DIR = path.resolve(ROOT, process.env.MOM_WIKIDATA_SHARD_DIR || 'data/mom/wikidata/shards');
const CONCEPTS_PER_SHARD = Math.max(1, Number(process.env.MOM_WIKIDATA_CSV_SHARD_CONCEPTS || 500));

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
function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function normalizedHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

if (!fs.existsSync(INPUT)) throw new Error(`Missing Wikidata master CSV: ${INPUT}`);
const rows = parseCsv(fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, ''));
const header = rows.shift() || [];
const indexes = Object.fromEntries(header.map((value, index) => [normalizedHeader(value), index]));
const conceptIndex = indexes.concept ?? indexes.canonicalanswer ?? indexes.name;
if (conceptIndex == null) throw new Error('Master CSV must contain a concept column.');

const grouped = new Map();
for (const row of rows) {
  const concept = String(row[conceptIndex] || '').trim();
  if (!concept) continue;
  const key = concept.normalize('NFKC').toLocaleLowerCase('en');
  const group = grouped.get(key) || { concept, rows: [] };
  group.rows.push(row);
  grouped.set(key, group);
}
const concepts = [...grouped.values()].sort((a, b) => a.concept.localeCompare(b.concept, 'en'));
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const filename of fs.readdirSync(OUT_DIR)) if (/^part-\d+\.csv$/i.test(filename)) fs.rmSync(path.join(OUT_DIR, filename));

let writtenRows = 0;
const parts = [];
for (let offset = 0, part = 1; offset < concepts.length; offset += CONCEPTS_PER_SHARD, part++) {
  const conceptChunk = concepts.slice(offset, offset + CONCEPTS_PER_SHARD);
  const chunkRows = conceptChunk.flatMap(group => group.rows);
  const filename = `part-${String(part).padStart(4, '0')}.csv`;
  const content = [header, ...chunkRows].map(row => row.map(csvEscape).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT_DIR, filename), content);
  writtenRows += chunkRows.length;
  parts.push({ filename, concepts: conceptChunk.length, rows: chunkRows.length });
}

const manifest = {
  source: path.relative(ROOT, INPUT),
  conceptsPerShard: CONCEPTS_PER_SHARD,
  concepts: concepts.length,
  rows: writtenRows,
  parts
};
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
