import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel,pamTraitIndex} from '../scripts/pam-classic-model.mjs';

const ROOT=process.cwd();
const parts=await Promise.all([1,2,3,4].map(i=>readFile(path.join(ROOT,'data','pam20q','quality',`quality-375.part${i}`),'utf8')));
const encoded=parts.join('').trim();
const qualityDoc=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
const {questions,targets,weights,baseTargetCount,extensionCount}=await loadPamClassicModel();
assert.equal(qualityDoc.count,375);
assert.equal(qualityDoc.profiles.length,375);
assert.equal(qualityDoc.profiles[374]?.name,'oar');
const qualityProfiles=qualityDoc.profiles;

function stateAtFor(modelWeights,modelTargets,q,t){return modelWeights[q*modelTargets.length+t];}
function categoryForModel(modelWeights,modelTargets,targetIndex){
 let best='other',bestScore=-Infinity;
 for(const [name,q] of Object.entries({animal:0,vegetable:1,mineral:2,other:3})){
  const state=stateAtFor(modelWeights,modelTargets,q,targetIndex),score=(state&1)?((state&2)?3:2):((state&2)?0:1);
  if(score>bestScore){bestScore=score;best=name;}
 }
 return best;
}
function oracleAnswerFor(modelWeights,modelTargets,q,targetIndex){const state=stateAtFor(modelWeights,modelTargets,q,targetIndex);return (state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');}
async function makeEngine(modelTargets,modelWeights,suffix){
 global.window={PAM_CLASSIC_MODEL:{questions,targets:modelTargets,weightsB64:modelWeights.toString('base64'),layout:'question-major',states:4,baseTargets:baseTargetCount,extensionTargets:modelTargets.length-baseTargetCount}};
 if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
 await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?${suffix}`);
 return window.PamClassic20Q;
}
function playWith(engine,modelWeights,modelTargets,targetIndex,{noise=false}={}){
 const game=engine.createGame({budget:20,minGuessQuestions:7});
 let next=engine.choose(game);
 assert.equal(next.kind,'category');
 next=engine.setCategory(game,categoryForModel(modelWeights,modelTargets,targetIndex));
 let softenedYes=false,softenedNo=false;
 for(let guard=0;guard<50;guard++){
  if(next.kind==='question'){
   let answer=oracleAnswerFor(modelWeights,modelTargets,next.index,targetIndex);
   if(noise&&answer==='yes'&&!softenedYes){answer='probably';softenedYes=true;}
   else if(noise&&answer==='no'&&!softenedNo){answer='doubtful';softenedNo=true;}
   next=engine.answer(game,next,answer);continue;
  }
  if(next.kind==='hunch'){next=next.index===targetIndex?engine.commitGuess(game,next):engine.deferGuess(game,next);continue;}
  if(next.kind==='guess')return next;
  throw new Error(`Unexpected Pam state ${next.kind}`);
 }
 throw new Error('Pam did not produce a guess');
}
function compileQualityProfile(profile){
 const states=new Uint8Array(questions.length);states.fill(2);
 const categoryIndex={animal:0,vegetable:1,mineral:2,other:3}[profile.category];
 if(categoryIndex==null)throw new Error(`Unknown quality category ${profile.category} for ${profile.name}`);
 for(let q=0;q<4;q++)states[q]=q===categoryIndex?3:2;
 const apply=(key,value)=>{const index=pamTraitIndex[key];if(index==null)throw new Error(`Unknown quality trait ${key} for ${profile.name}`);states[index]=value;};
 for(const key of profile.yes||[])apply(key,3);
 for(const key of profile.weakYes||[])apply(key,1);
 for(const key of profile.no||[])apply(key,2);
 return states;
}
function buildModel(profiles){
 const modelTargets=[...targets,...profiles.map(p=>p.name)];
 const modelWeights=Buffer.alloc(questions.length*modelTargets.length);
 for(let q=0;q<questions.length;q++)weights.copy(modelWeights,q*modelTargets.length,q*targets.length,(q+1)*targets.length);
 for(let e=0;e<profiles.length;e++){const states=compileQualityProfile(profiles[e]);const targetIndex=targets.length+e;for(let q=0;q<questions.length;q++)modelWeights[q*modelTargets.length+targetIndex]=states[q];}
 return{modelTargets,modelWeights};
}

const qualitySeen=new Set(targets.map(name=>String(name).trim().toLowerCase()));
for(const profile of qualityProfiles){const key=String(profile.name).trim().toLowerCase();assert.ok(!qualitySeen.has(key),`quality target duplicates existing target exactly: ${profile.name}`);qualitySeen.add(key);}
const {modelTargets:qualityTargets,modelWeights:qualityWeights}=buildModel(qualityProfiles);
const BaselineEngine=await makeEngine(targets,weights,'quality-baseline');
const QualityEngine=await makeEngine(qualityTargets,qualityWeights,'quality-375');

test('375 quality candidates are structurally valid in the real Pam model',()=>{
 assert.equal(baseTargetCount,1200);assert.equal(extensionCount,200);assert.equal(targets.length,1400);assert.equal(qualityProfiles.length,375);assert.equal(qualityTargets.length,1775);assert.equal(QualityEngine.N,1775);assert.equal(QualityEngine.F,156);assert.equal(qualityWeights.length,276900);assert.equal(new Set(qualityTargets.map(name=>name.toLowerCase())).size,qualityTargets.length);
});

test('375 quality candidates achieve exact full-model self-play',()=>{
 let exact=0;const failures=[];
 for(let i=0;i<qualityProfiles.length;i++){const index=targets.length+i;const guess=playWith(QualityEngine,qualityWeights,qualityTargets,index);if(guess.index===index)exact++;else failures.push({target:qualityTargets[index],guess:guess.label,guessIndex:guess.index});}
 console.log(`PAM_QUALITY_375_EXACT=${exact}/${qualityProfiles.length}`);if(failures.length)console.log('PAM_QUALITY_375_MISSES='+JSON.stringify(failures));assert.equal(exact,qualityProfiles.length,`375 quality batch has ${failures.length} full-model self-play misses`);
});

test('adding the 375 candidates does not change deterministic baseline guesses',async()=>{
 const changed=[];for(let index=0;index<targets.length;index++){const before=playWith(BaselineEngine,weights,targets,index);const after=playWith(QualityEngine,qualityWeights,qualityTargets,index);if(before.label!==after.label)changed.push({target:targets[index],before:before.label,after:after.label});}
 console.log(`PAM_QUALITY_375_BASELINE_CHANGED=${changed.length}/${targets.length}`);if(changed.length)console.log('PAM_QUALITY_375_BASELINE_CHANGES='+JSON.stringify(changed));
 if(changed.some(x=>x.target==='a laptop stand')){
  const suspects=['keyboard','cellphone','photocopier','answering machine','touchpad','computer screen','webcam','internet','projector','tape recorder','stereo','pager'];
  const restored=[];
  const baselineIndex=targets.indexOf('a laptop stand');
  for(const suspect of suspects){
   if(!qualityProfiles.some(p=>p.name.toLowerCase()===suspect))continue;
   const filtered=qualityProfiles.filter(p=>p.name.toLowerCase()!==suspect);
   const {modelTargets,modelWeights}=buildModel(filtered);
   const engine=await makeEngine(modelTargets,modelWeights,`diag-${suspect.replace(/\W+/g,'-')}`);
   const guess=playWith(engine,modelWeights,modelTargets,baselineIndex);
   if(guess.label==='a laptop stand')restored.push(suspect);
  }
  console.log('PAM_LAPTOP_STAND_SINGLE_REMOVALS='+JSON.stringify(restored));
 }
 assert.equal(changed.length,0,`375 quality batch changes ${changed.length} existing deterministic guesses`);
});

test('375 quality candidates remain robust to one softened yes and one softened no',()=>{
 let exact=0;const failures=[];for(let i=0;i<qualityProfiles.length;i++){const index=targets.length+i;const guess=playWith(QualityEngine,qualityWeights,qualityTargets,index,{noise:true});if(guess.index===index)exact++;else failures.push({target:qualityTargets[index],guess:guess.label});}
 const rate=exact/qualityProfiles.length;console.log(`PAM_QUALITY_375_NOISE=${exact}/${qualityProfiles.length} (${(rate*100).toFixed(1)}%)`);if(failures.length)console.log('PAM_QUALITY_375_NOISE_MISSES='+JSON.stringify(failures));assert.ok(rate>=0.90,`375 quality noise self-play ${(rate*100).toFixed(1)}% is below 90%`);
});
