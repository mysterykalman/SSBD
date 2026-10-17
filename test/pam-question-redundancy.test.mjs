import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';

const ROOT=process.cwd();
const model=await loadPam1775Model(loadPamClassicModel);
const {questions,targets,weights,knownMask}=model;
const N=targets.length;
const F=questions.length;
assert.equal(N,1775);
assert.equal(F,156);

const BASELINE_FIRST_HUNCH_MISSES=new Set([
 54,70,93,250,309,315,334,410,435,437,543,553,646,828,946,957,1034,1038,1115,1190,1276
]);
const QUALITY_START=1400;
const QUESTION_FAMILIES=[
 [8,12,22,24,43,57],
 [30,32,79,111],
 [97,126,129,132,152],
 [94,100,120,145],
 [48,51,65,92],
 [69,141],
 [56,116],
 [20,101,125],
 [149,153],
 [85,86,117],
 [115,119,128,142],
 [6,9,13,27,71,74,87,108],
 [62,154]
];
const SEMANTIC_PAIRS=[
 [97,132],[30,32],[85,117],[126,152],[62,154],[149,153],
 [56,116],[100,120],[119,128],[42,148],[69,141],[101,125]
];

const stateAt=(q,t)=>weights[q*N+t];
const knownAt=(q,t)=>knownMask[q*N+t]===1;
const polarity=state=>state&1;
const strength=state=>(state&2)?2:1;

function categoryFor(targetIndex){
 for(const [name,q] of Object.entries({animal:0,vegetable:1,mineral:2,other:3})){
  if(knownAt(q,targetIndex)&&polarity(stateAt(q,targetIndex)))return name;
 }
 throw new Error(`No category for ${targets[targetIndex]}`);
}
function oracleAnswer(q,targetIndex){
 if(!knownAt(q,targetIndex))return 'unknown';
 const state=stateAt(q,targetIndex);
 if(polarity(state))return strength(state)===2?'yes':'probably';
 return strength(state)===2?'no':'probably_not';
}
async function makeEngine(){
 global.window={PAM_CLASSIC_MODEL:{questions,targets,weightsB64:weights.toString('base64'),knownMaskB64:knownMask.toString('base64'),layout:'question-major',states:4}};
 if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
 await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?redundancy-${Date.now()}-${Math.random()}`);
 return window.PamClassic20Q;
}
const Engine=await makeEngine();

function playFirstHunch(targetIndex){
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 let next=Engine.setCategory(game,categoryFor(targetIndex));
 const sequence=[];
 for(let guard=0;guard<50;guard++){
  if(next.kind==='question'){
   sequence.push(next.index);
   next=Engine.answer(game,next,oracleAnswer(next.index,targetIndex));
   continue;
  }
  if(next.kind==='hunch'){
   const guess=Engine.commitGuess(game,next);
   return{guess,sequence,totalPrompts:sequence.length+1};
  }
  if(next.kind==='guess')return{guess:next,sequence,totalPrompts:sequence.length+1};
  throw new Error(`Unexpected Pam state ${next.kind}`);
 }
 throw new Error(`Pam did not finish natural play for ${targets[targetIndex]}`);
}
function playSoftened(targetIndex){
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 let next=Engine.setCategory(game,categoryFor(targetIndex));
 let softenedYes=false,softenedNo=false;
 for(let guard=0;guard<60;guard++){
  if(next.kind==='question'){
   let answer=oracleAnswer(next.index,targetIndex);
   if(answer==='yes'&&!softenedYes){answer='probably';softenedYes=true;}
   else if(answer==='no'&&!softenedNo){answer='probably_not';softenedNo=true;}
   next=Engine.answer(game,next,answer);
   continue;
  }
  if(next.kind==='hunch'){
   next=next.index===targetIndex?Engine.commitGuess(game,next):Engine.deferGuess(game,next);
   continue;
  }
  if(next.kind==='guess')return next;
  throw new Error(`Unexpected Pam state ${next.kind}`);
 }
 throw new Error(`Pam did not finish softened play for ${targets[targetIndex]}`);
}

function repetitionMetrics(games){
 let familyClose=0,semanticClose=0,warmBloodedMammal=0;
 for(const {sequence} of games){
  for(const family of QUESTION_FAMILIES){
   let latest=null;
   for(let i=0;i<sequence.length;i++){
    const q=sequence[i];
    if(!family.includes(q))continue;
    if(latest!=null&&i-latest<=3)familyClose++;
    latest=i;
   }
  }
  for(const [a,b] of SEMANTIC_PAIRS){
   const ia=sequence.indexOf(a),ib=sequence.indexOf(b);
   if(ia<0||ib<0)continue;
   if(Math.abs(ia-ib)<=3)semanticClose++;
   if(a===126&&b===152)warmBloodedMammal++;
  }
 }
 return{familyClose,semanticClose,warmBloodedMammal};
}

test('redundancy-aware selection preserves baseline first-hunch correctness while reducing close repetition',()=>{
 const games=[];
 const regressions=[];
 let correct=0,qualityCorrect=0,totalPrompts=0;
 for(let targetIndex=0;targetIndex<N;targetIndex++){
  const played=playFirstHunch(targetIndex);
  games.push(played);
  totalPrompts+=played.totalPrompts;
  if(played.guess.index===targetIndex){
   correct++;
   if(targetIndex>=QUALITY_START)qualityCorrect++;
  }else if(!BASELINE_FIRST_HUNCH_MISSES.has(targetIndex)){
   regressions.push({targetIndex,target:targets[targetIndex],guess:played.guess.label});
  }
 }
 const averagePrompts=totalPrompts/N;
 const repetition=repetitionMetrics(games);
 console.log(`PAM_REDUNDANCY_FIRST_HUNCH=${correct}/${N}`);
 console.log(`PAM_REDUNDANCY_AVG_PROMPTS=${averagePrompts.toFixed(4)}`);
 console.log(`PAM_REDUNDANCY_FAMILY_CLOSE=${repetition.familyClose}`);
 console.log(`PAM_REDUNDANCY_SEMANTIC_CLOSE=${repetition.semanticClose}`);
 console.log(`PAM_REDUNDANCY_WARMBLOODED_MAMMAL=${repetition.warmBloodedMammal}`);
 if(regressions.length)console.log('PAM_REDUNDANCY_REGRESSIONS='+JSON.stringify(regressions));
 assert.equal(regressions.length,0,'Redundancy-aware selection introduced a new first-hunch correctness regression');
 assert.equal(qualityCorrect,375,'All 375 protected quality targets must remain first-hunch correct');
 assert.ok(correct>=1754,`Natural first-hunch correctness ${correct}/${N} fell below the 6ee0062 baseline`);
 assert.ok(averagePrompts<=11.91,`Average prompts ${averagePrompts.toFixed(4)} exceeded the safe tuning ceiling`);
 assert.ok(repetition.familyClose<=850,`Close semantic-family repetitions rose to ${repetition.familyClose}`);
 assert.ok(repetition.semanticClose<=25,`Close verified semantic-pair repetitions rose to ${repetition.semanticClose}`);
 assert.ok(repetition.warmBloodedMammal<=3,`Warm-blooded/mammal co-occurrence rose to ${repetition.warmBloodedMammal}`);
});

test('all 375 protected quality targets remain exact with one softened yes and one softened no',()=>{
 const failures=[];
 for(let targetIndex=QUALITY_START;targetIndex<N;targetIndex++){
  const guess=playSoftened(targetIndex);
  if(guess.index!==targetIndex)failures.push({targetIndex,target:targets[targetIndex],guess:guess.label});
 }
 console.log(`PAM_REDUNDANCY_QUALITY_SOFTENED=${375-failures.length}/375`);
 if(failures.length)console.log('PAM_REDUNDANCY_QUALITY_SOFTENED_FAILURES='+JSON.stringify(failures));
 assert.equal(failures.length,0,'The 375/375 softened-answer quality gate must remain exact');
});
