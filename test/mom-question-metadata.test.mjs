import test from 'node:test';
import assert from 'node:assert/strict';
import {compileQuestionMetadata} from '../scripts/mom-question-metadata.mjs';

test('broad ontology questions compile as reliable broad filters',()=>{
  const meta=compileQuestionMetadata({id:'person',q:'Is it a person?',group:'domain',parents:[]});
  assert.equal(meta.family,'ontology');
  assert.equal(meta.breadth,'broad');
  assert.equal(meta.reliability,0.99);
  assert.deepEqual(meta.appliesTo,[]);
});

test('first-level category questions remain categories rather than over-specific filters',()=>{
  const meta=compileQuestionMetadata({id:'mammal',q:'Is it a mammal?',group:'animal',parents:['animal']});
  assert.equal(meta.family,'animal');
  assert.equal(meta.breadth,'category');
  assert.deepEqual(meta.appliesTo,['animal']);
  assert.equal(meta.minCoverage,0.35);
});

test('man-made excludes living semantic branches',()=>{
  const meta=compileQuestionMetadata({id:'manmade',q:'Was it made by people?',group:'physical',parents:[]});
  assert.equal(meta.family,'origin');
  assert.equal(meta.breadth,'broad');
  assert.deepEqual(meta.excludes,['person','animal','plant']);
  assert.equal(meta.minCoverage,0.5);
});

test('person-specific questions carry person applicability',()=>{
  const meta=compileQuestionMetadata({id:'profession',q:'Is it a profession?',group:'attribute',parents:[]});
  assert.equal(meta.family,'person');
  assert.deepEqual(meta.appliesTo,['person']);
});

test('general-knowledge prerequisite questions stay specific to their established branch',()=>{
  const meta=compileQuestionMetadata({id:'gk_console',q:'Is it a console?',group:'culture',requires:'gk_product',parents:[]});
  assert.equal(meta.family,'general_knowledge');
  assert.equal(meta.breadth,'specific');
  assert.equal(meta.reliability,0.95);
  assert.deepEqual(meta.appliesTo,['gk_product']);
});
