import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {loadPamAdaptiveModel} from '../scripts/pam-adaptive-model.mjs';

const baseline=await loadPam1775Model(loadPamClassicModel);
const model=await loadPamAdaptiveModel(()=>Promise.resolve(baseline));
const N=model.targets.length,oldN=baseline.targets.length;

test('all original and expansion records appear in 3284 by 488 matrix',()=>{
 assert.equal(N,3284);
 assert.ok(model.questions.length>488 && model.questions.length<=1000);
 assert.equal(model.questions.length,488+model.adaptive.generatedQuestions);
 assert.equal(model.weights.length,N*model.questions.length);
 assert.equal(model.knownMask.length,N*model.questions.length);
 assert.equal(model.targets[1775],'New York City');
 assert.equal(model.targets.at(-1),'DeLorean Motor Company');
});
test('original 156-question knowledge stays byte-for-byte unchanged',()=>{
 for(let q=0;q<156;q++)for(let t=0;t<oldN;t++){
  const old=q*oldN+t,next=q*N+t;
  assert.equal(model.weights[next],baseline.weights[old]);
  assert.equal(model.knownMask[next],baseline.knownMask[old]);
 }
});
test('unknown information is masked instead of treated as negative',()=>{
 const t=1775;
 for(let q=4;q<156;q++)assert.equal(model.knownMask[q*N+t],0);
 // Pam NEW 001: New York City is a real-world place.
 assert.equal(model.weights[156*N+t],3);
 assert.equal(model.knownMask[156*N+t],1);
 let unknown=0;
 for(let q=156;q<488;q++)unknown+=model.knownMask[q*N+t]===0;
 assert.ok(unknown>100);
});
test('no duplicate expansion answer IDs and each expanded vector is 332 positions',()=>{
 assert.equal(model.adaptive.originalTargets,1775);
 assert.equal(model.adaptive.expansionTargets,1509);
 assert.equal(model.adaptive.expansionQuestions,332);
 assert.ok(model.adaptive.answeredExpansionCells>0);
});
