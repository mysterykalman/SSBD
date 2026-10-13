import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCategoryBalancedPriors, categoryPriorMass, conceptPopularityWeight} from '../scripts/mom-runtime-priors.mjs';

const close=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);

test('category prior mass is independent of row count',()=>{
  const concepts=[
    ...Array.from({length:100},(_,i)=>({name:`Person ${i}`,category:'person',difficulty:'core',prior:1})),
    {name:'Object A',category:'object',difficulty:'core',prior:1}
  ];
  const balanced=applyCategoryBalancedPriors(concepts,{categoryMass:{person:0.4,object:0.6,unknown:0}});
  const mass=categoryPriorMass(balanced);
  close(mass.person,0.4);
  close(mass.object,0.6);
  close(balanced.reduce((sum,c)=>sum+c.prior,0),1);
});

test('common core concepts receive more mass than obscure long-tail concepts inside the same category',()=>{
  const concepts=[
    {name:'Common',category:'animal',difficulty:'core',prior:120},
    {name:'Obscure',category:'animal',difficulty:'long_tail',prior:2},
    {name:'Chair',category:'object',difficulty:'core',prior:90}
  ];
  assert.ok(conceptPopularityWeight(concepts[0])>conceptPopularityWeight(concepts[1]));
  const balanced=applyCategoryBalancedPriors(concepts);
  const common=balanced.find(c=>c.name==='Common');
  const obscure=balanced.find(c=>c.name==='Obscure');
  assert.ok(common.prior>obscure.prior);
  const mass=categoryPriorMass(balanced);
  const defaultPresentTotal=0.14+0.26;
  close(mass.animal,0.14/defaultPresentTotal);
  close(mass.object,0.26/defaultPresentTotal);
});
