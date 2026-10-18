import test from 'node:test';
import assert from 'node:assert/strict';
import {compileReviewedEvidence,validateReviewedSubject} from '../scripts/pam-reviewed-fact-compiler.mjs';
const SRC='https://www.wikidata.org/wiki/Q90';
const targets=[{id:'PAM-0001',name:'Paris'},{id:'PAM-0002',name:'Tokyo'},{id:'PAM-0003',name:'London'},{id:'PAM-0004',name:'Undocumented city'}];
const questions=[{field:'city_present_day_country',value:'France',text:'Is this city in France?'},{field:'city_present_day_country',value:'Japan',text:'Is this city in Japan?'},{field:'person_occupation',value:'physicist',text:'Were they known for physics?'}];
const approved=(id,qid,facts)=>({id,subject_qid:qid,identity_reviewed:true,
 approved_name:targets.find(target=>target.id===id)?.name,
 reviewer:'independent-editor',reviewed_at:'2026-10-18',identity_source:`https://www.wikidata.org/wiki/${qid}`,facts});
const fact=(field,value,complete=true)=>({field,value,truth:'yes',complete,review_status:'approved',source:SRC});

test('source-linked reviewed city countries can yield explicit Yes and logically exclusive No',()=>{
 const records=[approved('PAM-0001','Q90',[fact('city_present_day_country','France')]),approved('PAM-0002','Q1490',[fact('city_present_day_country','Japan')]),approved('PAM-0003','Q84',[fact('city_present_day_country','United Kingdom')])];
 const m=compileReviewedEvidence(targets,records,questions);assert.equal(m.N,4);assert.equal(m.F,3);
 assert.deepEqual([...m.weights.slice(0,4)],[3,2,2,0]);
 assert.deepEqual([...m.knownMask.slice(0,4)],[1,1,1,0]);
 assert.deepEqual([...m.weights.slice(4,8)],[2,3,2,0]);
 assert.equal(m.summary.reviewedKnownCells,6);
});
test('unreviewed, absent and unknown claims remain UNKNOWN',()=>{
 const r=approved('PAM-0001','Q90',[{...fact('city_present_day_country','France'),review_status:'research_only_unverified'}]);
 const m=compileReviewedEvidence(targets,[r],questions);assert.equal(m.summary.reviewedKnownCells,0);
});
test('reviewed occupations do not imply invented negatives for other occupations',()=>{
 const r=approved('PAM-0001','Q90',[fact('person_occupation','chemist',true)]);
 const m=compileReviewedEvidence(targets,[r],questions);assert.equal(m.weights[2*4],0);assert.equal(m.knownMask[2*4],0);
});
test('contradictory Yes and No fail validation rather than picking either',()=>{
 const r=approved('PAM-0001','Q90',[fact('city_present_day_country','France'),{...fact('city_present_day_country','France'),truth:'no'}]);
 assert.throws(()=>validateReviewedSubject(r),/Contradictory/);
});
test('unverified entity identity cannot be promoted to playable facts',()=>{
 const r={...approved('PAM-0001','Q90',[fact('city_present_day_country','France')]),identity_reviewed:false};
 assert.throws(()=>compileReviewedEvidence(targets,[r],questions),/Unreviewed identity/);
});
test('complete single-valued facts must not have conflicting reviewed positives',()=>{
 const r=approved('PAM-0001','Q90',[fact('city_present_day_country','France'),fact('city_present_day_country','Japan')]);
 assert.throws(()=>compileReviewedEvidence(targets,[r],questions),/Multiple complete/);
});
test('untrusted links and lexical name-hint filters are not factual evidence',()=>{
 const r=approved('PAM-0001','Q90',[{...fact('city_present_day_country','France'),source:'https://some-random-blog.example/foo'}]);
 assert.throws(()=>compileReviewedEvidence(targets,[r],questions),/trusted HTTPS/);
 const x=approved('PAM-0001','Q90',[fact('last_name','Paris')]);
 assert.throws(()=>compileReviewedEvidence(targets,[x],questions),/non-semantic/);
});
test('identity approval cannot be forged by a boolean flag or mismatched referent',()=>{
 const r=approved('PAM-0001','Q90',[fact('city_present_day_country','France')]);
 assert.throws(()=>validateReviewedSubject({...r,reviewer:''}),/Identity approval/);
 assert.throws(()=>validateReviewedSubject({...r,identity_source:'https://www.wikidata.org/wiki/Q1490'}),/Identity source/);
 assert.throws(()=>compileReviewedEvidence(targets,[{...r,approved_name:'Tokyo'}],questions),/identity name/);
 assert.throws(()=>compileReviewedEvidence([{...targets[0],subject_qid:'Q1490'}],[r],questions),/identity QID/);
});
