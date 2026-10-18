import test from 'node:test';
import assert from 'node:assert/strict';
import {knownOppositeAudit} from '../scripts/pam-known-opposite-audit.mjs';
import {loadThematicRoster,compileThematicModel} from '../scripts/pam-thematic-lab.mjs';

function matrix(items){
 return{targets:[{name:'A',category:'People'},{name:'B',category:'People'},{name:'C',category:'People'}],
  questions:items.map(([a,b,c],i)=>({id:'q'+i,known:Uint8Array.from([a,b,c].map(x=>x===null?0:1)),
   states:Uint8Array.from([a,b,c].map(x=>x===null?0:x?3:2))}))};
}

test('unknown does not falsely create known opposite evidence',()=>{
 const m=matrix([[true,null,false]]);
 const r=knownOppositeAudit(m);
 assert.equal(r.uniquelySeparable,0);
 assert.equal(r.unresolvedPairs,2);
});

test('all three target pairs can be separated with known contradictory facts',()=>{
 const m=matrix([[true,null,false],[false,true,null],[null,true,false]]);
 const r=knownOppositeAudit(m);
 assert.equal(r.uniquelySeparable,3);
 assert.equal(r.unresolvedPairs,0);
 assert.match(r.releaseGate,/PASS/);
});

test('current workbook-derived candidates fail the strict release gate rather than hallucinating negatives',async()=>{
 const m=compileThematicModel(await loadThematicRoster());
 const r=knownOppositeAudit(m,{limitExamples:4});
 assert.equal(r.total,1650);
 assert.ok(r.unresolvedTargets>0);
 assert.equal(r.uniquelySeparable+r.unresolvedTargets,1650);
 assert.ok(r.unresolvedPairs>0);
 assert.match(r.releaseGate,/BLOCKED/);
});