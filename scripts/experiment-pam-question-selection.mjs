import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const outDir=join(root,'artifacts','pam-question-redundancy');
const model=await loadPam1775Model(loadPamClassicModel);
const {questions,targets,weights,knownMask}=model;
const N=targets.length,F=questions.length;
if(N!==1775||F!==156)throw new Error(`Expected 1775×156 model, got ${N}×${F}`);
const stateAt=(q,t)=>weights[q*N+t];
const knownAt=(q,t)=>!knownMask||knownMask[q*N+t]===1;
const polarity=s=>s&1;
const strength=s=>(s&2)?2:1;
const CATEGORY_Q={animal:0,vegetable:1,mineral:2,other:3};
const round=(v,d=4)=>Number(Number(v).toFixed(d));
const pct=v=>round(v*100,2);
const pairKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const median=values=>{const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const inc=(m,k,n=1)=>m.set(k,(m.get(k)||0)+n);

const FAMILIES=Object.freeze({
 size:[8,12,22,24,43,57],
 sound:[30,32,79,111],
 'life-anatomy':[97,126,129,132,152],
 aquatic:[94,100,120,145],
 temperature:[48,51,65,92],
 headwear:[69,141],
 transparency:[56,116],
 'soft-fur':[20,101,125],
 'feathers-wings':[149,153],
 'food-taste':[85,86,117],
 diet:[115,119,128,142],
 colour:[6,9,13,27,71,74,87,108],
 'legs-feet':[62,154]
});
const familyByQ=Array.from({length:F},()=>[]);
for(const [family,indexes] of Object.entries(FAMILIES))for(const q of indexes)familyByQ[q].push(family);

const SEMANTIC_PAIRS=Object.freeze([
 [97,132],[30,32],[85,117],[126,152],[62,154],[149,153],[56,116],[100,120],[119,128],[42,148],[69,141],[101,125]
]);
const semanticPairSet=new Set(SEMANTIC_PAIRS.map(([a,b])=>pairKey(a,b)));

function vectorStats(a,b){
 let n11=0,n10=0,n01=0,n00=0,commonKnown=0;
 for(let t=0;t<N;t++){
  if(!knownAt(a,t)||!knownAt(b,t))continue;
  commonKnown++;
  const pa=polarity(stateAt(a,t)),pb=polarity(stateAt(b,t));
  if(pa&&pb)n11++;else if(pa)n10++;else if(pb)n01++;else n00++;
 }
 const union=n11+n10+n01;
 const denom=Math.sqrt((n11+n10)*(n01+n00)*(n11+n01)*(n10+n00));
 const phi=denom?((n11*n00-n10*n01)/denom):0;
 return{a,b,commonKnown,union,jaccard:union?n11/union:0,phi};
}
const nearVectorPairs=[];
for(let a=4;a<F;a++)for(let b=a+1;b<F;b++){
 const s=vectorStats(a,b);
 if(s.commonKnown>=1200&&s.union>=50&&s.phi>=0.85&&s.jaccard>=0.75)nearVectorPairs.push(s);
}
const nearVectorSet=new Set(nearVectorPairs.map(x=>pairKey(x.a,x.b)));

const CONFIGS=Object.freeze([
 {name:'baseline'},
 {name:'families-mild-t98',familyFactors:{1:.75,2:.86,3:.94},baseFloor:.98},
 {name:'families-moderate-t96',familyFactors:{1:.55,2:.72,3:.85,4:.94},baseFloor:.96},
 {name:'families-strong-t94',familyFactors:{1:.35,2:.55,3:.75,4:.88,5:.95},baseFloor:.94},
 {name:'moderate-plus-pairs-t96',familyFactors:{1:.58,2:.75,3:.87,4:.95},pairFactors:{1:.28,2:.45,3:.62,4:.78,5:.9,6:.96},baseFloor:.96},
 {name:'moderate-pairs-hard-alive-t96',familyFactors:{1:.58,2:.75,3:.87,4:.95},pairFactors:{1:.28,2:.45,3:.62,4:.78,5:.9,6:.96},baseFloor:.96,hardPairs:[[97,132]]},
 {name:'moderate-pairs-hard-alive-noise-t96',familyFactors:{1:.58,2:.75,3:.87,4:.95},pairFactors:{1:.28,2:.45,3:.62,4:.78,5:.9,6:.96},baseFloor:.96,hardPairs:[[97,132],[30,32]]}
]);

function createGame(){return{scores:new Float64Array(N),asked:new Set(),history:[],turn:0,budget:20,minGuessQuestions:7,deferGuessOnce:false};}
function rank(game,limit=N){const idx=Array.from({length:N},(_,i)=>i);idx.sort((a,b)=>game.scores[b]-game.scores[a]||a-b);return idx.slice(0,limit);}
function confidence(game){const leaders=rank(game,24);if(!leaders.length)return 0;const max=game.scores[leaders[0]];let sum=0,top=0;for(let i=0;i<leaders.length;i++){const v=Math.exp((game.scores[leaders[i]]-max)/2.4);if(i===0)top=v;sum+=v;}return sum?top/sum:0;}
function top(game){const i=rank(game,1)[0]??0;return{index:i,p:confidence(game)};}
function applyPolarity(game,q,wantYes,responseStrength){for(let t=0;t<N;t++){if(!knownAt(q,t))continue;const s=stateAt(q,t),match=polarity(s)===(wantYes?1:0);game.scores[t]+=(match?1:-1)*strength(s)*responseStrength;}}
function setCategory(game,value){const selected=CATEGORY_Q[value];for(const q of Object.values(CATEGORY_Q)){applyPolarity(game,q,q===selected,2);game.asked.add(q);}game.turn=1;game.history.push({kind:'category',turn:1});}
function candidatePool(game){const ranked=rank(game,96),best=game.scores[ranked[0]??0],close=ranked.filter(i=>game.scores[i]>=best-8);return close.length>=24?close:ranked.slice(0,Math.min(48,ranked.length));}
function recentQuestionGap(game,q){
 let gap=0;
 for(let i=game.history.length-1;i>=0;i--){const h=game.history[i];if(h.kind!=='question')continue;gap++;if(h.q===q)return gap;}
 return null;
}
function hardSuppressed(game,q,config){if(!config.hardPairs)return false;for(const [a,b] of config.hardPairs){if(q===a&&game.asked.has(b))return true;if(q===b&&game.asked.has(a))return true;}return false;}
function redundancyFactor(game,q,config){
 let factor=1;
 if(config.familyFactors){
  for(const family of familyByQ[q]){
   let bestGap=null;
   for(const priorQ of FAMILIES[family]){
    if(priorQ===q||!game.asked.has(priorQ))continue;
    const gap=recentQuestionGap(game,priorQ);
    if(gap!=null&&(bestGap==null||gap<bestGap))bestGap=gap;
   }
   if(bestGap!=null)factor=Math.min(factor,config.familyFactors[bestGap]??1);
  }
 }
 if(config.pairFactors){
  for(let priorQ=4;priorQ<F;priorQ++){
   if(!game.asked.has(priorQ)||!semanticPairSet.has(pairKey(q,priorQ)))continue;
   const gap=recentQuestionGap(game,priorQ);
   if(gap!=null)factor=Math.min(factor,config.pairFactors[gap]??1);
  }
 }
 return factor;
}
function bestQuestion(game,config){
 const pool=candidatePool(game),poolTop=pool[0];
 const denom=pool.reduce((sum,t)=>sum+Math.exp((game.scores[t]-game.scores[poolTop])/3),0);
 const candidates=[];
 for(let q=4;q<F;q++){
  if(game.asked.has(q)||hardSuppressed(game,q,config))continue;
  let yes=0,no=0,strong=0,knownTotal=0;
  for(const t of pool){
   if(!knownAt(q,t))continue;
   const s=stateAt(q,t),w=Math.exp((game.scores[t]-game.scores[poolTop])/3);
   knownTotal+=w;if(polarity(s))yes+=w;else no+=w;if(strength(s)===2)strong+=w;
  }
  if(knownTotal<=0)continue;
  const balance=1-Math.abs(yes-no)/knownTotal,certainty=strong/knownTotal,coverage=knownTotal/denom;
  const base=(balance*.9+certainty*.1)*coverage;
  candidates.push({q,base});
 }
 if(!candidates.length)return null;
 let bestBase=-Infinity;for(const c of candidates)if(c.base>bestBase)bestBase=c.base;
 if(config.name==='baseline')return candidates.find(c=>Math.abs(c.base-bestBase)<=1e-12)?.q??candidates[0].q;
 const floor=config.baseFloor??0;
 let bestQ=null,bestAdjusted=-Infinity,bestCandidateBase=-Infinity;
 for(const c of candidates){
  if(c.base+1e-12<bestBase*floor)continue;
  const adjusted=c.base*redundancyFactor(game,c.q,config);
  if(adjusted>bestAdjusted+1e-12||(Math.abs(adjusted-bestAdjusted)<=1e-12&&c.base>bestCandidateBase+1e-12)){
   bestAdjusted=adjusted;bestCandidateBase=c.base;bestQ=c.q;
  }
 }
 return bestQ??candidates.find(c=>Math.abs(c.base-bestBase)<=1e-12)?.q??candidates[0].q;
}
function shouldHunch(game){if(game.deferGuessOnce){game.deferGuessOnce=false;return false;}if(game.turn<game.minGuessQuestions)return false;const leaders=rank(game,3);if(leaders.length<2)return true;const margin=game.scores[leaders[0]]-game.scores[leaders[1]],p=confidence(game);if(game.turn>=16&&margin>=3)return true;if(game.turn>=11&&margin>=5&&p>=.42)return true;if(game.turn>=8&&margin>=8&&p>=.58)return true;return false;}
function categoryFor(t){for(let q=0;q<4;q++)if(knownAt(q,t)&&polarity(stateAt(q,t)))return Object.keys(CATEGORY_Q)[q];throw new Error(`No category for ${targets[t]}`);}
function answerFor(q,t){if(!knownAt(q,t))return'unknown';const s=stateAt(q,t);if(polarity(s))return strength(s)===2?'yes':'probably';return strength(s)===2?'no':'probably_not';}
function applyAnswer(game,q,answer){game.asked.add(q);const yes=answer==='yes'||answer==='probably',power=(answer==='yes'||answer==='no')?2:1;if(answer!=='unknown'&&answer!=='maybe')applyPolarity(game,q,yes,power);game.turn++;game.history.push({kind:'question',q,answer,turn:game.turn});}

function simulateTarget(t,config){
 const game=createGame();setCategory(game,categoryFor(t));const sequence=[];let reason='';
 for(let safety=0;safety<64;safety++){
  if(game.turn>=game.budget){reason='question_limit';break;}
  if(shouldHunch(game)){reason='confidence';break;}
  const q=bestQuestion(game,config);if(q==null){reason='no_questions';break;}
  const answer=answerFor(q,t);sequence.push(q);applyAnswer(game,q,answer);
 }
 const guess=top(game).index;
 return{targetIndex:t,target:targets[t],correct:guess===t,guess,traitQuestions:sequence.length,totalPrompts:sequence.length+1,sequence,reason,cohort:t<1200?'base-1200':t<1400?'extension-200':'quality-375',category:categoryFor(t)};
}

function repetitionMetrics(games){
 let familyEvents=0,familyClose=0,gamesFamily=0,semanticEvents=0,semanticClose=0,gamesSemantic=0,nearEvents=0,nearClose=0,gamesNear=0;
 const familyPairs=new Map(),semanticPairs=new Map(),nearPairs=new Map();
 for(const g of games){
  let gf=0,gs=0,gn=0;
  const latestByFamily=new Map();
  for(let i=0;i<g.sequence.length;i++){
   const q=g.sequence[i];
   for(const fam of familyByQ[q]){
    if(latestByFamily.has(fam)){
     const prior=latestByFamily.get(fam),gap=i-prior.i;familyEvents++;gf++;if(gap<=3)familyClose++;inc(familyPairs,`${fam}|${pairKey(prior.q,q)}`);
    }
    latestByFamily.set(fam,{q,i});
   }
   for(let j=0;j<i;j++){
    const key=pairKey(g.sequence[j],q),gap=i-j;
    if(semanticPairSet.has(key)){semanticEvents++;gs++;if(gap<=3)semanticClose++;inc(semanticPairs,key);}
    if(nearVectorSet.has(key)){nearEvents++;gn++;if(gap<=3)nearClose++;inc(nearPairs,key);}
   }
  }
  if(gf)gamesFamily++;if(gs)gamesSemantic++;if(gn)gamesNear++;
 }
 const detail=(map,limit=15)=>[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([key,count])=>{const pair=key.includes('|')?key.split('|')[1]:key,[a,b]=pair.split(':').map(Number);return{key,count,a,b,questionA:questions[a],questionB:questions[b]};});
 return{familyEvents,familyClose,gamesFamily,gamesFamilyPct:pct(gamesFamily/games.length),semanticEvents,semanticClose,gamesSemantic,gamesSemanticPct:pct(gamesSemantic/games.length),nearVectorEvents:nearEvents,nearVectorClose:nearClose,gamesNearVector:gamesNear,gamesNearVectorPct:pct(gamesNear/games.length),topFamilyPairs:detail(familyPairs),topSemanticPairs:detail(semanticPairs),topNearPairs:detail(nearPairs)};
}
function grouped(games,key){const groups={};for(const g of games)(groups[g[key]]??=[]).push(g);return Object.fromEntries(Object.entries(groups).map(([k,list])=>[k,{games:list.length,accuracy:pct(list.filter(x=>x.correct).length/list.length),avgPrompts:round(list.reduce((s,x)=>s+x.totalPrompts,0)/list.length,3)}]));}

const runs={};
for(const config of CONFIGS){
 const games=Array.from({length:N},(_,t)=>simulateTarget(t,config));
 runs[config.name]={config,games};
 console.error(`finished ${config.name}`);
}
const baseline=runs.baseline.games;
const baselineCorrect=new Set(baseline.filter(g=>g.correct).map(g=>g.targetIndex));
const baselineGuess=new Map(baseline.map(g=>[g.targetIndex,g.guess]));
const results=[];
for(const config of CONFIGS){
 const games=runs[config.name].games,counts=games.map(g=>g.totalPrompts),correct=games.filter(g=>g.correct).length;
 const regressions=games.filter(g=>baselineCorrect.has(g.targetIndex)&&!g.correct);
 const improvements=games.filter(g=>!baselineCorrect.has(g.targetIndex)&&g.correct);
 const changedGuesses=games.filter(g=>baselineGuess.get(g.targetIndex)!==g.guess);
 const quality=games.slice(1400),original=games.slice(0,1400);
 results.push({
  name:config.name,accuracy:pct(correct/N),correct,avgPrompts:round(counts.reduce((a,b)=>a+b,0)/N,3),medianPrompts:median(counts),maxPrompts:Math.max(...counts),
  qualityExact:`${quality.filter(g=>g.correct).length}/375`,originalCorrect:`${original.filter(g=>g.correct).length}/1400`,
  regressions:regressions.length,improvements:improvements.length,changedGuesses:changedGuesses.length,
  regressionExamples:regressions.slice(0,20).map(g=>({target:g.target,baselineGuess:targets[baselineGuess.get(g.targetIndex)],newGuess:targets[g.guess]})),
  repetition:repetitionMetrics(games),byCategory:grouped(games,'category'),byCohort:grouped(games,'cohort')
 });
}
const output={generatedAt:new Date().toISOString(),nearVectorDefinition:'common known >=1200, positive union >=50, phi >=0.85, Jaccard >=0.75',nearVectorPairs:nearVectorPairs.sort((a,b)=>b.phi-a.phi).map(x=>({...x,phi:round(x.phi,4),jaccardPct:pct(x.jaccard),questionA:questions[x.a],questionB:questions[x.b]})),results};
await mkdir(outDir,{recursive:true});
await writeFile(join(outDir,'selector-experiments.json'),JSON.stringify(output,null,2));
console.log('PAM_SELECTOR_EXPERIMENTS_START');
console.log(JSON.stringify({nearVectorPairs:output.nearVectorPairs,results:results.map(x=>({...x,regressionExamples:x.regressionExamples,repetition:{...x.repetition,topFamilyPairs:x.repetition.topFamilyPairs.slice(0,8),topSemanticPairs:x.repetition.topSemanticPairs.slice(0,8),topNearPairs:x.repetition.topNearPairs.slice(0,8)}}))},null,2));
console.log('PAM_SELECTOR_EXPERIMENTS_END');
