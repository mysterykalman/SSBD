import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {loadThematicRoster} from '../scripts/pam-thematic-lab.mjs';
import {appendReviewedPamExpansion} from '../scripts/pam-merge-reviewed-expansion.mjs';
const [frozen,roster]=await Promise.all([loadPam1775Model(loadPamClassicModel),loadThematicRoster()]);
const names=new Set(frozen.targets.map(s=>s.toLowerCase()));
const eligible=roster.filter(x=>!names.has(x.name.toLowerCase())).slice(0,2);
assert.equal(eligible.length,2);
const questions=Array.from({length:8},(_,i)=>({
 text:'Is it associated with research region '+(i+1)+'?',field:'research_region',value:'Region '+(i+1),
 reviewed_by:'Fixture reviewer',reviewed_at:'2026-10-18',review_status:'approved'
}));
function record(row,i){
 const qid='Q'+(998001+i);
 return {id:row.id,approved_name:row.name,subject_qid:qid,
  identity_reviewed:true,identity_source:'https://www.wikidata.org/wiki/'+qid,
  reviewer:'Fixture reviewer',reviewed_at:'2026-10-18',
  franchise_review:'APPROVED',gameplay_review:'APPROVED',
  facts:questions.map((q,j)=>({field:q.field,value:q.value,
   truth:(i===0?j<4:j>=4)?'yes':'no',
   review_status:'approved',source:'https://www.wikidata.org/wiki/'+qid}))};
}
function pack(){return{release_status:'EDITORIAL_APPROVAL_COMPLETE',approval_kind:'human_reviewed',records:eligible.map(record)};}
test('the approved-only assembler preserves all frozen answers and every original known cell',()=>{
 const out=appendReviewedPamExpansion(frozen,roster,pack(),questions,{count:2});
 assert.equal(out.targets.length,1777);
 assert.equal(out.questions.length,164);
 assert.deepEqual(out.targets.slice(0,1775),frozen.targets);
 assert.equal(out.expansionReviewed,true);
 assert.equal(out.reviewedExpansionCount,2);
 assert.equal(out.openingCategories[0],null);
 assert(out.openingCategories[1775].length>=1);
 for(let q=0;q<156;q++){
  const old=q*1775,expanded=q*1777;
  assert.deepEqual(out.weights.subarray(expanded,expanded+1775),
   frozen.weights.subarray(old,old+1775));
  assert.deepEqual(out.knownMask.subarray(expanded,expanded+1775),
   frozen.knownMask.subarray(old,old+1775));
  assert.equal(out.knownMask[expanded+1775],0);
  assert.equal(out.knownMask[expanded+1776],0);
 }
 for(let q=156;q<164;q++){
  const at=q*1777;
  assert.equal(out.knownMask[at],0,'new questions must not invent old-target facts');
  assert.equal(out.knownMask[at+1775],1);
  assert.equal(out.knownMask[at+1776],1);
 }
});
test('research-only labels, sparse profiles or no manual sign-off cannot become playable',()=>{
 const data=pack();
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,{...data,release_status:'RESEARCH_ONLY'},questions,{count:2}),/approval/);
 const noReviewer=pack();delete noReviewer.records[0].reviewer;
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,noReviewer,questions,{count:2}),/reviewer/);
 const noGameplay=pack();noGameplay.records[0].gameplay_review='PENDING';
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,noGameplay,questions,{count:2}),/gameplay review/);
 const sparse=pack();sparse.records[0].facts=sparse.records[0].facts.slice(0,2);
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,sparse,questions,{count:2}),/insufficient reviewed Yes\/No/);
});
test('every question requires editorial provenance and proper punctuation',()=>{
 const q=questions.map(x=>({...x}));q[0].text=q[0].text.replace(/\?$/,'');
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,pack(),q,{count:2}),/Malformed reviewed question/);
 const p=questions.map(x=>({...x}));delete p[0].reviewed_by;
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,pack(),p,{count:2}),/separate dated editorial signoff/);
});

test('reviewed replacement ledger swaps one film slot without touching original 1775',()=>{
 const sequel=roster.find(x=>x.name==='The Godfather Part II');
 assert.ok(sequel);
 const normal=eligible[0];
 const replacementName='The Sting';
 const movieRecord=record(sequel,3);movieRecord.approved_name=replacementName;
 const document={release_status:'EDITORIAL_APPROVAL_COMPLETE',approval_kind:'human_reviewed',
  records:[record(normal,0),movieRecord],
  replacements:[{
   slot_id:sequel.id,original_name:sequel.name,approved_name:replacementName,
   subject_qid:movieRecord.subject_qid,identity_source:movieRecord.identity_source,
   release_year:1973,subcategory:'Classic Cinema (to 1979)',
   review_status:'approved',reviewed_by:'Fixture reviewer',reviewed_at:'2026-10-18'
  }]};
 const out=appendReviewedPamExpansion(frozen,roster,document,questions,{count:2});
 assert.equal(out.targets[1776],replacementName);
 assert.deepEqual(out.targets.slice(0,1775),frozen.targets);
 const bad=structuredClone(document);bad.replacements[0].reviewed_at='never';
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,bad,questions,{count:2}),/dated, accountable/);
 const changed=structuredClone(document);changed.records[1].approved_name='Another unapproved movie';
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,changed,questions,{count:2}),/Replacement name not approved/);
});
test('approved model cannot contain two entries from one film franchise',()=>{
 const a=roster.find(x=>x.name==='The Godfather');
 const b=roster.find(x=>x.name==='The Godfather Part II');
 assert.ok(a&&b);
 const data={release_status:'EDITORIAL_APPROVAL_COMPLETE',approval_kind:'human_reviewed',
  records:[record(a,0),record(b,1)]};
 assert.throws(()=>appendReviewedPamExpansion(frozen,roster,data,questions,{count:2}),/One-film-per-franchise rule/);
});
