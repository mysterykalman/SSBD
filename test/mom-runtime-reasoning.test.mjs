import test from 'node:test';
import assert from 'node:assert/strict';
import {createMomRuntimeReasoner, initialRuntimeBelief} from '../src/shared/mom-runtime-reasoning.js';

const runtime={
  questions:[
    {id:'person',q:'Is it a person?',family:'ontology',breadth:'broad',reliability:0.99,appliesTo:[],excludes:[],minCoverage:0},
    {id:'manmade',q:'Is it man-made?',family:'origin',breadth:'broad',reliability:0.99,appliesTo:[],excludes:['person','animal','plant'],minCoverage:0.5},
    {id:'profession',q:'Is it a profession?',family:'person',breadth:'attribute',reliability:0.94,appliesTo:['person'],excludes:[],minCoverage:0.4},
    {id:'electronic',q:'Does it use electronics?',family:'technology',breadth:'category',reliability:0.97,appliesTo:['object'],excludes:[],minCoverage:0.35}
  ],
  concepts:[
    {name:'Ada',category:'person',subcategory:null,prior:0.4,yes:[0],no:[1],maybe:[]},
    {name:'Switch',category:'object',subcategory:'device',prior:0.3,yes:[1,3],no:[0],maybe:[]},
    {name:'Mystery object',category:'object',subcategory:null,prior:0.3,yes:[1],no:[0],maybe:[]}
  ]
};

test('semantic coverage excludes questions that make no sense for a candidate branch',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=initialRuntimeBelief(runtime);
  assert.equal(r.appliesToConcept(1,0),false,'man-made must not apply to a person');
  assert.equal(r.appliesToConcept(1,1),true);
  assert.equal(r.appliesToConcept(2,0),true);
  assert.equal(r.appliesToConcept(2,1),false);
  assert.ok(Math.abs(r.semanticCoverage(belief,1)-0.6)<1e-12);
  assert.ok(Math.abs(r.semanticCoverage(belief,2)-0.4)<1e-12);
});

test('known-data coverage measures evidence mass and leaves missing traits unknown',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=initialRuntimeBelief(runtime);
  assert.equal(r.truthAt(1,3),1);
  assert.equal(Number.isNaN(r.truthAt(2,3)),true);
  assert.ok(Math.abs(r.knownCoverage(belief,3)-0.3)<1e-12);
});

test('unknown evidence contributes no fake information gain',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=new Float64Array([0,0,1]);
  assert.equal(r.questionGain(belief,3,0.06),0);
});

test('balanced runtime priors initialize the belief exactly',()=>{
  const belief=initialRuntimeBelief(runtime);
  assert.ok(Math.abs(belief[0]-0.4)<1e-12);
  assert.ok(Math.abs(belief[1]-0.3)<1e-12);
  assert.ok(Math.abs(belief[2]-0.3)<1e-12);
});
