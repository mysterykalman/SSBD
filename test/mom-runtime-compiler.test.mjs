import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMomRuntimeKnowledge, normalizeMomLookup} from '../scripts/mom-runtime-compiler.mjs';

const traits = [
  {id:'person',q:'Is it a person?',group:'domain',parents:[]},
  {id:'animal',q:'Is it an animal?',group:'domain',parents:[]},
  {id:'plant',q:'Is it a plant?',group:'domain',parents:[]},
  {id:'place',q:'Is it a place?',group:'domain',parents:[]},
  {id:'object',q:'Is it a physical object?',group:'domain',parents:[]},
  {id:'device',q:'Is it a device?',group:'object',parents:['object']},
  {id:'electronic',q:'Does it use electronics?',group:'object',parents:['object']},
  {id:'mammal',q:'Is it a mammal?',group:'animal',parents:['animal']},
  {id:'bird',q:'Is it a bird?',group:'animal',parents:['animal']}
];
const inventory = [
  {name:'Nintendo Switch',key:'nintendo switch',aliases:['Switch'],difficulty:'Core',score:120,broadCategory:'Everyday things'},
  {name:'Ada Lovelace',key:'ada lovelace',aliases:['Augusta Ada King'],difficulty:'Sweet Spot',score:95,broadCategory:'Named / cultural knowledge'},
  {name:'Dog',key:'dog',aliases:['Domestic dog'],difficulty:'Core',score:118,broadCategory:'Everyday things'}
];
const profiles = [
  {name:'Nintendo Switch',key:'nintendo switch',aliases:['Nintendo Switch console'],difficulty:'Core',score:120,traits:['object','device','electronic'],facets:{brand:'Nintendo'}},
  {name:'Ada Lovelace',key:'ada lovelace',aliases:['Ada'],difficulty:'Sweet Spot',score:95,traits:['person']},
  {name:'Dog',key:'dog',aliases:[],difficulty:'Core',score:118,traits:['animal','mammal']}
];

const idIndex = runtime => Object.fromEntries(runtime.questions.map((q,i)=>[q.id,i]));

test('runtime compiler is deterministic and produces stable compact concept truth', () => {
  const a = compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  const b = compileMomRuntimeKnowledge({inventory:[...inventory].reverse(),profiles:[...profiles].reverse(),traits:[...traits].reverse(),generatedAt:'deterministic'});
  assert.equal(a.meta.sourceHash,b.meta.sourceHash);
  assert.deepEqual(a,b);
  assert.equal(a.meta.conceptCount,3);
  assert.equal(a.meta.questionCount,9);
  const switchConcept = a.concepts.find(c=>c.name==='Nintendo Switch');
  const q = idIndex(a);
  assert.equal(switchConcept.category,'object');
  assert.equal(switchConcept.subcategory,'device');
  assert.equal(switchConcept.difficulty,'core');
  assert.ok(switchConcept.no.includes(q.person));
  assert.ok(switchConcept.no.includes(q.place));
  assert.ok(!switchConcept.no.includes(q.animal),'object vs animal must remain unknown unless evidence says otherwise');
  assert.ok(!switchConcept.no.includes(q.plant),'object vs plant must remain unknown unless evidence says otherwise');
  assert.deepEqual(switchConcept.maybe,[]);
  assert.equal(switchConcept.facets.brand,'Nintendo');
});

test('safe negative inference rejects impossible roots without filling ambiguous unknowns', () => {
  const runtime = compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  const q = idIndex(runtime);
  const ada = runtime.concepts.find(c=>c.name==='Ada Lovelace');
  assert.ok(ada.no.includes(q.animal));
  assert.ok(ada.no.includes(q.plant));
  assert.ok(ada.no.includes(q.place));
  assert.ok(ada.no.includes(q.object));
  const dog = runtime.concepts.find(c=>c.name==='Dog');
  assert.ok(dog.no.includes(q.person));
  assert.ok(dog.no.includes(q.plant));
  assert.ok(dog.no.includes(q.place));
  assert.ok(dog.no.includes(q.bird),'known mammal safely excludes bird');
  assert.ok(!dog.no.includes(q.object),'animal vs physical object intentionally remains unknown');
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
