import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRuntimeFacetIndex, facetTruth, renderFacetQuestion} from '../scripts/mom-runtime-facets.mjs';

const concepts=[
  {name:'Nintendo Switch',facets:{brand:'Nintendo',productType:'video game console'}},
  {name:'PlayStation 5',facets:{brand:'Sony',productType:'video game console'}},
  {name:'Mystery Gadget',facets:{}},
  {name:'Person A',facets:{country:'Canada'}},
  {name:'Person B',facets:{country:['Canada','United States']}}
];

test('facet index compiles deterministic reusable filters',()=>{
  const index=buildRuntimeFacetIndex(concepts);
  assert.deepEqual(index.types.brand.values.Nintendo,[0]);
  assert.deepEqual(index.types.brand.values.Sony,[1]);
  assert.deepEqual(index.types.productType.values['video game console'],[0,1]);
  assert.equal(index.types.brand.exclusiveKnown,true);
  assert.equal(index.types.country.exclusiveKnown,false);
  assert.equal(renderFacetQuestion('brand','Nintendo'),'Is it made by Nintendo?');
  assert.equal(renderFacetQuestion('productType','electronic device'),'Is it an electronic device?');
});

test('exclusive known facets safely infer No only when another value is known',()=>{
  const index=buildRuntimeFacetIndex(concepts);
  assert.equal(facetTruth(index,'brand','Nintendo',0),1);
  assert.equal(facetTruth(index,'brand','Nintendo',1),0);
  assert.equal(Number.isNaN(facetTruth(index,'brand','Nintendo',2)),true,'missing brand must remain Unknown');
});

test('non-exclusive facets do not infer No from a different known value',()=>{
  const index=buildRuntimeFacetIndex(concepts);
  assert.equal(facetTruth(index,'country','Canada',3),1);
  assert.equal(facetTruth(index,'country','United States',4),1);
  assert.equal(Number.isNaN(facetTruth(index,'country','United States',3)),true,'Canada evidence does not prove not-American');
});
