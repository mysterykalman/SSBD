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
test('linked Wikidata QID labels are human-readable but never automatically approved',async()=>{
 const source={results:[{id:'PAM-0001',name:'A',category:'People',status:'single_plausible_not_verified',suggested_candidates:[{qid:'Q42'}]}]};
 const calls=[];
 const response=await retrieveFactCandidates(source,{includeValueLabels:true,fetchImpl:async url=>{
  const u=new URL(url);const ids=u.searchParams.get('ids');calls.push(ids);
  if(ids==='Q42')return{ok:true,status:200,json:async()=>({entities:{Q42:example}})};
  if(ids==='Q49757')return{ok:true,status:200,json:async()=>({entities:{Q49757:{id:'Q49757',labels:{en:{value:'poet'}},descriptions:{en:{value:'person who writes poems'}}}}})};
  throw Error('Unexpected Wikidata QIDs '+ids);
 }});
 assert.equal(response.label_metrics.referenced_qids,1);
 assert.equal(response.label_metrics.resolved_labels,1);
 assert.equal(calls.length,2);
 const occupation=response.subjects[0].claims.find(x=>x.field==='occupation');
 assert.equal(occupation.value_label,'poet');
 assert.equal(occupation.value_label_status,'wikidata_label_unreviewed');
 assert.equal(occupation.status,'source_claim_unreviewed');
 assert.equal(response.subjects[0].reviewed,false);
});
test('population, area, and national language preserve time qualifiers and quantities, never synthetic negatives',()=>{
 const sample={id:'Q16',claims:{
  P1082:[{id:'pop',rank:'preferred',mainsnak:{snaktype:'value',datavalue:{value:{amount:'+41200000',unit:'1'}}},qualifiers:{P585:[{snaktype:'value',datavalue:{value:{time:'+2021-01-01T00:00:00Z',precision:11}}}]}}],
  P2046:[{id:'area',rank:'normal',mainsnak:{snaktype:'value',datavalue:{value:{amount:'+9984670',unit:'http://www.wikidata.org/entity/Q712226'}}}}],
  P37:[{id:'language',rank:'preferred',mainsnak:{snaktype:'value',datavalue:{value:{id:'Q1860'}}}}],
  P47:[{id:'border',rank:'normal',mainsnak:{snaktype:'value',datavalue:{value:{id:'Q30'}}},qualifiers:{P582:[{snaktype:'value',datavalue:{value:{time:'+1990-01-01T00:00:00Z',precision:9}}}]}}],
  P38:[{id:'unknown',rank:'normal',mainsnak:{snaktype:'somevalue'}}]
 }};
 const facts=extractClaimFacts(sample);
 assert.equal(facts.length,4);
 const pop=facts.find(x=>x.field==='population');
 assert.equal(pop.kind,'quantity');assert.equal(pop.value_amount,41200000);
 assert.equal(pop.point_in_time,'+2021-01-01T00:00:00Z');
 assert.equal(pop.point_precision,11);assert.equal(pop.rank,'preferred');
 const area=facts.find(x=>x.field==='area');
 assert.equal(area.value_amount,9984670);
 assert.equal(area.unit,'http://www.wikidata.org/entity/Q712226');
 assert.ok(facts.some(x=>x.field==='official_language'&&x.value_id==='Q1860'));
 assert.equal(facts.find(x=>x.field==='shares_border').ended_at,'+1990-01-01T00:00:00Z');
 assert.ok(facts.every(x=>x.status==='source_claim_unreviewed'));
 assert.ok(!facts.some(x=>x.field==='currency'));
});