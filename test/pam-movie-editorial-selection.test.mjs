import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {movieFranchiseForTitle} from '../scripts/pam-movie-franchise-review.mjs';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
const catalog=JSON.parse(await readFile(new URL('../data/pam20q/expansion/standalone-movie-editorial-selection.json',import.meta.url),'utf8'));
test('owner approved precisely 15 new recognisable movie candidates, not unsourced gameplay cells',()=>{
 assert.equal(catalog.editorialSelection.status,'APPROVED_BY_OWNER');
 assert.equal(catalog.entries.length,15);
 assert.equal(new Set(catalog.entries.map(x=>x.title.toLowerCase())).size,15);
 assert(catalog.entries.every(e=>e.productionEnabled===false&&
  e.factualReviewStatus==='PARTIAL_SOURCE_CHECK_COMPLETED'&&e.gameplayReviewStatus==='PENDING'));
 assert(catalog.entries.every(e=>Number.isInteger(e.releaseYear)&&e.releaseYear>=1970&&e.releaseYear<=2026));
});
test('one representative per known movie franchise and no original target exact-title collisions',async()=>{
 const baseline=await loadPam1775Model(loadPamClassicModel);
 const originals=new Set(baseline.targets.map(x=>x.toLowerCase()));
 const families=new Set();
 for(const e of catalog.entries){
  assert(!originals.has(e.title.toLowerCase()),'Existing target would collide with '+e.title);
  const f=movieFranchiseForTitle(e.title);
  if(!f)continue;
  assert(!families.has(f),'Repeated franchise '+f);
  families.add(f);
 }
});
test('question drafts and references are distinguishable from editorial approval',()=>{
 for(const entry of catalog.entries){
  assert.equal(entry.questionCandidates.length,3);
  for(const q of entry.questionCandidates){
   assert(q.text.endsWith('?')&&q.text.length<146);
   assert.equal(q.status,'DRAFT_NOT_APPROVED');
  }
  if(entry.referenceSource){
   assert.match(entry.referenceSource,/^https:\/\//);
   assert.equal(entry.referenceStatus,'SOURCE_CHECKED_FOR_CORE_IDENTITY_AND_POSITIVE_CLUES');
   assert.equal(entry.sourceBackedPositiveClues.length,3);
   assert(entry.sourceBackedPositiveClues.every(f=>f.source===entry.referenceSource));
  }else assert.equal(entry.referenceStatus,'SOURCE_PENDING');
 }
 assert.equal(catalog.policy.deferredIdentityCandidates,298);
 assert.equal(catalog.policy.doNotAlterOriginal1775,true);
});
