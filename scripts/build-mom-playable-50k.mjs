import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, '.dev-data', 'mom-sources');
const OUT_DIR = path.join(ROOT, '.dev-data', 'mom-playable-50k');
const OLD_50K = path.join(ROOT, '.dev-data', 'mom-50k', 'inventory.csv');
const TARGET = 50000;

fs.mkdirSync(OUT_DIR, { recursive: true });

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/^the\s+/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function niceName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

const BAD_EXACT = new Set([
  'a','an','the','and','or','but','if','then','than','of','to','in','on','at','by','for','from','with','without','as','is','are','was','were','be','been','being','do','does','did','have','has','had','it','this','that','these','those','i','you','he','she','we','they','me','him','her','us','them','my','your','his','our','their','who','what','when','where','why','how','yes','no','maybe','probably'
]);

function acceptable(name) {
  const n = niceName(name);
  const key = normalize(n);
  if (!key || BAD_EXACT.has(key)) return false;
  if (n.length < 2 || n.length > 90) return false;
  if (/https?:\/\//i.test(n)) return false;
  if (/^[\d\W_]+$/.test(n)) return false;
  if (/^(list of|outline of|index of|timeline of|glossary of|category:)/i.test(n)) return false;
  if (/\b(disambiguation|surname|given name)\b/i.test(n)) return false;
  return true;
}

const candidates = new Map();

function addCandidate(name, source, score, fields = {}) {
  name = niceName(name);
  if (!acceptable(name)) return;
  const key = normalize(name);
  if (!key) return;
  const current = candidates.get(key);
  const record = {
    name,
    key,
    score: Number(score) || 0,
    sources: new Set([source]),
    sourceCategory: fields.sourceCategory || '',
    broadCategory: fields.broadCategory || '',
    difficulty: fields.difficulty || '',
    concreteness: fields.concreteness ?? '',
    percentKnown: fields.percentKnown ?? '',
    pos: fields.pos || '',
    qid: fields.qid || '',
    wikipediaUrl: fields.wikipediaUrl || '',
    sourceRank: fields.sourceRank ?? '',
    reason: fields.reason || ''
  };
  if (!current) {
    candidates.set(key, record);
    return;
  }
  current.sources.add(source);
  current.score = Math.max(current.score, record.score);
  if (record.score > current.score || (!current.sourceCategory && record.sourceCategory)) {
    current.sourceCategory ||= record.sourceCategory;
    current.broadCategory ||= record.broadCategory;
  }
  if (!current.qid && record.qid) current.qid = record.qid;
  if (!current.wikipediaUrl && record.wikipediaUrl) current.wikipediaUrl = record.wikipediaUrl;
  if (record.concreteness !== '' && (current.concreteness === '' || Number(record.concreteness) > Number(current.concreteness))) current.concreteness = record.concreteness;
  if (record.percentKnown !== '' && (current.percentKnown === '' || Number(record.percentKnown) > Number(current.percentKnown))) current.percentKnown = record.percentKnown;
  if (!current.pos && record.pos) current.pos = record.pos;
}

// Common word support sets. They improve confidence; they are not dumped directly into the answer pool.
const cel = new Set();
const celPath = path.join(SOURCE_DIR, 'cel_2-45.txt');
if (fs.existsSync(celPath)) {
  for (const line of readText(celPath).split(/\r?\n/)) {
    const key = normalize(line.trim());
    if (key && !key.includes(' ')) cel.add(key);
  }
}

const wordnik = new Set();
const wordnikPath = path.join(SOURCE_DIR, 'wordnik.txt');
if (fs.existsSync(wordnikPath)) {
  for (const line of readText(wordnikPath).split(/\r?\n/)) {
    const key = normalize(line.trim());
    if (key && !key.includes(' ')) wordnik.add(key);
  }
}

// THINGS: purpose-built object concepts, highest-confidence ordinary-answer donor.
const thingsPath = path.join(SOURCE_DIR, 'things.csv');
if (fs.existsSync(thingsPath)) {
  const rows = parseCsv(readText(thingsPath));
  const header = rows.shift()?.map(x => x.trim()) || [];
  const conceptCol = header.findIndex(x => /THINGS-concept/i.test(x));
  for (const row of rows) {
    const name = row[conceptCol >= 0 ? conceptCol : row.length - 1];
    if (name) addCandidate(name, 'THINGS', 120, { broadCategory: 'Everyday things', reason: 'Purpose-built THINGS object concept' });
  }
}

// Brysbaert: generally-known English lemmas with human concreteness ratings.
const bryPath = path.join(SOURCE_DIR, 'brysbaert.txt');
if (fs.existsSync(bryPath)) {
  const lines = readText(bryPath).split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t').map(x => x.trim()) || [];
  const idx = Object.fromEntries(header.map((h, i) => [h.toLowerCase(), i]));
  const col = (...names) => names.map(n => idx[n.toLowerCase()]).find(v => v !== undefined) ?? -1;
  const wordI = col('Word');
  const concI = col('Conc.M', 'Conc_M');
  const knownI = col('Percent_known', 'Percent known');
  const posI = col('Dom_Pos', 'Dom POS');
  const subtlexI = col('SUBTLEX');
  for (const line of lines) {
    const parts = line.split('\t');
    const name = parts[wordI];
    const conc = Number(parts[concI]);
    const knownRaw = Number(parts[knownI]);
    const known = Number.isFinite(knownRaw) ? (knownRaw > 1 ? knownRaw / 100 : knownRaw) : 0;
    const pos = posI >= 0 ? String(parts[posI] || '') : '';
    const subtlex = subtlexI >= 0 ? Number(parts[subtlexI]) : 0;
    const isNoun = /^noun$/i.test(pos) || /^n\b/i.test(pos);
    const isHighlyConcrete = Number.isFinite(conc) && conc >= 4.0;
    const isKnown = known >= 0.88 || (!knownI && true);
    if (!isKnown) continue;
    if (!isNoun && !isHighlyConcrete) continue;
    const key = normalize(name);
    let score = 72;
    if (isNoun) score += 10;
    if (Number.isFinite(conc)) score += conc * 4;
    if (known) score += known * 12;
    if (Number.isFinite(subtlex) && subtlex > 0) score += Math.min(8, Math.log10(1 + subtlex) * 2);
    if (cel.has(key)) score += 7;
    if (wordnik.has(key)) score += 4;
    addCandidate(name, 'Brysbaert', score, {
      broadCategory: isNoun ? 'Common concepts' : 'Concrete concepts',
      concreteness: Number.isFinite(conc) ? conc : '',
      percentKnown: known || '',
      pos,
      reason: 'Generally-known English lemma with concreteness/commonness evidence'
    });
  }
}

// AllenAI: mine actual Twenty Questions subjects/targets from extracted dataset files.
const allenDir = path.join(SOURCE_DIR, 'allenai');
const ALLEN_KEYS = new Set(['subject','target','targetword','target_word','object','concept','secret','entity','item']);
function addAllenValue(value) {
  if (typeof value !== 'string') return;
  let v = value.trim();
  if (/^(yes|no|maybe|probably|unknown|n\/a)$/i.test(v)) return;
  if (v.length > 100 || v.split(/\s+/).length > 12) return;
  addCandidate(v, 'AllenAI Twenty Questions', 116, { broadCategory: 'Actual 20Q answers', reason: 'Observed in an actual Twenty Questions dataset' });
}
function walkJson(value, keyHint = '') {
  if (Array.isArray(value)) { for (const v of value) walkJson(v, keyHint); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const nk = k.toLowerCase().replace(/[^a-z_]/g, '');
      if (ALLEN_KEYS.has(nk)) addAllenValue(v);
      walkJson(v, nk);
    }
  } else if (ALLEN_KEYS.has(keyHint)) addAllenValue(value);
}
function scanAllen(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.json','.jsonl','.ndjson','.csv','.tsv','.txt','.xml'].includes(ext)) return;
  let text;
  try { text = readText(file); } catch { return; }
  if (ext === '.json') {
    try { walkJson(JSON.parse(text)); return; } catch {}
  }
  if (ext === '.jsonl' || ext === '.ndjson') {
    for (const line of text.split(/\r?\n/)) { try { walkJson(JSON.parse(line)); } catch {} }
    return;
  }
  const keyPattern = '(?:subject|target(?:_word|word)?|object|concept|secret|entity|item)';
  for (const m of text.matchAll(new RegExp(`(?:"|<)?${keyPattern}(?:"|>)?\\s*(?:[:=]|</?[^>]+>)\\s*["']?([^"'<>\\n\\r,\\t]{2,100})`, 'gi'))) addAllenValue(m[1]);
}
function walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p); else scanAllen(p);
  }
}
walkFiles(allenDir);

// Wikipedia Vital Articles: donor for named entities/culture/history, no longer the backbone.
if (fs.existsSync(OLD_50K)) {
  const rows = parseCsv(readText(OLD_50K));
  const header = rows.shift()?.map(x => x.trim()) || [];
  const at = name => header.indexOf(name);
  const nameI = at('Canonical answer');
  const sourceI = at('Source');
  const levelI = at('Vital level');
  const catI = at('Vital category');
  const qidI = at('Wikidata QID');
  const urlI = at('Wikipedia URL');
  for (const row of rows) {
    const name = row[nameI];
    if (!name) continue;
    const level = Number(row[levelI]) || 6;
    const category = row[catI] || '';
    const source = row[sourceI] || 'Wikipedia Vital Articles';
    // Lower levels = more vital. Level 5 remains useful but ranks below ordinary/common concept sources.
    const score = ({1:98,2:94,3:88,4:73,5:58}[level] || 48);
    addCandidate(name, source.includes('pam-existing') ? 'Pam existing' : 'Wikipedia Vital Articles', score, {
      broadCategory: 'Named / cultural knowledge',
      sourceCategory: category,
      qid: row[qidI] || '',
      wikipediaUrl: row[urlI] || '',
      sourceRank: level,
      reason: `Wikipedia Vital Article level ${level}`
    });
  }
}

// Reward agreement between independent sources.
for (const c of candidates.values()) {
  const count = c.sources.size;
  if (count >= 2) c.score += 10 + Math.min(10, (count - 2) * 4);
}

const all = [...candidates.values()];

// Keep Wikipedia from crowding out ordinary 20Q-style concepts.
const nonWiki = all.filter(c => c.sources.size > 1 || !c.sources.has('Wikipedia Vital Articles'))
  .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
const wikiOnly = all.filter(c => c.sources.size === 1 && c.sources.has('Wikipedia Vital Articles'))
  .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));

const selected = [];
const selectedKeys = new Set();
function take(list, limit = Infinity) {
  for (const c of list) {
    if (selected.length >= TARGET || limit <= 0) break;
    if (selectedKeys.has(c.key)) continue;
    selected.push(c); selectedKeys.add(c.key); limit -= 1;
  }
}

take(nonWiki);
// Hard cap Wikipedia-only donor concepts at 22k unless needed to reach exactly 50k.
take(wikiOnly, 22000);
if (selected.length < TARGET) take(wikiOnly);

if (selected.length < TARGET) {
  throw new Error(`Only ${selected.length} usable unique candidates found; expected at least ${TARGET}`);
}
selected.length = TARGET;

function difficulty(c) {
  if (c.sources.has('THINGS') || c.sources.has('AllenAI Twenty Questions') || c.score >= 110) return 'Core';
  if (c.score >= 92) return 'Sweet Spot';
  if (c.score >= 72) return 'Hard but Fair';
  return 'Long Tail';
}

const header = ['Rank','Canonical answer','Sources','Score','Broad category','Source category','Difficulty','Concreteness','Percent known','Part of speech','Wikidata QID','Wikipedia URL','Source rank','Selection reason'];
const lines = [header.join(',')];
selected.forEach((c, i) => {
  const row = [i+1,c.name,[...c.sources].sort().join(' | '),c.score.toFixed(2),c.broadCategory,c.sourceCategory,difficulty(c),c.concreteness,c.percentKnown,c.pos,c.qid,c.wikipediaUrl,c.sourceRank,c.reason];
  lines.push(row.map(csvEscape).join(','));
});
fs.writeFileSync(path.join(OUT_DIR, 'playable_50k.csv'), lines.join('\n') + '\n');

const sourceCounts = {};
const difficultyCounts = {};
for (const c of selected) {
  for (const s of c.sources) sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  const d = difficulty(c); difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;
}
const summary = {
  generatedAt: new Date().toISOString(),
  target: TARGET,
  uniqueConcepts: selected.length,
  totalUniqueCandidatesBeforeSelection: all.length,
  sourceCounts,
  difficultyCounts,
  method: 'Priority to THINGS and actual 20Q answers, then generally-known/concrete Brysbaert concepts with CEL/Wordnik support, then capped Wikipedia Vital Articles for cultural/named-entity breadth.',
  notes: [
    'This is a candidate answer inventory, not yet the runtime trait table.',
    'CEL and Wordnik primarily act as commonness/support signals rather than being dumped wholesale into the answer set.',
    'ConceptNet is intentionally deferred to trait/relation enrichment instead of answer selection.'
  ]
};
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
