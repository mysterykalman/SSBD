import {mkdir,readFile,writeFile} from "node:fs/promises";
import vm from "node:vm";

const TARGET=50000;
const ENRICH_LIMIT=5000;
const OUT_DIR=new URL("../.dev-data/mom-50k/",import.meta.url);
const CATEGORY="Category:Wikipedia level-5 vital articles";
const wikiApi="https://en.wikipedia.org/w/api.php";
const wikidataApi="https://www.wikidata.org/w/api.php";
const userAgent="SSBD-MomMode/3.0 (50k inventory builder for mysterykalman/SSBD)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||"").trim().toLocaleLowerCase("en").replace(/\s+/g," ");
const csvCell=v=>{const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
const toCsv=rows=>rows.map(row=>row.map(csvCell).join(",")).join("\n")+"\n";
const wikiUrl=title=>`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ","_"))}`;

async function getJson(url,label,{attempts=5}={}){
 let last;
 for(let i=1;i<=attempts;i++){
  try{
   const response=await fetch(url,{headers:{"user-agent":userAgent,accept:"application/json"}});
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   return response.json();
  }catch(error){last=error;if(i<attempts)await sleep(750*i);}
 }
 throw last;
}

async function fetchVitalTitles(){
 const rows=[];
 let cont="";
 do{
  const p=new URLSearchParams({action:"query",format:"json",formatversion:"2",list:"categorymembers",cmtitle:CATEGORY,cmnamespace:"0",cmlimit:"500",cmprop:"ids|title|sortkeyprefix"});
  if(cont)p.set("cmcontinue",cont);
  const json=await getJson(`${wikiApi}?${p}`,"vital articles");
  rows.push(...(json.query?.categorymembers||[]));
  cont=json.continue?.cmcontinue||"";
  console.log(`Vital articles fetched: ${rows.length}`);
  if(cont)await sleep(75);
 }while(cont);
 return rows;
}

function loadObjects(path,globalName){
 return readFile(new URL(path,import.meta.url),"utf8").then(source=>{
  const sandbox={globalThis:null};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return sandbox[globalName]?.OBJECTS||[];
 }).catch(()=>[]);
}

async function padToTarget(rows){
 const seen=new Set(rows.map(r=>norm(r.title)));
 const sources=[
  ...(await loadObjects("../src/client/mom-mode/knowledge.general.js","MOM_GENERAL_KNOWLEDGE")),
  ...(await loadObjects("../src/client/mom-mode/knowledge.js","MOM_KNOWLEDGE")),
  ...(await loadObjects("../src/client/mom-mode/knowledge.generated.js","MOM_GENERATED_KNOWLEDGE"))
 ];
 for(const obj of sources){
  const title=String(obj.name||"").trim();
  if(!title||seen.has(norm(title)))continue;
  seen.add(norm(title));
  rows.push({pageid:"",ns:0,title,sortkeyprefix:"",source:"pam-existing"});
  if(rows.length>=TARGET)break;
 }
 return rows.slice(0,TARGET);
}

async function enrichTitles(titles){
 const result=new Map();
 for(let i=0;i<titles.length;i+=50){
  const batch=titles.slice(i,i+50);
  const p=new URLSearchParams({action:"wbgetentities",format:"json",formatversion:"2",sites:"enwiki",titles:batch.join("|"),props:"labels|aliases|descriptions",languages:"en",languagefallback:"1"});
  const json=await getJson(`${wikidataApi}?${p}`,`wikidata enrichment ${i/50+1}`);
  for(const entity of Object.values(json.entities||{})){
   const title=entity.sitelinks?.enwiki?.title || entity.labels?.en?.value || "";
   if(!title)continue;
   result.set(norm(title),{
    qid:entity.id||"",
    description:entity.descriptions?.en?.value||"",
    aliases:(entity.aliases?.en||[]).map(a=>a.value).filter(Boolean)
   });
  }
  console.log(`Enriched ${Math.min(i+50,titles.length)}/${titles.length}`);
  await sleep(80);
 }
 return result;
}

function broadCategory(description,title){
 const s=`${description} ${title}`.toLowerCase();
 const tests=[
  ["People",/\b(actor|actress|singer|politician|writer|author|scientist|artist|composer|athlete|footballer|human|person|journalist|director|philosopher|king|queen|president|chef)\b/],
  ["Places & geography",/\b(city|country|state|province|river|mountain|island|lake|ocean|sea|village|town|region|continent|park|landmark|building|bridge|airport)\b/],
  ["Arts & culture",/\b(film|movie|novel|book|painting|sculpture|song|album|band|television|tv series|play|video game|fictional character|character|artwork|comic)\b/],
  ["Biology & health",/\b(species|animal|plant|bird|mammal|fish|insect|disease|syndrome|medical|medicine|anatomy|organism|bacterium|virus)\b/],
  ["Science & mathematics",/\b(physics|chemistry|astronomy|mathematics|theorem|scientific|particle|element|planet|star|galaxy|phenomenon)\b/],
  ["Technology & objects",/\b(device|technology|computer|software|vehicle|aircraft|car|automobile|camera|tool|machine|invention|product|brand|company|console)\b/],
  ["History & society",/\b(war|battle|revolution|event|empire|dynasty|religion|philosophy|law|economic|society|organization|movement)\b/],
  ["Everyday life",/\b(food|dish|drink|beverage|clothing|furniture|household|sport|game|toy|utensil|container)\b/]
 ];
 return tests.find(([,re])=>re.test(s))?.[0]||"Other / needs classification";
}

await mkdir(OUT_DIR,{recursive:true});
const vital=await fetchVitalTitles();
const inventory=await padToTarget(vital.map(x=>({...x,source:"wikipedia-vital-5"})));
if(inventory.length!==TARGET)throw new Error(`Expected ${TARGET} rows, got ${inventory.length}`);
const unique=new Set(inventory.map(r=>norm(r.title)));
if(unique.size!==TARGET)throw new Error(`Expected ${TARGET} unique titles, got ${unique.size}`);

const enrichMap=await enrichTitles(inventory.slice(0,ENRICH_LIMIT).map(r=>r.title));
const rows=inventory.map((r,index)=>{
 const e=enrichMap.get(norm(r.title));
 return {
  rank:index+1,
  canonical:r.title,
  source:r.source,
  wikipedia_url:r.source==="wikipedia-vital-5"?wikiUrl(r.title):"",
  qid:e?.qid||"",
  description:e?.description||"",
  aliases:e?.aliases?.join(" | ")||"",
  broad_category:e?broadCategory(e.description,r.title):"",
  enrichment_status:e?"Batch 01 enriched":"Candidate only",
  enrichment_batch:e?1:""
 };
});
const header=["Rank","Canonical answer","Source","Wikipedia URL","Wikidata QID","Description","Aliases","Broad category","Enrichment status","Enrichment batch"];
const csvRows=[header,...rows.map(r=>[r.rank,r.canonical,r.source,r.wikipedia_url,r.qid,r.description,r.aliases,r.broad_category,r.enrichment_status,r.enrichment_batch])];
await writeFile(new URL("inventory.csv",OUT_DIR),toCsv(csvRows));
await writeFile(new URL("enriched-batch-01.csv",OUT_DIR),toCsv([header,...csvRows.slice(1,ENRICH_LIMIT+1)]));
const categoryCounts={};
for(const r of rows.slice(0,ENRICH_LIMIT))categoryCounts[r.broad_category]=(categoryCounts[r.broad_category]||0)+1;
const summary={generatedAt:new Date().toISOString(),target:TARGET,uniqueConcepts:unique.size,wikipediaVital5:vital.length,paddedFromPam:TARGET-Math.min(vital.length,TARGET),enrichedBatch01:rows.filter(r=>r.enrichment_status==="Batch 01 enriched").length,enrichmentTarget:ENRICH_LIMIT,categoryCounts};
await writeFile(new URL("summary.json",OUT_DIR),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
