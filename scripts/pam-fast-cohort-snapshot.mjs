/**
 * Fast deterministic checkpoint from hash-pinned source files, without live
 * Wikidata access. Unknown identities remain UNKNOWN until the full run.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSourceEvidence550} from './pam-source-evidence-compiler.mjs';
import {convertSavedSource} from './pam-1352-source-research.mjs';
import {auditPamCohort} from './pam-cohort-validation.mjs';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
export async function createFastCheckpoint(queue){
 if(queue?.review_status!=='IDENTITY_RESEARCH_ONLY'||queue.results?.length!==1650)throw Error('Expected entire queue');
 const source=await loadSourceEvidence550();
 const saved=new Map(source.subjects.map(s=>[s.id,s]));
 const active=queue.results.filter(x=>x.status==='single_plausible_not_verified');
 const subjects=active.map(row=>convertSavedSource(row,saved.get(row.id)||{})||{
  id:row.id,name:row.name,category:row.category,qid:row.qid_suggestion,
  source_status:'source_missing_or_error',claims:[],verified:false
 });
 const doc={status:'RESEARCH_CLAIMS_UNREVIEWED',identity_approvals:0,factual_approvals:0,subjects};
 const baseline=await loadPam1775Model(loadPamClassicModel);
 return auditPamCohort(queue,doc,{originalNames:baseline.targets,labels:{}});
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [path,output]=process.argv.slice(2);
 if(!path||!output)throw Error('Usage: node scripts/pam-fast-cohort-snapshot.mjs <queue.json> <output.json>');
 const report=await createFastCheckpoint(JSON.parse(await readFile(path,'utf8')));
 await mkdir(dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summary:report.summary,
  movieCandidates:report.profiles.filter(x=>x.category==='Movies').map(x=>({id:x.id,name:x.name,franchise:x.franchise?.label||null,sequelReview:x.sequelReview||null})),
  franchiseActions:report.franchiseActions,curatedReplacementFlags:report.curations},null,2));
}
