import {mkdir,readFile,writeFile} from "node:fs/promises";
import vm from "node:vm";

const TARGET=50000;
const ENRICH_LIMIT=5000;
const OUT_DIR=new URL("../.dev-data/mom-50k/",import.meta.url);
const wikiApi="https://en.wikipedia.org/w/api.php";
const wikidataApi="https://www.wikidata.org/w/api.php";
const userAgent="SSBD-MomMode/3.3 (50k inventory builder for mysterykalman/SSBD)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||"").trim().toLocaleLowerCase("en").replace(/\s+/g," ");
const csvCell=v=>{const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
const toCsv=rows=>rows.map(row=>row.map(csvCell).join(",")).join("\n")+"\n";
const wikiUrl=title=>`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ","_"))}`;

const LEVEL5=[
 ["People / Writers and journalists",2000,"People/Writers_and_journalists"],
 ["People / Artists, musicians and composers",2200,"People/Artists,_musicians,_and_composers"],
 ["People / Entertainers, directors, producers and screenwriters",2200,"People/Entertainers,_directors,_producers,_and_screenwriters"],
 ["People / Philosophers, historians, political and social scientists",1400,"People/Philosophers,_historians,_political_and_social_scientists"],
 ["People / Religious figures",500,"People/Religious_figures"],
 ["People / Politicians and leaders",2400,"People/Politicians_and_leaders"],
 ["People / Military personnel, revolutionaries and activists",900,"People/Military_personnel,_revolutionaries,_and_activists"],
 ["People / Scientists, inventors and mathematicians",1300,"People/Scientists,_inventors,_and_mathematicians"],
 ["People / Sports figures",1100,"People/Sports_figures"],
 ["People / Miscellaneous",1100,"People/Miscellaneous"],
 ["History",3300,"History"],
 ["Geography / Physical",1900,"Geography/Physical"],
 ["Geography / Countries and subdivisions",1300,"Geography/Countries"],
 ["Geography / Cities",2000,"Geography/Cities"],
 ["Arts",3700,"Arts"],
 ["Philosophy and religion",1400,"Philosophy_and_religion"],
 ["Everyday life",1300,"Everyday_life"],
 ["Sports, games and recreation",1200,"Everyday_life/Sports,_games_and_recreation"],
 ["Society / Social studies",500,"Society_and_social_sciences/Social_studies"],
 ["Society / Politics and economics",1900,"Society_and_social_sciences/Politics_and_economics"],
 ["Society / Culture",1600,"Society_and_social_sciences/Culture"],
 ["Biology / Animals",2400,"Biology_and_health_sciences/Animals"],
 ["Biology / Biology, biochemistry, anatomy and physiology",1100,"Biology_and_health_sciences/Biology"],
 ["Biology / Health, medicine and disease",1100,"Biology_and_health_sciences/Health"],
 ["Biology / Plants, fungi and other organisms",1000,"Biology_and_health_sciences/Plants"],
 ["Physical sciences / Basics and measurement",300,"Physical_sciences/Basics_and_measurement"],
 ["Physical sciences / Astronomy",900,"Physical_sciences/Astronomy"],
 ["Physical sciences / Chemistry",1200,"Physical_sciences/Chemistry"],
 ["Physical sciences / Earth science",1200,"Physical_sciences/Earth_science"],
 ["Physical sciences / Physics",1200,"Physical_sciences/Physics"],
 ["Technology",3200,"Technology"],
 ["Mathematics",1200,"Mathematics"]
];

if(LEVEL5.reduce((sum,[,quota])=>sum+quota,0)!==TARGET)throw new Error("Level 5 quotas must total 50,000");

async function getJson(url,label,{attempts=8}={}){
 let last;
 for(let i=1;i<=attempts;i++){
  try{
   const response=await fetch(url,{headers:{"user-agent":userAgent,accept:"application/json"}});
   if(response.status===429){
    const retrySeconds=Number(response.headers.get("retry-after"))||Math.min(20,2*i);
    console.log(`${label}: rate limited; waiting ${retrySeconds}s`);
    await sleep(retrySeconds*1000);
    continue;
   }
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   return response.json();
  }catch(error){last=error;if(i<attempts)await sleep(Math.min(10000,1000*i));}
 }
 throw last||new Error(`${label}: exhausted retries`);
}

async function fetchVitalTitles(){
 const rows=[];
 const seen=new Set();
 for(let i=0;i<LEVEL5.length;i++){
  const [section,quota,path]=LEVEL5[i];
  const page=`Wikipedia:Vital_articles/Level/5/${path}`;
  const p=new URLSearchParams({action:"parse",format:"json",formatversion:"2",page,prop:"links",redirects:"1"});
  const json=await getJson(`${wikiApi}?${p}`,`vital page ${section}`);
  const links=(json.parse?.links||[]).filter(link=>link.ns===0&&link.title);
  let accepted=0;
  for(const link of links){
   const key=norm(link.title);
   if(seen.has(key))continue;
   seen.add(key);
   rows.push({title:link.title,source:"wikipedia-vital-5",section,sectionQuota:quota,page});
   accepted++;
   if(accepted>=quota)break;
  }
  console.log(`${i+1}/${LEVEL5.length} ${section}: ${accepted}/${quota}; total unique ${rows.length}`);
  await sleep(300);
 }
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
  rows.push({title,source:"pam-existing",section:"Pam existing knowledge",sectionQuota:"",page:""});
  if(rows.length>=TARGET)break;
 }
 return rows.slice(0,TARGET);
}

async function enrichTitles(titles){
 const result=new Map();
 for(let i=0;i<titles.length;i+=50){
  const batch=titles.slice(i,i+50);
  const p=new URLSearchParams({action:"wbgetentities",format:"json",formatversion:"2",sites:"enwiki",titles:batch.join("|"),props:"sitelinks|labels|aliases|descriptions",languages:"en",languagefallback:"1",sitefilter:"enwiki"});
  const json=await getJson(`${wikidataApi}?${p}`,`wikidata enrichment ${i/50+1}`);
  for(const entity of Object.values(json.entities||{})){
   const title=entity.sitelinks?.enwiki?.title||entity.labels?.en?.value||"";
   if(!title)continue;
   result.set(norm(title),{qid:entity.id||"",description:entity.descriptions?.en?.value||"",aliases:(entity.aliases?.en||[]).map(a=>a.value).filter(Boolean)});
  }
  if((i/50+1)%10===0||i===0)console.log(`Enriched ${Math.min(i+50,titles.length)}/${titles.length}`);
  await sleep(180);
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
const inventory=await padToTarget(vital);
if(inventory.length!==TARGET)throw new Error(`Expected ${TARGET} rows, got ${inventory.length}. Vital source produced ${vital.length}.`);
const unique=new Set(inventory.map(r=>norm(r.title)));
if(unique.size!==TARGET)throw new Error(`Expected ${TARGET} unique titles, got ${unique.size}`);

const enrichMap=await enrichTitles(inventory.slice(0,ENRICH_LIMIT).map(r=>r.title));
const rows=inventory.map((r,index)=>{
 const e=enrichMap.get(norm(r.title));
 return {rank:index+1,canonical:r.title,source:r.source,section:r.section,wikipedia_url:r.source==="wikipedia-vital-5"?wikiUrl(r.title):"",qid:e?.qid||"",description:e?.description||"",aliases:e?.aliases?.join(" | ")||"",broad_category:e?broadCategory(e.description,r.title):"",enrichment_status:e?"Batch 01 enriched":"Candidate only",enrichment_batch:e?1:""};
});
const header=["Rank","Canonical answer","Source","Vital section","Wikipedia URL","Wikidata QID","Description","Aliases","Broad category","Enrichment status","Enrichment batch"];
const csvRows=[header,...rows.map(r=>[r.rank,r.canonical,r.source,r.section,r.wikipedia_url,r.qid,r.description,r.aliases,r.broad_category,r.enrichment_status,r.enrichment_batch])];
await writeFile(new URL("inventory.csv",OUT_DIR),toCsv(csvRows));
await writeFile(new URL("enriched-batch-01.csv",OUT_DIR),toCsv([header,...csvRows.slice(1,ENRICH_LIMIT+1)]));
const categoryCounts={};
const sectionCounts={};
for(const r of rows){sectionCounts[r.section]=(sectionCounts[r.section]||0)+1;}
for(const r of rows.slice(0,ENRICH_LIMIT))categoryCounts[r.broad_category]=(categoryCounts[r.broad_category]||0)+1;
const summary={generatedAt:new Date().toISOString(),target:TARGET,uniqueConcepts:unique.size,wikipediaVital5:vital.length,paddedFromPam:TARGET-Math.min(vital.length,TARGET),enrichedBatch01:rows.filter(r=>r.enrichment_status==="Batch 01 enriched").length,enrichmentTarget:ENRICH_LIMIT,sectionCounts,categoryCounts};
await writeFile(new URL("summary.json",OUT_DIR),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
