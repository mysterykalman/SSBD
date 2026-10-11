import fs from 'node:fs';
import path from 'node:path';
import {TRAITS,mapEvidence,expandParents,featureRecords} from './mom-controlled-traits.mjs';

const ROOT=process.cwd();
const INVENTORY=path.join(ROOT,'.dev-data','mom-playable-50k','playable_50k.csv');
const COVERAGE=path.join(ROOT,'.dev-data','mom-trait-coverage','trait_coverage.csv');
const OUT=path.join(ROOT,'.dev-data','mom-controlled-profiles');
fs.mkdirSync(OUT,{recursive:true});

function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
  else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=ch;
 }
 if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}return rows;
}
function norm(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/^the\s+/,'').replace(/\([^)]*\)/g,' ').replace(/[_–—-]+/g,' ').replace(/[^a-z0-9']+/g,' ').trim().replace(/\s+/g,' ');}
function headerMap(row){return Object.fromEntries(row.map((v,i)=>[v,i]));}
function field(row,map,name){const i=map[name];return i==null?'':String(row[i]??'').trim();}
function weight(d){return d==='Core'?3:d==='Sweet Spot'?2.3:d==='Hard but Fair'?1.5:0.8;}
function parseExamples(raw){
 if(!raw)return[];
 return raw.split(' | ').map(part=>{
  const p=part.indexOf(': ');if(p<0)return{source:'coverage',trait:part,type:''};
  return{source:part.slice(0,p),trait:part.slice(p+2),type:''};
 });
}

if(!fs.existsSync(INVENTORY)||!fs.existsSync(COVERAGE))throw new Error('Run the Mom trait coverage workflow first.');
const inv=parseCsv(fs.readFileSync(INVENTORY,'utf8').replace(/^\uFEFF/,''));
const cov=parseCsv(fs.readFileSync(COVERAGE,'utf8').replace(/^\uFEFF/,''));
const ih=headerMap(inv.shift()||[]),ch=headerMap(cov.shift()||[]);
const coverageByName=new Map(cov.map(r=>[norm(field(r,ch,'Canonical answer')),r]));

const objects=[];const counts={};const weak=[];
for(const row of inv){
 const name=field(row,ih,'Canonical answer');if(!name)continue;
 const difficulty=field(row,ih,'Difficulty')||'Unknown';
 const evidence=[];
 const broad=field(row,ih,'Broad category'),sourceCat=field(row,ih,'Source category');
 if(broad)evidence.push({source:'inventory taxonomy',type:'category',trait:broad});
 if(sourceCat)evidence.push({source:'inventory taxonomy',type:'category',trait:sourceCat});
 const cr=coverageByName.get(norm(name));
 if(cr)evidence.push(...parseExamples(field(cr,ch,'Example traits')));
 const traits=mapEvidence(evidence);
 // QIDs with no labelled public values remain evidence-poor. Do not manufacture facts.
 const yes=[...traits].filter(id=>TRAITS.some(t=>t.id===id)).sort();
 const status=yes.length>=5?'Strong standardized profile':yes.length>=2?'Partial standardized profile':'Needs enrichment';
 counts[status]=(counts[status]||0)+1;
 if(status==='Needs enrichment')weak.push({name,difficulty,publicCoverage:cr?field(cr,ch,'Coverage status'):'',traits:yes});
 objects.push({name,kind:yes.includes('person')?'person':yes.includes('place')?'place':'concept',proper:/^[A-Z]/.test(name)&&!/^A\s|^An\s/.test(name),weight:weight(difficulty),yes,maybe:[],difficulty});
}

const FEATURES=featureRecords();
const runtime={FEATURES,OBJECTS:objects,meta:{version:'controlled-traits-v1',concepts:objects.length,features:FEATURES.length,counts}};
fs.writeFileSync(path.join(OUT,'profiles.json'),JSON.stringify(runtime));
fs.writeFileSync(path.join(OUT,'knowledge.controlled.js'),`(function(g){g.MOM_CONTROLLED_KNOWLEDGE=${JSON.stringify(runtime)};})(typeof window!=="undefined"?window:globalThis);\n`);
fs.writeFileSync(path.join(OUT,'needs_enrichment.json'),JSON.stringify(weak,null,2)+'\n');

const byDifficulty={};
for(const o of objects){const d=o.difficulty||'Unknown';byDifficulty[d]??={total:0,strong:0,partial:0,weak:0};byDifficulty[d].total++;const n=o.yes.length;if(n>=5)byDifficulty[d].strong++;else if(n>=2)byDifficulty[d].partial++;else byDifficulty[d].weak++;}
const summary={generatedAt:new Date().toISOString(),concepts:objects.length,controlledTraits:FEATURES.length,profileStatus:counts,byDifficulty,averageTraits:Number((objects.reduce((s,o)=>s+o.yes.length,0)/Math.max(1,objects.length)).toFixed(2)),weakConcepts:weak.length,principle:'Only source-backed evidence and safe taxonomy inheritance are converted to Pam traits; missing facts remain missing.'};
fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
