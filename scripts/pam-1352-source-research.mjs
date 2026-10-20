/**
 * Exhaustively retrieve source-positive Wikidata claims for the 1,352
 * single-plausible candidates; retry missing source batches without promoting
 * research into approved gameplay content.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectUnreviewedFacts} from './pam-wikidata-facts-batch.mjs';
import {wikidataFetch} from './pam-wikidata-reconcile.mjs';
import {loadSourceEvidence550} from './pam-source-evidence-compiler.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Reuse the 467 hash-pinned source dossiers already saved in the repository. */
export function convertSavedSource(row,saved){
 if(row.qid_suggestion!==saved.qid||row.id!==saved.id||row.name!==saved.name)return null;
 const claims=[];
 for(const fact of saved.claims||[]){
  const p=fact.p||fact.property||String(fact.source||'').match(/#(P\d+)/)?.[1];
  if(!/^P\d+$/.test(p||'')||!/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+/.test(fact.source||''))continue;
  if(fact.k==='item'&&/^Q\d+$/.test(fact.v||'')){
   claims.push({field:fact.f,property:p,kind:'item',value_id:fact.v,claim_id:fact.claim_id||null,
    rank:'normal',source:fact.source,status:'source_claim_unreviewed'});
  }else if(fact.k==='time'&&typeof fact.v==='string'){
   claims.push({field:fact.f,property:p,kind:'time',value_time:fact.v,
    precision:fact.precision,claim_id:fact.claim_id||null,rank:'normal',
    source:fact.source,status:'source_claim_unreviewed'});
  }
 }
 if(!claims.length)return null;
 return{id:row.id,name:row.name,category:row.category,qid:row.qid_suggestion,verified:false,
  source_status:'wikidata_entity_found_unverified',entity_label:saved.entity_label||null,
  entity_description:saved.entity_description||null,claims,reusedPinnedSource:true};
}

export async function collect1352(queue,{output,labelsOutput,fetchImpl=fetch}={}){
 if(!output||!labelsOutput)throw Error('Source and label output files required');
 if(queue?.review_status!=='IDENTITY_RESEARCH_ONLY'||queue.results?.length!==1650)throw Error('Complete research queue required');
 const active=queue.results.filter(x=>x.status==='single_plausible_not_verified');
 if(active.length!==1352)throw Error('Expected 1352 plausible identities');
 await mkdir(dirname(output),{recursive:true});
 const saved=await loadSourceEvidence550();
 const originalRows=new Map(active.map(x=>[x.id,x]));
 const cached=saved.subjects.map(x=>convertSavedSource(originalRows.get(x.id)||{},x)).filter(Boolean);
 const combined=new Map(cached.map(x=>[x.id,x]));
 const needSource=active.filter(x=>!combined.has(x.id));
 const pending={review_status:'IDENTITY_RESEARCH_ONLY',results:needSource};
 let primary={requested:0,completed:0,errors:0},source={
  status:'RESEARCH_CLAIMS_UNREVIEWED',source:'https://www.wikidata.org/',
  identity_approvals:0,factual_approvals:0,errors:[],subjects:[],completed:0};
 if(needSource.length){
  primary=await collectUnreviewedFacts(pending,{outputPath:output+'.fresh.json',fetchImpl,paceMs:1500,batchSize:40,
   onProgress:x=>process.stderr.write('Fresh Wikidata subject batches '+x.completed+'/'+x.total+'; API errors '+x.errors+'\n')});
  const fresh=JSON.parse(await readFile(output+'.fresh.json','utf8'));
  for(const x of fresh.subjects)combined.set(x.id,x);
  source.errors=fresh.errors;
 }
 source.subjects=active.map(x=>combined.get(x.id));
 source.completed=source.subjects.length;
 await writeFile(output,JSON.stringify(source)+'\n');
 // Retry only missing source entities, in smaller batches. Every source
 // artifact is checkpointed before moving to labels.
 for(let round=1;round<=2;round++){
  const misses=active.filter(x=>combined.get(x.id)?.source_status!=='wikidata_entity_found_unverified');
  if(!misses.length)break;
  const narrowed={review_status:'IDENTITY_RESEARCH_ONLY',results:misses};
  const retryPath=output+'.retry-'+round+'.json';
  await collectUnreviewedFacts(narrowed,{outputPath:retryPath,fetchImpl,paceMs:2000,batchSize:10,
   onProgress:x=>process.stderr.write('Source retry '+round+' '+x.completed+'/'+x.total+'\n')});
  const retried=JSON.parse(await readFile(retryPath,'utf8'));
  for(const x of retried.subjects){
   if(x.source_status==='wikidata_entity_found_unverified'||!combined.has(x.id))combined.set(x.id,x);
  }
  source.subjects=active.map(x=>combined.get(x.id));
  source.completed=source.subjects.length;
  source.errors=[...source.errors,...retried.errors];
  await writeFile(output,JSON.stringify(source)+'\n');
 }
 source.subjects=active.map(x=>combined.get(x.id));
 if(source.subjects.length!==1352||source.subjects.some(x=>!x))throw Error('Research source coverage incomplete: missing row');
 source.completed=1352;
 source.research_only=true;
 source.identity_approvals=0;
 source.factual_approvals=0;
 await writeFile(output,JSON.stringify(source)+'\n');
 const qids=[...new Set(source.subjects.flatMap(s=>(s.claims||[])
  .filter(c=>c.kind==='item'&&/^Q\d+$/.test(c.value_id||'')).map(c=>c.value_id)))].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
 const labels={},failed=[];
 await mkdir(dirname(labelsOutput),{recursive:true});
 for(let i=0;i<qids.length;i+=40){
  const selected=qids.slice(i,i+40);
  let ok=false;
  for(let tryNum=1;tryNum<=3&&!ok;tryNum++){
   try{
    const data=await wikidataFetch({action:'wbgetentities',ids:selected.join('|'),props:'labels|descriptions',
     languages:'en',format:'json',formatversion:2},{fetchImpl});
    for(const qid of selected){
     const entity=data.entities?.[qid];
     if(entity?.labels?.en?.value)labels[qid]={label:entity.labels.en.value,
      description:entity.descriptions?.en?.value||'',
      source:'https://www.wikidata.org/wiki/'+qid,status:'UNREVIEWED_REFERENCE_LABEL'};
    }
    ok=true;
   }catch(err){
    if(tryNum===3)failed.push({offset:i,qids:selected,error:String(err).slice(0,200)});
    else await sleep(2500*tryNum);
   }
  }
  if(i%400===0||i+40>=qids.length)await writeFile(labelsOutput,JSON.stringify({
   status:'RESEARCH_LABELS_UNREVIEWED',referenced:qids.length,resolved:Object.keys(labels).length,
   failed,labels})+'\n');
  process.stderr.write('Wikidata linked labels '+Math.min(i+40,qids.length)+'/'+qids.length+'\n');
  if(i+40<qids.length)await sleep(900);
 }
 const result={active:1352,sourceFound:source.subjects.filter(x=>x.source_status==='wikidata_entity_found_unverified').length,
  sourceMissing:source.subjects.filter(x=>x.source_status!=='wikidata_entity_found_unverified').length,
  claims:source.subjects.reduce((sum,s)=>sum+(s.claims||[]).length,0),
  relatedQids:qids.length,labeledQids:Object.keys(labels).length,labelFailedBatches:failed.length,
  identityApprovals:0,factualApprovals:0,researchOnly:true,reusedPinnedClaims:cached.length,initial:primary};
 console.log(JSON.stringify(result,null,2));
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [queuePath,sourceOutput,labelsOutput]=process.argv.slice(2);
 if(!queuePath||!sourceOutput||!labelsOutput)throw Error('Usage: node scripts/pam-1352-source-research.mjs <queue> <sources-output> <labels-output>');
 await collect1352(JSON.parse(await readFile(queuePath,'utf8')),{output:sourceOutput,labelsOutput});
}
