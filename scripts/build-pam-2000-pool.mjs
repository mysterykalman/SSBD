// Stage-1 candidate logic check: names, broad category/term clarity,
// duplicate equivalence, and overlap with the protected 1775.
// A pool passing THIS stage is not a roster of accurate 20Q profiles.
import {writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';
import {pam500DiverseCatalogue} from '../data/pam20q/candidates/diverse-500.mjs';
import {loadPamLexicalLeads,normalizePamName} from './pam-2000-corpus.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'data','pam20q','candidates','pam-2000-reviewed-pool.json');
const baseline=await loadPam1775Model(loadPamClassicModel),lexical=await loadPamLexicalLeads();
const categoryFor={mammal:'animal',hoof:'animal',bird:'animal',fish:'animal',reptile:'animal',amphibian:'animal',insect:'animal',invert:'animal',shellfish:'animal',
 fruit:'vegetable',berry:'vegetable',vegetable:'vegetable',root:'vegetable',herb:'vegetable',nut:'vegetable',plant:'vegetable',tree:'vegetable',
 rock:'mineral',gem:'mineral',ice:'mineral',landform:'mineral',nature:'mineral'};
const prior=new Set(baseline.targets.map(normalizePamName)),seen=new Set(),pool=[],rejected=[];
const suspicious=/^(?:a|an|the)?\s*(?:pile|mound|handful|pinch|piece|slice|chunk|layer|patch|cloud|group|set|pair|clump) of\b/i;
const disallowed=/\b(?:sex|orgasm|nudity|porn|heroin|cocaine|meth|fascism|torture|gunshot|shotgun|rifle|pistol|ammunition|suicide|murder|rape|nazi|booby trap)\b/i;
const disallowedSingle=new Set(['a warning','an internet meme','a solar eclipse shadow','a nightmare','a secret','a promise','a joke','a riddle','a surprise','a daydream']);
const alias={};
const pluralKey=s=>{
 if(s.endsWith('ies')&&s.length>5)return s.slice(0,-3)+'y';
 if(s.endsWith('es')&&/(?:ses|xes|zes|ches|shes)$/.test(s))return s.replace(/(?:es)$/,'');
 if(s.endsWith('s')&&!s.endsWith('ss')&&!s.endsWith('us')&&s.length>5)return s.slice(0,-1);
 return s;
};
const priorCanon=new Set([...prior].flatMap(k=>[k,pluralKey(k)]));
function process(name,kind,origin,sourceRank=null,sourceFlags=''){
 const n=String(name||'').trim(),key=normalizePamName(n),normalizedPlural=pluralKey(key);
 let reason='';
 if(!n||!/^[\p{L}\d]/u.test(n))reason='not_a_name';
 else if(n.length<3||n.length>60||n.split(/\s+/).length>7)reason='poor_answer_phrase';
 else if(/\d|[#@]/.test(n))reason='digits_or_markup';
 else if(disallowed.test(n)||disallowedSingle.has(n.toLowerCase()))reason='inappropriate_or_unstable_referent';
 else if(suspicious.test(n))reason='quantity_or_fragment_not_atomic';
 else if(priorCanon.has(key)||priorCanon.has(normalizedPlural))reason='duplicate_1775';
 else if(seen.has(key)||seen.has(normalizedPlural))reason='duplicate_in_pool';
 if(reason){rejected.push({name:n,kind,origin,reason});return;}
 seen.add(key);seen.add(normalizedPlural);
 pool.push({name:n,kind,category:categoryFor[kind]||'other',
  origin,source_rank:sourceRank,source_flags:sourceFlags,
  confidence:origin==='lexical_52k'?'lead_not_fact_checked':'curated_template_requires_item_review',
  review_status:'candidate_unreviewed'});
}
for(const group of [...pam500DiverseCatalogue,...pam500Catalogue]){
 const origin=pam500DiverseCatalogue.includes(group)?'diversified_catalogue':'original_catalogue';
 for(const line of group.entries.trim().split(/\r?\n/)){
  const [name,flags='']=line.split('|');process(name,group.kind,origin,null,group.flags+' '+flags);
 }
}
const order=lexical.sort((a,b)=>a.rank-b.rank);
for(const item of order){
 const display=/^[aeiou]/i.test(item.name)?'an '+item.name:'a '+item.name;
 process(display,item.kind,'lexical_52k',item.rank,'');
}
const raw=lexical.length+pam500Catalogue.reduce((s,g)=>s+g.entries.trim().split(/\n/).length,0)+pam500DiverseCatalogue.reduce((s,g)=>s+g.entries.trim().split(/\n/).length,0);
const bySource={},byCategory={},byKind={},rejectByReason={};
for(const p of pool){
 bySource[p.origin]=(bySource[p.origin]||0)+1;
 byCategory[p.category]=(byCategory[p.category]||0)+1;
 byKind[p.kind]=(byKind[p.kind]||0)+1;
}
for(const p of rejected)rejectByReason[p.reason]=(rejectByReason[p.reason]||0)+1;
const summary={rawCandidates:raw,baseline:baseline.targets.length,sourceLexicalLeads:lexical.length,
 eligibleUniqueCandidates:pool.length,rejected:rejected.length,bySource,byCategory,byKind,rejectByReason};
if(pool.length<2000)throw Error('Logic-checked pool has '+pool.length+' candidates, minimum 2000 required. Expand source intelligently.');
const document={version:1,review_status:'candidate_unreviewed',purpose:'2000-plus source pool, not production model',
 sourceNotes:['Curated template flags are not per-item factual signoff','Lexical leads have NOT been independently verified and may not be promoted without further evidence'],
 summary,candidates:pool,rejected};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(document,null,2)+'\n');
console.log('PAM_2000_POOL='+JSON.stringify(summary));
console.log('PAM_2000_REJECT_SAMPLE='+JSON.stringify(rejected.slice(0,38)));
console.log('PAM_2000_SOURCE_SAMPLES='+JSON.stringify(Object.fromEntries(Object.keys(bySource).map(k=>[k,pool.filter(p=>p.origin===k).slice(0,22).map(p=>p.name)]))));
