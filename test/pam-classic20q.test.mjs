import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel,pamTraitIndex} from '../scripts/pam-classic-model.mjs';

const ROOT=process.cwd();
const QUALITY_PATH=path.join(ROOT,'data','pam20q','extensions','batch-002-quality.json');
const QUALITY_HIDDEN=path.join(ROOT,'data','pam20q','extensions','batch-002-quality.data');
const qualityDoc=JSON.parse(await readFile(QUALITY_PATH,'utf8'));
await rename(QUALITY_PATH,QUALITY_HIDDEN);
const {questions,targets,weights,baseTargetCount,extensionCount}=await loadPamClassicModel();

global.window={PAM_CLASSIC_MODEL:{questions,targets,weightsB64:weights.toString('base64'),layout:'question-major',states:4,baseTargets:baseTargetCount,extensionTargets:extensionCount}};
if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?classic-test=1`);
const Engine=window.PamClassic20Q;

function stateAtFor(modelWeights,modelTargets,q,t){return modelWeights[q*modelTargets.length+t];}
function categoryForModel(modelWeights,modelTargets,targetIndex){
 let best='other',bestScore=-Infinity;
 for(const [name,q] of Object.entries({animal:0,vegetable:1,mineral:2,other:3})){
  const state=stateAtFor(modelWeights,modelTargets,q,targetIndex),score=(state&1)?((state&2)?3:2):((state&2)?0:1);
  if(score>bestScore){bestScore=score;best=name;}
 }
 return best;
}
function oracleAnswerFor(modelWeights,modelTargets,q,targetIndex){
 const state=stateAtFor(modelWeights,modelTargets,q,targetIndex);
 return (state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');
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
   next=engine.answer(game,next,answer);
   continue;
  }
  if(next.kind==='hunch'){
   if(next.index===targetIndex)next=engine.commitGuess(game,next);
   else next=engine.deferGuess(game,next);
   continue;
  }
  if(next.kind==='guess')return next;
  throw new Error(`Unexpected Pam state ${next.kind}`);
 }
 throw new Error('Pam did not produce a guess');
}
function playTarget(targetIndex){return playWith(Engine,weights,targets,targetIndex);}

test('frozen Pam model includes the first 200-target expansion',()=>{
 assert.equal(baseTargetCount,1200);
 assert.equal(extensionCount,200);
 assert.equal(Engine.N,1400);
 assert.equal(Engine.F,156);
 assert.equal(weights.length,218400);
 assert.ok([...weights].every(value=>value>=0&&value<=3));
 assert.equal(new Set(targets.map(name=>name.toLowerCase())).size,targets.length);
 assert.equal(Engine.createGame().budget,20);
});

test('Pam exposes the classic response flow deterministically',()=>{
 const gameA=Engine.createGame(),gameB=Engine.createGame();
 let a=Engine.setCategory(gameA,'animal');
 let b=Engine.setCategory(gameB,'animal');
 assert.equal(a.kind,'question');
 assert.equal(a.index,b.index);
 assert.equal(a.text,b.text);
 a=Engine.answer(gameA,a,'probably');
 b=Engine.answer(gameB,b,'probably');
 assert.equal(a.kind,b.kind);
 if(a.kind==='question'){assert.equal(a.index,b.index);assert.equal(a.text,b.text);}
});

test('representative original targets still produce a model guess within the 20-question budget',()=>{
 const samples=['a dog','a car','a chair','the Sun','water','a book','a piano','a blue whale'];
 let checked=0;
 for(const name of samples){
  const index=targets.indexOf(name);
  if(index<0)continue;
  const guess=playTarget(index);
  assert.ok(guess.label);
  assert.ok(guess.index>=0&&guess.index<targets.length);
  checked++;
 }
 assert.ok(checked>=5);
});

test('200-target expansion is playable and reports deterministic self-play quality',()=>{
 let exact=0;
 const failures=[];
 for(let index=baseTargetCount;index<targets.length;index++){
  const guess=playTarget(index);
  if(guess.index===index)exact++;
  else failures.push({target:targets[index],guess:guess.label});
 }
 const rate=exact/extensionCount;
 console.log(`Pam expansion self-play: ${exact}/${extensionCount} exact (${(rate*100).toFixed(1)}%)`);
 if(failures.length)console.log('ALL_PAM_EXPANSION_MISSES='+JSON.stringify(failures));
 assert.ok(rate>=0.20,`Expansion self-play exact rate ${(rate*100).toFixed(1)}% is below 20%`);
});

assert.equal(qualityDoc.count,qualityDoc.profiles.length);

function compileQualityProfile(profile){
 const states=new Uint8Array(questions.length);
 states.fill(2);
 const categoryIndex={animal:0,vegetable:1,mineral:2,other:3}[profile.category];
 if(categoryIndex==null)throw new Error(`Unknown quality category ${profile.category} for ${profile.name}`);
 for(let q=0;q<4;q++)states[q]=q===categoryIndex?3:2;
 const apply=(key,value)=>{
  const index=pamTraitIndex[key];
  if(index==null)throw new Error(`Unknown quality trait ${key} for ${profile.name}`);
  states[index]=value;
 };
 for(const key of profile.yes||[])apply(key,3);
 for(const key of profile.weakYes||[])apply(key,1);
 for(const key of profile.no||[])apply(key,2);
 return states;
}

const qualityProfiles=[];
const qualitySeen=new Set(targets.map(name=>String(name).trim().toLowerCase()));
for(const profile of qualityDoc.profiles){
 const key=String(profile.name||'').trim().toLowerCase();
 assert.ok(key,`blank quality target`);
 assert.ok(!qualitySeen.has(key),`quality target duplicates existing target exactly: ${profile.name}`);
 qualitySeen.add(key);
 qualityProfiles.push(profile);
}

const qualityTargets=[...targets,...qualityProfiles.map(p=>p.name)];
const qualityWeights=Buffer.alloc(questions.length*qualityTargets.length);
for(let q=0;q<questions.length;q++){
 weights.copy(qualityWeights,q*qualityTargets.length,q*targets.length,(q+1)*targets.length);
}
for(let e=0;e<qualityProfiles.length;e++){
 const states=compileQualityProfile(qualityProfiles[e]);
 const targetIndex=targets.length+e;
 for(let q=0;q<questions.length;q++)qualityWeights[q*qualityTargets.length+targetIndex]=states[q];
}

window.PAM_CLASSIC_MODEL={questions,targets:qualityTargets,weightsB64:qualityWeights.toString('base64'),layout:'question-major',states:4,baseTargets:baseTargetCount,extensionTargets:extensionCount+qualityProfiles.length};
await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?classic-quality-375=1`);
const QualityEngine=window.PamClassic20Q;

test('375 quality candidates are structurally valid in the real Pam model',()=>{
 assert.equal(qualityProfiles.length,375);
 assert.equal(qualityTargets.length,1775);
 assert.equal(QualityEngine.N,1775);
 assert.equal(QualityEngine.F,156);
 assert.equal(qualityWeights.length,276900);
 assert.ok([...qualityWeights].every(value=>value>=0&&value<=3));
 assert.equal(new Set(qualityTargets.map(name=>name.toLowerCase())).size,qualityTargets.length);
});

test('375 quality candidates achieve exact full-model self-play',()=>{
 let exact=0;
 const failures=[];
 for(let i=0;i<qualityProfiles.length;i++){
  const index=targets.length+i;
  const guess=playWith(QualityEngine,qualityWeights,qualityTargets,index);
  if(guess.index===index)exact++;
  else failures.push({target:qualityTargets[index],guess:guess.label,guessIndex:guess.index});
 }
 console.log(`PAM_QUALITY_375_EXACT=${exact}/${qualityProfiles.length}`);
 if(failures.length)console.log('PAM_QUALITY_375_MISSES='+JSON.stringify(failures));
 assert.equal(exact,qualityProfiles.length,`375 quality batch has ${failures.length} full-model self-play misses`);
});

test('adding the 375 candidates does not change deterministic baseline guesses',()=>{
 const changed=[];
 for(let index=0;index<targets.length;index++){
  const before=playWith(Engine,weights,targets,index);
  const after=playWith(QualityEngine,qualityWeights,qualityTargets,index);
  if(before.label!==after.label)changed.push({target:targets[index],before:before.label,after:after.label});
 }
 console.log(`PAM_QUALITY_375_BASELINE_CHANGED=${changed.length}/${targets.length}`);
 if(changed.length)console.log('PAM_QUALITY_375_BASELINE_CHANGES='+JSON.stringify(changed));
 assert.equal(changed.length,0,`375 quality batch changes ${changed.length} existing deterministic guesses`);
});

test('375 quality candidates remain robust to one softened yes and one softened no',()=>{
 let exact=0;
 const failures=[];
 for(let i=0;i<qualityProfiles.length;i++){
  const index=targets.length+i;
  const guess=playWith(QualityEngine,qualityWeights,qualityTargets,index,{noise:true});
  if(guess.index===index)exact++;
  else failures.push({target:qualityTargets[index],guess:guess.label});
 }
 const rate=exact/qualityProfiles.length;
 console.log(`PAM_QUALITY_375_NOISE=${exact}/${qualityProfiles.length} (${(rate*100).toFixed(1)}%)`);
 if(failures.length)console.log('PAM_QUALITY_375_NOISE_MISSES='+JSON.stringify(failures));
 assert.ok(rate>=0.90,`375 quality noise self-play ${(rate*100).toFixed(1)}% is below 90%`);
});
