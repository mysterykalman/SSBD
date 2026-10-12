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
const WIKIDATA_LABELLED = path.join(ROOT, '.dev-data', 'trait-sources', 'wikidata-labelled-evidence.json');
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
if(!fs.existsSync(WIKIDATA_LABELLED)) throw new Error(`Missing required static Wikidata evidence: ${WIKIDATA_LABELLED}`);
let wikidataRows;
try {
  wikidataRows=JSON.parse(fs.readFileSync(WIKIDATA_LABELLED,'utf8'));
} catch (error) {
  throw new Error(`Required static Wikidata evidence is unreadable: ${error.message}`);
}
if(!Array.isArray(wikidataRows)||wikidataRows.length===0) throw new Error('Required static Wikidata evidence is empty or malformed.');
let wikidataMatchedConcepts=0,wikidataEvidenceItems=0;
for(const row of wikidataRows){
 let matched=false;
 for(const evidence of row.evidence||[]){
  if(addEvidence(row.concept,'Wikidata',evidence.trait,evidence.type||'',{confidence:evidence.confidence})){matched=true;wikidataEvidenceItems++;}
 }
 if(matched)wikidataMatchedConcepts++;
}
if(wikidataMatchedConcepts===0||wikidataEvidenceItems===0) throw new Error('Required static Wikidata evidence did not match any playable concepts.');
console.log(`Required static Wikidata evidence loaded: ${wikidataMatchedConcepts.toLocaleString()} concepts, ${wikidataEvidenceItems.toLocaleString()} evidence items`);
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