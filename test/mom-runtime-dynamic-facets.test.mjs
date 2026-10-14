import test from 'node:test';
import assert from 'node:assert/strict';
import {createMomRuntimeReasoner} from '../src/shared/mom-runtime-reasoning.js';

const runtime={
  questions:[
    {id:'gk_product',q:'Is it a consumer product?',group:'culture',family:'general_knowledge',breadth:'broad',reliability:0.98,requires:null,appliesTo:[],excludes:[],minCoverage:0}
  ],
  concepts:[
    {name:'Nintendo Switch',category:'object',prior:0.25,yes:[0],no:[],maybe:[],facets:{brand:'Nintendo'}},
    {name:'PlayStation 5',category:'object',prior:0.25,yes:[0],no:[],maybe:[],facets:{brand:'Sony'}},
    {name:'Xbox',category:'object',prior:0.25,yes:[0],no:[],maybe:[],facets:{brand:'Microsoft'}},
    {name:'Chair',category:'object',prior:0.25,yes:[],no:[0],maybe:[],facets:{}}
  ],
  facetIndex:{
    version:1,
    types:{
      brand:{question:'Is it made by {value}?',exclusiveKnown:true,requiresCategory:'object',reliability:0.98,known:[0,1,2],values:{Microsoft:[2],Nintendo:[0],Sony:[1]}}
    }
  }
};

test('broad product filtering beats brand specificity at the opening',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=new Float64Array([0.25,0.25,0.25,0.25]);
  const best=r.bestQuestion(belief,{turn:0});
  assert.equal(best.kind,'static');
  assert.equal(best.question.id,'gk_product');
});

test('brand becomes a natural best filter once only consoles remain',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=new Float64Array([1/3,1/3,1/3,0]);
  const best=r.bestQuestion(belief,{turn:8,asked:new Set([0])});
  assert.equal(best.kind,'facet');
  assert.equal(best.type,'brand');
  assert.ok(['Microsoft','Nintendo','Sony'].includes(best.value));
  assert.ok(best.gain>0.5,`expected a strong 1-vs-2 brand split, got ${best.gain}`);
  assert.match(best.text,/made by/);
});

test('repeating brand filters is strongly discouraged but not globally forbidden',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=new Float64Array([1/3,1/3,1/3,0]);
  const normal=r.facetQuestionScore(belief,'brand','Nintendo',{turn:8});
  const repeated=r.facetQuestionScore(belief,'brand','Nintendo',{turn:8,recentFacetTypes:['brand']});
  assert.equal(repeated.repetition,0.4);
  assert.ok(repeated.score<normal.score);
  assert.ok(repeated.eligible);
});
