import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {loadThematicRoster,compileThematicModel,collisionAudit,oracleTrial} from './pam-thematic-lab.mjs';
import {knownOppositeAudit} from './pam-known-opposite-audit.mjs';
const dir=join(import.meta.dirname,'..','data','pam20q','expansion');
const targets=await loadThematicRoster();
const model=compileThematicModel(targets);
const stats=collisionAudit(model);
const opposite=knownOppositeAudit(model);
const sample=[];
for(let i=0;i<targets.length;i+=Math.max(1,Math.floor(targets.length/100))){
 const r=oracleTrial(model,i,{limit:20});sample.push({name:targets[i].name,category:targets[i].category,correct:r.correct,turns:r.turns,remaining:r.remaining});
}
const report={...stats,knownOpposite:{unique:opposite.uniquelySeparable,unresolvedTargets:opposite.unresolvedTargets,unresolvedPairs:opposite.unresolvedPairs,maxAmbiguousPeers:opposite.maxAmbiguousPeers,perCategory:opposite.byCategory,examples:opposite.examples,releaseGate:opposite.releaseGate},oracleSample:{size:sample.length,correct:sample.filter(s=>s.correct).length,examples:sample.filter(s=>!s.correct).slice(0,12)},releaseGate:'BLOCKED: candidate_unreviewed; no integration into src/client or production until verified profiles and oracle performance pass'};
await mkdir(dir,{recursive:true});
await writeFile(join(dir,'semantic-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({count:stats.count,questions:stats.questionCount,uniqueProfiles:stats.uniqueProfiles,collidingProfiles:stats.collidingProfiles,oracleSample:report.oracleSample,perCategory:stats.perCategory,knownOpposite:report.knownOpposite},null,2));