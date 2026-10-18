import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const model=await loadPam1775Model(loadPamClassicModel);
global.window={PAM_CLASSIC_MODEL:{
 questions:model.questions, targets:model.targets,
 weightsB64:model.weights.toString('base64'),
 knownMaskB64:model.knownMask.toString('base64')
}};
if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
await import(pathToFileURL(path.join(process.cwd(),'src/client/mom-mode/engine.js')).href+'?opening-six');
const Engine=window.PamClassic20Q;
const choices=['person','place','animal_plant','object','entertainment','other'];
test('six distinct multiple-choice openings preserve the frozen 1775 × 156 model',()=>{
 assert.equal(Engine.N,1775);
 assert.equal(Engine.F,156);
 for(const value of choices){
  const game=Engine.createGame({budget:20});
  const opening=Engine.choose(game);
  assert.equal(opening.text,'What kind of thing are you thinking of?');
  assert.deepEqual(opening.options,choices);
  assert.equal(opening.kind,'category');
  assert.ok(game.scores.every(Number.isFinite));
  const next=Engine.setOpeningCategory(game,value);
  assert.equal(game.turn,1);
  assert.equal(game.category,value);
  assert.deepEqual(game.history[0],{kind:'category',value,turn:1,format:'six-choice'});
  assert.notEqual(next.kind,'category');
  assert.ok(game.scores.every(Number.isFinite));
  assert.throws(()=>Engine.setOpeningCategory(game,value),/start/);
  for(let i=0;i<21;i++){
   if(next.kind==='guess')break;
   if(next.kind==='hunch')break;
   assert.equal(next.kind,'question');
   assert.match(next.text,/\\?$/);
   if(i===0)assert.equal(next.index>=4,true);
   const following=Engine.answer(game,next,'unknown');
   assert.ok(game.turn<=20);
   if(following.kind==='guess'||following.kind==='hunch')break;
  }
 }
});
test('opening category gives a soft hint rather than excluding possible answers',()=>{
 const animal=Engine.createGame();
 const object=Engine.createGame();
 Engine.setOpeningCategory(animal,'animal_plant');
 Engine.setOpeningCategory(object,'object');
 assert.ok(animal.scores.some((score,i)=>score>object.scores[i]));
 assert.ok(object.scores.some((score,i)=>score>animal.scores[i]));
 assert.equal(animal.scores.some(x=>x===-Infinity),false);
});
test('six buttons keep deliberate two-column, three-row order and accessible click targets',async()=>{
 const root=new URL('../src/client/mom-mode/',import.meta.url);
 const html=await readFile(new URL('index.html',root),'utf8');
 const css=await readFile(new URL('classic.css',root),'utf8');
 const matches=[...html.matchAll(/data-answer="(person|place|animal_plant|object|entertainment|other)"[^>]*>([^<]+)<\\/button>/g)];
 assert.deepEqual(matches.map(m=>m[1]),choices);
 assert.deepEqual(matches.map(m=>m[2]),['Person','Place','Animal or Plant','Object','Entertainment','Other']);
 assert.match(css,/\\.category-answers\\{display:grid;grid-template-columns:repeat\\(2,minmax\\(0,1fr\\)\\)/);
});
