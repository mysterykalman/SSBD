import {mkdir,readFile,writeFile} from "node:fs/promises";
import vm from "node:vm";

const TARGET=50000;
const ENRICH_LIMIT=5000;
const OUT_DIR=new URL("../.dev-data/mom-50k/",import.meta.url);
const VITAL_SOURCE="https://raw.githubusercontent.com/GeogSage/Wiki_Vital/main/Vitallist_AllLevels_15June2025_Full.csv";
const wikidataApi="https://www.wikidata.org/w/api.php";
const userAgent="SSBD-MomMode/4.0 (50k knowledge inventory for mysterykalman/SSBD)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||"").trim().toLocaleLowerCase("en").replace(/\s+/g," ");
const csvCell=v=>{const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
const toCsv=rows=>rows.map(row=>row.map(csvCell).join(",")).join("\n")+"\n";
const wikiUrl=title=>`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ","_"))}`;

function parseCsv(text){
 const rows=[];let row=[];let cell="";let quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}
   else if(ch==='"')quoted=false;
   else cell+=ch;
   continue;
  }
  if(ch==='"'){quoted=true;continue;}
  if(ch===','){row.push(cell);cell="";continue;}
  if(ch==='\n'){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell="";continue;}
  cell+=ch;
 }
 if(cell||row.length){row.push(cell.replace(/\r$/,""));rows.push(row);}
 return rows;
}

async function fetchVitalDataset(){
 const response=await fetch(VITAL_SOURCE,{headers:{"user-agent":userAgent}});
 if(!response.ok)throw new Error(`Vital source HTTP ${response.status}`);
 const bytes=new Uint8Array(await response.arrayBuffer());
 const text=new TextDecoder("utf-8",{fatal:false}).decode(bytes);
 const parsed=parseCsv(text);
 const headers=parsed.shift();
 const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
 for(const required of ["Article","Vital_Level","Vital_Category","Qid"]){if(index[required]===undefined)throw new Error(`Vital source missing ${required}`);}
 const seen=new Set();const rows=[];
 for(const record of parsed){
  const title=String(record[index.Article]||"").trim();
  if(!title)continue;
  const key=norm(title);if(seen.has(key))continue;seen.add(key);
  rows.push({
   title,
   source:"wikipedia-vital-articles",
   vitalLevel:String(record[index.Vital_Level]||"").trim(),
   vitalCategory:String(record[index.Vital_Category]||"").trim(),
   qid:String(record[index.Qid]||"").trim()
  });
 }
 console.log(`Vital source: ${parsed.length} records, ${rows.length} unique articles`);
 return rows;
}

function loadObjects(path,globalName){
 return readFile(new URL(path,import.meta.url),"utf8").then(source=>{
  const sandbox={globalThis:null};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return sandbox[globalName]?.OBJECTS||[];
 }).catch(()=>[]);
}

async function topUpToTarget(rows){
 const seen=new Set(rows.map(r=>norm(r.title)));
 const sources=[
  ...(await loadObjects("../src/client/mom-mode/knowledge.general.js","MOM_GENERAL_KNOWLEDGE")),
  ...(await loadObjects("../src/client/mom-mode/knowledge.js","MOM_KNOWLEDGE")),
  ...(await loadObjects("../src/client/mom-mode/knowledge.generated.js","MOM_GENERATED_KNOWLEDGE"))
 ];
 let added=0;
 for(const obj of sources){
  const title=String(obj.name||"").trim();
  if(!title||seen.has(norm(title)))continue;
  seen.add(norm(title));
  rows.push({title,source:"pam-existing",vitalLevel:"",vitalCategory:String(obj.category||obj.type||"Pam existing knowledge"),qid:String(obj.wikidata_id||obj.wikidataId||obj.qid||"")});
  added++;
  if(rows.length>=TARGET)break;
 }
 console.log(`Pam top-up: ${added}`);
 return rows.slice(0,TARGET);
}

async function getJson(url,label,{attempts=8}={}){
 let last;
 for(let i=1;i<=attempts;i++){
  try{
   const response=await fetch(url,{headers:{"user-agent":userAgent,accept:"application/json"}});
   if(response.status===429){const wait=Number(response.headers.get("retry-after"))||Math.min(20,2*i);console.log(`${label}: 429, waiting ${wait}s`);await sleep(wait*1000);continue;}
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   return response.json();
  }catch(error){last=error;if(i<attempts)await sleep(Math.min(10000,1000*i));}
 }
 throw last||new Error(`${label}: exhausted retries`);
}

async function enrichBatch(rows){
 const byQid=new Map();
 for(let i=0;i<rows.length;i+=50){
  const batch=rows.slice(i,i+50);
  const ids=[...new Set(batch.map(r=>r.qid).filter(q=>/^Q\d+$/.test(q)))];
  if(ids.length){
   const p=new URLSearchParams({action:"wbgetentities",format:"json",formatversion:"2",ids:ids.join("|"),props:"labels|aliases|descriptions",languages:"en",languagefallback:"1"});
   const json=await getJson(`${wikidataApi}?${p}`,`Wikidata batch ${i/50+1}`);
   for(const entity of Object.values(json.entities||{}))byQid.set(entity.id,{description:entity.descriptions?.en?.value||"",aliases:(entity.aliases?.en||[]).map(a=>a.value).filter(Boolean)});
  }
  if((i/50+1)%10===0||i===0)console.log(`Enriched ${Math.min(i+50,rows.length)}/${rows.length}`);
  await sleep(180);
 }
 return byQid;
}

function broadCategory(vitalCategory,description){
 const c=String(vitalCategory||"").toLowerCase();
 if(/writers|artists|entertainers|philosophers, historians|religious figures|politicians|military personnel|scientists, inventors|sports figures|miscellaneous/.test(c))return "People";
 if(/geography|countries|cities/.test(c))return "Places & geography";
 if(/arts|culture/.test(c))return "Arts & culture";
 if(/animals|biology|health|plants/.test(c))return "Biology & health";
 if(/basics and measurement|astronomy|chemistry|earth science|physics|mathematics/.test(c))return "Science & mathematics";
 if(/technology/.test(c))return "Technology & objects";
 if(/history|social studies|politics and economics|philosophy and religion/.test(c))return "History & society";
 if(/everyday life|sports, games/.test(c))return "Everyday life";
 const s=String(description||"").toLowerCase();
 if(/human|person|actor|writer|politician|artist|athlete/.test(s))return "People";
 return "Other / needs classification";
}

function seedTraits(vitalCategory,broad){
 const traits=new Set([broad.toLowerCase().replaceAll(" & ","/")]);
 const c=String(vitalCategory||"").toLowerCase();
 if(broad==="People")traits.add("person");
 if(broad==="Technology & objects"||broad==="Arts & culture")traits.add("man-made");
 if(/animals/.test(c))traits.add("animal");
 if(/plants/.test(c))traits.add("plant/fungus");
 if(/health/.test(c))traits.add("health/medicine");
 if(/astronomy/.test(c))traits.add("space/astronomy");
 if(/sports/.test(c))traits.add("sport/recreation");
 if(/history/.test(c))traits.add("history");
 return [...traits].filter(Boolean).join(" | ");
}

await mkdir(OUT_DIR,{recursive:true});
const vital=await fetchVitalDataset();
const vitalUnique=vital.length;
const inventory=await topUpToTarget(vital);
if(inventory.length!==TARGET)throw new Error(`Expected ${TARGET} rows, got ${inventory.length}`);
const unique=new Set(inventory.map(r=>norm(r.title)));
if(unique.size!==TARGET)throw new Error(`Expected ${TARGET} unique titles, got ${unique.size}`);

const enrichRows=inventory.slice(0,ENRICH_LIMIT);
const enrichment=await enrichBatch(enrichRows);
const rows=inventory.map((r,index)=>{
 const e=enrichment.get(r.qid);
 const broad=broadCategory(r.vitalCategory,e?.description);
 const inBatch=index<ENRICH_LIMIT;
 return {
  rank:index+1,canonical:r.title,source:r.source,vital_level:r.vitalLevel,vital_category:r.vitalCategory,wikipedia_url:r.source==="wikipedia-vital-articles"?wikiUrl(r.title):"",qid:r.qid,
  description:e?.description||"",aliases:e?.aliases?.join(" | ")||"",broad_category:broad,seed_traits:seedTraits(r.vitalCategory,broad),
  enrichment_status:inBatch?(e?"Batch 01 enriched":"Batch 01 partial"):"Candidate only",enrichment_batch:inBatch?1:""
 };
});
const header=["Rank","Canonical answer","Source","Vital level","Vital category","Wikipedia URL","Wikidata QID","Description","Aliases","Broad category","Seed traits","Enrichment status","Enrichment batch"];
const csvRows=[header,...rows.map(r=>[r.rank,r.canonical,r.source,r.vital_level,r.vital_category,r.wikipedia_url,r.qid,r.description,r.aliases,r.broad_category,r.seed_traits,r.enrichment_status,r.enrichment_batch])];
await writeFile(new URL("inventory.csv",OUT_DIR),toCsv(csvRows));
await writeFile(new URL("enriched-batch-01.csv",OUT_DIR),toCsv([header,...csvRows.slice(1,ENRICH_LIMIT+1)]));
const categoryCounts={};const sourceCounts={};const levelCounts={};
for(const r of rows){categoryCounts[r.vital_category]=(categoryCounts[r.vital_category]||0)+1;sourceCounts[r.source]=(sourceCounts[r.source]||0)+1;levelCounts[r.vital_level||"Pam top-up"]=(levelCounts[r.vital_level||"Pam top-up"]||0)+1;}
const summary={generatedAt:new Date().toISOString(),target:TARGET,uniqueConcepts:unique.size,vitalSourceUnique:vitalUnique,paddedFromPam:TARGET-Math.min(vitalUnique,TARGET),enrichmentTarget:ENRICH_LIMIT,enrichedBatch01:rows.filter(r=>r.enrichment_status==="Batch 01 enriched").length,partialBatch01:rows.filter(r=>r.enrichment_status==="Batch 01 partial").length,sourceCounts,levelCounts,categoryCounts,sourceUrl:VITAL_SOURCE};
await writeFile(new URL("summary.json",OUT_DIR),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
