import {readFile, writeFile} from "node:fs/promises";
import vm from "node:vm";

const OUT=new URL("../src/client/mom-mode/knowledge.generated.js",import.meta.url);
const REPORT=new URL("../docs/mom-mode-knowledge-report.md",import.meta.url);
const arg=(name,fallback)=>{const hit=process.argv.find(v=>v.startsWith(`--${name}=`));return hit?Number(hit.split("=")[1]):fallback;};
const PEOPLE_LIMIT=arg("people",5000);
const FICTION_LIMIT=arg("fictional",1500);
const PLACES_LIMIT=arg("places",2500);
const endpoint="https://query.wikidata.org/sparql";
const userAgent="SSBD-MomMode/1.0 (Wikidata knowledge refresh for mysterykalman/SSBD)";
const slug=s=>String(s||"").normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80);
const title=s=>String(s||"").trim().replace(/\s+/g," ");
const year=value=>{const m=/^([+-]?\d{1,6})-/.exec(String(value||""));return m?Number(m[1]):null;};
const list=value=>[...new Set(String(value||"").split("|").map(title).filter(Boolean))];
const article=word=>/^[aeiou]/i.test(word)?"an":"a";

async function sparql(query,label){
 let last;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","accept":"application/sparql-results+json","user-agent":userAgent},body:new URLSearchParams({query,format:"json"})});
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   const data=await response.json();
   return data.results?.bindings||[];
  }catch(error){
   last=error;
   if(attempt<3)await new Promise(r=>setTimeout(r,attempt*1500));
  }
 }
 throw last;
}
const prefixes=`PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`;

async function fetchPeople(limit){
 const q=prefixes+`
SELECT ?entity ?entityLabel ?birth ?death ?genderLabel ?sitelinks
 (GROUP_CONCAT(DISTINCT ?countryLabel;separator="|") AS ?countries)
 (GROUP_CONCAT(DISTINCT ?occupationLabel;separator="|") AS ?occupations)
WHERE {
 ?entity wdt:P31 wd:Q5; wikibase:sitelinks ?sitelinks.
 ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>.
 FILTER(?sitelinks >= 25)
 OPTIONAL { ?entity wdt:P569 ?birth. }
 OPTIONAL { ?entity wdt:P570 ?death. }
 OPTIONAL { ?entity wdt:P21 ?gender. ?gender rdfs:label ?genderLabel. FILTER(LANG(?genderLabel)="en") }
 OPTIONAL { ?entity wdt:P27 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="en") }
 OPTIONAL { ?entity wdt:P106 ?occupation. ?occupation rdfs:label ?occupationLabel. FILTER(LANG(?occupationLabel)="en") }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. }
}
GROUP BY ?entity ?entityLabel ?birth ?death ?genderLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT ${Math.max(1,Math.floor(limit))}`;
 return sparql(q,"people");
}
async function fetchFictional(limit){
 const q=prefixes+`
SELECT ?entity ?entityLabel ?genderLabel ?sitelinks
 (GROUP_CONCAT(DISTINCT ?universeLabel;separator="|") AS ?universes)
 (GROUP_CONCAT(DISTINCT ?typeLabel;separator="|") AS ?types)
WHERE {
 ?entity wdt:P31/wdt:P279* wd:Q95074; wikibase:sitelinks ?sitelinks.
 ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>.
 FILTER(?sitelinks >= 18)
 OPTIONAL { ?entity wdt:P21 ?gender. ?gender rdfs:label ?genderLabel. FILTER(LANG(?genderLabel)="en") }
 OPTIONAL { ?entity wdt:P1080 ?universe. ?universe rdfs:label ?universeLabel. FILTER(LANG(?universeLabel)="en") }
 OPTIONAL { ?entity wdt:P31 ?type. ?type rdfs:label ?typeLabel. FILTER(LANG(?typeLabel)="en") }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. }
}
GROUP BY ?entity ?entityLabel ?genderLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT ${Math.max(1,Math.floor(limit))}`;
 return sparql(q,"fictional characters");
}
async function fetchPlaces(limit){
 const q=prefixes+`
SELECT ?entity ?entityLabel ?root ?rootLabel ?sitelinks
 (GROUP_CONCAT(DISTINCT ?countryLabel;separator="|") AS ?countries)
 (GROUP_CONCAT(DISTINCT ?continentLabel;separator="|") AS ?continents)
 (GROUP_CONCAT(DISTINCT ?typeLabel;separator="|") AS ?types)
WHERE {
 VALUES ?root { wd:Q515 wd:Q6256 wd:Q8502 wd:Q4022 wd:Q41176 wd:Q570116 }
 ?entity wdt:P31/wdt:P279* ?root; wikibase:sitelinks ?sitelinks.
 ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>.
 FILTER(?sitelinks >= 22)
 OPTIONAL { ?entity wdt:P17 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="en") }
 OPTIONAL { ?entity wdt:P30 ?continent. ?continent rdfs:label ?continentLabel. FILTER(LANG(?continentLabel)="en") }
 OPTIONAL { ?entity wdt:P31 ?type. ?type rdfs:label ?typeLabel. FILTER(LANG(?typeLabel)="en") }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. ?root rdfs:label ?rootLabel. }
}
GROUP BY ?entity ?entityLabel ?root ?rootLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT ${Math.max(1,Math.floor(limit))}`;
 return sparql(q,"places");
}

function loadSeed(source){
 const sandbox={globalThis:null};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const data=sandbox.MOM_GENERATED_KNOWLEDGE||{FEATURES:[],OBJECTS:[]};
 return{
  features:(data.FEATURES||[]).filter(f=>!String(f.id).startsWith("wd_")),
  objects:(data.OBJECTS||[]).filter(o=>o.source==="curated-seed")
 };
}
function feature(id,q,group,requires){return{id,q,label:id,group,...(requires?{requires}:{})};}
function mildWeight(sitelinks){
 const n=Math.max(1,Number(sitelinks)||1);
 return Number((1+Math.min(1.4,Math.log10(n+1)/2)).toFixed(3));
}
function qid(binding){return String(binding.entity?.value||"").split("/").pop();}

const current=await readFile(OUT,"utf8");
const seed=loadSeed(current);
const features=new Map(seed.features.map(f=>[f.id,f]));
const objects=new Map(seed.objects.map(o=>[o.name.toLocaleLowerCase("en"),o]));
const addFeature=(id,q,group,requires)=>{if(id&&!features.has(id))features.set(id,feature(id,q,group,requires));};
const addObject=o=>{const key=o.name.toLocaleLowerCase("en");if(!objects.has(key))objects.set(key,o);};

const BIRTH_SPLITS=Array.from({length:43},(_,i)=>1800+i*5);
const broadDomains=[
 ["music",/\b(singer|musician|composer|rapper|songwriter|record producer|conductor|dj)\b/i,"making music"],
 ["acting",/\b(actor|actress|film actor|television actor|voice actor|comedian)\b/i,"acting or comedy"],
 ["sports",/\b(footballer|soccer|basketball|hockey|tennis|athlete|swimmer|boxer|golfer|racing driver|baseball|cricketer|gymnast)\b/i,"sports"],
 ["science",/\b(scientist|physicist|chemist|biologist|astronomer|mathematician|researcher|engineer|computer scientist)\b/i,"science or engineering"],
 ["writing",/\b(writer|author|novelist|poet|journalist|screenwriter|playwright)\b/i,"writing"],
 ["politics",/\b(politician|president|prime minister|statesman|monarch|king|queen|diplomat)\b/i,"politics, government, or royalty"],
 ["business",/\b(businessperson|entrepreneur|executive|investor|industrialist)\b/i,"business"],
 ["television",/\b(television presenter|broadcaster|media personality|YouTuber|internet celebrity)\b/i,"television or online media"]
];
for(const [id,,label] of broadDomains)addFeature(`wd_domain_${id}`,`Are they especially known for ${label}?`,"person","specificPerson");

const [peopleRows,fictionRows,placeRows]=await Promise.all([
 fetchPeople(PEOPLE_LIMIT),
 fetchFictional(FICTION_LIMIT).catch(e=>{console.warn(String(e));return[];}),
 fetchPlaces(PLACES_LIMIT).catch(e=>{console.warn(String(e));return[];})
]);
if(peopleRows.length<Math.min(300,PEOPLE_LIMIT))throw new Error(`Wikidata returned only ${peopleRows.length} people; refusing to replace the generated snapshot.`);

const people=new Map();
for(const b of peopleRows){
 const id=qid(b),name=title(b.entityLabel?.value);if(!id||!name||/^Q\d+$/.test(name))continue;
 const rec=people.get(id)||{id,name,birth:null,death:null,gender:"",countries:new Set(),occupations:new Set(),sitelinks:0};
 rec.name=name;rec.birth=rec.birth??year(b.birth?.value);rec.death=rec.death??year(b.death?.value);rec.gender=title(b.genderLabel?.value)||rec.gender;
 for(const x of list(b.countries?.value))rec.countries.add(x);
 for(const x of list(b.occupations?.value))rec.occupations.add(x);
 rec.sitelinks=Math.max(rec.sitelinks,Number(b.sitelinks?.value)||0);people.set(id,rec);
}
const occupationCounts=new Map(),countryCounts=new Map();
for(const p of people.values()){
 for(const x of p.occupations)occupationCounts.set(x,(occupationCounts.get(x)||0)+1);
 for(const x of p.countries)countryCounts.set(x,(countryCounts.get(x)||0)+1);
}
for(const p of people.values()){
 const yes=["person","specificPerson"];
 if(p.death==null)yes.push("alive");
 if(/^male$/i.test(p.gender))yes.push("personMan");
 if(/^female$/i.test(p.gender))yes.push("personWoman");
 if(p.birth!=null){
  for(const y of BIRTH_SPLITS)if(p.birth<y)yes.push(`bornBefore_${y}`);
  for(const y of [1950,1980,2000])if(p.birth>y)yes.push(`bornAfter_${y}`);
  if(p.birth>=0){const d=Math.floor(p.birth/10)*10,tag=`wd_born_decade_${d}`;addFeature(tag,`Were they born in the ${d}s?`,"person","specificPerson");yes.push(tag);}
 }
 const occupationText=[...p.occupations].join(" | ");
 for(const [id,re,label] of broadDomains)if(re.test(occupationText))yes.push(`wd_domain_${id}`);
 for(const country of p.countries){
  if((countryCounts.get(country)||0)<4)continue;
  const tag=`wd_person_country_${slug(country)}`;addFeature(tag,`Are they strongly associated with ${country}?`,"person","specificPerson");yes.push(tag);
 }
 for(const occupation of p.occupations){
  if((occupationCounts.get(occupation)||0)<8||occupation.length>45)continue;
  const tag=`wd_occupation_${slug(occupation)}`;addFeature(tag,`Are they known as ${article(occupation)} ${occupation}?`,"person","specificPerson");yes.push(tag);
 }
 addObject({name:p.name,kind:"person",proper:true,specificPerson:true,qid:p.id,source:"wikidata",yes:[...new Set(yes)],maybe:[],weight:mildWeight(p.sitelinks)});
}

// Fictional characters. Keep only universe/type questions that repeat often enough to be useful.
const fictionRaw=[];
for(const b of fictionRows){
 const name=title(b.entityLabel?.value),id=qid(b);if(!name||!id||/^Q\d+$/.test(name))continue;
 fictionRaw.push({name,id,gender:title(b.genderLabel?.value),universes:list(b.universes?.value),types:list(b.types?.value),sitelinks:Number(b.sitelinks?.value)||0});
}
const universeCounts=new Map(),fictionTypeCounts=new Map();
for(const x of fictionRaw){for(const u of x.universes)universeCounts.set(u,(universeCounts.get(u)||0)+1);for(const t of x.types)fictionTypeCounts.set(t,(fictionTypeCounts.get(t)||0)+1);}
addFeature("wd_fiction_man","Is the character male?","fictional","fictional");
addFeature("wd_fiction_woman","Is the character female?","fictional","fictional");
for(const x of fictionRaw){
 const yes=["fictional"];
 if(/^male$/i.test(x.gender))yes.push("wd_fiction_man");if(/^female$/i.test(x.gender))yes.push("wd_fiction_woman");
 for(const u of x.universes){if((universeCounts.get(u)||0)<3)continue;const tag=`wd_universe_${slug(u)}`;addFeature(tag,`Is the character from ${u}?`,"fictional","fictional");yes.push(tag);}
 for(const t of x.types){if((fictionTypeCounts.get(t)||0)<5||t.length>42)continue;const tag=`wd_fiction_type_${slug(t)}`;addFeature(tag,`Is the character ${article(t)} ${t}?`,"fictional","fictional");yes.push(tag);}
 addObject({name:x.name,kind:"fictional",proper:true,qid:x.id,source:"wikidata",yes:[...new Set(yes)],maybe:[],weight:mildWeight(x.sitelinks)});
}

// Places and landmarks.
const placeRaw=[];
for(const b of placeRows){
 const name=title(b.entityLabel?.value),id=qid(b);if(!name||!id||/^Q\d+$/.test(name))continue;
 placeRaw.push({name,id,root:title(b.rootLabel?.value),countries:list(b.countries?.value),continents:list(b.continents?.value),types:list(b.types?.value),sitelinks:Number(b.sitelinks?.value)||0});
}
const placeCountryCounts=new Map(),placeTypeCounts=new Map(),continentCounts=new Map();
for(const x of placeRaw){for(const c of x.countries)placeCountryCounts.set(c,(placeCountryCounts.get(c)||0)+1);for(const t of x.types)placeTypeCounts.set(t,(placeTypeCounts.get(t)||0)+1);for(const c of x.continents)continentCounts.set(c,(continentCounts.get(c)||0)+1);}
for(const x of placeRaw){
 const yes=["place"];
 if(x.root){const tag=`wd_place_root_${slug(x.root)}`;addFeature(tag,`Is it ${article(x.root)} ${x.root}?`,"place","place");yes.push(tag);}
 for(const c of x.countries){if((placeCountryCounts.get(c)||0)<3)continue;const tag=`wd_place_country_${slug(c)}`;addFeature(tag,`Is it in ${c}?`,"place","place");yes.push(tag);}
 for(const c of x.continents){if((continentCounts.get(c)||0)<3)continue;const tag=`wd_continent_${slug(c)}`;addFeature(tag,`Is it in ${c}?`,"place","place");yes.push(tag);}
 for(const t of x.types){if((placeTypeCounts.get(t)||0)<5||t.length>42)continue;const tag=`wd_place_type_${slug(t)}`;addFeature(tag,`Is it ${article(t)} ${t}?`,"place","place");yes.push(tag);}
 addObject({name:x.name,kind:"place",proper:true,qid:x.id,source:"wikidata",yes:[...new Set(yes)],maybe:[],weight:mildWeight(x.sitelinks)});
}

const out={
 meta:{
  source:"curated seed + Wikidata",
  generatedAt:new Date().toISOString(),
  license:"Wikidata structured data is CC0; curated seed is original project data",
  seedObjects:seed.objects.length,
  wikidataPeople:people.size,
  wikidataFictional:fictionRaw.length,
  wikidataPlaces:placeRaw.length
 },
 FEATURES:[...features.values()],
 OBJECTS:[...objects.values()]
};
const source=`(function(global){\n"use strict";\nglobal.MOM_GENERATED_KNOWLEDGE=${JSON.stringify(out)};\n})(typeof window!=="undefined"?window:globalThis);\n`;
await writeFile(OUT,source);
const total=out.OBJECTS.length;
await writeFile(REPORT,`# Mom Mode knowledge snapshot\n\nGenerated: ${out.meta.generatedAt}\n\n- Curated seed concepts: ${out.meta.seedObjects}\n- Wikidata people: ${out.meta.wikidataPeople}\n- Wikidata fictional characters: ${out.meta.wikidataFictional}\n- Wikidata places/landmarks: ${out.meta.wikidataPlaces}\n- Generated concepts total: ${total}\n- Generated question traits: ${out.FEATURES.length}\n\nWikidata structured data is published under CC0. Gameplay reads this generated local snapshot and does not query Wikimedia during a round.\n`);
console.log(`Mom Mode knowledge: ${total} generated concepts, ${out.FEATURES.length} generated traits.`);
