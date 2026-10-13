import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMomRuntimeKnowledge, normalizeMomLookup} from '../scripts/mom-runtime-compiler.mjs';

const traits=[{id:'object',q:'Is it a physical object?',group:'domain',parents:[]}];

test('ambiguous aliases preserve all matching concepts instead of silently choosing one',()=>{
  const inventory=[
    {name:'Alpha Device',key:'alpha device',aliases:['AD'],difficulty:'Core',score:100},
    {name:'Adventure Disc',key:'adventure disc',aliases:['AD'],difficulty:'Core',score:90}
  ];
  const profiles=inventory.map(item=>({name:item.name,key:item.key,aliases:item.aliases,difficulty:item.difficulty,score:item.score,traits:['object']}));
  const runtime=compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  const match=runtime.aliases[normalizeMomLookup('AD')];
  assert.ok(Array.isArray(match));
  assert.equal(match.length,2);
  assert.deepEqual(match.map(i=>runtime.concepts[i].name),['Adventure Disc','Alpha Device']);
});

test('unique aliases remain compact single indexes',()=>{
  const inventory=[{name:'Nintendo Switch',key:'nintendo switch',aliases:['Switch'],difficulty:'Core',score:120}];
  const profiles=[{name:'Nintendo Switch',key:'nintendo switch',aliases:['Switch'],difficulty:'Core',score:120,traits:['object']}];
  const runtime=compileMomRuntimeKnowledge({inventory,profiles,traits,generatedAt:'deterministic'});
  assert.equal(typeof runtime.aliases[normalizeMomLookup('Switch')],'number');
});
