// Research Pam's explicitly unknown answers using Wikipedia's public API.
// This script produces REVIEW CANDIDATES, never writes guesses into the model.
// Run: node scripts/research-pam-missing-facts.mjs --out artifacts/pam-research.json --limit 1775
// Exact matched subjects and quoted evidence are required before a fact is proposed.
// The 1400 legacy profiles lack per-cell provenance; absence cannot be inferred from their default "no".
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';

const args=process.argv,flag=(key,defaultValue)=>{const i=args.indexOf(key);return i<0?defaultValue:args[i+1];};
const out=flag('--out','artifacts/pam-research.json');
const limit=Math.min(1775,Math.max(1,Number(flag('--limit','1775'))));
const model=await loadPam1775Model(loadPamClassicModel);
const N=model.targets.length;
const patterns=[
 {trait:'nocturnal',re:/\bnocturnal\b/i,value:3},
 {trait:'herbivore',re:/\bherbivor(?:e|ous)\b/i,value:3},
 {trait:'carnivore',re:/\bcarnivor(?:e|ous)\b/i,value:3},
 {trait:'mammal',re:/\b(?:is|are|was) (?:an? |the )?\w{0,18} ?mammal\b/i,value:3},
 {trait:'fish',re:/\b(?:is|are|was) (?:an? |the )?\w{0,18} ?fish\b/i,value:3},
 {trait:'insect',re:/\b(?:is|are|was) (?:an? |the )?\w{0,18} ?insect\b/i,value:3},
 {trait:'wings',re:/\b(?:has|have) wings\b/i,value:3},
 {trait:'feathers',re:/\b(?:has|have) feathers\b/i,value:3},
 {trait:'hooves',re:/\b(?:has|have) hooves\b/i,value:3},
];
const traitIndex={nocturnal:135,herbivore:128,carnivore:115,mammal:152,fish:145,insect:147,wings:153,feathers:149,hooves:155};
const candidates=[],unresolved=[],errors=[];
const clean=name=>name.replace(/^(an?|the) /i,'').trim();
async function fetchPage(title){
 const api='https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=extracts&exintro=1&explaintext=1&titles='+encodeURIComponent(title);
 const response=await fetch(api,{headers:{'User-Agent':'SSBD-Pam-knowledge-audit/1.0 (educational research; provenance tracked)','Accept':'application/json'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Wikipedia '+response.status);
 return (await response.json()).query?.pages?.[0];
}
for(let t=0;t<limit;t++){
 // Never treat pre-existing legacy negatives as verified, or overwrite them.
 const unknowns=patterns.filter(p=>model.knownMask[p.traitIndex??traitIndex[p.trait]]?.length===-1 || model.knownMask[traitIndex[p.trait]*N+t]===0);
 if(!unknowns.length)continue;
 const target=model.targets[t],subject=clean(target);
 try {
  const page=await fetchPage(subject);
  if(!page||page.missing||!page.extract){unresolved.push({target,reason:'no-exact-article'});continue;}
  // No fuzzy name matching: a matched title is still not sufficient for automatic insertion.
  const normalized=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(normalized(page.title)!==normalized(subject)){unresolved.push({target,reason:'ambiguous-page',matched:page.title});continue;}
  const found=[];
  for(const p of unknowns){
   const m=page.extract.match(p.re);
   if(!m)continue;
   found.push({trait:p.trait,value:p.value,evidence:m[0],source:'https://en.wikipedia.org/?curid='+page.pageid,sourceTitle:page.title,reviewStatus:'needs-verification'});
  }
  if(found.length)candidates.push({target,facts:found});
  else unresolved.push({target,reason:'no-supported-evidence'});
 }catch(err){errors.push({target,error:String(err.message||err)});}
 if((t+1)%50===0)console.error('Reviewed targets: '+(t+1)+'/'+limit);
}
const report={schemaVersion:1,reviewRequired:true,targetsScanned:limit,candidates,unresolved,errors};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({targetsScanned:limit,targetsWithCandidates:candidates.length,factCandidates:candidates.reduce((n,c)=>n+c.facts.length,0),unresolved:unresolved.length,errors:errors.length,out}));
