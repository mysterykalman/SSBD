import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const doc=JSON.parse(await readFile('data/pam20q/research/quality-500-unreviewed.json','utf8'));
const journal=JSON.parse(await readFile('data/pam20q/research/quality-500-corrections-2026-10-19.json','utf8'));
const byName=new Map(doc.profiles.map(p=>[p.name,p]));
test('target-specific review journal is complete and changes each named trait in the intended direction',()=>{
 assert.equal(doc.profiles.length,500);
 assert.equal(journal.correctedTargets,100);
 assert.equal(journal.correctedCells,107);
 assert.equal(new Set(journal.changes.map(c=>c.target)).size,100);
 for(const c of journal.changes){
  assert.ok(['yes','no'].includes(c.from)&&['yes','no'].includes(c.to));
  const p=byName.get(c.target);assert.ok(p,c.target);
  assert.ok((p[c.to]||[]).includes(c.trait),c.target+' / '+c.trait);
  assert.ok(!(p[c.from]||[]).includes(c.trait),c.target+' / '+c.trait+' stale');
 }
});
test('reviewed animal morphology and semantic traps have no remaining contradictory research tags',()=>{
 for(const p of doc.profiles){
  const yes=new Set(p.yes||[]),no=new Set(p.no||[]);
  for(const v of yes)assert.ok(!no.has(v),p.name+' '+v);
  if(yes.has('feet')&&p.category==='animal'&&no.has('legs'))assert.fail(p.name+' has feet but no legs');
  if(yes.has('feathers')&&yes.has('fish'))assert.fail(p.name+' is a bird and a fish');
  if(yes.has('spine')&&yes.has('insect'))assert.fail(p.name+' is a vertebrate and insect');
 }
 assert.ok(byName.get('a bladderwort').no.includes('roots'));
 assert.ok(byName.get('a jackfruit').yes.includes('buy'));
 assert.ok(byName.get('a cormorant').yes.includes('carnivore'));
});
