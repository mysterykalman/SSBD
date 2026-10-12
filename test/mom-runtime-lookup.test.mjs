import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMomRuntimeLookup,resolveMomRuntimeLookup} from '../src/shared/mom-runtime-lookup.js';

const runtime={
  concepts:[{name:'Nintendo Switch'},{name:'Mercury (planet)'},{name:'Mercury (element)'}],
  aliases:{'nintendo switch':0,switch:0,mercury:[1,2]}
};

test('runtime lookup resolves canonical names and aliases',()=>{
  assert.equal(resolveMomRuntimeLookup(runtime,'Switch').index,0);
  assert.equal(resolveMomRuntimeLookup(runtime,'The Nintendo Switch').index,0);
  assert.equal(normalizeMomRuntimeLookup('Nintendo-Switch'),'nintendo switch');
});

test('runtime lookup preserves ambiguous aliases instead of guessing',()=>{
  const result=resolveMomRuntimeLookup(runtime,'Mercury');
  assert.equal(result.status,'ambiguous');
  assert.deepEqual(result.candidates,[1,2]);
  assert.equal(result.index,null);
});

test('runtime lookup reports unsupported answers without affecting gameplay',()=>{
  const result=resolveMomRuntimeLookup(runtime,'Something Pam does not know');
  assert.equal(result.status,'unknown');
  assert.equal(result.index,null);
});
