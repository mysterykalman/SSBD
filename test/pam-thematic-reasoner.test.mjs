import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicRoster,compileThematicModel} from '../scripts/pam-thematic-lab.mjs';
import {createThematicGame,selectThematicQuestion,acceptThematicAnswer,nextThematicDecision,oracleThematicGame,candidateDistribution} from '../scripts/pam-thematic-reasoner.mjs';

function fullyKnownMatrix(n=128){
 const targets=Array.from({length:n},(_,i)=>({name:'Subject '+String(i+1)}));
 const questions=Array.from({length:7},(_,q)=>({id:'bit_'+q,field:'fact_'+q,text:'Does it have fact '+q+'?',
  known:Uint8Array.from({length:n},()=>1),
  states:Uint8Array.from({length:n},(_,i)=>((i>>q)&1)?3:2)}));
 return{targets,questions};
}

test('eight-way or larger fully known categorical tree stays within 20 questions',()=>{
 const model=fullyKnownMatrix(128);
 for(let t=0;t<128;t++){
  const r=oracleThematicGame(model,t);
  assert.equal(r.correct,true,'failed target '+t+' '+JSON.stringify({kind:r.kind,guess:r.guess,p:r.p}));
  assert.ok(r.turns>=7&&r.turns<=20);
  assert.ok(new Set(r.log.map(x=>x.id)).size===r.log.length);
 }
});

test('softened yes and no change probability but never hard-eliminate correct subject',()=>{
 const model=fullyKnownMatrix(128);
 const game=createThematicGame(model);
 const first=selectThematicQuestion(game);
 assert.ok(first);
 const target=123;
 const prior=game.mass[target];
 const actual=first.q.states[target]===3?'probably':'probably_not';
 acceptThematicAnswer(game,first,actual);
 assert.ok(game.mass[target]>prior);
 assert.ok(game.mass[target]<1);
 assert.equal(game.mass.reduce((a,b)=>a+b,0).toFixed(9),'1.000000000');
});

test('an unknown answer is neutral, not an invented no',()=>{
 const model=fullyKnownMatrix(128);
 const game=createThematicGame(model);
 const q=selectThematicQuestion(game);
 acceptThematicAnswer(game,q,'unknown');
 for(const p of game.mass)assert.ok(Math.abs(p-1/128)<1e-12);
 assert.equal(game.turn,1);
});

test('ambiguous identities cannot get a dishonest confident guess',()=>{
 const model={targets:[{name:'A'},{name:'B'}],questions:[]};
 const game=createThematicGame(model);
 assert.equal(nextThematicDecision(game).kind,'insufficient_evidence');
 assert.equal(oracleThematicGame(model,0).correct,false);
});

test('category question meaning is used and no answer name letters are inspected',async()=>{
 const targets=await loadThematicRoster();
 const model=compileThematicModel(targets);
 const game=createThematicGame(model);
 const first=nextThematicDecision(game);
 assert.equal(first.kind,'question');
 assert.ok(first.informationGain>0);
 assert.equal(first.question.field,'macro_topic','Pam should begin with a conversational broad filter');
 assert.ok(!/letter|spell|start with/i.test(first.question.text));
 const sampleIndices=[0,250,550,750,950,1150,1350,1500,1550,1600];
 for(const idx of sampleIndices){
  const r=oracleThematicGame(model,idx);
  assert.ok(r.turns<=20);
  assert.ok(!r.correct,'workbook metadata is not enough to identify '+model.targets[idx].name);
  assert.ok(r.log.every(x=>!/(starts with|spelled)/i.test(x.text)));
 }
});

test('no question repeats and maximum turn budget is enforced',()=>{
 const model=fullyKnownMatrix(128);
 const game=createThematicGame(model,{maxTurns:5});
 assert.throws(()=>createThematicGame(model,{maxTurns:21}),/within 20 turns/);
 for(let i=0;i<5;i++){
  const q=selectThematicQuestion(game);
  assert.ok(q);
  acceptThematicAnswer(game,q,'yes');
 }
 assert.equal(game.turn,5);
 assert.equal(nextThematicDecision(game).kind,'time_up');
 assert.equal(new Set(game.history.map(x=>x.id)).size,5);
});