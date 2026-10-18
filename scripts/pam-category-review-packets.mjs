/**
 * Prepare semantic-category review packets from the frozen 1,650 identity queue.
 * A research suggestion is never an editorial approval.
 * Usage: node scripts/pam-category-review-packets.mjs <review.json> <output-dir>
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const [source,dest]=process.argv.slice(2);
if(!source||!dest)throw Error('Usage: node scripts/pam-category-review-packets.mjs <review.json> <output-dir>');
const queue=JSON.parse(await readFile(source,'utf8'));
if(queue.review_status!=='IDENTITY_RESEARCH_ONLY'||queue.results.length!==1650)throw Error('Expected complete unapproved identity queue');
const active=queue.results.filter(r=>r.status==='single_plausible_not_verified');
const paused=queue.results.filter(r=>r.status!=='single_plausible_not_verified');
if(active.length!==1352||paused.length!==298||queue.results.some(r=>r.reviewed||r.reviewed_qid))throw Error('Research cohort count or approval status changed');
const grouped=new Map();
for(const row of active){
 const key=row.category+' / '+row.subcategory;
 if(!grouped.has(key))grouped.set(key,[]);
 grouped.get(key).push(row);
}
await mkdir(dest,{recursive:true});
const manifest={status:'UNVERIFIED_CATEGORY_RESEARCH_ONLY',active:active.length,deferred:paused.length,groups:[]};
let n=0;
for(const [key,rows] of [...grouped].sort(([a],[b])=>a.localeCompare(b))){
 rows.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const file='cluster-'+String(++n).padStart(2,'0')+'.json';
 await writeFile(join(dest,file),JSON.stringify({categoryCluster:key,approval:'NONE',count:rows.length,rows:rows.map(r=>({...r,identityDecision:'PENDING',sources:[],verifiedSharedTraits:[],verifiedDifferentiators:[],closestCompetitors:[],gameplayValidation:'PENDING'}))},null,2)+'\n');
 manifest.groups.push({cluster:key,file,count:rows.length});
}
await writeFile(join(dest,'deferred-298.json'),JSON.stringify({status:'PAUSED',rows:paused},null,2)+'\n');
await writeFile(join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(manifest.groups.reduce((sum,g)=>sum+g.count,0)!==1352)throw Error('Category packet reconciliation failed');
console.log(JSON.stringify(manifest,null,2));
