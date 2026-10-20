// Reproducible full-library knowledge coverage and conservative inference audit.
// Usage: node scripts/pam-full-knowledge-audit.mjs [--output path.json] [--strict]
// Never interprets unknown cells as "no" or changes the frozen knowledge library.
import {writeFile} from 'node:fs/promises';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
const m=await loadPam1775Model(loadPamClassicModel);
const {targets,questions,weights,knownMask}=m,N=targets.length,Q=questions.length;
if(N!==1775||Q!==156)throw Error('Unexpected Pam knowledge shape');
const isKnown=(q,t)=>!knownMask||knownMask[q*N+t]===1;
const edges=new Map([
 [152,[126,129,132]], // mammal -> warm-blooded, spine, living
 [149,[153,99,132]], // feathers -> wings, lays eggs, living
 [155,[152,126,129]], // hooves -> mammal, warm-blooded, spine
 [124,[152,126,129]], // rodent -> mammal, warm-blooded, spine
 [145,[129,132]], // fish -> spine, living (only if question denotes fish; reviewed below)
 [131,[154]], // paws -> feet
]);
const proposed=[],conflicts=[],coverage=[],unknownsByQuestion=Array(Q).fill(0);
const state=(q,t)=>weights[q*N+t];
for(let t=0;t<N;t++){
 let known=0;
 for(let q=0;q<Q;q++)if(isKnown(q,t))known++;else unknownsByQuestion[q]++;
 coverage.push({target:targets[t],known,unknown:Q-known,coverage:known/Q});
 for(const [cause,consequences] of edges){
  if(!isKnown(cause,t)||state(cause,t)!==3)continue;
  for(const inferred of consequences){
   if(!isKnown(inferred,t))proposed.push({target:targets[t],question:inferred,value:3,reasonQuestion:cause,provenance:'logical-implication',status:'proposal'});
   else if(!(state(inferred,t)&1))conflicts.push({target:targets[t],question:inferred,reasonQuestion:cause,existing:state(inferred,t)});
  }
 }
}
const unique=new Map(proposed.map(p=>[p.target+'|'+p.question,p]));
const report={
 schemaVersion:1,model:{targets:N,questions:Q,knownCells:coverage.reduce((s,r)=>s+r.known,0),totalCells:N*Q},
 coverage:{fullyKnown:coverage.filter(r=>!r.unknown).length,targetsWithUnknowns:coverage.filter(r=>r.unknown).length},
 proposals:[...unique.values()],contradictions:conflicts,
 lowCoverage:coverage.filter(r=>r.unknown>0).sort((a,b)=>b.unknown-a.unknown||a.target.localeCompare(b.target)),
 questionGaps:unknownsByQuestion.map((unknown,q)=>({index:q,question:questions[q],unknown})).filter(r=>r.unknown).sort((a,b)=>b.unknown-a.unknown)
};
const idx=process.argv.indexOf('--output');
if(idx!==-1){if(!process.argv[idx+1])throw Error('Missing --output path');await writeFile(process.argv[idx+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({model:report.model,coverage:report.coverage,proposals:report.proposals.length,contradictions:conflicts.length,lowCoverage:report.lowCoverage.slice(0,10),questionGaps:report.questionGaps.slice(0,10)},null,2));
if(process.argv.includes('--strict')&&conflicts.length)process.exitCode=1;
