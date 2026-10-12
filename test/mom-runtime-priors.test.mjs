import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCategoryBalancedPriors, categoryPriorMass} from '../scripts/mom-runtime-priors.mjs';

const close=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);

test('category prior mass is independent of row count',()=>{
  const concepts=[
    ...Array.from({length:100},(_,i)=>({name:`Person ${i}`,category:'person',prior:1})),
    {name:'Object A',category:'object',prior:1}
  ];
  const balanced=applyCategoryBalancedPriors(concepts,{categoryMass:{person:0.4,object:0.6,unknown:0}});
  const mass=categoryPriorMass(balanced);
  close(mass.person,0.4);
  close(mass.object,0.6);
  close(balanced.reduce((sum,c)=>sum+c.prior,0),1);
});

test('default Step 10 weighting is equal within a category regardless of old raw score',()=>{
  const concepts=[
    {name:'Common',category:'animal',prior:120},
    {name:'Obscure',category:'animal',prior:2},
    {name:'Chair',category:'object',prior:90}
  ];
  const balanced=applyCategoryBalancedPriors(concepts);
  const common=balanced.find(c=>c.name==='Common');
  const obscure=balanced.find(c=>c.name==='Obscure');
  close(common.prior,obscure.prior);
});
