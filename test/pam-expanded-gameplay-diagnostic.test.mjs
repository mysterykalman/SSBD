import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {loadPamAdaptiveModel} from '../scripts/pam-adaptive-model.mjs';

const model=await loadPamAdaptiveModel(()=>loadPam1775Model(loadPamClassicModel));
const N=model.targets.length,known=model.knownMask,weights=model.weights;
globalThis.window={PAM_CLASSIC_MODEL:{
 questions:model.questions,targets:model.targets,weightsB64:weights.toString('base64'),
 knownMaskB64:known.toString('base64'),layout:'question-major',states:4
}};
globalThis.atob=x=>Buffer.from(x,'base64').toString('binary');
await import(pathToFileURL(resolve('src/client/mom-mode/engine.js')).href+'?adaptive-playback=1');
const Engine=window.PamClassic20Q;
function oracle(q,t){const offset=q*N+t;if(!known[offset])return 'unknown';const state=weights[offset];return state===3?'yes':state===2?'no':state===1?'probably':'probably_not'}
function category(t){
 if(t>=1775)return 'other';
 let best=0;
 for(let q=1;q<4;q++)if(weights[q*N+t]>weights[best*N+t])best=q;
 return ['animal','vegetable','mineral','other'][best];
}
function play(t){
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 let next=Engine.setCategory(game,category(t));
 const asked=[];
 for(let i=0;i<50;i++){
  if(next.kind==='question'){
   asked.push(next.index);
   next=Engine.answer(game,next,oracle(next.index,t));
   continue;
  }
  if(next.kind==='hunch'){
   next=next.index===t?Engine.commitGuess(game,next):Engine.deferGuess(game,next);
   continue;
  }
  if(next.kind==='guess')return {expected:model.targets[t],actual:next.label,correct:next.index===t,turns:game.turn,asked};
  throw Error('Unexpected Pam state '+next.kind);
 }
 throw Error('Pam did not terminate for '+model.targets[t]);
}
// These are diagnostic targets, not a success-rate estimate. Do not treat a
// structural test pass as gameplay certification.
test('expanded model produces bounded, measurable gameplay results',()=>{
 const targets=[0,40,1200,1410,1775,1776,1794,1900,1980,2200,2770,3283];
 const results=targets.map(play);
 for(const row of results){
  assert.ok(row.turns<=20,'Pam exceeded 20 questions for '+row.expected);
  assert.equal(new Set(row.asked).size,row.asked.length,'Pam repeated a question for '+row.expected);
 }
 const correct=results.filter(r=>r.correct).length;
 console.log('PAM_ADAPTIVE_GAMEPLAY_DIAGNOSTIC='+JSON.stringify({tested:results.length,correct,results:results.map(r=>({expected:r.expected,actual:r.actual,correct:r.correct,turns:r.turns}))}));
});
