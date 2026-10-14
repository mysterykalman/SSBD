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

test('relationship targets do not masquerade as root classifications',()=>{
 const hasBook=mapEvidence([{source:'CSKG:ConceptNet',type:'hasa',trait:'hasa:book'}]);
 assert.ok(!hasBook.has('media_work'));
 assert.ok(!hasBook.has('book'));

 const atPark=mapEvidence([{source:'CSKG:ConceptNet',type:'atlocation',trait:'atlocation:park'}]);
 assert.ok(!atPark.has('place'));
 assert.ok(!atPark.has('park'));

 const madeByPerson=mapEvidence([{source:'ConceptNet',type:'CreatedBy',trait:'CreatedBy:person'}]);
 assert.ok(!madeByPerson.has('person'));
 assert.ok(!madeByPerson.has('living'));
});

test('taxonomic evidence still maps controlled roots and subtypes',()=>{
 const book=mapEvidence([{source:'CSKG:WordNet',type:'isa',trait:'isa:book'}]);
 for(const id of ['book','media_work','manmade'])assert.ok(book.has(id),`missing ${id}`);

 const company=mapEvidence([{source:'ConceptNet',type:'IsA',trait:'IsA:company'}]);
 for(const id of ['company','organization'])assert.ok(company.has(id),`missing ${id}`);
});
