import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';

const ROOT=process.cwd();
const parts=await Promise.all([1,2,3,4].map(i=>readFile(path.join(ROOT,'data','pam20q','quality',`quality-375.part${i}`),'utf8')));
const qualityDoc=JSON.parse(gunzipSync(Buffer.from(parts.join('').trim(),'base64')).toString('utf8'));
const model=await loadPam1775Model(loadPamClassicModel);
const {questions,targets,weights,baseTargetCount,extensionCount,qualityCount}=model;

assert.equal(qualityDoc.count,375);
assert.equal(qualityDoc.profiles.length,375);
assert.equal(targets.length,1775);
assert.equal(baseTargetCount,1200);
assert.equal(extensionCount,200);
assert.equal(qualityCount,375);

const QUALITY_COUNT=375;
const LEGACY_COUNT=1400;
const qualityProfiles=qualityDoc.profiles;
const qualityStart=targets.length-QUALITY_COUNT;
const qualityNames=qualityProfiles.map(p=>p.name);
assert.deepEqual(targets.slice(qualityStart),qualityNames,'The final 375 model targets must exactly match the reviewed quality set');

function sliceQuestionMajor(fullWeights,fullTargetCount,targetCount){
  const out=Buffer.alloc(questions.length*targetCount);
  for(let q=0;q<questions.length;q++){
    fullWeights.copy(out,q*targetCount,q*fullTargetCount,q*fullTargetCount+targetCount);
  }
  return out;
}
const baselineTargets=targets.slice(0,LEGACY_COUNT);
const baselineWeights=sliceQuestionMajor(weights,targets.length,LEGACY_COUNT);

function stateAt(modelWeights,modelTargets,q,t){return modelWeights[q*modelTargets.length+t];}
function categoryFor(modelWeights,modelTargets,targetIndex){
  let best='other',bestScore=-Infinity;
  for(const [name,q] of Object.entries({animal:0,vegetable:1,mineral:2,other:3})){
    const state=stateAt(modelWeights,modelTargets,q,targetIndex);
    const score=(state&1)?((state&2)?3:2):((state&2)?0:1);
    if(score>bestScore){bestScore=score;best=name;}
  }
  return best;
}
function oracleAnswer(modelWeights,modelTargets,q,targetIndex){
  const state=stateAt(modelWeights,modelTargets,q,targetIndex);
  return (state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');
}
async function makeEngine(modelTargets,modelWeights,suffix){
  global.window={PAM_CLASSIC_MODEL:{questions,targets:modelTargets,weightsB64:modelWeights.toString('base64'),layout:'question-major',states:4}};
  if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
  await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?${suffix}-${Date.now()}-${Math.random()}`);
  return window.PamClassic20Q;
}
function playWith(engine,modelWeights,modelTargets,targetIndex,{noise=false}={}){
  const game=engine.createGame({budget:20,minGuessQuestions:7});
  let next=engine.choose(game);
  assert.equal(next.kind,'category');
  next=engine.setCategory(game,categoryFor(modelWeights,modelTargets,targetIndex));
  let softenedYes=false,softenedNo=false;
  for(let guard=0;guard<50;guard++){
    if(next.kind==='question'){
      let answer=oracleAnswer(modelWeights,modelTargets,next.index,targetIndex);
      if(noise&&answer==='yes'&&!softenedYes){answer='probably';softenedYes=true;}
      else if(noise&&answer==='no'&&!softenedNo){answer='doubtful';softenedNo=true;}
      next=engine.answer(game,next,answer);
      continue;
    }
    if(next.kind==='hunch'){
      next=next.index===targetIndex?engine.commitGuess(game,next):engine.deferGuess(game,next);
      continue;
    }
    if(next.kind==='guess')return next;
    throw new Error(`Unexpected Pam state ${next.kind}`);
  }
  throw new Error('Pam did not produce a guess');
}

const BaselineEngine=await makeEngine(baselineTargets,baselineWeights,'quality-baseline');
const FullEngine=await makeEngine(targets,weights,'quality-full');

test('integrated Pam model has exactly 1775 reviewed targets',()=>{
  assert.equal(FullEngine.N,1775);
  assert.equal(FullEngine.F,156);
  assert.equal(weights.length,156*1775);
  assert.equal(new Set(targets.map(name=>String(name).toLowerCase())).size,1775);
});

test('375 new targets achieve exact full-model self-play',()=>{
  let exact=0;
  const failures=[];
  for(let index=qualityStart;index<targets.length;index++){
    const guess=playWith(FullEngine,weights,targets,index);
    if(guess.index===index)exact++;
    else failures.push({target:targets[index],guess:guess.label,guessIndex:guess.index});
  }
  console.log(`PAM_QUALITY_375_EXACT=${exact}/${QUALITY_COUNT}`);
  if(failures.length)console.log('PAM_QUALITY_375_MISSES='+JSON.stringify(failures));
  assert.equal(exact,QUALITY_COUNT,`375 quality batch has ${failures.length} full-model self-play misses`);
});

test('adding the 375 does not change deterministic guesses for the existing 1400',()=>{
  const changed=[];
  for(let index=0;index<LEGACY_COUNT;index++){
    const before=playWith(BaselineEngine,baselineWeights,baselineTargets,index);
    const after=playWith(FullEngine,weights,targets,index);
    if(before.label!==after.label)changed.push({target:baselineTargets[index],before:before.label,after:after.label});
  }
  console.log(`PAM_QUALITY_375_BASELINE_CHANGED=${changed.length}/${LEGACY_COUNT}`);
  if(changed.length)console.log('PAM_QUALITY_375_BASELINE_CHANGES='+JSON.stringify(changed));
  assert.equal(changed.length,0,`375 quality batch changes ${changed.length} existing deterministic guesses`);
});

test('375 new targets remain robust to one softened yes and one softened no',()=>{
  let exact=0;
  const failures=[];
  for(let index=qualityStart;index<targets.length;index++){
    const guess=playWith(FullEngine,weights,targets,index,{noise:true});
    if(guess.index===index)exact++;
    else failures.push({target:targets[index],guess:guess.label});
  }
  const rate=exact/QUALITY_COUNT;
  console.log(`PAM_QUALITY_375_NOISE=${exact}/${QUALITY_COUNT} (${(rate*100).toFixed(1)}%)`);
  if(failures.length)console.log('PAM_QUALITY_375_NOISE_MISSES='+JSON.stringify(failures));
  assert.ok(rate>=0.90,`375 quality noise self-play ${(rate*100).toFixed(1)}% is below 90%`);
});
