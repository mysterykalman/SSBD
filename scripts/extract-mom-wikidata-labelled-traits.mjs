import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const INVENTORY=path.join(ROOT,'.dev-data','mom-playable-50k','playable_50k.csv');
const OUT_DIR=path.join(ROOT,'.dev-data','trait-sources');
const OUT=path.join(OUT_DIR,'wikidata-labelled-evidence.json');
const SUMMARY=path.join(OUT_DIR,'wikidata-labelled-evidence.summary.json');
const PARTS_DIR=path.join(OUT_DIR,'wikidata-labelled-evidence.parts');
const API='https://www.wikidata.org/w/api.php';
const REQUEST_BATCH_SIZE=Math.max(1,Math.min(50,Number(process.env.MOM_WIKIDATA_BATCH_SIZE||50)));
const SHARD_SIZE=Math.max(REQUEST_BATCH_SIZE,Number(process.env.MOM_WIKIDATA_SHARD_SIZE||500));
const REQUEST_DELAY_MS=Math.max(0,Number(process.env.MOM_WIKIDATA_DELAY_MS||125));
const REQUEST_TIMEOUT_MS=Math.max(5000,Number(process.env.MOM_WIKIDATA_TIMEOUT_MS||12000));
const RETRIES=Math.max(1,Number(process.env.MOM_WIKIDATA_RETRIES||3));
const SOURCE_BUDGET_MS=Math.max(60000,Number(process.env.MOM_WIKIDATA_BUDGET_MS||8*60*1000));
const MAX_CONSECUTIVE_FAILED_BATCHES=Math.max(1,Number(process.env.MOM_WIKIDATA_MAX_CONSECUTIVE_FAILURES||3));

const PROPS={
 P31:'instance of',P279:'subclass of',P106:'occupation',P27:'country of citizenship',P17:'country',
 P495:'country of origin',P136:'genre',P170:'creator',P50:'author',P57:'director',P175:'performer',
 P361:'part of',P527:'has part',P186:'material',P366:'use',P276:'location',P131:'located in',
 P452:'industry',P176:'manufacturer',P400:'platform',P641:'sport',P21:'gender',P144:'based on',
 P138:'named after',P1412:'languages spoken',P101:'field of work',P69:'educated at',P108:'employer',
 P1303:'instrument',P264:'record label',P463:'member of',P54:'member of sports team',P413:'position played',
 P577:'publication date',P921:'main subject',P180:'depicts',
 P462:'color',P2048:'height',P2067:'mass',P2054:'density',P2670:'has parts of class',P1552:'has quality',
 P105:'taxon rank',P171:'parent taxon',P183:'endemic to',P141:'conservation status',P703:'found in taxon'
};

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
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
function chunk(values,size){const out=[];for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));return out;}
function formatError(error){return error instanceof Error?error.message:String(error);}
function tripCircuit(control,reason){
 if(control.aborted)return;
 control.aborted=true;
 control.abortReason=reason;
 console.warn(`Wikidata source circuit opened: ${reason}. Continuing with partial evidence.`);
}

async function fetchJson(url,label){
 let last;
 for(let attempt=1;attempt<=RETRIES;attempt++){
  try{
   const response=await fetch(url,{headers:{'user-agent':'SSBD-Pam-knowledge-audit/1.2',accept:'application/json'},signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
   if(response.status===429||response.status===503){
    const retryAfter=Number(response.headers.get('retry-after'))||Math.min(12,attempt*2);
    throw Object.assign(new Error(`HTTP ${response.status}`),{retryAfter});
   }
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   return await response.json();
  }catch(error){
   last=error;
   if(attempt<RETRIES){
    const waitMs=Number(error?.retryAfter)?Number(error.retryAfter)*1000:Math.min(6000,750*attempt);
    console.warn(`${label} attempt ${attempt}/${RETRIES} failed: ${formatError(error)}; retrying in ${waitMs}ms`);
    await sleep(waitMs);
   }
  }
 }
 throw last||new Error(`${label} exhausted retries`);
}

async function fetchEntities(ids,props,stage,stats,control){
 const entities={};
 const batches=chunk(ids,REQUEST_BATCH_SIZE);
 for(let index=0;index<batches.length;index++){
  if(control.aborted)break;
  if(Date.now()-control.startedAt>=SOURCE_BUDGET_MS){
   tripCircuit(control,`source time budget of ${SOURCE_BUDGET_MS}ms reached`);
   break;
  }
  const batch=batches[index];
  const params=new URLSearchParams({action:'wbgetentities',format:'json',formatversion:'2',languages:'en',languagefallback:'1',props,ids:batch.join('|'),maxlag:'5'});
  try{
   const data=await fetchJson(`${API}?${params}`,`${stage} batch ${index+1}/${batches.length}`);
   Object.assign(entities,data.entities||{});
   stats[`${stage}BatchesSucceeded`]++;
   control.consecutiveFailures=0;
  }catch(error){
   stats[`${stage}BatchesFailed`]++;
   control.consecutiveFailures++;
   stats.failures.push({stage,batch:index+1,ids:batch.length,error:formatError(error)});
   console.warn(`${stage} batch ${index+1}/${batches.length} skipped after retries: ${formatError(error)}`);
   if(control.consecutiveFailures>=MAX_CONSECUTIVE_FAILED_BATCHES){
    tripCircuit(control,`${control.consecutiveFailures} consecutive ${stage} batches failed`);
   }
  }
  if((index+1)%10===0||index===batches.length-1){
   console.log(`${stage} progress: ${index+1}/${batches.length} batches; ${stats[`${stage}BatchesFailed`]} failed`);
  }
  if(!control.aborted&&REQUEST_DELAY_MS)await sleep(REQUEST_DELAY_MS);
 }
 return entities;
}

const rows=parseCsv(fs.readFileSync(INVENTORY,'utf8').replace(/^\uFEFF/,''));
const header=hmap(rows.shift()||[]);const ni=header['Canonical answer'],qi=header['Wikidata QID'];
if(ni==null||qi==null)throw new Error('Inventory missing Canonical answer or Wikidata QID');
const targets=rows.filter(r=>/^Q\d+$/.test(String(r[qi]||''))).map(r=>({name:String(r[ni]).trim(),qid:String(r[qi]).trim()}));
const targetsByQid=new Map();
for(const target of targets){const list=targetsByQid.get(target.qid)||[];list.push(target);targetsByQid.set(target.qid,list);}
const qids=[...targetsByQid.keys()];
const shards=chunk(qids,SHARD_SIZE);
const records=[];
const control={startedAt:Date.now(),aborted:false,abortReason:'',consecutiveFailures:0};
const stats={
 inventoryQids:qids.length,
 targetRows:targets.length,
 shardSize:SHARD_SIZE,
 requestBatchSize:REQUEST_BATCH_SIZE,
 requestTimeoutMs:REQUEST_TIMEOUT_MS,
 retries:RETRIES,
 sourceBudgetMs:SOURCE_BUDGET_MS,
 maxConsecutiveFailedBatches:MAX_CONSECUTIVE_FAILED_BATCHES,
 shards:shards.length,
 completedShards:0,
 claimBatchesSucceeded:0,
 claimBatchesFailed:0,
 labelBatchesSucceeded:0,
 labelBatchesFailed:0,
 referencedQids:0,
 matchedConcepts:0,
 evidenceItems:0,
 failures:[]
};

fs.mkdirSync(OUT_DIR,{recursive:true});
fs.rmSync(PARTS_DIR,{recursive:true,force:true});
fs.mkdirSync(PARTS_DIR,{recursive:true});

for(let shardIndex=0;shardIndex<shards.length;shardIndex++){
 if(control.aborted)break;
 const shardQids=shards[shardIndex];
 console.log(`Wikidata shard ${shardIndex+1}/${shards.length}: ${shardQids.length} inventory QIDs`);
 const shardStats={claimBatchesSucceeded:0,claimBatchesFailed:0,labelBatchesSucceeded:0,labelBatchesFailed:0,failures:[]};
 const entities=await fetchEntities(shardQids,'claims','claim',shardStats,control);
 const referenced=new Set();
 for(const entity of Object.values(entities)){
  for(const prop of Object.keys(PROPS))for(const claim of entity?.claims?.[prop]||[]){
   const value=claim?.mainsnak?.datavalue?.value;
   if(value&&typeof value==='object'&&/^Q\d+$/.test(value.id||''))referenced.add(value.id);
  }
 }
 const refs=[...referenced];
 const labelEntities=!control.aborted&&refs.length?await fetchEntities(refs,'labels','label',shardStats,control):{};
 const labels={};
 for(const [qid,entity] of Object.entries(labelEntities))labels[qid]=entity?.labels?.en?.value||qid;
 const shardRecords=[];
 for(const qid of shardQids){
  const entity=entities[qid];
  if(!entity?.claims)continue;
  const evidence=[];
  for(const [prop,label] of Object.entries(PROPS)){
   for(const claim of (entity.claims[prop]||[]).slice(0,8)){
    const value=claim?.mainsnak?.datavalue?.value;let rendered='';
    if(value&&typeof value==='object'&&value.id)rendered=labels[value.id]||'';
    else if(typeof value==='string')rendered=value.slice(0,100);
    else if(value&&typeof value==='object'&&value.amount)rendered=String(value.amount);
    if(!rendered||/^Q\d+$/.test(rendered))continue;
    evidence.push({source:'Wikidata labelled',type:label,trait:`${label}:${rendered}`});
   }
  }
  if(!evidence.length)continue;
  for(const target of targetsByQid.get(qid)||[])shardRecords.push({concept:target.name,evidence});
 }
 const partName=`part-${String(shardIndex+1).padStart(3,'0')}.jsonl`;
 fs.writeFileSync(path.join(PARTS_DIR,partName),shardRecords.map(record=>JSON.stringify(record)).join('\n')+(shardRecords.length?'\n':''));
 records.push(...shardRecords);
 stats.claimBatchesSucceeded+=shardStats.claimBatchesSucceeded;
 stats.claimBatchesFailed+=shardStats.claimBatchesFailed;
 stats.labelBatchesSucceeded+=shardStats.labelBatchesSucceeded;
 stats.labelBatchesFailed+=shardStats.labelBatchesFailed;
 stats.referencedQids+=refs.length;
 stats.matchedConcepts+=shardRecords.length;
 stats.evidenceItems+=shardRecords.reduce((sum,record)=>sum+record.evidence.length,0);
 stats.failures.push(...shardStats.failures.map(failure=>({shard:shardIndex+1,...failure})));
 stats.completedShards=shardIndex+1;
 console.log(`Wikidata shard ${shardIndex+1}/${shards.length} complete: ${shardRecords.length} concepts, ${shardStats.claimBatchesFailed} claim failures, ${shardStats.labelBatchesFailed} label failures`);
}

const finalStats={...stats,sourceAborted:control.aborted,abortReason:control.abortReason||null,elapsedMs:Date.now()-control.startedAt,output:OUT,partsDirectory:PARTS_DIR};
fs.writeFileSync(OUT,JSON.stringify(records));
fs.writeFileSync(SUMMARY,JSON.stringify(finalStats,null,2)+'\n');
console.log(JSON.stringify(finalStats,null,2));

if(control.aborted){
 console.warn(`Wikidata enrichment stopped early: ${control.abortReason}. Downstream coverage and benchmark gates will determine whether partial evidence is sufficient.`);
}else if(stats.claimBatchesFailed||stats.labelBatchesFailed){
 console.warn(`Wikidata completed with partial-source failures (${stats.claimBatchesFailed} claim batches, ${stats.labelBatchesFailed} label batches). Downstream coverage and benchmark gates will determine whether the resulting evidence is sufficient.`);
}
