import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';

const ROOT=process.cwd();
const {questions,targets,weights,baseTargetCount,extensionCount}=await loadPamClassicModel();

global.window={PAM_CLASSIC_MODEL:{questions,targets,weightsB64:weights.toString('base64'),layout:'question-major',states:4,baseTargets:baseTargetCount,extensionTargets:extensionCount}};
if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?classic-test=1`);
const Engine=window.PamClassic20Q;

function stateAt(q,t){return weights[q*targets.length+t];}
function categoryFor(targetIndex){
 let best='other',bestScore=-Infinity;
 for(const [name,q] of Object.entries({animal:0,vegetable:1,mineral:2,other:3})){
  const state=stateAt(q,targetIndex),score=(state&1)?((state&2)?3:2):((state&2)?0:1);
  if(score>bestScore){bestScore=score;best=name;}
 }
 return best;
}
function oracleAnswer(q,targetIndex){const state=stateAt(q,targetIndex);return (state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');}
function playTarget(targetIndex){
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 let next=Engine.choose(game);
 assert.equal(next.kind,'category');
 next=Engine.setCategory(game,categoryFor(targetIndex));
 for(let guard=0;guard<50;guard++){
  if(next.kind==='question'){next=Engine.answer(game,next,oracleAnswer(next.index,targetIndex));continue;}
  if(next.kind==='hunch'){
   if(next.index===targetIndex)next=Engine.commitGuess(game,next);
   else next=Engine.deferGuess(game,next);
   continue;
  }
  if(next.kind==='guess')return next;
  throw new Error(`Unexpected Pam state ${next.kind}`);
 }
 throw new Error('Pam did not produce a guess');
}

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
