import test from 'node:test';
import assert from 'node:assert/strict';
import {createMomRuntimeReasoner, initialRuntimeBelief} from '../src/shared/mom-runtime-reasoning.js';

const runtime={
  questions:[
    {id:'person',q:'Is it a person?',family:'ontology',breadth:'broad',reliability:0.99,requires:null,appliesTo:[],excludes:[],minCoverage:0},
    {id:'manmade',q:'Is it man-made?',family:'origin',breadth:'broad',reliability:0.99,requires:null,appliesTo:[],excludes:['person','animal','plant'],minCoverage:0.5},
    {id:'profession',q:'Is it a profession?',family:'person',breadth:'attribute',reliability:0.94,requires:null,appliesTo:['person'],excludes:[],minCoverage:0.4},
    {id:'electronic',q:'Does it use electronics?',family:'technology',breadth:'category',reliability:0.97,requires:null,appliesTo:['object'],excludes:[],minCoverage:0.35},
    {id:'specific_split',q:'Is it from the person-like half?',family:'detail',breadth:'specific',reliability:0.99,requires:null,appliesTo:[],excludes:[],minCoverage:0}
  ],
  concepts:[
    {name:'Ada',category:'person',subcategory:null,prior:0.4,yes:[0,4],no:[1],maybe:[]},
    {name:'Switch',category:'object',subcategory:'device',prior:0.3,yes:[1,3],no:[0,4],maybe:[]},
    {name:'Mystery object',category:'object',subcategory:null,prior:0.3,yes:[1],no:[0,4],maybe:[]}
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

test('equally informative broad questions outrank specific questions early',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=initialRuntimeBelief(runtime);
  const broad=r.questionScore(belief,0,{turn:0});
  const specific=r.questionScore(belief,4,{turn:0});
  assert.ok(Math.abs(broad.gain-specific.gain)<1e-12,'fixture should give identical raw information gain');
  assert.ok(broad.score>specific.score,'early-stage breadth should break the tie naturally');
  assert.ok(broad.stage>specific.stage);
});

test('recently repeated question families are strongly penalized without becoming illegal',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const belief=initialRuntimeBelief(runtime);
  const normal=r.questionScore(belief,4,{turn:10,recentQuestionIndexes:[]});
  const repeated=r.questionScore(belief,4,{turn:10,recentQuestionIndexes:[4]});
  assert.equal(normal.eligible,true);
  assert.equal(repeated.eligible,true);
  assert.equal(repeated.repetition,0.42);
  assert.ok(repeated.score<normal.score);
});

test('bestQuestion exposes inspectable ranking diagnostics',()=>{
  const r=createMomRuntimeReasoner(runtime);
  const best=r.bestQuestion(initialRuntimeBelief(runtime),{turn:0});
  assert.ok(best);
  for(const key of ['score','gain','semantic','known','stage','repetition','sequence'])assert.equal(typeof best[key],'number');
});

const branchRuntime={
  questions:[
    {id:'object',q:'Is it a physical object?',family:'ontology',breadth:'broad',reliability:0.99,requires:null,appliesTo:[],excludes:[],minCoverage:0},
    {id:'electronic',q:'Is it electronic?',family:'technology',breadth:'category',reliability:0.97,requires:null,appliesTo:['object'],excludes:[],minCoverage:0.35},
    {id:'animal',q:'Is it an animal?',family:'ontology',breadth:'broad',reliability:0.99,requires:null,appliesTo:[],excludes:[],minCoverage:0},
    {id:'vehicle',q:'Is it a vehicle?',family:'transport',breadth:'category',reliability:0.97,requires:null,appliesTo:['object'],excludes:[],minCoverage:0.35},
    {id:'car',q:'Is it a car?',family:'transport',breadth:'specific',reliability:0.96,requires:null,appliesTo:['vehicle'],excludes:[],minCoverage:0.3},
    {id:'handheld',q:'Can you hold it in one hand?',family:'physical',breadth:'attribute',reliability:0.94,requires:null,appliesTo:['object'],excludes:[],minCoverage:0.25}
  ],
  concepts:[
    {name:'Phone',category:'object',subcategory:'device',prior:0.45,yes:[0,1,5],no:[2,3,4],maybe:[]},
    {name:'Car',category:'object',subcategory:'vehicle',prior:0.35,yes:[0,1,3,4],no:[2,5],maybe:[]},
    {name:'Dog',category:'animal',subcategory:null,prior:0.2,yes:[2],no:[0,1,3,4],maybe:[]}
  ]
};

test('confirmed electronic object branch blocks contradictory ontology questions',()=>{
  const r=createMomRuntimeReasoner(branchRuntime);
  const belief=initialRuntimeBelief(branchRuntime);
  const context={turn:12,confirmedYes:new Set([0,1]),asked:new Set(),recentQuestionIndexes:[]};
  const animal=r.questionScore(belief,2,context);
  assert.equal(animal.eligible,false);
  assert.equal(animal.reason,'contradicts_established_object_branch');
  assert.equal(r.questionScore(belief,5,context).eligible,true);
});

test('transport leaf guesses require the vehicle branch first',()=>{
  const r=createMomRuntimeReasoner(branchRuntime);
  const belief=initialRuntimeBelief(branchRuntime);
  const before=r.questionScore(belief,4,{turn:15,confirmedYes:new Set([0,1]),asked:new Set()});
  assert.equal(before.eligible,false);
  assert.equal(before.reason,'requires_vehicle_branch');
  const after=r.questionScore(belief,4,{turn:15,confirmedYes:new Set([0,1,3]),asked:new Set()});
  assert.equal(after.eligible,true);
});

test('late game favors category and attribute narrowing over leaf specificity',()=>{
  const r=createMomRuntimeReasoner(branchRuntime);
  const belief=initialRuntimeBelief(branchRuntime);
  const context={turn:16,confirmedYes:new Set([0,1,3]),asked:new Set()};
  const vehicle=r.questionScore(belief,3,context);
  const car=r.questionScore(belief,4,context);
  assert.ok(vehicle.stage>car.stage);
});
