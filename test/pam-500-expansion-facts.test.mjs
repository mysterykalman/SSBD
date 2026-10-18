import test from 'node:test';
import assert from 'node:assert/strict';
import {pamTraitIndex} from '../scripts/pam-classic-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';
import {pam500DiverseCatalogue} from '../data/pam20q/candidates/diverse-500.mjs';

function parseFlags(value){
 const states=new Map();
 for(const token of String(value||'').split(/\s+/).filter(Boolean)){
  const sign=token[0],key=token.slice(1);
  assert.ok(['+','-','~'].includes(sign),'Invalid answer sign '+token);
  assert.ok(Object.hasOwn(pamTraitIndex,key),'Unknown question trait '+token);
  states.set(key,sign);
 }
 return states;
}
function parseCatalogue(groups,label){
 const parsed=[];
 for(const group of groups){
  const defaults=parseFlags(group.flags);
  const lines=group.entries.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  assert.ok(lines.length>0,label+' has an empty concept family '+group.kind);
  for(const line of lines){
   const [name,...flagParts]=line.split('|');
   assert.ok(name?.trim(),label+' has a missing candidate name');
   const traits=new Map(defaults);
   for(const [key,sign] of parseFlags(flagParts.join(' ')))traits.set(key,sign);
   parsed.push({name:name.trim(),kind:group.kind,traits});
  }
 }
 return parsed;
}
const catalogue=parseCatalogue(pam500Catalogue,'previous');
const diverse=parseCatalogue(pam500DiverseCatalogue,'diverse');
const invertebrateInsects=new Set(["a tarantula hawk wasp","a paper wasp","a potter wasp","a mud dauber","a velvet ant","a leafcutter ant","an army ant","a trap-jaw ant","a honeypot ant","a bullet ant"]);
const byName=new Map([...catalogue,...diverse].map(p=>[p.name.toLowerCase(),p]));
const get=name=>{const p=byName.get(name.toLowerCase());assert.ok(p,'Missing correction fixture '+name);return p;};
const answer=(name,trait)=>get(name).traits.get(trait);

test('diversified source contains 541 candidate entries across at least 15 concrete and intangible families',()=>{
 assert.equal(diverse.length,541);
 assert.ok(new Set(pam500DiverseCatalogue.map(x=>x.kind)).size>=15);
 assert.equal(new Set(diverse.map(x=>x.name.toLowerCase())).size,diverse.length);
});

test('biological diets do not misclassify animal type as something eaten',()=>{
 const biological=new Set(['mammal','hoof','bird','reptile','amphibian','insect','invert','fish','shellfish']);
 for(const p of [...catalogue,...diverse]){
  if(!biological.has(p.kind))continue;
  if(p.kind!=='fish')assert.notEqual(p.traits.get('fish'),'+',p.name+' must not be called a fish');
  if(p.kind==='invert'){
   if(invertebrateInsects.has(p.name))assert.equal(p.traits.get('insect'),'+',p.name+' is biologically an insect');
   else assert.notEqual(p.traits.get('insect'),'+',p.name+' is an invertebrate but not an insect');
  }else if(p.kind!=='insect')assert.notEqual(p.traits.get('insect'),'+',p.name+' must not be called an insect');
  if(['mammal','hoof','bird'].includes(p.kind)){
   assert.notEqual(p.traits.get('cold'),'+',p.name+' is not physically cold merely because of habitat');
  }
 }
 for(const name of ['a gannet','a booby bird','a cormorant','an anhinga','a grebe','a bee-eater']){
  assert.notEqual(answer(name,'fish'),'+');
  assert.equal(answer(name,'carnivore'),'+');
 }
 assert.notEqual(answer('a bat-eared fox','insect'),'+');
});

test('insectivores and omnivores do not inherit a false strictly herbivorous diet',()=>{
 for(const name of ['a numbat','an echidna','a pangolin','a tamandua','a silky anteater','a giant anteater']){
  assert.equal(answer(name,'herbivore'),'-',name);
  assert.equal(answer(name,'carnivore'),'+',name);
 }
 for(const name of ['a bilby','a bandicoot','a peccary','a babirusa','a red river hog','a warthog']){
  assert.notEqual(answer(name,'herbivore'),'+',name);
 }
 assert.equal(answer('a pangolin','shell'),'-');
 assert.equal(answer('a pangolin','furry'),'-');
});

test('habitat and size labels retain their literal question meanings',()=>{
 for(const name of ['a flat-headed cat','a sitatunga','a marsh deer','a barasingha','a basilisk lizard','a crocodile skink','a fishing spider']){
  assert.notEqual(answer(name,'water'),'+',name+' does not live IN water');
 }
 for(const name of ['a fennec fox','a steenbok','a muntjac','a camping pillow','a lumbar pillow']){
  assert.notEqual(answer(name,'smallBread'),'+',name+' must not be asserted smaller than a loaf of bread');
 }
 for(const group of pam500DiverseCatalogue.filter(x=>['rock','landform','weather'].includes(x.kind))){
  assert.notEqual(parseFlags(group.flags).get('seenReal'),'+');
 }
 assert.notEqual(answer('a stalactite','veryLarge'),'+');
 assert.notEqual(answer('a tidal pool','veryLarge'),'+');
});
