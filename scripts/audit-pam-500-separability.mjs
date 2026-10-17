import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model,loadPamExpandedModel} from './pam-quality-model.mjs';
import {writeFile,mkdir} from 'node:fs/promises';

const baseline=await loadPam1775Model(loadPamClassicModel);
const expanded=await loadPamExpandedModel(loadPamClassicModel);
const F=baseline.questions.length,N=expanded.targets.length,B=baseline.targets.length;
if(F!==156||B!==1775||N!==2275)throw new Error('Unexpected Pam 500 model shape');
const known=(q,t)=>expanded.knownMask[q*N+t]===1;
const yes=(q,t)=>(expanded.weights[q*N+t]&1)===1;
function compare(a,b){
 let contradictions=0,overlap=0,unknownA=0,unknownB=0;
 for(let q=0;q<F;q++){
  const ak=known(q,a),bk=known(q,b);
  if(!ak)unknownA++;
  if(!bk)unknownB++;
  if(ak&&bk){overlap++;if(yes(q,a)!==yes(q,b))contradictions++;}
 }
 return{contradictions,overlap,unknownA,unknownB};
}
const categories=['animal','vegetable','mineral','other'];
const types={};for(const x of categories)types[x]={total:0,noSeparatingQuestion:0,oneSeparatingQuestion:0,meanKnown:0};
const results=[],distribution={};
for(let t=B;t<N;t++){
 const category=categories.find((_,q)=>yes(q,t));
 const info=types[category];if(!info)throw new Error('Invalid category '+expanded.targets[t]);
 info.total++;
 let knownCount=0,yesCount=0,noCount=0,weakCount=0;
 for(let q=0;q<F;q++){if(known(q,t)){knownCount++;if(yes(q,t))yesCount++;else noCount++;if((expanded.weights[q*N+t]&2)===0)weakCount++;}}
 info.meanKnown+=knownCount;
 let nearestOld={distance:Infinity,name:''},nearestNew={distance:Infinity,name:''},totalZeroOld=0,totalZeroNew=0;
 for(let j=0;j<N;j++){
  if(j===t)continue;
  if(yes(0,t)!==yes(0,j)||yes(1,t)!==yes(1,j)||yes(2,t)!==yes(2,j)||yes(3,t)!==yes(3,j))continue;
  const c=compare(t,j);
  if(j<B){
   if(c.contradictions===0)totalZeroOld++;
   if(c.contradictions<nearestOld.distance)nearestOld={distance:c.contradictions,name:expanded.targets[j],overlap:c.overlap};
  }else{
   if(c.contradictions===0)totalZeroNew++;
   if(c.contradictions<nearestNew.distance)nearestNew={distance:c.contradictions,name:expanded.targets[j],overlap:c.overlap};
  }
 }
 const minSeparation=Math.min(nearestOld.distance,nearestNew.distance);
 if(minSeparation===0)info.noSeparatingQuestion++;
 if(minSeparation<=1)info.oneSeparatingQuestion++;
 const entry={name:expanded.targets[t],category,known:knownCount,yes:yesCount,no:noCount,weak:weakCount,minSeparation,nearestOld,nearestNew,zeroOld:totalZeroOld,zeroNew:totalZeroNew};
 distribution[minSeparation]=(distribution[minSeparation]||0)+1;
 results.push(entry);
}
for(const item of Object.values(types))if(item.total)item.meanKnown=Number((item.meanKnown/item.total).toFixed(1));
results.sort((a,b)=>a.minSeparation-b.minSeparation||a.yes-b.yes||a.name.localeCompare(b.name));
const report={
 metadata:{totalTargets:N,previousTargets:B,newTargets:N-B,questionCount:F},
 summary:{categories:types,minSeparatingQuestions:distribution,
  ambiguousWithExisting:results.filter(r=>r.zeroOld).length,
  ambiguousWithNew:results.filter(r=>r.zeroNew).length,
  ambiguousWithEither:results.filter(r=>r.minSeparation===0).length,
  atMostOneDistinguishingQuestion:results.filter(r=>r.minSeparation<=1).length},
 worst:results.slice(0,60),targets:results
};
await mkdir('.dev-data/pam-500',{recursive:true});
await writeFile('.dev-data/pam-500/separability-report.json',JSON.stringify(report,null,2)+'\n');
console.log('PAM_500_SEPARABILITY='+JSON.stringify(report.summary));
console.log('PAM_500_WORST='+JSON.stringify(report.worst.slice(0,25)));
if(process.argv.includes('--strict')){
 if(report.summary.ambiguousWithEither)throw new Error(report.summary.ambiguousWithEither+' proposed targets have zero separating known questions');
}
