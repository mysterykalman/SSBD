import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicPilot} from '../scripts/pam-thematic-pilot.mjs';
import {oracleThematicGame} from '../scripts/pam-thematic-reasoner.mjs';

const model=await loadThematicPilot();
const knownCount=model.questions.reduce((sum,q)=>sum+q.known.reduce((a,b)=>a+b,0),0);
test('thematic pilot is 16 subjects by 24 meaningful questions; unknown cells remain unknown',()=>{
 assert.equal(model.status,'research_pilot_unreviewed_not_for_release');
 assert.equal(model.targets.length,16);
 assert.equal(model.questions.length,24);
 assert.equal(knownCount,144);
 assert.equal(16*24-knownCount,240);
 for(const q of model.questions)for(let i=0;i<model.targets.length;i++){
  assert.ok(q.known[i]===0||q.known[i]===1);
  if(q.known[i])assert.ok(q.states[i]===2||q.states[i]===3);
  if(q.scope!=='all'&&model.targets[i].category!==q.scope)assert.equal(q.known[i],0,'Out-of-scope facts must be unknown');
 }
});
for(const soft of [false,true])test('actual thematic reasoner identifies all 16 pilot subjects within 20 turns, '+(soft?'one softened answer':'exact answers'),()=>{
 const results=model.targets.map((target,index)=>({target:target.name,result:oracleThematicGame(model,index,soft?{softAt:[3]}:{})}));
 for(const {target,result} of results){
  assert.equal(result.correct,true,target+' identified as '+result.guess+' ('+result.kind+')');
  assert.ok(result.turns<=20,target);
 }
 assert.equal(results.length,16);
});

test('question-family cooldown waits for two repeats and reduces unknown questions',()=>{
 let unknown=0;
 for(let i=0;i<model.targets.length;i++) {
  const out=oracleThematicGame(model,i);
  unknown+=out.log.filter(event=>event.answer==='unknown').length;
 }
 assert.ok(unknown<=4,'An overaggressive family penalty caused excessive out-of-scope questions: '+unknown);
});
