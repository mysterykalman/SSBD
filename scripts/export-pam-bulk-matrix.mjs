// Export every cell of the 1775 x 156 Pam knowledge matrix for bulk review.
// Usage: node scripts/export-pam-bulk-matrix.mjs artifacts/pam-matrix.csv
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {enrichPamModel} from './pam-enrich-model.mjs';
import {applyVerifiedPamFacts} from './pam-verified-facts.mjs';
const target=process.argv[2]||'artifacts/pam-matrix.csv';
const raw=await loadPam1775Model(loadPamClassicModel);
const result=await applyVerifiedPamFacts(enrichPamModel(raw));
const n=result.targets.length,q=result.questions.length;
if(n!==1775||q!==156)throw Error('Model shape changed');
const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
const stateLabel=['probably not','probably','no','yes'];
let known=0,unknown=0,legacy=0;
const lines=['target_index,target,question_index,question,answer,confidence_class'];
for(let t=0;t<n;t++){
 for(let i=0;i<q;i++){
  const cell=i*n+t;
  const has=result.knownMask[cell]===1;
  const legacyCell=t<1400;
  const answer=has?stateLabel[result.weights[cell]]:'unknown';
  const provenance=has?(legacyCell?'legacy_unverified':'recorded_or_derived'):'unknown';
  known+=Number(has);unknown+=Number(!has);legacy+=Number(has&&legacyCell);
  lines.push([t,quote(result.targets[t]),i,quote(result.questions[i]),quote(answer),provenance].join(','));
 }
}
await mkdir(dirname(target),{recursive:true});
await writeFile(target,lines.join('\n')+'\n');
const report={targets:n,questions:q,cells:n*q,known,unknown,legacyUnverified:legacy,
 inferred:result.enrichment.additions.length,sourceBacked:result.verifiedEnrichment.applied.length,
 conflicts:result.enrichment.conflicts.length+result.verifiedEnrichment.conflicts.length,
 output:target};
await writeFile(target+'.summary.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
