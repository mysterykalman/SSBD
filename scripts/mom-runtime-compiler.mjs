import {createHash} from 'node:crypto';
import {deriveSafeNegativeTraitIds} from './mom-safe-negatives.mjs';
import {buildRuntimeFacetIndex} from './mom-runtime-facets.mjs';
import {applyCategoryBalancedPriors} from './mom-runtime-priors.mjs';
import {compileQuestionMetadata} from './mom-question-metadata.mjs';

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
const LEGACY_DOMAIN_HINTS = [
  ['person','person'],['animal','animal'],['plant','plant'],['place','place'],['food','food_drink'],['drink','food_drink'],
  ['gk_product','object'],['gk_invention','object'],['gk_artwork','media_work'],['gk_book','media_work'],['gk_film','media_work'],
  ['gk_tv','media_work'],['gk_music_work','media_work'],['gk_event','event'],['gk_brand','organization'],['gk_science','abstract']
];
const SUBCATEGORY_ORDER = [
  'fictional_character','mammal','bird','fish','reptile','amphibian','insect','tree','flower','country','city','natural_place','building','landmark',
  'vehicle','car','aircraft','watercraft','tool','device','electronic','furniture','clothing','container','toy','musical_instrument','sports_equipment',
  'prepared_food','drink','fruit_food','vegetable_food','meat','film','tv_series','book','novel','play','music_work','song','album','video_game',
  'artwork','painting','sculpture','historical_event','war','disaster','space_event','company','brand','sports_team','science_concept','emotion'
];

function difficultyOf(value) {
  return DIFFICULTY.get(String(value || '').trim().toLowerCase()) || 'long_tail';
}
function categoryOf(traitSet, fallback='unknown', kind='') {
  const controlled = DOMAIN_ORDER.find(id => traitSet.has(id));
  if (controlled) return controlled;
  for (const [legacy,category] of LEGACY_DOMAIN_HINTS) if (traitSet.has(legacy)) return category;
  const kindKey = normalizeMomLookup(kind).replaceAll(' ','_');
  const kindMap = {product:'object',invention:'object',artwork:'media_work',book:'media_work',film:'media_work',television:'media_work',music:'media_work',event:'event',brand:'organization',science:'abstract',person:'person',place:'place',animal:'animal',plant:'plant',food:'food_drink',drink:'food_drink'};
  if (kindMap[kindKey]) return kindMap[kindKey];
  return normalizeMomLookup(fallback).replaceAll(' ', '_') || 'unknown';
}
function subcategoryOf(traitSet) {
  return SUBCATEGORY_ORDER.find(id => traitSet.has(id)) || null;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function canonicalList(values, keyFn) {
  return [...values].map(stable).sort((a,b) => keyFn(a).localeCompare(keyFn(b), 'en'));
}
function canonicalSupplements(supplements) {
  return [...supplements].map(s=>({
    source:String(s.source||''),
    features:canonicalList(s.features||[],f=>String(f.id||'')),
    objects:canonicalList(s.objects||[],o=>`${normalizeMomLookup(o.name)}|${String(o.qid||'')}`)
  })).sort((a,b)=>a.source.localeCompare(b.source,'en'));
}
function hashSources(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function runtimeIdentityKey(value={}) {
  const qid=String(value.qid||'').trim();
  if(qid)return `wd:${qid}`;
  return `concept:${normalizeMomLookup(value.key||value.name)}`;
}
function conceptId(profile, inventory, supplements=[]) {
  const qid = String(profile.qid || inventory?.qid || supplements.find(x=>x.qid)?.qid || '').trim();
  if (qid) return `wd:${qid}`;
  const key = normalizeMomLookup(profile.key || inventory?.key || profile.name);
  return `concept:${key.replace(/\s+/g, '_')}`;
}
function normalizeQuestionDefs(traits, supplements) {
  const map = new Map();
  for (const trait of traits) {
    if (!trait?.id || !trait?.q) continue;
    map.set(trait.id,{id:trait.id,q:trait.q,group:trait.group||'attribute',parents:[...(trait.parents||[])],requires:null});
  }
  for (const supplement of supplements) for (const feature of supplement.features||[]) {
    if (!feature?.id || !feature?.q || map.has(feature.id)) continue;
    map.set(feature.id,{id:feature.id,q:feature.q,group:feature.group||'attribute',parents:[...(feature.parents||[])],requires:feature.requires||null});
  }
  return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
function consolidateSupplementObjects(supplements) {
  const map = new Map();
  for (const supplement of supplements) for (const raw of supplement.objects||[]) {
    const name=String(raw?.name||'').trim();
    if(!name) continue;
    const key=normalizeMomLookup(name);
    const qid=String(raw.qid||'').trim();
    const identityKey=qid?`wd:${qid}`:`concept:${key}`;
    const current=map.get(identityKey)||{name,key,identityKey,aliases:new Set(),yes:new Set(),no:new Set(),maybe:new Set(),weight:0,qid:'',kind:'',facets:{},sources:new Set()};
    current.sources.add(supplement.source||'supplement');
    for(const alias of raw.aliases||[]) if(alias) current.aliases.add(String(alias).trim());
    for(const id of raw.yes||[]) if(id) current.yes.add(id);
    for(const id of raw.no||[]) if(id) current.no.add(id);
    for(const id of raw.maybe||[]) if(id) current.maybe.add(id);
    current.weight=Math.max(current.weight,Number(raw.weight)||0);
    current.qid ||= String(raw.qid||'');
    current.kind ||= String(raw.kind||'');
    if(raw.facets&&typeof raw.facets==='object')current.facets={...current.facets,...raw.facets};
    map.set(identityKey,current);
  }
  for(const record of map.values()){
    for(const id of record.yes){record.no.delete(id);record.maybe.delete(id);}
    for(const id of record.no)record.maybe.delete(id);
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'en'));
}
function supplementIndexes(records){
  const byLookup=new Map(),byQid=new Map();
  for(const record of records){
    for(const value of [record.name,...record.aliases]){
      const key=normalizeMomLookup(value);if(!key)continue;
      const list=byLookup.get(key)||[];list.push(record);byLookup.set(key,list);
    }
    if(record.qid&&!byQid.has(record.qid))byQid.set(record.qid,record);
  }
  return{byLookup,byQid};
}
function matchSupplementRecords(profile,source,indexes){
  const found=new Set();
  const qid=String(profile.qid||source.qid||'').trim();
  if(qid){
    if(indexes.byQid.has(qid))found.add(indexes.byQid.get(qid));
    return [...found];
  }
  for(const value of [profile.name,...(profile.aliases||[]),source.name,...(source.aliases||[])]){
    const key=normalizeMomLookup(value);if(!key)continue;
    for(const record of indexes.byLookup.get(key)||[])if(!record.qid)found.add(record);
  }
  return [...found];
}
function idsFrom(records,field){return records.flatMap(record=>[...record[field]]);}
function conceptAliases(profile,source,matches,name){
  return [...new Set([
    name,...(profile.aliases||[]),...(source.aliases||[]),...matches.flatMap(record=>[record.name,...record.aliases])
  ].map(v=>String(v||'').trim()).filter(Boolean))];
}
function buildAliasMap(seeds,concepts){
  const targets=new Map();
  for(let conceptIndex=0;conceptIndex<seeds.length;conceptIndex++){
    const {profile,source,matches}=seeds[conceptIndex];
    for(const alias of conceptAliases(profile,source,matches,concepts[conceptIndex].name)){
      const key=normalizeMomLookup(alias);if(!key)continue;
      const set=targets.get(key)||new Set();set.add(conceptIndex);targets.set(key,set);
    }
  }
  return Object.fromEntries([...targets.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,set])=>{
    const indexes=[...set].sort((a,b)=>a-b);return[key,indexes.length===1?indexes[0]:indexes];
  }));
}

export function compileMomRuntimeKnowledge({inventory=[], profiles=[], traits=[], supplements=[], generatedAt='deterministic'}) {
  const questionDefs=normalizeQuestionDefs(traits,supplements);
  const questionIndex=new Map(questionDefs.map((def,index)=>[def.id,index]));
  const questions=questionDefs.map(def=>{
    const meta=compileQuestionMetadata(def);
    const requiresId=def.requires||def.parents?.[0]||null;
    return{
      id:def.id,q:def.q,group:def.group||'attribute',family:meta.family,breadth:meta.breadth,reliability:meta.reliability,
      requires:requiresId?(questionIndex.get(requiresId)??null):null,appliesTo:meta.appliesTo,excludes:meta.excludes,minCoverage:meta.minCoverage
    };
  });

  const inventoryByIdentity=new Map(inventory.map(item=>[runtimeIdentityKey(item),item]));
  const supplementRecords=consolidateSupplementObjects(supplements);
  const supplementIndex=supplementIndexes(supplementRecords);
  const matchedSupplement=new Set();
  const seeds=[];

  for(const profile of [...profiles].sort((a,b)=>String(a.name).localeCompare(String(b.name),'en'))){
    const source=inventoryByIdentity.get(runtimeIdentityKey(profile))||{};
    const matches=matchSupplementRecords(profile,source,supplementIndex);
    matches.forEach(record=>matchedSupplement.add(record));
    seeds.push({profile,source,matches});
  }
  for(const record of supplementRecords){
    if(matchedSupplement.has(record))continue;
    seeds.push({
      profile:{name:record.name,key:record.key,aliases:[...record.aliases],qid:record.qid,difficulty:'Long Tail',score:record.weight||1,facets:record.facets,traits:[]},
      source:{},matches:[record]
    });
  }
  seeds.sort((a,b)=>String(a.profile.name).localeCompare(String(b.profile.name),'en'));

  const rawConcepts=seeds.map(({profile,source,matches})=>{
    const yesIds=[...new Set([...(profile.traits||profile.yes||[]),...idsFrom(matches,'yes')])].filter(id=>questionIndex.has(id)).sort();
    const derivedNo=deriveSafeNegativeTraitIds(yesIds);
    const noIds=[...new Set([...(profile.no||[]),...idsFrom(matches,'no'),...derivedNo])].filter(id=>questionIndex.has(id)&&!yesIds.includes(id)).sort();
    const maybeIds=[...new Set([...(profile.maybe||[]),...idsFrom(matches,'maybe')])].filter(id=>questionIndex.has(id)&&!yesIds.includes(id)&&!noIds.includes(id)).sort();
    const traitSet=new Set(yesIds);
    const name=String(profile.name||source.name||matches[0]?.name||'').trim();
    const supplementWeight=Math.max(0,...matches.map(record=>record.weight||0));
    const score=Number(profile.score??source.score??supplementWeight??1);
    const facets=stable({...matches.reduce((acc,record)=>({...acc,...record.facets}),{}),...(profile.facets&&typeof profile.facets==='object'?profile.facets:{})});
    const kind=profile.kind||source.kind||matches.find(record=>record.kind)?.kind||'';
    return{
      id:conceptId(profile,source,matches),name,
      category:categoryOf(traitSet,profile.broadCategory||source.broadCategory,kind),subcategory:subcategoryOf(traitSet),
      difficulty:difficultyOf(profile.difficulty||source.difficulty),prior:Number.isFinite(score)&&score>0?Number(score.toFixed(6)):1,
      yes:yesIds.map(id=>questionIndex.get(id)),no:noIds.map(id=>questionIndex.get(id)),maybe:maybeIds.map(id=>questionIndex.get(id)),facets
    };
  });
  const concepts=applyCategoryBalancedPriors(rawConcepts);
  const aliases=buildAliasMap(seeds,concepts);
  const facetIndex=buildRuntimeFacetIndex(concepts);

  const canonicalSources={
    inventory:canonicalList(inventory,item=>normalizeMomLookup(item.key||item.name)),
    profiles:canonicalList(profiles,item=>normalizeMomLookup(item.key||item.name)),
    traits:questionDefs,
    supplements:canonicalSupplements(supplements)
  };
  const sourceHash=hashSources(canonicalSources);
  return{
    version:1,
    meta:{conceptCount:concepts.length,questionCount:questions.length,sourceHash,generatedAt,compilerVersion:'7'},
    questions,concepts,aliases,facetIndex
  };
}
