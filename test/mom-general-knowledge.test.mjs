/**
 * General-knowledge regression tests against the shipped model plus the
 * approved-fact compiler. The thematic additions are still research-only.
 * Do not interpret these tests as a verified Venus de Milo gameplay win.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCurrentPam,traceCurrentPam} from './support/pam-current-engine.mjs';
import {compileReviewedEvidence} from '../scripts/pam-reviewed-fact-compiler.mjs';

const current=await loadCurrentPam();
const {engine:e,model:m}=current;

test('existing Pam knowledge spans the four frozen base categories',()=>{
 assert.equal(e.N,1775);
 assert.equal(e.F,156);
 for(let q=0;q<4;q++){
  let count=0;
  for(let i=0;i<e.N;i++)if(m.knownMask[q*e.N+i]&&(m.weights[q*e.N+i]&1))count++;
  assert.ok(count>0,'missing original knowledge class '+q);
 }
});

test('sampled general-knowledge gameplay has natural questions within 20 turns',()=>{
 for(const i of [0,63,219,487,740,1199,1400,1650,1774]){
  const play=traceCurrentPam(current,i);
  assert.ok(play.turns<=20,m.targets[i]);
  assert.ok(play.path.every(p=>p.kind!=='question'||p.text.endsWith('?')));
 }
});

test('known artwork types can be kept separate with reviewed source facts',()=>{
 const targets=[{id:'PAM-0001',name:'Venus de Milo'},{id:'PAM-0002',name:'Mona Lisa'}];
 const rows=[
  ['PAM-0001','Venus de Milo','Q1','sculpture','yes'],
  ['PAM-0002','Mona Lisa','Q2','sculpture','no']
 ].map(([id,name,qid,value,truth])=>({
  id,approved_name:name,subject_qid:qid,reviewer:'synthetic test fixture',
  identity_reviewed:true,reviewed_at:'2026-10-18',
  identity_source:'https://www.wikidata.org/wiki/'+qid,
  facts:[{field:'artwork_type',value,truth,source:'https://www.wikidata.org/wiki/'+qid,review_status:'approved'}]
 }));
 const result=compileReviewedEvidence(targets,rows,[{text:'Is it a sculpture?',field:'artwork_type',value:'sculpture'}]);
 assert.deepEqual([...result.knownMask],[1,1]);
 assert.deepEqual([...result.weights],[3,2]);
});

test('unprofiled cultural subjects never inherit speculative negative answers',()=>{
 const targets=[{id:'PAM-0001',name:'Venus de Milo'},{id:'PAM-0002',name:'Mona Lisa'}];
 const record={id:'PAM-0001',approved_name:'Venus de Milo',subject_qid:'Q1',
  identity_reviewed:true,reviewer:'synthetic test fixture',reviewed_at:'2026-10-18',
  identity_source:'https://www.wikidata.org/wiki/Q1',
  facts:[{field:'artwork_type',value:'sculpture',truth:'yes',review_status:'approved',source:'https://www.wikidata.org/wiki/Q1'}]};
 const result=compileReviewedEvidence(targets,[record],[{text:'Is it a sculpture?',field:'artwork_type',value:'sculpture'}]);
 assert.deepEqual([...result.knownMask],[1,0]);
 assert.equal(result.summary.reviewedNo,0);
});

test('answers without supporting evidence are not treated as No',()=>{
 const targets=[{id:'PAM-0001',name:'Unreviewed Painting'}];
 const result=compileReviewedEvidence(targets,[],
  [{text:'Was it painted in Italy?',field:'country',value:'Italy'}]);
 assert.deepEqual([...result.knownMask],[0]);
 assert.deepEqual([...result.weights],[0]);
 assert.equal(result.summary.reviewedNo,0);
 assert.equal(result.summary.unknownCells,1);
});
