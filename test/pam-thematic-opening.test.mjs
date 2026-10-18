import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicRoster,openingCategoriesForThematicTarget,SIX_OPENING_CATEGORIES} from '../scripts/pam-thematic-lab.mjs';

const roster=await loadThematicRoster();
test('all 1650 research answers receive a non-empty, valid six-way opening routing hint',()=>{
 assert.equal(roster.length,1650);
 assert.deepEqual(SIX_OPENING_CATEGORIES,['person','place','animal_plant','object','entertainment','other']);
 for(const target of roster){
  const categories=openingCategoriesForThematicTarget(target);
  assert.ok(categories.length>=1,target.name);
  assert.equal(new Set(categories).size,categories.length,target.name);
  for(const category of categories)assert.ok(SIX_OPENING_CATEGORIES.includes(category),target.name);
 }
});
test('artist and actor identities may overlap Person and Entertainment without exclusion',()=>{
 assert.deepEqual(openingCategoriesForThematicTarget({category:'People',subcategory:'Film, TV & Comedy'}),['person','entertainment']);
 assert.deepEqual(openingCategoriesForThematicTarget({category:'People',subcategory:'Solo Musicians & Composers'}),['person','entertainment']);
 assert.deepEqual(openingCategoriesForThematicTarget({category:'People',subcategory:'Athletes'}),['person']);
 assert.deepEqual(openingCategoriesForThematicTarget({category:'Bands & Music Groups'}),['entertainment']);
});
test('places, artwork, and organizations retain their own category meanings',()=>{
 assert.deepEqual(openingCategoriesForThematicTarget({category:'Monuments, Paintings & Sculptures',subcategory:'Monuments & Historic Sites'}),['place']);
 assert.deepEqual(openingCategoriesForThematicTarget({category:'Monuments, Paintings & Sculptures',subcategory:'Sculptures & Public Art'}),['object']);
 assert.deepEqual(openingCategoriesForThematicTarget({category:'Car Companies'}),['other']);
 assert.throws(()=>openingCategoriesForThematicTarget({category:'Monuments, Paintings & Sculptures',subcategory:'Unrecognized'}),/Unclassified/);
});
