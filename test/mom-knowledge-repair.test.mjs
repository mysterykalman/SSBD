import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditMomKnowledge,
  buildIdentityRepairTargets,
  buildRepairTargets,
  conceptRootConflicts,
  duplicateQuestionGroups,
  normalizeQuestionText,
  questionAppliesToConcept,
  truthAt
} from '../scripts/mom-knowledge-repair.mjs';

const runtime={
  questions:[
    {id:'animal',q:'Is it an animal?',group:'domain',family:'ontology',breadth:'broad',requires:null,appliesTo:[],excludes:[]},
    {id:'fur',q:'Does it have fur?',group:'animal',family:'animal',breadth:'specific',requires:0,appliesTo:['animal'],excludes:[]},
    {id:'home',q:'Would you find it in a home?',group:'attribute',family:'environment',breadth:'attribute',requires:null,appliesTo:[],excludes:[]},
    {id:'home_copy',q:'Would you find it in a home?',group:'attribute',family:'environment',breadth:'attribute',requires:null,appliesTo:[],excludes:[]}
  ],
  concepts:[
    {id:'dog',name:'dog',category:'animal',subcategory:'mammal',prior:2,yes:[0,1],no:[],maybe:[]},
    {id:'chair',name:'chair',category:'object',subcategory:'furniture',prior:1,yes:[],no:[0],maybe:[]}
  ]
};

test('normalizes question text for duplicate detection',()=>{
  assert.equal(normalizeQuestionText(' Would you find it in a HOME? '),'would you find it in a home');
  assert.equal(duplicateQuestionGroups(runtime).length,1);
});

test('truthAt returns Y, N, S or null',()=>{
  assert.equal(truthAt(runtime,0,0),'Y');
  assert.equal(truthAt(runtime,1,0),'N');
  assert.equal(truthAt(runtime,1,2),null);
});

test('question applicability follows runtime appliesTo semantics',()=>{
  assert.equal(questionAppliesToConcept(runtime,1,0),true);
  assert.equal(questionAppliesToConcept(runtime,1,1),false);
  assert.equal(questionAppliesToConcept(runtime,2,1),true);
});

test('audit measures applicable rather than theoretical missing cells',()=>{
  const audit=auditMomKnowledge(runtime);
  assert.equal(audit.meta.theoreticalCells,8);
  assert.equal(audit.meta.applicableCells,7);
  assert.equal(audit.meta.rawKnown,3);
  assert.equal(audit.meta.applicableKnown,3);
  assert.equal(audit.meta.applicableMissing,4);
  assert.equal(audit.meta.duplicateWordingGroups,1);
});

test('repair targets skip known and inapplicable cells and rank by prior',()=>{
  const targets=buildRepairTargets(runtime,{limit:10});
  assert.equal(targets[0].concept_id,'dog');
  assert.equal(targets.some(row=>row.concept_id==='chair'&&row.question_id==='fur'),false);
  assert.equal(targets.some(row=>row.concept_id==='dog'&&row.question_id==='animal'),false);
});

test('identity repair targets include zero-knowledge concepts',()=>{
  const targets=buildIdentityRepairTargets(runtime,{limit:10});
  assert.equal(targets.some(row=>row.concept_id==='chair'),false);
  const blankRuntime={...runtime,concepts:[...runtime.concepts,{id:'mystery',name:'Mystery',category:'unknown',subcategory:null,prior:3,yes:[],no:[],maybe:[]}]};
  const blankTargets=buildIdentityRepairTargets(blankRuntime,{limit:10});
  assert.equal(blankTargets[0].concept_id,'mystery');
  assert.equal(blankTargets[0].repair_reason,'zero_knowledge');
});

test('root conflict detection identifies incompatible positive domain roots',()=>{
  const conflictRuntime={...runtime,concepts:[{id:'odd',name:'Odd',category:'animal',subcategory:null,prior:1,yes:[0],no:[],maybe:[]}],questions:[...runtime.questions,{id:'object',q:'Is it a physical object?',group:'domain',family:'ontology',breadth:'broad',requires:null,appliesTo:[],excludes:[]}]};
  conflictRuntime.concepts[0].yes.push(4);
  const conflicts=conceptRootConflicts(conflictRuntime);
  assert.deepEqual(conflicts[0].roots,['animal','object']);
});
