import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAITS,mapEvidence,featureRecords} from '../scripts/mom-controlled-traits.mjs';

test('controlled Pam vocabulary has unique stable ids and natural questions',()=>{
 const ids=TRAITS.map(t=>t.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.length>=90);
 for(const t of TRAITS){assert.ok(t.q.endsWith('?'),`${t.id} needs a question`);assert.ok(t.q.length<110,`${t.id} question is too long`);}
});

test('public vehicle evidence maps through safe hierarchy',()=>{
 const got=mapEvidence([{source:'ConceptNet',type:'IsA',trait:'IsA:pickup truck'}]);
 for(const id of ['car','vehicle','object','manmade'])assert.ok(got.has(id),`missing ${id}`);
 assert.ok(!got.has('animal'));
});

test('Wikidata occupation evidence maps a musician as a person',()=>{
 const got=mapEvidence([{source:'Wikidata',type:'occupation',trait:'occupation:singer'}]);
 for(const id of ['musician','person','living'])assert.ok(got.has(id),`missing ${id}`);
});

test('semantic material evidence maps useful physical traits',()=>{
 const got=mapEvidence([{source:'CSLB trait norms',type:'material',trait:'made of metal'}]);
 assert.ok(got.has('metal'));
});

test('feature records use only known prerequisite traits',()=>{
 const ids=new Set(TRAITS.map(t=>t.id));
 for(const f of featureRecords())if(f.requires)assert.ok(ids.has(f.requires),`${f.id} has unknown prerequisite ${f.requires}`);
});
