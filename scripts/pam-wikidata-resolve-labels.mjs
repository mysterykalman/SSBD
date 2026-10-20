/**
 * Label the value entities in the saved Wikidata 550-source positive claims.
 * Research-only: labels let humans interpret source IDs and design natural
 * questions. They are not independent factual verification or a No answer.
 */
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSourceEvidence550} from './pam-source-evidence-compiler.mjs';
import {wikidataFetch} from './pam-wikidata-reconcile.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const QID=/^Q\d+$/;

export function referencedValueQids(source){
 if(source?.review_status!=='research_only_unverified')throw Error('Unexpected source review status');
 const ids=new Set();
 for(const subject of source.subjects){
  if(subject.verified)throw Error('Approved subject unexpectedly entered unreviewed research');
  for(const claim of subject.claims){
   if(claim.k==='item'&&typeof claim.v==='string'&&QID.test(claim.v))ids.add(claim.v);
  }
 }
 return [...ids].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
}

export async function retrieveValueLabels(source,{fetchImpl=fetch,batchSize=40,paceMs=1000,onProgress=()=>{},outFile=null}={}){
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>45)throw Error('invalid label batch size');
 if(!Number.isInteger(paceMs)||paceMs<250)throw Error('paceMs cannot be below 250');
 const ids=referencedValueQids(source);
 const labels={};const failed=[];
 for(let i=0;i<ids.length;i+=batchSize){
  const selected=ids.slice(i,i+batchSize);
  try{
   const res=await wikidataFetch({action:'wbgetentities',ids:selected.join('|'),props:'labels|descriptions',languages:'en',format:'json',formatversion:2},{fetchImpl});
   for(const qid of selected){
    const e=res.entities?.[qid];
    if(e?.missing||!e?.labels?.en?.value)continue;
    labels[qid]={label:e.labels.en.value,description:e.descriptions?.en?.value||'',source:`https://www.wikidata.org/wiki/${qid}`,status:'unreviewed_reference_label'};
   }
  }catch(err){failed.push({batch:Math.floor(i/batchSize),qid_list:selected,error:String(err).slice(0,250)});}
  const doc={review_status:'research_only_unverified',subject_count:source.subjects.length,
    referenced_value_qids:ids.length,labeled_value_qids:Object.keys(labels).length,
    failed_batches:failed,labels};
  if(outFile){await mkdir(dirname(outFile),{recursive:true});await writeFile(outFile,JSON.stringify(doc)+'\n');}
  onProgress({completed:Math.min(i+batchSize,ids.length),total:ids.length,labeled:Object.keys(labels).length,failed:failed.length});
  if(i+batchSize<ids.length)await sleep(paceMs);
 }
 return{review_status:'research_only_unverified',subject_count:source.subjects.length,
  referenced_value_qids:ids.length,labeled_value_qids:Object.keys(labels).length,
  failed_batches:failed,labels};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const src=await loadSourceEvidence550();
 const outFile=join(root,'data','pam20q','expansion','wikidata-value-labels.json');
 const res=await retrieveValueLabels(src,{outFile,onProgress:x=>console.error(`labels ${x.completed}/${x.total}, got ${x.labeled}, failed ${x.failed}`)});
 console.log(JSON.stringify({total:res.referenced_value_qids,labeled:res.labeled_value_qids,failed:res.failed_batches.length,status:res.review_status}));
}