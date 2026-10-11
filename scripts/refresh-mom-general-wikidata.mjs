import {readFile,writeFile} from "node:fs/promises";
import vm from "node:vm";

const OUT=new URL("../src/client/mom-mode/knowledge.generated.js",import.meta.url);
const endpoint="https://query.wikidata.org/sparql";
const userAgent="SSBD-MomMode/2.0 (general-knowledge refresh for mysterykalman/SSBD)";
const arg=(name,fallback)=>{const hit=process.argv.find(v=>v.startsWith(`--${name}=`));return hit?Number(hit.split("=")[1]):fallback;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n));
const title=s=>String(s||"").trim().replace(/\s+/g," ");
const list=v=>[...new Set(String(v||"").split("|").map(title).filter(Boolean))];
const year=v=>{const m=/^([+-]?\d{1,6})-/.exec(String(v||""));return m?Number(m[1]):null;};
const mildWeight=n=>Number((1.25+Math.min(1.5,Math.log10(Math.max(1,Number(n)||1)+1)/2)).toFixed(3));
const prefixes=`PREFIX wd: <http://www.wikidata.org/entity/>\nPREFIX wdt: <http://www.wikidata.org/prop/direct/>\nPREFIX wikibase: <http://wikiba.se/ontology#>\nPREFIX schema: <http://schema.org/>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nPREFIX bd: <http://www.bigdata.com/rdf#>\n`;

async function sparql(query,label,{attempts=3}={}){
 let last;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8",accept:"application/sparql-results+json","user-agent":userAgent},body:new URLSearchParams({query,format:"json"})});
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   return (await response.json()).results?.bindings||[];
  }catch(error){last=error;if(attempt<attempts)await sleep(800*attempt);}
 }
 throw last;
}

function load(source){
 const sandbox={globalThis:null};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return sandbox.MOM_GENERATED_KNOWLEDGE||{meta:{},FEATURES:[],OBJECTS:[]};
}

const CATEGORIES=[
 {id:"artwork",root:"Q838948",limit:arg("artworks",350),minLinks:25},
 {id:"book",root:"Q571",limit:arg("books",350),minLinks:25},
 {id:"film",root:"Q11424",limit:arg("films",350),minLinks:30},
 {id:"tv",root:"Q5398426",limit:arg("tv",250),minLinks:25},
 {id:"song",root:"Q7366",limit:arg("songs",250),minLinks:30},
 {id:"album",root:"Q482994",limit:arg("albums",200),minLinks:25},
 {id:"event",root:"Q13418847",limit:arg("events",200),minLinks:25}
].filter(c=>c.limit>0);

async function categoryIndex(c){
 const q=prefixes+`SELECT DISTINCT ?entity ?sitelinks WHERE {\n ?entity wdt:P31/wdt:P279* wd:${c.root}; wikibase:sitelinks ?sitelinks.\n ?article schema:about ?entity; schema:isPartOf <https://en.wikipedia.org/>.\n FILTER(?sitelinks >= ${c.minLinks})\n}\nLIMIT ${Math.floor(c.limit)}`;
 return sparql(q,`${c.id} index`,{attempts:2});
}
const values=rows=>rows.map(r=>`<${r.entity.value}>`).join(" ");
async function categoryDetails(c,indexRows){
 const out=[];
 for(const [i,batch] of chunks(indexRows,60).entries()){
  const q=prefixes+`SELECT ?entity ?entityLabel ?sitelinks\n (GROUP_CONCAT(DISTINCT ?typeLabel;separator="|") AS ?types)\n (GROUP_CONCAT(DISTINCT ?genreLabel;separator="|") AS ?genres)\n (GROUP_CONCAT(DISTINCT ?countryLabel;separator="|") AS ?countries)\n (GROUP_CONCAT(DISTINCT ?materialLabel;separator="|") AS ?materials)\n (GROUP_CONCAT(DISTINCT ?locationLabel;separator="|") AS ?locations)\n (GROUP_CONCAT(DISTINCT STR(?date);separator="|") AS ?dates)\nWHERE {\n VALUES ?entity { ${values(batch)} }\n ?entity wikibase:sitelinks ?sitelinks.\n OPTIONAL { ?entity wdt:P31 ?type. ?type rdfs:label ?typeLabel. FILTER(LANG(?typeLabel)="en") }\n OPTIONAL { ?entity wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel)="en") }\n OPTIONAL { ?entity wdt:P17 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="en") }\n OPTIONAL { ?entity wdt:P186 ?material. ?material rdfs:label ?materialLabel. FILTER(LANG(?materialLabel)="en") }\n OPTIONAL { ?entity wdt:P276 ?location. ?location rdfs:label ?locationLabel. FILTER(LANG(?locationLabel)="en") }\n OPTIONAL { ?entity wdt:P571 ?date. }\n SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?entity rdfs:label ?entityLabel. }\n}\nGROUP BY ?entity ?entityLabel ?sitelinks`;
  out.push(...await sparql(q,`${c.id} details ${i+1}/${Math.ceil(indexRows.length/60)}`,{attempts:2}));
  await sleep(100);
 }
 return out;
}

function traitsFor(category,row){
 const types=list(row.types?.value),genres=list(row.genres?.value),countries=list(row.countries?.value),materials=list(row.materials?.value),locations=list(row.locations?.value);
 const text=[...types,...genres].join(" | ");
 const place=[...countries,...locations].join(" | ");
 const dates=list(row.dates?.value).map(year).filter(Number.isFinite);
 const earliest=dates.length?Math.min(...dates):null;
 const yes=["manmade"];
 if(category==="artwork"){
  yes.push("gk_artwork");
  if(/sculpture|statue|bust/i.test(text))yes.push("gk_sculpture");
  if(/painting|fresco|portrait/i.test(text))yes.push("gk_painting");
  if(/marble/i.test(materials.join(" | ")))yes.push("gk_marble");
  if(earliest!=null&&earliest<600)yes.push("gk_ancient");
  if(/greece|greek/i.test(place))yes.push("gk_greek");
  if(/rome|roman|italy/i.test(place)&&earliest!=null&&earliest<600)yes.push("gk_roman");
  if(/museum|gallery|louvre/i.test(locations.join(" | ")))yes.push("gk_museum");
  if(/louvre/i.test(locations.join(" | ")))yes.push("gk_louvre");
 }else if(category==="book"){
  yes.push("gk_book");
  if(/novel/i.test(text))yes.push("gk_novel");
  if(/play|drama/i.test(text))yes.push("gk_play");
  if(earliest!=null&&earliest<1900)yes.push("gk_written_pre1900");
  if(/science fiction|sci-fi/i.test(text))yes.push("gk_scifi");
  if(/fantasy/i.test(text))yes.push("gk_fantasy");
 }else if(category==="film"){
  yes.push("gk_film");
  if(/animated|animation/i.test(text))yes.push("gk_animated");
  if(/science fiction|sci-fi/i.test(text))yes.push("gk_scifi");
  if(/fantasy/i.test(text))yes.push("gk_fantasy");
 }else if(category==="tv"){
  yes.push("gk_tv");
  if(/science fiction|sci-fi/i.test(text))yes.push("gk_scifi");
  if(/fantasy/i.test(text))yes.push("gk_fantasy");
 }else if(category==="song")yes.push("music","gk_music_work","gk_song");
 else if(category==="album")yes.push("music","gk_music_work","gk_album");
 else if(category==="event"){
  yes.push("gk_event");
  if(/war|battle|military conflict/i.test(text))yes.push("gk_war");
  if(/disaster|accident|catastrophe/i.test(text))yes.push("gk_disaster");
  if(/space|moon|apollo/i.test(text+" "+title(row.entityLabel?.value)))yes.push("gk_space_event");
 }
 if(/france/i.test(place))yes.push("gk_france");
 if(/italy/i.test(place))yes.push("gk_italy");
 if(/united kingdom|england|scotland|wales/i.test(place))yes.push("gk_uk");
 if(/united states|usa|america/i.test(place))yes.push("gk_usa");
 return [...new Set(yes)];
}

const current=load(await readFile(OUT,"utf8"));
const objectMap=new Map((current.OBJECTS||[]).map(o=>[String(o.name||"").trim().toLocaleLowerCase("en"),o]));
const counts={};
for(const c of CATEGORIES){
 let indexRows=[];
 try{indexRows=await categoryIndex(c);}catch(error){console.warn(`${c.id} index skipped: ${error}`);counts[c.id]=0;continue;}
 let rows=[];
 try{rows=await categoryDetails(c,indexRows);}catch(error){console.warn(`${c.id} details skipped: ${error}`);counts[c.id]=0;continue;}
 let added=0;
 for(const row of rows){
  const name=title(row.entityLabel?.value),qid=String(row.entity?.value||"").split("/").pop();
  if(!name||!qid||/^Q\d+$/.test(name))continue;
  const key=name.toLocaleLowerCase("en"),yes=traitsFor(c,row),weight=mildWeight(row.sitelinks?.value);
  const incoming={name,kind:c.id,proper:true,qid,source:"wikidata-general",yes,maybe:[],weight};
  const old=objectMap.get(key);
  if(old){
   objectMap.set(key,{...incoming,...old,yes:[...new Set([...(old.yes||[]),...yes])],maybe:[...new Set(old.maybe||[])],weight:Math.max(Number(old.weight)||1,weight)});
  }else{objectMap.set(key,incoming);added++;}
 }
 counts[c.id]=added;
}

const out={
 ...current,
 meta:{...(current.meta||{}),generalRefreshGeneratedAt:new Date().toISOString(),wikidataGeneral:counts},
 OBJECTS:[...objectMap.values()]
};
await writeFile(OUT,`(function(global){\n"use strict";\nglobal.MOM_GENERATED_KNOWLEDGE=${JSON.stringify(out)};\n})(typeof window!=="undefined"?window:globalThis);\n`);
console.log("Mom general-knowledge refresh:",counts,"total concepts",out.OBJECTS.length);
