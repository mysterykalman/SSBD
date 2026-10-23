import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicRoster,compileThematicModel,collisionAudit} from '../scripts/pam-thematic-lab.mjs';
import {inventoryCombined} from '../scripts/pam-real-roster-benchmark.mjs';
import {readFile} from 'node:fs/promises';

// This test reads the ORIGINAL, gzip/Brotli-encoded recovered roster.
const roster=await loadThematicRoster();
const originals=JSON.parse(await readFile(new URL('../data/pam20q/exports/targets-1775.json',import.meta.url),'utf8'));
const base={targets:originals,questions:Array.from({length:156},(_,i)=>'q'+i)};
const inventory=inventoryCombined(base,roster);
test('actual original 1775 and thematic 1650 names are reconciled without accidental additions',()=>{
 assert.equal(inventory.oldTargets,1775);
 assert.equal(inventory.recoveredCandidates,1650);
 assert.equal(inventory.internalDuplicates.length,0);
 assert.equal(inventory.uniqueNewNames,1650);
 assert.equal(inventory.crossLibraryExactNameOverlaps.length,1);
 assert.equal(inventory.resolvedAliases.length,1);
 assert.equal(inventory.resolvedAliases[0].disambiguatedName,'Dove (personal care brand)');
 assert.equal(inventory.combinedUniqueNames,3425);
 assert.equal(inventory.combinedUniqueNames,1775+inventory.uniqueNewNames);
});
test('real roster has a compiled question set with explicit unknowns',()=>{
 const model=compileThematicModel(roster);
 assert.equal(model.targets.length,1650);
 assert.ok(model.questions.length>0);
 for(const q of model.questions){
  assert.ok(q.text.endsWith('?'));
  assert.equal(q.known.length,1650);assert.equal(q.states.length,1650);
  for(let i=0;i<1650;i++)if(q.known[i])assert.ok(q.states[i]===2||q.states[i]===3);
 }
 const collisions=collisionAudit(model);
 assert.equal(collisions.count,1650);
 assert.equal(collisions.uniqueProfiles+collisions.collidingProfiles,1650);
});
