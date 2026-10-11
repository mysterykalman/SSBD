import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const INVENTORY=path.join(ROOT,'.dev-data','mom-playable-50k','playable_50k.csv');
const OUT=path.join(ROOT,'.dev-data','trait-sources','wikidata-labelled-evidence.json');

const PROPS={
 P31:'instance of',P279:'subclass of',P106:'occupation',P27:'country of citizenship',P17:'country',
 P495:'country of origin',P136:'genre',P170:'creator',P50:'author',P57:'director',P175:'performer',
 P361:'part of',P527:'has part',P186:'material',P366:'use',P276:'location',P131:'located in',
 P452:'industry',P176:'manufacturer',P400:'platform',P641:'sport',P21:'gender',P144:'based on',
 P138:'named after',P1412:'languages spoken',P101:'field of work',P69:'educated at',P108:'employer',
 P1303:'instrument',P264:'record label',P463:'member of',P54:'member of sports team',P413:'position played',
 P577:'publication date',P577:'publication date',P577:'publication date',P921:'main subject',P180:'depicts',
 P462:'color',P2048:'height',P2067:'mass',P2054:'density',P2670:'has parts of class',P1552:'has quality',
 P105:'taxon rank',P171:'parent taxon',P183:'endemic to',P141:'conservation status',P703:'found in taxon'
};

function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
  else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=ch;
 }
 if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}return rows;
}
function hmap(row){return Object.fromEntries(row.map((v,i)=>[v,i]));}
async function fetchJson(url,retries=4){
 let last;
 for(let i=0;i<retries;i++){
  try{
   const r=await fetch(url,{headers:{'user-agent':'SSBD-Pam-knowledge-audit/1.0'}});
   if(!r.ok)throw new Error(`HTTP ${r.status}`);
   return await r.json();
  }catch(e){last=e;await new Promise(res=>setTimeout(res,750*(i+1)));}
 }
 throw last;
}
async function batched(ids,props){
 const out={};
 for(let i=0;i<ids.length;i+=50){
  const batch=ids.slice(i,i+50);
  const url=`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=${props}&ids=${encodeURIComponent(batch.join('|'))}`;
  const data=await fetchJson(url);
  Object.assign(out,data.entities||{});
 }
 return out;
}

const rows=parseCsv(fs.readFileSync(INVENTORY,'utf8').replace(/^\uFEFF/,''));
const header=hmap(rows.shift()||[]);const ni=header['Canonical answer'],qi=header['Wikidata QID'];
if(ni==null||qi==null)throw new Error('Inventory missing Canonical answer or Wikidata QID');
const targets=rows.filter(r=>/^Q\d+$/.test(String(r[qi]||''))).map(r=>({name:String(r[ni]).trim(),qid:String(r[qi]).trim()}));
const qids=[...new Set(targets.map(x=>x.qid))];
const entities=await batched(qids,'claims');
const referenced=new Set();
for(const e of Object.values(entities)){
 for(const prop of Object.keys(PROPS))for(const claim of e?.claims?.[prop]||[]){
  const v=claim?.mainsnak?.datavalue?.value;
  if(v&&typeof v==='object'&&/^Q\d+$/.test(v.id||''))referenced.add(v.id);
 }
}
const labels={};
const refs=[...referenced];
for(let i=0;i<refs.length;i+=50){
 const batch=refs.slice(i,i+50);
 const url=`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels&ids=${encodeURIComponent(batch.join('|'))}`;
 let data;try{data=await fetchJson(url);}catch{continue;}
 for(const [qid,e] of Object.entries(data.entities||{}))labels[qid]=e?.labels?.en?.value||qid;
}

const records=[];let items=0;
for(const t of targets){
 const e=entities[t.qid];if(!e?.claims)continue;
 const evidence=[];
 for(const [prop,label] of Object.entries(PROPS)){
  for(const claim of (e.claims[prop]||[]).slice(0,8)){
   const v=claim?.mainsnak?.datavalue?.value;let value='';
   if(v&&typeof v==='object'&&v.id)value=labels[v.id]||v.id;
   else if(typeof v==='string')value=v.slice(0,100);
   else if(v&&typeof v==='object'&&v.amount)value=String(v.amount);
   if(!value||/^Q\d+$/.test(value))continue;
   evidence.push({source:'Wikidata labelled',type:label,trait:`${label}:${value}`});items++;
  }
 }
 if(evidence.length)records.push({concept:t.name,evidence});
}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(records));
console.log(JSON.stringify({inventoryQids:qids.length,referencedQids:refs.length,matchedConcepts:records.length,evidenceItems:items,output:OUT},null,2));
