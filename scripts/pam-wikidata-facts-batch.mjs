/**
 * Collect research-only claims for individually plausible QID suggestions.
 * Runs in CI after source reconciliation, never imports into live 20Q knowledge.
 * 40-entity checkpointing and pacing avoid losing everything after a timeout.
 * Claims remain unreviewed even if they come directly from Wikidata.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {wikidataFetch} from './pam-wikidata-reconcile.mjs';
import {extractClaimFacts} from './pam-wikidata-facts.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(root,'data','pam20q','expansion');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function candidateSubjects(review){
 if(review?.review_status!=='IDENTITY_RESEARCH_ONLY')throw Error('This workflow expects identity suggestions, not approved profiles');
 return review.results.filter(x=>x.status==='single_plausible_not_verified'&&x.qid_suggestion).map(x=>({id:x.id,name:x.name,category:x.category,qid:x.qid_suggestion,match_status:x.status}));
}

export async function collectUnreviewedFacts(review,{fetchImpl=fetch,paceMs=1300,
 outputPath=join(dir,'wikidata-facts-first550.json'),batchSize=20,onProgress=()=>{}}={}){
 const subjects=candidateSubjects(review);
 const results=[],errors=[];
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>40)throw Error('Invalid batchSize');
 for(let i=0;i<subjects.length;i+=batchSize){
  const batch=subjects.slice(i,i+batchSize);
  let entityDoc={};
  try{
   const response=await wikidataFetch({action:'wbgetentities',ids:batch.map(x=>x.qid).join('|'),props:'claims|labels|descriptions',languages:'en',format:'json',formatversion:2},{fetchImpl});
   entityDoc=response.entities||{};
  }catch(error){
   errors.push({batchIndex:Math.floor(i/batchSize),qidList:batch.map(x=>x.qid),error:String(error).slice(0,220)});
  }
  for(const x of batch){
   const e=entityDoc[x.qid];
   results.push({...x,verified:false,
    source_status:e&&!e.missing?'wikidata_entity_found_unverified':'source_missing_or_error',
    entity_label:e?.labels?.en?.value||null,
    entity_description:e?.descriptions?.en?.value||null,
    claims:e&&!e.missing?extractClaimFacts(e):[]});
  }
  await mkdir(dirname(outputPath),{recursive:true});
  const snapshot={status:'RESEARCH_CLAIMS_UNREVIEWED',source:'https://www.wikidata.org/',
   identity_approvals:0,factual_approvals:0,requested:subjects.length,completed:results.length,
   batch_size:batchSize,errors,subjects:results};
  await writeFile(outputPath,JSON.stringify(snapshot,null,2)+'\n');
  onProgress({completed:results.length,total:subjects.length,errors:errors.length});
  if(i+batchSize<subjects.length)await sleep(paceMs);
 }
 return {requested:subjects.length,completed:results.length,errors:errors.length,
  claimCount:results.reduce((n,x)=>n+x.claims.length,0),
  sourceFound:results.filter(x=>x.source_status==='wikidata_entity_found_unverified').length};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const review=JSON.parse(await readFile(join(dir,'wikidata-identity-review.json'),'utf8'));
 const stats=await collectUnreviewedFacts(review,{onProgress:r=>process.stderr.write(`facts ${r.completed}/${r.total} ${r.errors} errors\n`)});
 console.log(JSON.stringify({...stats,releaseGate:'BLOCKED: all QIDs and properties require factual/semantic review'}));
}