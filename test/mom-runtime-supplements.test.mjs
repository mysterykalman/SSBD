import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMomRuntimeKnowledge} from '../scripts/mom-runtime-compiler.mjs';

const traits=[
  {id:'object',q:'Is it a physical object?',group:'domain',parents:[]},
  {id:'person',q:'Is it a person?',group:'domain',parents:[]}
];
const inventory=[{name:'Nintendo Switch',key:'nintendo switch',aliases:['Switch'],difficulty:'Core',score:120}];
const profiles=[{name:'Nintendo Switch',key:'nintendo switch',aliases:[],difficulty:'Core',score:120,traits:['object']}];
const supplements=[{
  source:'knowledge.general.js',
  features:[
    {id:'gk_product',q:'Is it a specific well-known consumer product?',group:'culture',requires:'object'},
    {id:'gk_console',q:'Is it a video game console?',group:'culture',requires:'gk_product'},
    {id:'gk_artwork',q:'Is it mainly known as a work of art?',group:'culture'}
  ],
  objects:[
    {name:'Nintendo Switch',kind:'product',yes:['gk_product','gk_console'],weight:2.6},
    {name:'Mona Lisa',kind:'artwork',proper:true,yes:['gk_artwork'],weight:3}
  ]
}];

const ids=runtime=>Object.fromEntries(runtime.questions.map((q,i)=>[q.id,i]));

test('curated supplements enrich matching 50k concepts and preserve supplement-only concepts',()=>{
  const runtime=compileMomRuntimeKnowledge({inventory,profiles,traits,supplements,generatedAt:'deterministic'});
  const q=ids(runtime);
  const switchConcept=runtime.concepts.find(c=>c.name==='Nintendo Switch');
  const mona=runtime.concepts.find(c=>c.name==='Mona Lisa');
  assert.ok(switchConcept);
  assert.ok(mona,'existing curated concept must not disappear just because it is absent from the 50k fixture');
  assert.ok(switchConcept.yes.includes(q.object));
  assert.ok(switchConcept.yes.includes(q.gk_product));
  assert.ok(switchConcept.yes.includes(q.gk_console));
  assert.ok(mona.yes.includes(q.gk_artwork));
  assert.equal(mona.category,'media_work');
  assert.equal(runtime.meta.conceptCount,2);
});

test('supplement ordering does not change compiled output or source hash',()=>{
  const a=compileMomRuntimeKnowledge({inventory,profiles,traits,supplements,generatedAt:'deterministic'});
  const reordered=[{
    ...supplements[0],
    features:[...supplements[0].features].reverse(),
    objects:[...supplements[0].objects].reverse()
  }];
  const b=compileMomRuntimeKnowledge({inventory,profiles,traits,supplements:reordered,generatedAt:'deterministic'});
  assert.equal(a.meta.sourceHash,b.meta.sourceHash);
  assert.deepEqual(a,b);
});

test('controlled question definition wins when a supplemental source reuses the same id',()=>{
  const collision=[{
    source:'legacy',
    features:[{id:'object',q:'Legacy wording that should not replace controlled taxonomy',group:'legacy'}],
    objects:[]
  }];
  const runtime=compileMomRuntimeKnowledge({inventory,profiles,traits,supplements:collision,generatedAt:'deterministic'});
  const object=runtime.questions.find(q=>q.id==='object');
  assert.equal(object.q,'Is it a physical object?');
  assert.equal(object.group,'domain');
});
