import {createHash} from 'node:crypto';

export function normalizeMomLookup(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^the\s+/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[_–—-]+/g, ' ')
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const DIFFICULTY = new Map([
  ['core', 'core'],
  ['sweet spot', 'sweet_spot'],
  ['sweet_spot', 'sweet_spot'],
  ['hard but fair', 'hard_but_fair'],
  ['harder but fair', 'hard_but_fair'],
  ['hard_but_fair', 'hard_but_fair'],
  ['long tail', 'long_tail'],
  ['long_tail', 'long_tail']
]);
const DOMAIN_ORDER = ['person','animal','plant','place','food_drink','object','media_work','event','organization','abstract'];
const SUBCATEGORY_ORDER = [
  'fictional_character','mammal','bird','fish','reptile','amphibian','insect','tree','flower','country','city','natural_place','building','landmark',
  'vehicle','car','aircraft','watercraft','tool','device','electronic','furniture','clothing','container','toy','musical_instrument','sports_equipment',
  'prepared_food','drink','fruit_food','vegetable_food','meat','film','tv_series','book','novel','play','music_work','song','album','video_game',
  'artwork','painting','sculpture','historical_event','war','disaster','space_event','company','brand','sports_team','science_concept','emotion'
];

function difficultyOf(value) {
  return DIFFICULTY.get(String(value || '').trim().toLowerCase()) || 'long_tail';
}
function categoryOf(traitSet, fallback='unknown') {
  return DOMAIN_ORDER.find(id => traitSet.has(id)) || normalizeMomLookup(fallback).replaceAll(' ', '_') || 'unknown';
}
function subcategoryOf(traitSet) {
  return SUBCATEGORY_ORDER.find(id => traitSet.has(id)) || null;
}
function breadthFor(trait) {
  if (trait.group === 'domain') return 'broad';
  if (Array.isArray(trait.parents) && trait.parents.length) return trait.parents.length > 1 ? 'specific' : 'category';
  if (['person','animal','plant','place','object','food','media','event','organization','abstract'].includes(trait.group)) return 'category';
  return 'attribute';
}
function reliabilityFor(trait) {
  if (trait.group === 'domain') return 0.99;
  if (Array.isArray(trait.parents) && trait.parents.length) return 0.96;
  return 0.94;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function hashSources(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function conceptId(profile, inventory) {
  const qid = String(profile.qid || inventory?.qid || '').trim();
  if (qid) return `wd:${qid}`;
  const key = normalizeMomLookup(profile.key || inventory?.key || profile.name);
  return `concept:${key.replace(/\s+/g, '_')}`;
}

export function compileMomRuntimeKnowledge({inventory=[], profiles=[], traits=[], generatedAt='deterministic'}) {
  const traitList = [...traits].map(trait => ({...trait, parents:[...(trait.parents || [])]})).sort((a,b) => a.id.localeCompare(b.id));
  const traitIndex = new Map(traitList.map((trait,index) => [trait.id,index]));
  const questions = traitList.map(trait => ({
    id: trait.id,
    q: trait.q,
    group: trait.group || 'attribute',
    breadth: breadthFor(trait),
    reliability: reliabilityFor(trait),
    requires: trait.parents?.length ? (traitIndex.get(trait.parents[0]) ?? null) : null,
    appliesTo: [...(trait.parents || [])],
    excludes: [],
    minCoverage: trait.group === 'domain' ? 0 : 0.35
  }));

  const inventoryByKey = new Map(inventory.map(item => [normalizeMomLookup(item.key || item.name), item]));
  const orderedProfiles = [...profiles].sort((a,b) => String(a.name).localeCompare(String(b.name), 'en'));
  const aliases = {};
  const concepts = orderedProfiles.map((profile, conceptIndex) => {
    const key = normalizeMomLookup(profile.key || profile.name);
    const source = inventoryByKey.get(key) || {};
    const yesIds = [...new Set(profile.traits || profile.yes || [])].filter(id => traitIndex.has(id)).sort();
    const noIds = [...new Set(profile.no || [])].filter(id => traitIndex.has(id) && !yesIds.includes(id)).sort();
    const maybeIds = [...new Set(profile.maybe || [])].filter(id => traitIndex.has(id) && !yesIds.includes(id) && !noIds.includes(id)).sort();
    const traitSet = new Set(yesIds);
    const name = String(profile.name || source.name || '').trim();
    const allAliases = [...new Set([name, ...(profile.aliases || []), ...(source.aliases || [])].map(v => String(v || '').trim()).filter(Boolean))];
    for (const alias of allAliases) {
      const normalized = normalizeMomLookup(alias);
      if (normalized && aliases[normalized] == null) aliases[normalized] = conceptIndex;
    }
    const score = Number(profile.score ?? source.score ?? 1);
    return {
      id: conceptId(profile, source),
      name,
      category: categoryOf(traitSet, profile.broadCategory || source.broadCategory),
      subcategory: subcategoryOf(traitSet),
      difficulty: difficultyOf(profile.difficulty || source.difficulty),
      prior: Number.isFinite(score) && score > 0 ? Number(score.toFixed(6)) : 1,
      yes: yesIds.map(id => traitIndex.get(id)),
      no: noIds.map(id => traitIndex.get(id)),
      maybe: maybeIds.map(id => traitIndex.get(id)),
      facets: profile.facets && typeof profile.facets === 'object' ? stable(profile.facets) : {}
    };
  });

  const sourceHash = hashSources({inventory, profiles, traits:traitList});
  return {
    version: 1,
    meta: {
      conceptCount: concepts.length,
      questionCount: questions.length,
      sourceHash,
      generatedAt,
      compilerVersion: '1'
    },
    questions,
    concepts,
    aliases: Object.fromEntries(Object.entries(aliases).sort(([a],[b]) => a.localeCompare(b)))
  };
}
