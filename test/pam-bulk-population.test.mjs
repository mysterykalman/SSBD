import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichPamModel} from '../scripts/pam-enrich-model.mjs';

test('bulk fill covers taxonomic yes and no without overwriting known evidence',()=>{
 const n=4,f=156,idx=(q,t)=>q*n+t;
 const targets=['mammal','fish','insect','bird'];
 const weights=Buffer.alloc(n*f),knownMask=Buffer.alloc(n*f);
 for(const [q,t] of [[152,0],[145,1],[147,2],[149,3]]){
  weights[idx(q,t)]=3;knownMask[idx(q,t)]=1;
 }
 weights[idx(126,0)]=3;knownMask[idx(126,0)]=1;
 const result=enrichPamModel({targets,questions:Array(f).fill('?'),weights,knownMask});
 for(const [q,t] of [[129,0],[129,1],[97,2],[126,3]])
  assert.equal(result.weights[idx(q,t)],3);
 for(const [q,t] of [[145,0],[152,1],[129,2],[147,3]])
  assert.equal(result.weights[idx(q,t)],2);
 assert.equal(result.weights[idx(152,0)],3);
 assert.equal(weights[idx(145,0)],0);
 assert.ok(result.enrichment.additions.length>=20);
});
