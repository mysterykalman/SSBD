import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPamCohort} from '../scripts/pam-cohort-validation.mjs';
function fixture(){
 const results=[];
 for(let i=1;i<=1650;i++){
  const id='PAM-'+String(i).padStart(4,'0');
  results.push({id,name:'Candidate '+i,category:'People',subcategory:'Athletes',
   context:'',status:i<=1352?'single_plausible_not_verified':'ambiguous_needs_review',
   qid_suggestion:'Q'+(10000+i),reviewed:false,reviewed_qid:null});
 }
 const film=[
  {id:'PAM-0001',name:'Jurassic Park',category:'Movies',subcategory:'1980s & 1990s',
   context:'1993',qid_suggestion:'Q10001',status:'single_plausible_not_verified',reviewed:false},
  {id:'PAM-0002',name:'The Lost World: Jurassic Park',category:'Movies',subcategory:'1980s & 1990s',
   context:'1997',qid_suggestion:'Q10002',status:'single_plausible_not_verified',reviewed:false},
  {id:'PAM-0003',name:'The Matrix',category:'Movies',subcategory:'1980s & 1990s',
   context:'1999',qid_suggestion:'Q10003',status:'single_plausible_not_verified',reviewed:false}
 ];
 results.splice(0,3,...film);
 const claim=(subject,property,field,kind,value)=>({
  status:'source_claim_unreviewed',property,field,kind,rank:'normal',claim_id:'sample',
  source:'https://www.wikidata.org/wiki/'+subject+'#'+property,
  ...(kind==='item'?{value_id:value}:{value_time:'+'+value+'-01-01T00:00:00Z',precision:11})
 });
 const subjects=[
  {id:'PAM-0001',qid:'Q10001',entity_label:'Jurassic Park',source_status:'wikidata_entity_found_unverified',
   claims:[claim('Q10001','P577','release_date','time','1993'),claim('Q10001','P57','film_director','item','Q252')]},
  {id:'PAM-0002',qid:'Q10002',entity_label:'The Lost World: Jurassic Park',source_status:'wikidata_entity_found_unverified',
   claims:[claim('Q10002','P577','release_date','time','1997'),claim('Q10002','P57','film_director','item','Q252')]},
  {id:'PAM-0003',qid:'Q10003',entity_label:'The Matrix',source_status:'wikidata_entity_found_unverified',
   claims:[claim('Q10003','P577','release_date','time','1999')]}
 ];
 return {queue:{review_status:'IDENTITY_RESEARCH_ONLY',results},
  facts:{status:'RESEARCH_CLAIMS_UNREVIEWED',identity_approvals:0,factual_approvals:0,subjects}};
}
test('whole-cohort report reconciles all 1352 active and 298 paused without promoting facts',()=>{
 const {queue,facts}=fixture();
 const audit=auditPamCohort(queue,facts,{labels:{Q252:{label:'Steven Spielberg'}}});
 assert.equal(audit.summary.activeCount,1352);
 assert.equal(audit.summary.pausedCount,298);
 assert.equal(audit.summary.editorialApprovedCount,0);
 assert.equal(audit.summary.sourceFound,3);
 assert.equal(audit.summary.sourceMissing,1349);
 assert.equal(audit.summary.franchiseCollisionGroups,1);
 assert.equal(audit.summary.curatedSequelReplacementFlags,1);
 assert.equal(audit.clusters.find(c=>c.cluster==='Movies / 1980s & 1990s').count,3);
 assert(audit.clusters.find(c=>c.cluster==='Movies / 1980s & 1990s').questionCandidates>0);
 assert(audit.profiles.find(p=>p.id==='PAM-0002').sequelReview==='REVIEW_REMOVE_OR_REPLACE');
 assert(audit.profiles.find(p=>p.id==='PAM-0001').positives.some(x=>x.value_label==='Steven Spielberg'));
 assert.equal(audit.profiles.find(p=>p.id==='PAM-0004').positives.length,0);
});
test('contradictory Wikidata dates are not silently treated as a reliable release year',()=>{
 const {queue,facts}=fixture();
 facts.subjects[0].claims.push({...facts.subjects[0].claims[0],value_time:'+1994-01-01T00:00:00Z'});
 const audit=auditPamCohort(queue,facts);
 const film=audit.profiles.find(x=>x.id==='PAM-0001');
 assert.equal(film.year,null);
 assert.equal(film.yearConflict,false);
});
test('context/date mismatch is flagged for review',()=>{
 const {queue,facts}=fixture();
 queue.results[0].context='1983';
 const audit=auditPamCohort(queue,facts);
 assert.equal(audit.summary.identityYearConflicts,1);
});
test('unreviewed or reshaped source data never become approved',()=>{
 const {queue,facts}=fixture();queue.results[0].reviewed=true;
 assert.throws(()=>auditPamCohort(queue,facts),/not an editorial signoff/);
});
