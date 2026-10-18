/**
 * Natural question-order and topical-evidence contract for current Pam.
 * The removed MomBayes facet-scoring API is deliberately not emulated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCurrentPam} from './support/pam-current-engine.mjs';
import {compileReviewedEvidence} from '../scripts/pam-reviewed-fact-compiler.mjs';
const {engine:e}=await loadCurrentPam();

const candidates=[
 {id:'PAM-0001',name:'Nintendo Switch'},
 {id:'PAM-0002',name:'PlayStation 5'},
 {id:'PAM-0003',name:'Xbox'}
];
const identity=(id,name,qid,facts)=>({id,approved_name:name,subject_qid:qid,
 identity_reviewed:true,reviewer:'synthetic test fixture',reviewed_at:'2026-10-18',
 identity_source:'https://www.wikidata.org/wiki/'+qid,
 facts:facts.map(([truth,value])=>({field:'manufacturer',value,truth,review_status:'approved',source:'https://www.wikidata.org/wiki/'+qid}))});
const question=[{text:'Is it made by Nintendo?',field:'manufacturer',value:'Nintendo'}];

test('Pam begins with an approachable broad classification, not niche trivia',()=>{
 const g=e.createGame();
 const first=e.choose(g);
 assert.equal(first.kind,'category');
 assert.equal(first.text,'What kind of thing are you thinking of?');
 assert.deepEqual([...first.options],['person','place','animal_plant','object','entertainment','other']);
});

test('person and entertainment labels must not become exclusionary negatives',()=>{
 for(const label of ['person','entertainment','object']){
  const g=e.createGame();
  const next=e.setOpeningCategory(g,label);
  assert.equal(g.turn,1);
  assert.equal(next.kind,'question');
  assert.ok(g.scores.every(Number.isFinite));
 }
});

test('reviewed manufacturer questions separate console answers only with real negatives',()=>{
 const records=[
  identity('PAM-0001','Nintendo Switch','Q1001',[['yes','Nintendo']]),
  identity('PAM-0002','PlayStation 5','Q1002',[['no','Nintendo']]),
  identity('PAM-0003','Xbox','Q1003',[['no','Nintendo']])
 ];
 const result=compileReviewedEvidence(candidates,records,question);
 assert.deepEqual([...result.knownMask],[1,1,1]);
 assert.deepEqual([...result.weights],[3,2,2]);
 assert.equal(result.summary.reviewedKnownCells,3);
});

test('a brand question is not informative about targets with unreviewed brands',()=>{
 const records=[identity('PAM-0001','Nintendo Switch','Q1001',[['yes','Nintendo']])];
 const result=compileReviewedEvidence(candidates,records,question);
 assert.deepEqual([...result.knownMask],[1,0,0]);
 assert.equal(result.summary.unknownCells,2);
 assert.equal(result.summary.reviewedNo,0);
});
