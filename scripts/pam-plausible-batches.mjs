/**
 * Deterministic work packets for the plausible-only Pam identity cohort.
 * These are review packets, NOT approved knowledge or runtime input.
 * Usage: node scripts/pam-plausible-batches.mjs <review.json> <output-directory>
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/pam-plausible-batches.mjs <review.json> <output-directory>');
const data=JSON.parse(await readFile(input,'utf8'));
if(data.review_status!=='IDENTITY_RESEARCH_ONLY'||data.retrieved!==1650)
 throw Error('Expected complete, unapproved 1,650-row research queue');
const plausible=data.results.filter(x=>x.status==='single_plausible_not_verified');
const deferred=data.results.filter(x=>x.status!=='single_plausible_not_verified');
if(plausible.length!==1352||deferred.length!==298)throw Error('Cohort counts changed; review before proceeding');
if(data.results.some(x=>x.reviewed||x.reviewed_qid))throw Error('Research input unexpectedly includes approvals');
plausible.sort((a,b)=>a.id.localeCompare(b.id));
await mkdir(output,{recursive:true});
const sizes=[135,135,135,135,135,135,135,135,135,137];
let offset=0;
const manifest={status:'UNVERIFIED_REVIEW_PACKETS',sourceTotal:1650,active:1352,deferred:298,batches:[]};
for(let i=0;i<sizes.length;i++){
 const rows=plausible.slice(offset,offset+sizes[i]);
 const name=`batch-${String(i+1).padStart(2,'0')}.json`;
 await writeFile(join(output,name),JSON.stringify({status:'PENDING_HUMAN_FACT_CHECK',batch:i+1,rows:rows.map(r=>({...r,identityDecision:'PENDING',duplicateDecision:'PENDING',factEvidence:[],gameplayDecision:'PENDING'}))},null,2)+'\n');
 manifest.batches.push({batch:i+1,file:name,count:rows.length,firstId:rows[0].id,lastId:rows.at(-1).id});
 offset+=rows.length;
}
if(offset!==1352||new Set(plausible.map(x=>x.id)).size!==1352)throw Error('Missing or duplicated plausible candidate');
await writeFile(join(output,'deferred-298.json'),JSON.stringify({status:'DEFERRED',rows:deferred},null,2)+'\n');
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
