import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicRoster,compileThematicModel} from '../scripts/pam-thematic-lab.mjs';
import {pruneRedundantQuestions} from '../scripts/pam-question-prune.mjs';
import {knownOppositeAudit} from '../scripts/pam-known-opposite-audit.mjs';

const profile=()=>({targets:[{name:'A'},{name:'B'}],questions:[
 {id:'one',field:'foo',known:Uint8Array.from([1,1]),states:Uint8Array.from([3,2])},
 {id:'two',field:'foo',known:Uint8Array.from([1,1]),states:Uint8Array.from([3,2])}
]});

test('duplicated filters are pruned without losing a pairwise distinguishing fact',()=>{
 const m=profile(),r=pruneRedundantQuestions(m,{protectedFields:[]});
 assert.equal(r.report.before,2);
 assert.equal(r.report.after,1);
 assert.equal(r.report.pairsPreserved,1);
 assert.equal(m.questions.length,2,'original model must remain unchanged');
});

test('a single indispensable question cannot be pruned',()=>{
 const m=profile();m.questions.pop();const r=pruneRedundantQuestions(m,{protectedFields:[]});
 assert.equal(r.report.after,1);
});

test('the 1650 workbook model preserves all known opposing pairs while retaining good broad routing',async()=>{
 const roster=await loadThematicRoster();
 const m=compileThematicModel(roster);
 const result=pruneRedundantQuestions(m);
 const before=knownOppositeAudit(m),after=knownOppositeAudit(result.model);
 assert.ok(result.report.after<result.report.before);
 assert.equal(result.report.before,351);
 assert.equal(result.report.after,304);
 assert.equal(result.report.pairsPreserved,1325524);
 assert.equal(before.unresolvedPairs,after.unresolvedPairs);
 assert.equal(before.uniquelySeparable,after.uniquelySeparable);
 assert.equal(result.model.questions.filter(q=>q.field==='macro_topic').length,6);
 assert.ok(result.model.questions.every(q=>q.text.endsWith('?')));
});