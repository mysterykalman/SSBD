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

// The review queue identifies the unanswered question cells with the greatest
// potential to separate collided targets. It NEVER infers a factual answer:
// a reviewer must decide whether any proposed yes/no is actually true.
const reviewQueue=[],reviewCsv=[
 ['target','category','ambiguous_peers','question_index','question','known_yes_peers','known_no_peers','example_yes_peer','example_no_peer']
];
for(let t=B;t<N;t++){
 const peers=[];
 for(let j=B;j<N;j++){
  if(j===t)continue;
  if(categories.findIndex((_,q)=>yes(q,t))!==categories.findIndex((_,q)=>yes(q,j)))continue;
  if(compare(t,j).contradictions===0)peers.push(j);
 }
 if(!peers.length)continue;
 const opportunities=[];
 for(let q=4;q<F;q++){
  if(known(q,t))continue;
  const yesPeers=peers.filter(j=>known(q,j)&&yes(q,j));
  const noPeers=peers.filter(j=>known(q,j)&&!yes(q,j));
  const opportunity=Math.max(yesPeers.length,noPeers.length);
  if(opportunity===0)continue;
  opportunities.push({
   questionIndex:q,question:baseline.questions[q],potentialPeers:opportunity,
   knownYesPeers:yesPeers.length,knownNoPeers:noPeers.length,
   exampleYes:yesPeers.length?expanded.targets[yesPeers[0]]:null,
   exampleNo:noPeers.length?expanded.targets[noPeers[0]]:null
  });
 }
 opportunities.sort((a,b)=>b.potentialPeers-a.potentialPeers||a.questionIndex-b.questionIndex);
 const top=opportunities.slice(0,8);
 const category=categories.find((_,q)=>yes(q,t));
 reviewQueue.push({target:expanded.targets[t],category,ambiguousPeers:peers.length,reviewQuestions:top});
 for(const rec of top)reviewCsv.push([
  expanded.targets[t],category,String(peers.length),String(rec.questionIndex),rec.question,
  String(rec.knownYesPeers),String(rec.knownNoPeers),rec.exampleYes||'',rec.exampleNo||''
 ]);
}
reviewQueue.sort((a,b)=>b.ambiguousPeers-a.ambiguousPeers||a.target.localeCompare(b.target));
const csvCell=s=>'"'+String(s).replaceAll('"','""')+'"';
await writeFile('.dev-data/pam-500/review-queue.csv',reviewCsv.map(row=>row.map(csvCell).join(',')).join('\n')+'\n');
await writeFile('.dev-data/pam-500/review-queue.json',JSON.stringify({count:reviewQueue.length,records:reviewQueue},null,2)+'\n');
console.log('PAM_500_REVIEW_QUEUE='+JSON.stringify({
 affectedTargets:reviewQueue.length,reviewPrompts:reviewCsv.length-1,
 highestPriority:reviewQueue.slice(0,6).map(x=>({name:x.target,ambiguousPeers:x.ambiguousPeers,
  topQuestion:x.reviewQuestions[0]?.question||null}))
}));

console.log('PAM_500_SEPARABILITY='+JSON.stringify(report.summary));
console.log('PAM_500_WORST='+JSON.stringify(report.worst.slice(0,25)));
if(process.argv.includes('--strict-existing')&&report.summary.ambiguousWithExisting>0){
 throw new Error(report.summary.ambiguousWithExisting+' proposed targets have no known separating answer against the previous 1775');
}
if(process.argv.includes('--strict')){
 if(report.summary.ambiguousWithEither)throw new Error(report.summary.ambiguousWithEither+' proposed targets have zero separating known questions');
}
