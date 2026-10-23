import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadThematicRoster,compileThematicModel,collisionAudit,oracleTrial} from './pam-thematic-lab.mjs';
import {inventoryCombined} from './pam-real-roster-benchmark.mjs';
const roster=await loadThematicRoster();
const names=JSON.parse(await readFile(new URL('../data/pam20q/exports/targets-1775.json',import.meta.url),'utf8'));
const inventory=inventoryCombined({targets:names,questions:Array(156).fill('source question')},roster);
const model=compileThematicModel(roster);
const collisions=collisionAudit(model);
const byCategory=new Map();for(let i=0;i<roster.length;i++){
 const category=roster[i].category;if(!byCategory.has(category))byCategory.set(category,[]);byCategory.get(category).push(i);
}
const indexes=[...byCategory.values()].flatMap(a=>[a[0],a[Math.floor((a.length-1)/2)],a[a.length-1]]);
const trials=indexes.map(i=>{const exact=oracleTrial(model,i,{limit:20});const softened=oracleTrial(model,i,{limit:20,softEvery:3});return {id:roster[i].id,name:roster[i].name,category:roster[i].category,exact:exact.correct,soft:softened.correct,exactTurns:exact.turns,softTurns:softened.turns,remaining:exact.remaining,reason:exact.reason||null};});
const known=model.questions.reduce((n,q)=>n+q.known.reduce((s,v)=>s+v,0),0);
const summary={status:'RESEARCH_DIAGNOSTIC_ONLY',sourceTargets:1650,originalTargets:1775,netUniqueNew:inventory.uniqueNewNames,exactNameOverlaps:inventory.crossLibraryExactNameOverlaps,combinedUniqueNames:inventory.combinedUniqueNames,experimentalQuestions:model.questions.length,questionTargetCells:model.questions.length*1650,knownCells:known,unknownCells:model.questions.length*1650-known,collisions:{uniqueProfiles:collisions.uniqueProfiles,collidingProfiles:collisions.collidingProfiles,largest:collisions.largestCollisions.slice(0,8)},sample:{method:'first, median and last target of each of 11 frozen roster categories',targets:trials.length,exactCorrect:trials.filter(x=>x.exact).length,softCorrect:trials.filter(x=>x.soft).length,failures:trials.filter(x=>!x.exact||!x.soft),trials},limits:['Uses workbook-derived candidate facts without individual factual approvals','All 1650 included in question competition, only 33 representative targets played','Not a test against the original 1775 engine and not production playable']};
const dest=process.argv[2]||'artifacts/pam-real-roster-quickcheck.json';await mkdir(dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,sample:{...summary.sample,trials:undefined}},null,2));
