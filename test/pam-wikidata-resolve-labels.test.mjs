import test from 'node:test';
import assert from 'node:assert/strict';
import {referencedValueQids,retrieveValueLabels} from '../scripts/pam-wikidata-resolve-labels.mjs';
const src={review_status:'research_only_unverified',subjects:[
 {id:'PAM-0001',verified:false,claims:[{k:'item',v:'Q50'},{k:'item',v:'Q20'},{k:'time',v:'+1970-01-01'},{k:'item',v:'Q50'}]},
 {id:'PAM-0002',verified:false,claims:[{k:'item',v:'Q3'},{k:'item',v:null}]}
]};
test('only sourced QID values enter label lookup, never missing or ambiguous proxies',()=>{
 assert.deepEqual(referencedValueQids(src),['Q3','Q20','Q50']);
 assert.throws(()=>referencedValueQids({...src,subjects:[{verified:true,claims:[]}]}),/Approved/);
});
test('failed batches and missing labels do not become negative answers',async()=>{
 const res=await retrieveValueLabels(src,{batchSize:2,paceMs:250,fetchImpl:async u=>{
  const ids=new URL(u).searchParams.get('ids');
  if(ids==='Q50')return{ok:false,status:404};
  assert.equal(ids,'Q3|Q20');
  return{ok:true,status:200,json:async()=>({entities:{Q3:{labels:{en:{value:'life'}}},Q20:{labels:{en:{value:'country'}}}}})};
 }});
 assert.equal(res.referenced_value_qids,3);assert.equal(res.labeled_value_qids,2);
 assert.equal(res.failed_batches.length,1);assert.equal(res.labels.Q3.status,'unreviewed_reference_label');
 assert.ok(!res.labels.Q50);assert.equal(res.review_status,'research_only_unverified');
});