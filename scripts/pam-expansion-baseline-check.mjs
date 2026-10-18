/** Compare unapproved 1,650 roster to frozen 1,775 baseline without mutating it. */
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {loadThematicRoster} from './pam-thematic-lab.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const [model,roster]=await Promise.all([
 loadPam1775Model(loadPamClassicModel),loadThematicRoster()
]);
const strict=value=>String(value).trim().normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g,' ');
const loose=value=>strict(value).replace(/^(an?|the)\s+/,'').replace(/\s*\([^)]*\)\s*$/,'').trim();
const originalExact=new Map(),originalLoose=new Map();
for(const n of model.targets){
 const a=strict(n),b=loose(n);
 if(!originalExact.has(a))originalExact.set(a,[]);originalExact.get(a).push(n);
 if(!originalLoose.has(b))originalLoose.set(b,[]);originalLoose.get(b).push(n);
}
const exactTitleCollisions=[],possibleHomonyms=[];
for(const r of roster){
 const exact=originalExact.get(strict(r.name)),near=originalLoose.get(loose(r.name));
 if(exact)exactTitleCollisions.push({new:r.name,topic:r.category,original:exact,interpretation:'Same displayed title; verify referent, do not auto-delete.'});
 else if(near)possibleHomonyms.push({new:r.name,topic:r.category,original:near,interpretation:'Similar wording but often a different concept, brand or artwork; protect with topical filters.'});
}
const report={baselineCount:model.targets.length,proposedCount:roster.length,potentialCount:model.targets.length+roster.length,exactTitleCollisions:exactTitleCollisions.length,nearTitleHomonyms:possibleHomonyms.length,exactTitleReview:exactTitleCollisions,homonymReview:possibleHomonyms,reviewStatus:'candidate_unreviewed',productionMutation:false,releaseGate:'BLOCKED: source facts and candidate distinguishability; all matching titles require referent review, not automatic deduplication'};
if(model.targets.length!==1775||model.questions.length!==156)throw Error('Frozen baseline has moved unexpectedly');
const dir=join(import.meta.dirname,'..','data','pam20q','expansion');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'baseline-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));