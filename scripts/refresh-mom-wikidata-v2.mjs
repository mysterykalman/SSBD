import {readFile, writeFile} from "node:fs/promises";
import vm from "node:vm";

const OUT=new URL("../src/client/mom-mode/knowledge.generated.js",import.meta.url);
const REPORT=new URL("../docs/mom-mode-knowledge-report.md",import.meta.url);
const endpoint="https://query.wikidata.org/sparql";
const userAgent="SSBD-MomMode/1.1 (knowledge refresh for mysterykalman/SSBD)";
const arg=(name,fallback)=>{const hit=process.argv.find(v=>v.startsWith(`--${name}=`));return hit?Number(hit.split("=")[1]):fallback;};
const PEOPLE_LIMIT=arg("people",4000), FICTION_LIMIT=arg("fictional",500), PLACES_LIMIT=arg("places",700);
const slug=s=>String(s||"").normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80);
const title=s=>String(s||"").trim().replace(/\s+/g," ");
const year=v=>{const m=/^([+-]?\d{1,6})-/.exec(String(v||""));return m?Number(m[1]):null;};
const list=v=>[...new Set(String(v||"").split("|").map(title).filter(Boolean))];
const article=w=>/^[aeiou]/i.test(w)?"an":"a";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n));

const prefixes=`PREFIX wd: <http://www.wikidata.org/entity/>\nPREFIX wdt: <http://www.wikidata.org/prop/direct/>\nPREFIX wikibase: <http://wikiba.se/ontology#>\nPREFIX schema: <http://schema.org/>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nPREFIX bd: <http://www.bigdata.com/rdf#>\n`;

async function sparql(query,label,{attempts=3}={}){
 let last;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8",accept:"application/sparql-results+json","user-agent":userAgent},body:new URLSearchParams({query,format:"json"})});
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   return (await response.json()).results?.bindings||[];
  }catch(error){last=error;if(attempt<attempts)await sleep(700*attempt);}
 }
 throw last;
}

function loadSeed(source){
 const sandbox={globalThis:null};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const data=sandbox.MOM_GENERATED_KNOWLEDGE||{FEATURES:[],OBJECTS:[]};
 return{features:(data.FEATURES||[]).filter(f=>!String(f.id).startsWith("wd_")),objects:(data.OBJECTS||[]).filter(o=>o.source==="curated-seed")};
}
const current=await readFile(OUT,"utf8");
const seed=loadSeed(current);
const features=new Map(seed.features.map(f=>[f.id,f]));
const objects=new Map(seed.objects.map(o=>[o.name.toLocaleLowerCase("en"),o]));
const feature=(id,q,group,requires)=>({id,q,label:id,group,...(requires?{requires}:{})});
const addFeature=(id,q,group,requires)=>{if(id&&!features.has(id))features.set(id,feature(id,q,group,requires));};
const addObject=o=>{const k=o.name.toLocaleLowerCase("en");if(!objects.has(k))objects.set(k,o);};
const mildWeight=n=>Number((1+Math.min(1.35,Math.log10(Math.max(1,Number(n)||1)+1)/2)).toFixed(3));
const entityValues=rows=>rows.map(r=>`<${r.entity.value}>`).join(" ");

async function peopleIndex(limit){
 // Avoid the expensive GROUP BY + ORDER BY that caused WDQS 504s. The curated seed
 // already contains household-name people; this query adds a broad pool of notable people.
 return sparql(prefixes+`SELECT DISTINCT ?entity ?sitelinks WHERE {\n ?entity wdt:P31 wd:Q5; wikibase:sitelinks ?sitelinks.\n ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>.\n FILTER(?sitelinks >= 35)\n}\nLIMIT ${Math.max(1,Math.floor(limit))}`,"people index");
}
async function peopleDetails(indexRows){
 const out=[];
 for(const [i,batch] of chunks(indexRows,80).entries()){
  const q=prefixes+`SELECT ?entity ?entityLabel ?birth ?death ?genderLabel ?sitelinks\n (GROUP_CONCAT(DISTINCT ?countryLabel;separator="|") AS ?countries)\n (GROUP_CONCAT(DISTINCT ?occupationLabel;separator="|") AS ?occupations)\nWHERE {\n VALUES ?entity { ${entityValues(batch)} }\n ?entity wikibase:sitelinks ?sitelinks.\n OPTIONAL { ?entity wdt:P569 ?birth. }\n OPTIONAL { ?entity wdt:P570 ?death. }\n OPTIONAL { ?entity wdt:P21 ?gender. ?gender rdfs:label ?genderLabel. FILTER(LANG(?genderLabel)="en") }\n OPTIONAL { ?entity wdt:P27 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="en") }\n OPTIONAL { ?entity wdt:P106 ?occupation. ?occupation rdfs:label ?occupationLabel. FILTER(LANG(?occupationLabel)="en") }\n SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. }\n}\nGROUP BY ?entity ?entityLabel ?birth ?death ?genderLabel ?sitelinks`;
  out.push(...await sparql(q,`people details ${i+1}/${Math.ceil(indexRows.length/80)}`));
  await sleep(90);
 }
 return out;
}
async function optionalFiction(limit){
 if(limit<=0)return[];
 try{return await sparql(prefixes+`SELECT ?entity ?entityLabel ?genderLabel ?sitelinks\n (GROUP_CONCAT(DISTINCT ?universeLabel;separator="|") AS ?universes)\nWHERE {\n ?entity wdt:P31/wdt:P279* wd:Q95074; wikibase:sitelinks ?sitelinks.\n ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>. FILTER(?sitelinks >= 25)\n OPTIONAL { ?entity wdt:P21 ?gender. ?gender rdfs:label ?genderLabel. FILTER(LANG(?genderLabel)="en") }\n OPTIONAL { ?entity wdt:P1080 ?universe. ?universe rdfs:label ?universeLabel. FILTER(LANG(?universeLabel)="en") }\n SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. }\n}\nGROUP BY ?entity ?entityLabel ?genderLabel ?sitelinks\nLIMIT ${Math.floor(limit)}`,"fictional characters",{attempts:1});}catch(error){console.warn(`Optional fiction refresh skipped: ${error}`);return[];}
}
async function optionalPlaces(limit){
 if(limit<=0)return[];
 try{return await sparql(prefixes+`SELECT ?entity ?entityLabel ?rootLabel ?sitelinks\n (GROUP_CONCAT(DISTINCT ?countryLabel;separator="|") AS ?countries)\nWHERE {\n VALUES ?root { wd:Q515 wd:Q8502 wd:Q41176 wd:Q570116 }\n ?entity wdt:P31/wdt:P279* ?root; wikibase:sitelinks ?sitelinks.\n ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>. FILTER(?sitelinks >= 30)\n OPTIONAL { ?entity wdt:P17 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="en") }\n SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. ?root rdfs:label ?rootLabel. }\n}\nGROUP BY ?entity ?entityLabel ?rootLabel ?sitelinks\nLIMIT ${Math.floor(limit)}`,"places",{attempts:1});}catch(error){console.warn(`Optional places refresh skipped: ${error}`);return[];}
}

const indexRows=await peopleIndex(PEOPLE_LIMIT);
if(indexRows.length<Math.min(300,PEOPLE_LIMIT))throw new Error(`Wikidata returned only ${indexRows.length} people; refusing to replace the generated snapshot.`);
const peopleRows=await peopleDetails(indexRows);
const people=new Map();
for(const b of peopleRows){
 const id=String(b.entity?.value||"").split("/").pop(),name=title(b.entityLabel?.value);if(!id||!name||/^Q\d+$/.test(name))continue;
 const rec=people.get(id)||{id,name,birth:null,death:null,gender:"",countries:new Set(),occupations:new Set(),sitelinks:0};
 rec.name=name;rec.birth=rec.birth??year(b.birth?.value);rec.death=rec.death??year(b.death?.value);rec.gender=title(b.genderLabel?.value)||rec.gender;
 for(const x of list(b.countries?.value))rec.countries.add(x);for(const x of list(b.occupations?.value))rec.occupations.add(x);
 rec.sitelinks=Math.max(rec.sitelinks,Number(b.sitelinks?.value)||0);people.set(id,rec);
}
const occupationCounts=new Map(),countryCounts=new Map();
for(const p of people.values()){for(const x of p.occupations)occupationCounts.set(x,(occupationCounts.get(x)||0)+1);for(const x of p.countries)countryCounts.set(x,(countryCounts.get(x)||0)+1);}
const domains=[["music",/\b(singer|musician|composer|rapper|songwriter|record producer|conductor|dj)\b/i,"making music"],["acting",/\b(actor|actress|film actor|television actor|voice actor|comedian)\b/i,"acting or comedy"],["sports",/\b(footballer|soccer|basketball|hockey|tennis|athlete|swimmer|boxer|golfer|racing driver|baseball|cricketer|gymnast)\b/i,"sports"],["science",/\b(scientist|physicist|chemist|biologist|astronomer|mathematician|researcher|engineer|computer scientist)\b/i,"science or engineering"],["writing",/\b(writer|author|novelist|poet|journalist|screenwriter|playwright)\b/i,"writing"],["politics",/\b(politician|president|prime minister|statesman|monarch|king|queen|diplomat)\b/i,"politics, government, or royalty"],["business",/\b(businessperson|entrepreneur|executive|investor|industrialist)\b/i,"business"],["media",/\b(television presenter|broadcaster|media personality|YouTuber|internet celebrity)\b/i,"television or online media"]];
for(const [id,,label] of domains)addFeature(`wd_domain_${id}`,`Are they especially known for ${label}?`,"person","specificPerson");
const birthSplits=Array.from({length:43},(_,i)=>1800+i*5);
for(const p of people.values()){
 const yes=["person","specificPerson"];
 if(p.death==null)yes.push("alive");if(/^male$/i.test(p.gender))yes.push("personMan");if(/^female$/i.test(p.gender))yes.push("personWoman");
 if(p.birth!=null){for(const y of birthSplits)if(p.birth<y)yes.push(`bornBefore_${y}`);for(const y of [1950,1980,2000])if(p.birth>y)yes.push(`bornAfter_${y}`);if(p.birth>=0){const d=Math.floor(p.birth/10)*10,tag=`wd_born_decade_${d}`;addFeature(tag,`Were they born in the ${d}s?`,"person","specificPerson");yes.push(tag);}}
 const occupationText=[...p.occupations].join(" | ");for(const [id,re] of domains)if(re.test(occupationText))yes.push(`wd_domain_${id}`);
 for(const country of p.countries){if((countryCounts.get(country)||0)<4)continue;const tag=`wd_person_country_${slug(country)}`;addFeature(tag,`Are they strongly associated with ${country}?`,"person","specificPerson");yes.push(tag);}
 for(const occupation of p.occupations){if((occupationCounts.get(occupation)||0)<8||occupation.length>45)continue;const tag=`wd_occupation_${slug(occupation)}`;addFeature(tag,`Are they known as ${article(occupation)} ${occupation}?`,"person","specificPerson");yes.push(tag);}
 addObject({name:p.name,kind:"person",proper:true,specificPerson:true,qid:p.id,source:"wikidata",yes:[...new Set(yes)],maybe:[],weight:mildWeight(p.sitelinks)});
}

// These two categories are useful enrichment but never block a healthy people refresh.
const fictionRows=await optionalFiction(FICTION_LIMIT);
addFeature("wd_fiction_man","Is the character male?","fictional","fictional");addFeature("wd_fiction_woman","Is the character female?","fictional","fictional");
for(const b of fictionRows){const name=title(b.entityLabel?.value),id=String(b.entity?.value||"").split("/").pop();if(!name||!id||/^Q\d+$/.test(name))continue;const yes=["fictional"];if(/^male$/i.test(title(b.genderLabel?.value)))yes.push("wd_fiction_man");if(/^female$/i.test(title(b.genderLabel?.value)))yes.push("wd_fiction_woman");for(const u of list(b.universes?.value)){const tag=`wd_universe_${slug(u)}`;addFeature(tag,`Is the character from ${u}?`,"fictional","fictional");yes.push(tag);}addObject({name,kind:"fictional",proper:true,qid:id,source:"wikidata",yes:[...new Set(yes)],maybe:[],weight:mildWeight(b.sitelinks?.value)});}
const placeRows=await optionalPlaces(PLACES_LIMIT);
for(const b of placeRows){const name=title(b.entityLabel?.value),id=String(b.entity?.value||"").split("/").pop();if(!name||!id||/^Q\d+$/.test(name))continue;const yes=["place"];for(const c of list(b.countries?.value)){const tag=`wd_place_country_${slug(c)}`;addFeature(tag,`Is it in ${c}?`,"place","place");yes.push(tag);}const root=title(b.rootLabel?.value);if(root){const tag=`wd_place_root_${slug(root)}`;addFeature(tag,`Is it ${article(root)} ${root}?`,"place","place");yes.push(tag);}addObject({name,kind:"place",proper:true,qid:id,source:"wikidata",yes:[...new Set(yes)],maybe:[],weight:mildWeight(b.sitelinks?.value)});}

const out={meta:{source:"curated seed + Wikidata",generatedAt:new Date().toISOString(),license:"Wikidata structured data is CC0; curated seed is original project data",seedObjects:seed.objects.length,wikidataPeople:people.size,wikidataFictional:fictionRows.length,wikidataPlaces:placeRows.length},FEATURES:[...features.values()],OBJECTS:[...objects.values()]};
await writeFile(OUT,`(function(global){\n"use strict";\nglobal.MOM_GENERATED_KNOWLEDGE=${JSON.stringify(out)};\n})(typeof window!=="undefined"?window:globalThis);\n`);
await writeFile(REPORT,`# Mom Mode knowledge snapshot\n\nGenerated: ${out.meta.generatedAt}\n\n- Curated seed concepts: ${out.meta.seedObjects}\n- Wikidata people: ${out.meta.wikidataPeople}\n- Wikidata fictional characters: ${out.meta.wikidataFictional}\n- Wikidata places/landmarks: ${out.meta.wikidataPlaces}\n- Generated concepts total: ${out.OBJECTS.length}\n- Generated question traits: ${out.FEATURES.length}\n\nWikidata structured data is published under CC0. Gameplay reads this generated local snapshot and does not query Wikimedia during a round.\n`);
console.log(`Mom Mode knowledge: ${out.OBJECTS.length} generated concepts, ${out.FEATURES.length} generated traits (${people.size} Wikidata people).`);
