import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';

test('Pam renders all 156 questions with a question mark without altering IDs or the knowledge matrix',async()=>{
 const model=await loadPam1775Model(loadPamClassicModel);
 const before=Buffer.from(model.weights);
 const beforeKnown=Buffer.from(model.knownMask);
 const source=await readFile('src/client/mom-mode/engine.js','utf8');
 const sandbox={window:{PAM_CLASSIC_MODEL:{
  targets:model.targets,questions:model.questions,weightsB64:model.weights.toString('base64'),
  knownMaskB64:model.knownMask.toString('base64')
 }},atob:x=>Buffer.from(x,'base64').toString('binary')};
 createContext(sandbox);
 runInContext(source,sandbox,{timeout:15000});
 const api=sandbox.window.PamClassic20Q;
 assert.equal(api.QUESTIONS.length,156);
 for(let q=0;q<156;q++){
  assert.ok(api.QUESTIONS[q].endsWith('?'),'Question '+q+' lacks final ?: '+api.QUESTIONS[q]);
  assert.equal(api.QUESTIONS[q].replace(/\?$/,''),model.questions[q].trim(),'Question '+q+' wording changed');
 }
 assert.ok(api.choose(api.createGame()).text.endsWith('?'),'Category prompt must end with ?');
 const game=api.createGame();
 const current=api.setCategory(game,'animal');
 assert.equal(current.kind,'question');
 assert.ok(current.text.endsWith('?'),'Actual gameplay prompt must end with ?');
 assert.ok(api.QUESTIONS[current.index].endsWith('?'));
 assert.deepEqual(model.weights,before,'Adding punctuation must not change the answer matrix');
 assert.deepEqual(model.knownMask,beforeKnown,'Adding punctuation must not change the known-answer mask');
});
