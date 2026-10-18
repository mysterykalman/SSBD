/**
 * Behavioural migration of the Bayes-era deduction suite.
 * Test the shipped question-selection contract and source-backed known masks,
 * not methods/classes retired with the experimental MomBayes engine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCurrentPam,traceCurrentPam} from './support/pam-current-engine.mjs';
const fixture=await loadCurrentPam();
const {engine:e,model:m}=fixture;

test('deduction exposes a selectable question and its information-gain diagnostic',()=>{
 const g=e.createGame();
 const first=e.choose(g);
 assert.equal(first.kind,'category');
 const q=e.setOpeningCategory(g,'other');
 assert.equal(q.kind,'question');
 assert.ok(q.index>=4&&q.index<e.F);
 assert.equal(q.id,'q'+q.index);
 assert.equal(typeof q.gain,'number');
 assert.ok(Number.isFinite(q.gain)&&q.gain>=0);
 assert.ok(q.text.endsWith('?'));
});

test('a question is grounded in independently known yes/no evidence',()=>{
 const g=e.createGame();
 const q=e.setOpeningCategory(g,'other');
 let yes=0,no=0,unknown=0;
 for(let t=0;t<e.N;t++){
  const pos=q.index*e.N+t;
  if(!m.knownMask[pos])unknown++;
  else if(m.weights[pos]&1)yes++;
  else no++;
 }
 assert.ok(yes>0&&no>0,'first selected question must split known candidates');
 assert.ok(yes+no+unknown===e.N);
});

test('unknown evidence remains neutral even for strong yes answers',()=>{
 const g=e.createGame();
 const q=e.setOpeningCategory(g,'other');
 const unknownIndex=m.targets.findIndex((_,t)=>m.knownMask[q.index*e.N+t]===0);
 assert.ok(unknownIndex>=0,'the combined model must expose sparse reviewed traits');
 const before=g.scores[unknownIndex];
 e.answer(g,q,'yes');
 assert.equal(g.scores[unknownIndex],before,'unknown must never become an implicit No');
});

test('reviewed known evidence differentiates yes and no without erasing candidates',()=>{
 const g=e.createGame();
 const q=e.setOpeningCategory(g,'other');
 const yesIndex=m.targets.findIndex((_,t)=>m.knownMask[q.index*e.N+t]===1&&(m.weights[q.index*e.N+t]&1)===1);
 const noIndex=m.targets.findIndex((_,t)=>m.knownMask[q.index*e.N+t]===1&&(m.weights[q.index*e.N+t]&1)===0);
 assert.ok(yesIndex>=0&&noIndex>=0);
 const beforeYes=g.scores[yesIndex],beforeNo=g.scores[noIndex];
 e.answer(g,q,'yes');
 assert.ok(g.scores[yesIndex]>beforeYes);
 assert.ok(g.scores[noIndex]<beforeNo);
 assert.ok(g.scores.every(Number.isFinite));
});

test('a selected question cannot be answered again to amplify evidence',()=>{
 const g=e.createGame();
 const q=e.setOpeningCategory(g,'other');
 e.answer(g,q,'probably');
 const turn=g.turn;
 assert.throws(()=>e.answer(g,q,'yes'),/repeated/);
 assert.equal(g.turn,turn);
});

test('deduction self-play remains bounded on diverse candidate indexes',()=>{
 for(const t of [0,1,12,100,299,499,800,1100,1350,1400,1500,1750,1774]){
  const play=traceCurrentPam(fixture,t,{softAnswerAt:3});
  assert.ok(play.turns<=20,m.targets[t]+' overran');
  assert.ok(play.path.every(entry=>entry.kind!=='question'||entry.text.endsWith('?')));
 }
});
