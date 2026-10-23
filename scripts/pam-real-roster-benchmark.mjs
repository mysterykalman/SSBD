/** Full recovered-roster vs actual production library laboratory. Run: node scripts/pam-real-roster-benchmark.mjs */
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {enrichPamModel} from './pam-enrich-model.mjs';
import {applyVerifiedPamFacts} from './pam-verified-facts.mjs';
import {applyReviewedPamCorrections} from './pam-reviewed-corrections.mjs';
import {loadThematicRoster,compileThematicModel,collisionAudit,oracleTrial} from './pam-thematic-lab.mjs';
import {oracleThematicGame} from './pam-thematic-reasoner.mjs';

const norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\\s+/g,' ');
export function inventoryCombined(base,roster){
 if(base.targets.length!==1775||base.questions.length!==156||roster.length!==1650)throw Error('Actual 1775 + 1650 required');
 const original=new Map(base.targets.map((name,i)=>[norm(name),i]));
 const overlaps=roster.filter(x=>original.has(norm(x.name))).map(x=>({id:x.id,name:x.name,originalIndex:original.get(norm(x.name)),category:x.category}));
 const newEntries=roster.filter(x=>!original.has(norm(x.name)));
 const names=new Map();const duplicates=[];
 for(const x of newEntries){const k=norm(x.name);if(names.has(k))duplicates.push([x.name,names.get(k)]);else names.set(k,x.name);}
 const counts={};for(const x of roster)counts[x.category]=(counts[x.category]||0)+1;
 return{oldTargets:base.targets.length,recoveredCandidates:roster.length,crossLibraryExactNameOverlaps:overlaps,internalDuplicates:duplicates,uniqueNewNames:newEntries.length,combinedUniqueNames:base.targets.length+newEntries.length,categories:counts,newEntries};
}
export function benchmarkThematicCohorts(roster,{limit=20,softEvery=3,trialCap=1650}={}){
 const model=compileThematicModel(roster);
 const collisions=collisionAudit(model);
 const tested=[];
 for(let i=0;i<Math.min(roster.length,trialCap);i++){
  const t=roster[i];
  const result=oracleTrial(model,i,{limit});
  const soft=oracleTrial(model,i,{limit,softEvery});
  tested.push({id:t.id,name:t.name,category:t.category,exact:result.correct,soft:soft.correct,exactTurns:result.turns,softTurns:soft.turns,remaining:result.remaining,reason:result.reason||null});
 }
 const perCategory={};for(const x of tested){const s=perCategory[x.category]??={targets:0,exact:0,soft:0};s.targets++;s.exact+=Number(x.exact);s.soft+=Number(x.soft);}
 return{questions:model.questions.length,profiles:model.targets.length,source:'unreviewed frozen research roster',knownCells:model.questions.reduce((n,q)=>n+q.known.reduce((s,v)=>s+v,0),0),collisions,tested:tested.length,exactSolved:tested.filter(x=>x.exact).length,softSolved:tested.filter(x=>x.soft).length,perCategory,failures:tested.filter(x=>!x.exact||!x.soft).slice(0,100),trials:tested};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [base,roster]=await Promise.all([
  loadPam1775Model(loadPamClassicModel).then(enrichPamModel).then(applyVerifiedPamFacts).then(applyReviewedPamCorrections),
  loadThematicRoster()
 ]);
 const inventory=inventoryCombined(base,roster);
 // The roster benchmark is intentionally separate from the original gameplay engine.
 // Never present these per-cohort results as proof of a combined 3425-target game.
 const benchmark=benchmarkThematicCohorts(roster);
 const report={status:'RESEARCH_ONLY_NOT_PRODUCTION_APPROVAL',date:'2026-10-22',inventory:{...inventory,newEntries:undefined},benchmark:{...benchmark,trials:undefined},limits:['Candidate labels and inferred questions have not been individually verified','Thematic engine is run with all 1650 candidate profiles, but NOT integrated with 1775 classic gameplay','No new production target or approved question is claimed']};
 const dest=process.argv[2]||'artifacts/pam-real-roster-benchmark.json';
 await mkdir(dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(report,null,2)+'\\n');
 await writeFile(dest.replace(/\\.json$/,'')+'-trials.json',JSON.stringify(benchmark.trials,null,2)+'\\n');
 console.log(JSON.stringify({file:dest,candidates:inventory.recoveredCandidates,uniqueNew:inventory.uniqueNewNames,overlaps:inventory.crossLibraryExactNameOverlaps.length,questions:benchmark.questions,exact:benchmark.exactSolved,soft:benchmark.softSolved,trials:benchmark.tested,colliding:benchmark.collisions.collidingProfiles}));
}
