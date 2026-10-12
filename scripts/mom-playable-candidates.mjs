export function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-').replace(/^the\s+/, '').replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function niceName(value) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
function normalizeFacets(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    const values = (Array.isArray(raw) ? raw : [raw]).map(niceName).filter(Boolean);
    if (values.length) out[key] = [...new Set(values)];
  }
  return out;
}
function mergeFacets(target, incoming) {
  for (const [key, values] of Object.entries(incoming || {})) {
    const current = Array.isArray(target[key]) ? target[key] : [];
    target[key] = [...new Set([...current, ...values])];
  }
}
const BAD_EXACT = new Set(['a','an','the','and','or','but','if','then','than','of','to','in','on','at','by','for','from','with','without','as','is','are','was','were','be','been','being','do','does','did','have','has','had','it','this','that','these','those','i','you','he','she','we','they','me','him','her','us','them','my','your','his','our','their','who','what','when','where','why','how','yes','no','maybe','unknown']);
function acceptable(name) {
  const n = niceName(name), key = normalize(n);
  if (!key || BAD_EXACT.has(key)) return false;
  if (n.length < 2 || n.length > 90 || /https?:\/\//i.test(n) || /^[\d\W_]+$/.test(n)) return false;
  if (/^(list of|outline of|index of|timeline of|glossary of|category:)/i.test(n) || /\b(disambiguation|surname|given name)\b/i.test(n)) return false;
  return true;
}

export function createCandidateAccumulator() {
  const candidates = new Map();
  return {
    candidates,
    addCandidate(name, source, score, fields = {}) {
      name = niceName(name);
      if (!acceptable(name)) return;
      const key = normalize(name), current = candidates.get(key);
      const record = { name, key, aliases: new Set(), score: Number(score) || 0, sources: new Set([source]),
        sourceCategory: fields.sourceCategory || '', broadCategory: fields.broadCategory || '', difficulty: fields.difficulty || '',
        concreteness: fields.concreteness ?? '', percentKnown: fields.percentKnown ?? '', pos: fields.pos || '', qid: fields.qid || '',
        wikipediaUrl: fields.wikipediaUrl || '', sourceRank: fields.sourceRank ?? '', reason: fields.reason || '', facets: normalizeFacets(fields.facets) };
      if (!current) { candidates.set(key, record); return; }
      current.sources.add(source); current.aliases.add(record.name);
      mergeFacets(current.facets, record.facets);
      const isBetter = record.score > current.score;
      if (isBetter) { current.aliases.add(current.name); current.name = record.name; current.score = record.score; }
      if (isBetter) {
        current.sourceCategory = record.sourceCategory || current.sourceCategory;
        current.broadCategory = record.broadCategory || current.broadCategory;
        current.reason = record.reason || current.reason;
      } else {
        current.sourceCategory ||= record.sourceCategory;
        current.broadCategory ||= record.broadCategory;
        current.reason ||= record.reason;
      }
      if (!current.qid && record.qid) current.qid = record.qid;
      if (!current.wikipediaUrl && record.wikipediaUrl) current.wikipediaUrl = record.wikipediaUrl;
      if (record.concreteness !== '' && (current.concreteness === '' || Number(record.concreteness) > Number(current.concreteness))) current.concreteness = record.concreteness;
      if (record.percentKnown !== '' && (current.percentKnown === '' || Number(record.percentKnown) > Number(current.percentKnown))) current.percentKnown = record.percentKnown;
      if (!current.pos && record.pos) current.pos = record.pos;
    }
  };
}
