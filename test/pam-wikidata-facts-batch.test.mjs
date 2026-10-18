import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateSubjects,collectUnreviewedFacts} from '../scripts/pam-wikidata-facts-batch.mjs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const review={review_status:'IDENTITY_RESEARCH_ONLY',results:[
 {id:'PAM-0001',name:'New York City',category:'Cities',qid_suggestion:'Q60',status:'single_plausible_not_verified'},
 {id:'PAM-0002',name:'San Francisco',category:'Cities',qid_suggestion:'Q62',status:'ambiguous_needs_review'}
]};
const fakeEntity={id:'Q60',labels:{en:{value:'New York City'}},claims:{
 P17:[{rank:'normal',id:'Q60$P17',mainsnak:{snaktype:'value',datavalue:{value:{id:'Q30'}}}}],
 P569:[{rank:'deprecated',id:'Q60$BAD',mainsnak:{snaktype:'value',datavalue:{value:{time:'+1600-01-01T00:00:00Z',precision:9}}}}]
}};

test('only individually plausible, still-unverified identities enter provenance research',()=>{
 assert.equal(candidateSubjects(review).length,1);
 assert.equal(candidateSubjects(review)[0].qid,'Q60');
 assert.throws(()=>candidateSubjects({...review,review_status:'approved'}),/identity suggestions/);
});

test('retrieved properties remain unapproved and missing facts are never converted to negative answers',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pam-facts-'));
 try{
  const outputPath=join(root,'facts.json');
  const fake=async()=>({ok:true,status:200,json:async()=>({entities:{Q60:fakeEntity}})});
  const result=await collectUnreviewedFacts(review,{fetchImpl:fake,outputPath,paceMs:0,batchSize:1});
  assert.equal(result.requested,1);
  assert.equal(result.completed,1);
  assert.equal(result.claimCount,1);
  const data=JSON.parse(await readFile(outputPath,'utf8'));
  assert.equal(data.identity_approvals,0);
  assert.equal(data.factual_approvals,0);
  assert.equal(data.subjects[0].verified,false);
  assert.equal(data.subjects[0].claims[0].value_id,'Q30');
  assert.equal(data.subjects[0].claims.some(x=>x.property==='P569'),false);
  assert.ok(data.subjects[0].claims.every(x=>x.status==='source_claim_unreviewed'));
 }finally{await rm(root,{recursive:true,force:true});}
});