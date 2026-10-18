/**
 * Legacy engine acceptance criteria, migrated from removed MomBayes internals
 * to the actual PamClassic20Q public contract and the 1,775-source model.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCurrentPam,traceCurrentPam} from './support/pam-current-engine.mjs';

const current=await loadCurrentPam();
const {engine:e,model:m}=current;

test('Mom Mode knowledge is broad, unique and loaded from source',()=>{
 assert.equal(e.N,1775);
 assert.equal(e.F,156);
 assert.equal(m.weights.length,e.N*e.F);
 assert.equal(m.knownMask.length,e.N*e.F);
 assert.equal(new Set(m.targets.map(t=>t.toLowerCase())).size,e.N);
 assert.ok(m.weights.every(v=>v>=0&&v<=3));
});

test('truthful self-play stays within twenty questions for distributed target samples',()=>{
 const ids=[...new Set(Array.from({length:24},(_,i)=>Math.round(i*(e.N-1)/23)))];
 for(const i of ids){
  const play=traceCurrentPam(current,i);
  assert.ok(play.turns<=20, m.targets[i]+' exceeded budget');
  assert.equal(typeof play.result.score,'number');
  assert.equal(play.path.filter(x=>x.kind==='question').length+1,play.turns);
 }
});

test('six-choice opening is non-exclusive and cannot eliminate candidates',()=>{
 for(const category of ['person','place','animal_plant','object','entertainment','other']){
  const g=e.createGame();
  const next=e.setOpeningCategory(g,category);
  assert.equal(g.turn,1);
  assert.equal(g.category,category);
  assert.ok(g.scores.every(Number.isFinite));
  assert.equal(next.kind,'question');
 }
});

test('Pam cannot guess before the configured minimum, even with extreme confidence',()=>{
 const g=e.createGame({budget:20,minGuessQuestions:7});
 g.turn=6;g.scores.fill(0);g.scores[0]=100;
 assert.equal(e.choose(g).kind,'question');
 g.turn=7;
 assert.equal(e.choose(g).kind,'hunch');
});

test('an evidence-based hunch can be committed as a final guess',()=>{
 const g=e.createGame({minGuessQuestions:7});
 g.turn=11;g.scores[5]=100;
 const hunch=e.choose(g);
 assert.equal(hunch.kind,'hunch');
 const guess=e.commitGuess(g,hunch);
 assert.equal(guess.kind,'guess');
 assert.equal(guess.index,5);
 assert.equal(guess.label,m.targets[5]);
});

test('continuing a hunch charges points and asks another question',()=>{
 const g=e.createGame({minGuessQuestions:7,continuePrice:2});
 g.turn=11;g.scores[5]=100;
 const hunch=e.choose(g);
 assert.equal(hunch.kind,'hunch');
 const continued=e.deferGuess(g,hunch);
 assert.equal(g.continueCost,2);
 assert.equal(continued.kind,'question');
 assert.ok(!g.asked.has(continued.index));
});

test('Pam makes exactly one final guess and cannot rewrite a wrong guess',()=>{
 const g=e.createGame();g.turn=20;
 const guess=e.choose(g);
 assert.equal(guess.kind,'guess');
 const result=e.confirm(g,guess,false);
 assert.equal(result.winner,'player');
 assert.equal(result.correct,false);
 assert.equal(g.status,'finished');
 assert.throws(()=>e.confirm(g,guess,true),/game finished|one guess/);
 assert.throws(()=>e.choose(g),/game finished/);
});

test('continuing costs points; hard cap at twenty yields a guess',()=>{
 const g=e.createGame();g.turn=20;g.continueCost=4;
 const guess=e.choose(g);
 assert.equal(guess.kind,'guess');
 assert.equal(guess.reason,'question_limit');
 assert.equal(e.confirm(g,guess,false).score,26);
});

test('missing traits stay unknown rather than becoming negative claims',()=>{
 assert.ok(m.knownMask.includes(0),'reviewed additions must retain unknown cells');
 const q=10,t=m.targets.length-1,cell=q*e.N+t;
 assert.ok([0,1].includes(m.knownMask[cell]));
 const g=e.createGame();
 const first=e.setOpeningCategory(g,'other');
 const before=[...g.scores];
 e.answer(g,first,'unknown');
 assert.deepEqual([...g.scores],before);
});

test('unknown replies never eliminate any candidate and consume one turn',()=>{
 const g=e.createGame();
 const next=e.setOpeningCategory(g,'other');
 const scores=[...g.scores];
 e.answer(g,next,'unknown');
 assert.equal(g.turn,2);
 assert.deepEqual([...g.scores],scores);
 assert.ok(g.scores.every(Number.isFinite));
});

test('softened answers retain all candidates with finite belief scores',()=>{
 for(const answer of ['yes','probably','maybe','unknown','doubtful','no']){
  const g=e.createGame();
  const q=e.setOpeningCategory(g,'other');
  e.answer(g,q,answer);
  assert.ok(g.scores.every(Number.isFinite),answer);
  assert.equal(g.turn,2);
 }
});

test('late confidence can surface a hunch without repeated questions',()=>{
 const g=e.createGame();
 let action=e.setOpeningCategory(g,'other');
 const asked=new Set();
 for(let count=0;count<20&&action.kind==='question';count++){
  assert.ok(!asked.has(action.index),'repeated question');
  asked.add(action.index);
  action=e.answer(g,action,'maybe');
 }
 assert.ok(g.turn<=20);
 assert.ok(['guess','hunch'].includes(action.kind));
});
