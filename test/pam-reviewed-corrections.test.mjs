import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {enrichPamModel} from '../scripts/pam-enrich-model.mjs';
import {applyVerifiedPamFacts} from '../scripts/pam-verified-facts.mjs';
import {applyReviewedPamCorrections} from '../scripts/pam-reviewed-corrections.mjs';

const doc=JSON.parse(await readFile(new URL('../data/pam20q/reviews/classic-batch-001.json',import.meta.url),'utf8'));
const before=await applyVerifiedPamFacts(enrichPamModel(await loadPam1775Model(loadPamClassicModel)));
const after=await applyReviewedPamCorrections(before);
const n=after.targets.length,q=after.questions.length;
test('review batch 001 covers explicitly reviewed complete 156-question rows and individually sourced scoped fixes',()=>{
 assert.equal(n,1775);assert.equal(q,156);assert.equal(doc.rows.length,24);
 assert.equal(new Set(doc.rows.map(x=>x.name)).size,doc.rows.length);
 assert.equal(after.reviewedCorrections.fullReviews.length,doc.rows.length);
 for (const row of doc.rows) {
   assert.equal(after.targets[row.targetIndex],row.name);
   assert.equal(row.original.length,156);assert.equal(row.states.length,156);
   for (let j=0;j<156;j++) {
     assert.equal(before.weights[j*n+row.targetIndex],Number(row.original[j]),row.name+' original Q'+j);
     assert.equal(after.weights[j*n+row.targetIndex],Number(row.states[j]),row.name+' updated Q'+j);
     assert.equal(after.knownMask[j*n+row.targetIndex],1);
   }
   assert.equal(row.changedCells,[...row.states].filter((x,j)=>x!==row.original[j]).length);
 }
 const cellKeys=new Set();
 for (const c of doc.scopedCorrections) {
   assert.equal(after.targets[c.targetIndex],c.target);
   assert.equal(after.questions[c.questionIndex],c.question);
   assert.equal(before.weights[c.questionIndex*n+c.targetIndex],c.oldState);
   assert.equal(after.weights[c.questionIndex*n+c.targetIndex],c.newState);
   assert.ok(c.rationale.length>10);
   const key=c.targetIndex+':'+c.questionIndex;assert.ok(!cellKeys.has(key));cellKeys.add(key);
 }
 const changes=after.reviewedCorrections.changedCells;
 assert.equal(changes.length,doc.rows.reduce((a,x)=>a+x.changedCells,doc.scopedCorrections.length));
 const allowed=new Set([...doc.rows.flatMap(r=>Array.from({length:156},(_,q)=>q*n+r.targetIndex)),...doc.scopedCorrections.map(c=>c.questionIndex*n+c.targetIndex)]);
 for (let i=0;i<after.weights.length;i++) if (!allowed.has(i)) assert.equal(after.weights[i],before.weights[i],'Unaudited cell changed at '+i);
 for (let i=0;i<after.knownMask.length;i++) assert.equal(after.knownMask[i],before.knownMask[i],'Known-mask changed at '+i);
 assert.equal(after.targets.join('\\n'),before.targets.join('\\n'));
 assert.equal(after.questions.join('\\n'),before.questions.join('\\n'));
});
