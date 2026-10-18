/**
 * Facet safety guarantees for the reviewed-only expansion compiler.
 * The live classic model does not claim to ship 1,650 new facet targets.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileReviewedEvidence} from '../scripts/pam-reviewed-fact-compiler.mjs';

const targets=[
 {id:'PAM-0001',name:'Nintendo Switch'},
 {id:'PAM-0002',name:'PlayStation 5'},
 {id:'PAM-0003',name:'Unidentified Console'}
];
const source=qid=>'https://www.wikidata.org/wiki/'+qid;
function record(id,name,qid,claims){
 return{id,approved_name:name,subject_qid:qid,identity_reviewed:true,
  reviewer:'fixture-author',reviewed_at:'2026-10-18',identity_source:source(qid),
  facts:claims.map(([field,value,truth,complete=false])=>({field,value,truth,complete,review_status:'approved',source:source(qid)}))};
}
const questions=[
 {text:'Is it made by Nintendo?',field:'manufacturer',value:'Nintendo'},
 {text:'Is it a video game console?',field:'product_type',value:'video game console'}
];

test('reviewed brand and product type facets compile into natural questions',()=>{
 const verified=[
  record('PAM-0001','Nintendo Switch','Q1001',[['manufacturer','Nintendo','yes'],['product_type','video game console','yes']]),
  record('PAM-0002','PlayStation 5','Q1002',[['manufacturer','Nintendo','no'],['product_type','video game console','yes']])
 ];
 const result=compileReviewedEvidence(targets,verified,questions);
 assert.equal(result.N,3);
 assert.equal(result.F,2);
 assert.deepEqual([...result.weights],[3,2,0,3,3,0]);
 assert.deepEqual([...result.knownMask],[1,1,0,1,1,0]);
});

test('unknown product facets stay unknown rather than false',()=>{
 const verified=[record('PAM-0001','Nintendo Switch','Q1001',[['manufacturer','Nintendo','yes']])];
 const result=compileReviewedEvidence(targets,verified,questions);
 assert.equal(result.summary.reviewedYes,1);
 assert.equal(result.summary.reviewedNo,0);
 assert.equal(result.summary.unknownCells,5);
});

test('multi-valued manufacturer facts cannot imply an unreviewed negative',()=>{
 const verified=[record('PAM-0001','Nintendo Switch','Q1001',[['manufacturer','Nintendo','yes',true]])];
 const alternative=[{text:'Is it made by Sony?',field:'manufacturer',value:'Sony'}];
 const result=compileReviewedEvidence(targets,verified,alternative);
 assert.equal(result.knownMask[0],0);
});

test('contradictory manufacturer evidence is rejected before gameplay',()=>{
 const verified=[record('PAM-0001','Nintendo Switch','Q1001',[
  ['manufacturer','Nintendo','yes'],['manufacturer','Nintendo','no']
 ])];
 assert.throws(()=>compileReviewedEvidence(targets,verified,questions),/Contradictory/);
});
