import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';

const model=await loadPam1775Model(loadPamClassicModel);

test('Pam runtime model contains all 1775 targets',()=>{
  assert.equal(model.baseTargetCount,1200);
  assert.equal(model.extensionCount,200);
  assert.equal(model.qualityCount,375);
  assert.equal(model.targets.length,1775);
  assert.equal(model.questions.length,156);
  assert.equal(model.weights.length,1775*156);
  assert.equal(new Set(model.targets.map(x=>x.toLowerCase())).size,1775);
});

test('current Pam engine accepts the 1775-target model',async()=>{
  global.window={PAM_CLASSIC_MODEL:{questions:model.questions,targets:model.targets,weightsB64:model.weights.toString('base64'),layout:'question-major',states:4,baseTargets:1200,extensionTargets:575}};
  if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
  await import(`${pathToFileURL(path.join(process.cwd(),'src','client','mom-mode','engine.js')).href}?pam1775=1`);
  assert.equal(window.PamClassic20Q.N,1775);
  assert.equal(window.PamClassic20Q.F,156);
});
