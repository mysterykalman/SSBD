import test from 'node:test';
import assert from 'node:assert/strict';
import {extractClaimFacts,retrieveFactCandidates} from '../scripts/pam-wikidata-facts.mjs';
const example={id:'Q42',claims:{
 P106:[{id:'claim1',rank:'normal',mainsnak:{snaktype:'value',datavalue:{value:{id:'Q49757'}}}}],
 P569:[{id:'claim2',rank:'preferred',mainsnak:{snaktype:'value',datavalue:{value:{time:'+1952-03-11T00:00:00Z',precision:11}}}}],
 P17:[{id:'claim3',rank:'deprecated',mainsnak:{snaktype:'value',datavalue:{value:{id:'Q145'}}}}],
 P570:[{id:'claim4',rank:'normal',mainsnak:{snaktype:'novalue'}}]
}};
test('positive source claims survive with QID and precision, deprecated and unknown do not',()=>{
 const facts=extractClaimFacts(example);
 assert.equal(facts.length,2);
 assert.ok(facts.some(x=>x.field==='occupation'&&x.value_id==='Q49757'));
 assert.ok(facts.some(x=>x.field==='birth_date'&&x.precision===11));
 assert.ok(facts.every(x=>x.status==='source_claim_unreviewed'));
 assert.ok(facts.every(x=>x.source.startsWith('https://www.wikidata.org/wiki/Q42')));
});
test('only distinct plausible QIDs are fetched; even they stay unapproved',async()=>{
 const source={results:[
  {id:'PAM-0001',name:'A',category:'People',status:'single_plausible_not_verified',suggested_candidates:[{qid:'Q42'}]},
  {id:'PAM-0002',name:'B',category:'People',status:'ambiguous_needs_review',suggested_candidates:[{qid:'Q345'}]}
 ]};
 let called='';
 const out=await retrieveFactCandidates(source,{fetchImpl:async(url)=>{
  called=url;return{ok:true,status:200,json:async()=>({entities:{Q42:example}})};
 }});
 assert.equal(out.subject_count,1);
 assert.equal(out.subjects[0].reviewed,false);
 assert.ok(called.includes('Q42'));
 assert.ok(!called.includes('Q345'));
});