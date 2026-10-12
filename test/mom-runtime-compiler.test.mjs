import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMomRuntimeKnowledge, normalizeMomLookup} from '../scripts/mom-runtime-compiler.mjs';

const traits = [
  {id:'person',q:'Is it a person?',group:'domain',parents:[]},
  {id:'object',q:'Is it a physical object?',group:'domain',parents:[]},
  {id:'device',q:'Is it a device?',group:'object',parents:['object']},
  {id:'electronic',q:'Does it use electronics?',group:'object',parents:['object']}
];
const inventory = [
  {name:'Nintendo Switch',key:'nintendo switch',aliases:['Switch'],difficulty:'Core',score:120,broadCategory:'Everyday things'},
  {name:'Ada Lovelace',key:'ada lovelace',aliases:['Augusta Ada King'],difficulty:'Sweet Spot',score:95,broadCategory:'Named / cultural knowledge'}
];
const profiles = [
  {name:'Nintendo Switch',key:'nintendo switch',aliases:['Nintendo Switch console'],difficulty:'Core',score:120,traits:['object','device','electronic'],facets:{brand:'Nintendo'}},
  {name:'Ada Lovelace',key:'ada lovelace',aliases:['Ada'],difficulty:'Sweet Spot',score:95,traits:['person']}
];

test('runtime compiler is deterministic and produces stable compact concept truth', () => {
  const a = compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  const b = compileMomRuntimeKnowledge({inventory:[...inventory].reverse(),profiles:[...profiles].reverse(),traits:[...traits].reverse(),generatedAt:'deterministic'});
  assert.equal(a.meta.sourceHash,b.meta.sourceHash);
  assert.deepEqual(a,b);
  assert.equal(a.meta.conceptCount,2);
  assert.equal(a.meta.questionCount,4);
  const switchConcept = a.concepts.find(c=>c.name==='Nintendo Switch');
  assert.equal(switchConcept.category,'object');
  assert.equal(switchConcept.subcategory,'device');
  assert.equal(switchConcept.difficulty,'core');
  assert.deepEqual(switchConcept.no,[],'missing evidence must remain unknown, not become No');
  assert.deepEqual(switchConcept.maybe,[]);
  assert.equal(switchConcept.facets.brand,'Nintendo');
});

test('runtime alias map resolves canonical names and aliases without changing beliefs', () => {
  const runtime = compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  const target = runtime.concepts.findIndex(c=>c.name==='Nintendo Switch');
  assert.equal(runtime.aliases[normalizeMomLookup('Nintendo Switch')],target);
  assert.equal(runtime.aliases[normalizeMomLookup('Switch')],target);
  assert.equal(runtime.aliases[normalizeMomLookup('Nintendo Switch console')],target);
  assert.equal(runtime.aliases[normalizeMomLookup('Something unsupported')],undefined);
});

test('question prerequisites compile to numeric indexes', () => {
  const runtime = compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  const objectIndex = runtime.questions.findIndex(q=>q.id==='object');
  const device = runtime.questions.find(q=>q.id==='device');
  assert.equal(device.requires,objectIndex);
  assert.deepEqual(device.appliesTo,['object']);
});
