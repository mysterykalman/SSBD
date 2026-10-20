import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const path='data/pam20q/reference/classic/';
const [raw,targetsDoc,questionsDoc]=await Promise.all([
 readFile(path+'weights.u2states.bin'),readFile(path+'targets.json','utf8'),readFile(path+'questions.json','utf8')
]);
const rawNames=JSON.parse(targetsDoc),rawQuestions=JSON.parse(questionsDoc);
const names=Array.isArray(rawNames)?rawNames:rawNames.targets;
const qs=Array.isArray(rawQuestions)?rawQuestions:rawQuestions.questions;
const n=names.length;
const answer=(name,q)=>raw[q*n+names.indexOf(name)];
test('Pinned 1200 x 156 source is shape-valid without asserting factual review',()=>{
 assert.equal(n,1200);
 assert.equal(qs.length,156);
 assert.equal(raw.length,n*qs.length);
 assert.ok([...raw].every(x=>x>=0&&x<=3));
});
test('Known semantic exceptions must not be erased by global taxonomic implication',()=>{
 assert.equal(answer('a cadaver',152),3);
 assert.equal(answer('a cadaver',126),2);
 assert.equal(answer('a desk',62),3);
 assert.equal(answer('a desk',154),2);
 assert.equal(answer('blue jeans',62),3);
 assert.equal(answer('blue jeans',154),2);
});
