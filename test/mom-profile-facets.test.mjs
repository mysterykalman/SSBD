import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveProfileFacets} from '../scripts/mom-profile-facets.mjs';

test('profile facets derive useful product, brand, occupation, and medium filters from controlled evidence',()=>{
  assert.deepEqual(deriveProfileFacets({
    traits:['object','device','electronic'],
    evidence:[{source:'Wikidata',type:'brand',trait:'brand:Nintendo'}]
  }),{brand:'Nintendo',productType:'electronic'});

  assert.deepEqual(deriveProfileFacets({traits:['person','writer'],evidence:[]}),{occupation:'writer'});
  assert.deepEqual(deriveProfileFacets({traits:['media_work','film'],evidence:[]}),{medium:'film'});
});

test('explicit facets win over inferred manufacturer fallback and values remain deterministic',()=>{
  assert.deepEqual(deriveProfileFacets({
    base:{brand:'Nintendo'},
    traits:['object','device'],
    evidence:[{source:'Wikidata',type:'manufacturer',trait:'manufacturer:Foxconn'}]
  }),{brand:'Nintendo',productType:'device'});
});
