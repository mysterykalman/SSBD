import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';
import {pam500DiverseCatalogue} from '../data/pam20q/candidates/diverse-500.mjs';
import {classifyPamLexicalLead} from './pam-2000-lexical-classifier.mjs';
const source='docs/pam-knowledge-fill/all-concepts.csv';
const model=await loadPam1775Model(loadPamClassicModel);
const normalize=s=>String(s??'').normalize('NFKD').toLowerCase().replace(/^an?\s+|^the\s+/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const prior=new Set(model.targets.map(normalize)),catalogue=new Set();
for(const g of [...pam500Catalogue,...pam500DiverseCatalogue])for(const line of g.entries.trim().split(/\n/))catalogue.add(normalize(line.split('|')[0]));
function parse(line){
 const out=[];let value='',inside=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'){if(inside&&line[i+1]==='"'){value+='"';i++;}else inside=!inside;}
  else if(c===','&&!inside){out.push(value);value='';}
  else value+=c;
 }
 out.push(value);return out;
}
let columns=null,scanned=0;
const stats=new Map(),samples=new Map(),seen=new Set(),invalidHeader=[];
const lexicalStats=new Map(),lexicalSamples=new Map(),recognized=new Set();
const groupToSourceKind={bird:'animal',fish:'animal',mammal:'animal',hoof:'animal',reptile:'animal',amphibian:'animal',insect:'animal',invert:'animal',tree:'plant',plant:'plant',root:'food_drink',berry:'food_drink',fruit:'food_drink',herb:'food_drink',vegetable:'food_drink',gem:'object',rock:'object',weather:'object',instrument:'object',vehicle:'object',tool:'object',wear:'object',kitchen:'object',office:'object',sport:'object',meal:'food_drink',dessert:'food_drink',beverage:'food_drink'};
const q=createInterface({input:createReadStream(source),crlfDelay:Infinity});
for await(const line of q){
 if(!line.trim())continue;
 if(!columns){columns=parse(line);continue;}
 const row=parse(line),name=row[columns.indexOf('name')]?.trim(),category=row[columns.indexOf('category')]||'unknown';
 if(!name)continue;
 scanned++;
 const key=normalize(name);
 const candidate=classifyPamLexicalLead(name);
 if(candidate){
  const expected=groupToSourceKind[candidate.kind];
  const permissive=['common_concepts','actual_20q_answers','concrete_concepts','everyday_things'].includes(category);
  if(category===expected||permissive){
   const low=lexicalStats.get(candidate.kind)||{newVsOld:0,all:0,newVsCatalogue:0};low.all++;
   if(!prior.has(key))low.newVsOld++;
   if(!prior.has(key)&&!catalogue.has(key)){
    low.newVsCatalogue++;recognized.add(key);
    const sample=lexicalSamples.get(candidate.kind)||[];
    if(sample.length<35){sample.push({name,sourceCategory:category});lexicalSamples.set(candidate.kind,sample)}
   }
   lexicalStats.set(candidate.kind,low);
  }
 }
 const positives=columns.filter((k,i)=>i>2&&row[i]==='Y');
 const negatives=columns.filter((k,i)=>i>2&&row[i]==='N');
 const st=stats.get(category)||{total:0,newVsOriginal:0,newVsAllSources:0,knownTraits:0,positiveTraits:0,lowEvidence:0,namesWithDigits:0,repeatedNames:0};
 st.total++;st.knownTraits+=positives.length+negatives.length;st.positiveTraits+=positives.length;
 if(!prior.has(key))st.newVsOriginal++;
 if(!prior.has(key)&&!catalogue.has(key))st.newVsAllSources++;
 if(positives.length<2)st.lowEvidence++;
 if(/\d/.test(name))st.namesWithDigits++;
 if(seen.has(key))st.repeatedNames++;
 stats.set(category,st);seen.add(key);
 const list=samples.get(category)||[];
 if(list.length<45&&!prior.has(key)&&!catalogue.has(key)){
  list.push({name,yes:positives.slice(0,16),no:negatives.slice(0,8)});
  samples.set(category,list);
 }
}
console.log('PAM_2000_SOURCE_AUDIT='+JSON.stringify({columns,scanned,unique:seen.size,groups:Object.fromEntries([...stats].map(([c,s])=>[c,{...s,meanKnown:Math.round(s.knownTraits/s.total),meanPositive:Math.round(s.positiveTraits/s.total)}])),samples:Object.fromEntries(samples),lexicalCandidates:{uniqueNew:recognized.size,groups:Object.fromEntries(lexicalStats),samples:Object.fromEntries(lexicalSamples)}}));
