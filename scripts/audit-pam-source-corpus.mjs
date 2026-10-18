import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';
import {pam500DiverseCatalogue} from '../data/pam20q/candidates/diverse-500.mjs';
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
const q=createInterface({input:createReadStream(source),crlfDelay:Infinity});
for await(const line of q){
 if(!line.trim())continue;
 if(!columns){columns=parse(line);continue;}
 const row=parse(line),name=row[columns.indexOf('name')]?.trim(),category=row[columns.indexOf('category')]||'unknown';
 if(!name)continue;
 scanned++;
 const key=normalize(name);
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
console.log('PAM_2000_SOURCE_AUDIT='+JSON.stringify({columns,scanned,unique:seen.size,groups:Object.fromEntries([...stats].map(([c,s])=>[c,{...s,meanKnown:Math.round(s.knownTraits/s.total),meanPositive:Math.round(s.positiveTraits/s.total)}])),samples:Object.fromEntries(samples)}));
