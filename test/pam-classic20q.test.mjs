import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const MODEL_DIR=path.join(ROOT,'data','pam20q','reference','classic');
const questions=JSON.parse(fs.readFileSync(path.join(MODEL_DIR,'questions.json'),'utf8'));
const targets=JSON.parse(fs.readFileSync(path.join(MODEL_DIR,'targets.json'),'utf8'));
const weights=fs.readFileSync(path.join(MODEL_DIR,'weights.u2states.bin'));

global.window={PAM_CLASSIC_MODEL:{questions,targets,weightsB64:weights.toString('base64'),layout:'question-major',states:4}};
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
function oracleAnswer(q,targetIndex){return (stateAt(q,targetIndex)&1)?'yes':'no';}
function playTarget(targetIndex){
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 let next=Engine.choose(game);
 assert.equal(next.kind,'category');
 next=Engine.setCategory(game,categoryFor(targetIndex));
 for(let guard=0;guard<40;guard++){
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

test('frozen Pam model has the expected self-contained shape',()=>{
 assert.equal(Engine.N,1200);
 assert.equal(Engine.F,156);
 assert.equal(weights.length,187200);
 assert.ok([...weights].every(value=>value>=0&&value<=3));
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

test('representative model targets resolve to a model guess within the 20-question budget',()=>{
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
