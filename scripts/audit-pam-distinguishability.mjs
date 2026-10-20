import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';

const {targets,questions,weights,knownMask}=await loadPam1775Model(loadPamClassicModel);
const N=targets.length,F=questions.length;
const known=(q,t)=>!knownMask||knownMask[q*N+t]===1;
const signature=t=>Array.from({length:F},(_,q)=>known(q,t)?String(weights[q*N+t]):'?').join('');
const groups=new Map();
for(let t=0;t<N;t++){
 const key=signature(t);
 if(!groups.has(key))groups.set(key,[]);
 groups.get(key).push(targets[t]);
}
const exact=[...groups.values()].filter(g=>g.length>1).sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]));
// A pair is indistinguishable if no question has two known, differing answers.
// Unknown evidence is deliberately not interpreted as "no".
const unresolved=[];
for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){
 let differences=0,comparable=0;
 for(let q=0;q<F;q++){
  if(!known(q,a)||!known(q,b))continue;
  comparable++;
  if(weights[q*N+a]!==weights[q*N+b])differences++;
  if(differences>1)break;
 }
 if(differences<=1)unresolved.push({a:targets[a],b:targets[b],distinguishingQuestions:differences,comparableQuestions:comparable});
}
unresolved.sort((a,b)=>a.distinguishingQuestions-b.distinguishingQuestions||a.a.localeCompare(b.a)||a.b.localeCompare(b.b));
const report={targets:N,questions:F,exactProfileGroups:exact.length,exactProfileTargets:exact.reduce((n,g)=>n+g.length,0),pairsWithAtMostOneKnownDifference:unresolved.length,exactGroups:exact,unresolvedPairs:unresolved};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--strict')&&unresolved.length)process.exitCode=1;
