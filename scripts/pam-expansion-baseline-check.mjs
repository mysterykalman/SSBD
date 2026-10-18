/** Compare unapproved 1,650 roster to frozen 1,775 baseline without mutating it. */
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {loadThematicRoster} from './pam-thematic-lab.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const [model,roster]=await Promise.all([
 loadPam1775Model(loadPamClassicModel),loadThematicRoster()
]);
const norm=value=>String(value).trim().normalize('NFKC').toLocaleLowerCase('en').replace(/^(an?|the)\s+/,'').replace(/\s*\([^)]*\)\s*$/,'').replace(/\s+/g,' ');
const original=new Map();
for(const n of model.targets){let key=norm(n);if(!original.has(key))original.set(key,[]);original.get(key).push(n);}
const direct=[];
for(const r of roster){const overlaps=original.get(norm(r.name));if(overlaps)direct.push({new:r.name,original:overlaps});}
const report={baselineCount:model.targets.length,proposedCount:roster.length,potentialCount:model.targets.length+roster.length,directOrNearNameOverlaps:direct.length,overlaps:direct,reviewStatus:'candidate_unreviewed',productionMutation:false,releaseGate:direct.length?'BLOCKED: name conflict review needed':'BLOCKED: insufficient distinguishing knowledge / self-play reliability'};
if(model.targets.length!==1775||model.questions.length!==156)throw Error('Frozen baseline has moved unexpectedly');
const dir=join(import.meta.dirname,'..','data','pam20q','expansion');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'baseline-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));