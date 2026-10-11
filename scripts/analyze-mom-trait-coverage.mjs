import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, '.dev-data', 'mom-playable-50k', 'playable_50k.jsonl');
const OUT_DIR = path.join(ROOT, '.dev-data', 'mom-trait-coverage');
const MCRAE_THINGS = path.join(ROOT, '.dev-data', 'trait-sources', 'seeing-what-tastes-good', 'data', 'mcrae-x-things.json');
const MCRAE_TAXONOMY = path.join(ROOT, '.dev-data', 'trait-sources', 'seeing-what-tastes-good', 'data', 'mcrae-x-things-taxonomy.json');
const CARDIFF_DIR = path.join(ROOT, '.dev-data', 'trait-sources', 'trait-concept-datasets');
const CONCEPTNET = path.join(ROOT, '.dev-data', 'trait-sources', 'conceptnet-assertions-5.7.0.csv.gz');
const WORDNET = path.join(ROOT, '.dev-data', 'trait-sources', 'wordnet-evidence.json');
fs.mkdirSync(OUT_DIR, { recursive: true });

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[–—]/g, '-')
    .replace(/^the\s+/, '').replace(/\([^)]*\)/g, ' ').replace(/[_-]+/g, ' ').replace(/[^a-z0-9']+/g, ' ').trim().replace(/\s+/g, ' ');
}
function parseCsv(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=ch;}
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);} return rows;
}
function csvEscape(value){const s=String(value??'');return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
if(!fs.existsSync(INVENTORY)) throw new Error(`Missing inventory: ${INVENTORY}`);
const inventory=fs.readFileSync(INVENTORY,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
const concepts=inventory.map((item,i)=>({rank:item.rank||i+1,name:String(item.name||'').trim(),key:normalize(item.name),aliases:Array.isArray(item.aliases)?item.aliases:[],difficulty:item.difficulty||'',qid:String(item.qid||'').trim(),traits:new Map(),sources:new Set()})).filter(c=>c.name);
const byKey=new Map(); for(const c of concepts){byKey.set(c.key,c);for(const alias of c.aliases)byKey.set(normalize(alias),c);}
const byQid=new Map(concepts.filter(c=>/^Q\d+$/.test(c.qid)).map(c=>[c.qid,c]));
function addEvidenceToConcept(c,source,rawTrait,type='',metadata={}){
  const trait=String(rawTrait??'').trim();if(!trait)return false;
  const evidenceKey=`${source}|${type}|${trait}`;const current=c.traits.get(evidenceKey);
  if(current){current.support+=Number(metadata.support)||1;if(metadata.weight!=null)current.weight=Math.max(Number(current.weight)||0,Number(metadata.weight)||0);}
  else c.traits.set(evidenceKey,{concept:c.name,source,type,trait,normalizedTrait:normalize(trait),support:Number(metadata.support)||1,...(metadata.confidence!=null?{confidence:metadata.confidence}:{}),...(metadata.weight!=null?{weight:metadata.weight}:{}),...(metadata.qid?{qid:metadata.qid}:{})});
  c.sources.add(source);return true;
}
function addEvidence(rawConcept,source,rawTrait,type='',metadata={}){const key=normalize(rawConcept).replace(/\b([a-z]+)\d+$/,'$1');const c=byKey.get(key);return c?addEvidenceToConcept(c,source,rawTrait,type,metadata):false;}

if(fs.existsSync(MCRAE_THINGS)){
 const pairs=JSON.parse(fs.readFileSync(MCRAE_THINGS,'utf8'));const taxonomy=fs.existsSync(MCRAE_TAXONOMY)?JSON.parse(fs.readFileSync(MCRAE_TAXONOMY,'utf8')):{};
 for(const pair of pairs)if(Array.isArray(pair)&&pair.length>=2)addEvidence(pair[0],'McRae x THINGS',pair[1],taxonomy[pair[1]]??'');
}
function walk(dir){if(!fs.existsSync(dir))return[];const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(file));else out.push(file);}return out;}
for(const file of walk(CARDIFF_DIR).filter(file=>file.endsWith('.csv'))){
 const rows=parseCsv(fs.readFileSync(file,'utf8'));const header=rows.shift()?.map(x=>x.trim().toLowerCase())??[];const conceptI=header.indexOf('concept'),featureI=header.indexOf('feature'),typeI=header.indexOf('attribute type');if(conceptI<0||featureI<0)continue;
 const lower=file.toLowerCase(),source=lower.includes('norms')?'CSLB trait norms':'McRae trait norms';for(const row of rows)addEvidence(row[conceptI],source,row[featureI],typeI>=0?row[typeI]:'');
}
if(fs.existsSync(WORDNET)){for(const row of JSON.parse(fs.readFileSync(WORDNET,'utf8')))for(const trait of row.traits||[])addEvidence(row.concept,'Open English WordNet',trait,trait.split(':')[0]);}
const USEFUL_RELATIONS=new Set(['/r/IsA','/r/InstanceOf','/r/HasProperty','/r/UsedFor','/r/CapableOf','/r/HasA','/r/PartOf','/r/AtLocation','/r/MadeOf','/r/CreatedBy','/r/DefinedAs','/r/ReceivesAction']);
function conceptFromUri(uri){const match=String(uri??'').match(/^\/c\/en\/([^/]+)/);return match?decodeURIComponent(match[1].replaceAll('_',' ')):'';}
if(fs.existsSync(CONCEPTNET)){
 const input=fs.createReadStream(CONCEPTNET).pipe(zlib.createGunzip()),rl=readline.createInterface({input,crlfDelay:Infinity});let lines=0,useful=0;
 for await(const line of rl){lines++;const cols=line.split('\t');if(cols.length<4||!USEFUL_RELATIONS.has(cols[1]))continue;const start=conceptFromUri(cols[2]),end=conceptFromUri(cols[3]);if(!start||!end)continue;
  let weight;try{weight=Number(JSON.parse(cols[4]).weight)||undefined;}catch{}
  if(addEvidence(start,'ConceptNet',`${cols[1].slice(3)}:${end}`,cols[1].slice(3),{weight}))useful++;
 }
 console.log(`ConceptNet complete: ${lines.toLocaleString()} lines, ${useful.toLocaleString()} matched useful edges`);
}
const WIKIDATA_PROPS={P31:'instance of',P279:'subclass of',P106:'occupation',P27:'country of citizenship',P17:'country',P495:'country of origin',P136:'genre',P170:'creator',P50:'author',P57:'director',P175:'performer',P361:'part of',P527:'has part',P186:'material',P366:'use',P276:'location',P131:'located in',P452:'industry',P176:'manufacturer',P400:'platform',P641:'sport',P21:'gender',P144:'based on',P138:'named after'};
async function fetchJson(url,retries=3){let last;for(let i=0;i<retries;i++){try{const response=await fetch(url,{headers:{'user-agent':'SSBD-Pam-knowledge-audit/1.0'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}catch(error){last=error;await new Promise(resolve=>setTimeout(resolve,500*(i+1)));}}throw last;}
const qids=[...byQid.keys()],batches=[];for(let i=0;i<qids.length;i+=50)batches.push(qids.slice(i,i+50));let wikidataMatched=0,nextBatch=0;
async function wikidataWorker(){while(true){const index=nextBatch++;if(index>=batches.length)return;const batch=batches[index],url=`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${encodeURIComponent(batch.join('|'))}`;let data;try{data=await fetchJson(url);}catch(error){console.warn(`Wikidata batch ${index+1}/${batches.length} failed: ${error.message}`);continue;}
 for(const [qid,entity]of Object.entries(data.entities||{})){const c=byQid.get(qid);if(!c||!entity?.claims)continue;let added=false;for(const [prop,label]of Object.entries(WIKIDATA_PROPS))for(const claim of(entity.claims[prop]||[]).slice(0,6)){const value=claim?.mainsnak?.datavalue?.value;const compact=value&&typeof value==='object'&&value.id?value.id:typeof value==='string'?value.slice(0,80):'';if(!compact)continue;addEvidenceToConcept(c,'Wikidata',`${label}:${compact}`,label,{qid,confidence:claim.rank==='preferred'?1:0.75});added=true;}if(added)wikidataMatched++;}}
}
if(batches.length){await Promise.all(Array.from({length:Math.min(6,batches.length)},()=>wikidataWorker()));console.log(`Wikidata complete: ${wikidataMatched.toLocaleString()} concepts matched from ${qids.length.toLocaleString()} QIDs`);}
function status(c){const n=c.traits.size;return n>=5?'Strong public trait coverage':n>=1?'Partial public trait coverage':'Needs help';}
const sources=['McRae x THINGS','McRae trait norms','CSLB trait norms','Open English WordNet','ConceptNet','Wikidata'];
const summary={totalConcepts:concepts.length,strongCoverage:concepts.filter(c=>status(c)==='Strong public trait coverage').length,partialCoverage:concepts.filter(c=>status(c)==='Partial public trait coverage').length,needsHelp:concepts.filter(c=>status(c)==='Needs help').length,anyPublicTraitCoverage:concepts.filter(c=>c.traits.size>0).length,bySource:{},byDifficulty:{},thresholds:{strong:'5 or more distinct usable public trait assertions',partial:'1 to 4 distinct usable public trait assertions',needsHelp:'0 matched usable public trait assertions'}};
for(const source of sources)summary.bySource[source]=concepts.filter(c=>c.sources.has(source)).length;
for(const c of concepts){const difficulty=c.difficulty||'Unknown';summary.byDifficulty[difficulty]??={total:0,strong:0,partial:0,needsHelp:0};summary.byDifficulty[difficulty].total++;const s=status(c);if(s==='Strong public trait coverage')summary.byDifficulty[difficulty].strong++;else if(s==='Partial public trait coverage')summary.byDifficulty[difficulty].partial++;else summary.byDifficulty[difficulty].needsHelp++;}
const reportHeader=['Rank','Canonical answer','Difficulty','Coverage status','Trait count','Sources','Example traits'],reportLines=[reportHeader.join(',')];
for(const c of concepts){const examples=[...c.traits.values()].slice(0,16).map(e=>`${e.source}: ${e.trait}`).join(' | ');reportLines.push([c.rank,c.name,c.difficulty,status(c),c.traits.size,[...c.sources].sort().join(' | '),examples].map(csvEscape).join(','));}
fs.writeFileSync(path.join(OUT_DIR,'trait_coverage.csv'),reportLines.join('\n')+'\n');
const evidenceLines=concepts.flatMap(c=>[...c.traits.values()].map(e=>JSON.stringify(e))).sort((a,b)=>a.localeCompare(b));
fs.writeFileSync(path.join(OUT_DIR,'evidence.jsonl'),evidenceLines.join('\n')+(evidenceLines.length?'\n':''));
fs.writeFileSync(path.join(OUT_DIR,'summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(OUT_DIR,'needs_help.txt'),concepts.filter(c=>status(c)==='Needs help').map(c=>c.name).join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
