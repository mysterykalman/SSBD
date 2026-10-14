import test from 'node:test';
import assert from 'node:assert/strict';
import {createMomRuntimeGame} from '../src/shared/mom-runtime-game.js';

const runtime={
  questions:[
    {id:'object',q:'Is it an object?',family:'ontology',group:'domain',breadth:'broad',reliability:0.99,requires:null,appliesTo:[],excludes:[],minCoverage:0},
    {id:'electronic',q:'Is it electronic?',family:'technology',group:'object',breadth:'category',reliability:0.97,requires:0,appliesTo:['object'],excludes:[],minCoverage:0.35},
    {id:'handheld',q:'Can you hold it?',family:'physical',group:'object',breadth:'attribute',reliability:0.94,requires:0,appliesTo:['object'],excludes:[],minCoverage:0.25}
  ],
  concepts:[
    {id:'switch',name:'Nintendo Switch',category:'object',subcategory:'device',difficulty:'core',prior:0.6,yes:[0,1,2],no:[],maybe:[],facets:{brand:'Nintendo'}},
    {id:'lamp',name:'Lamp',category:'object',subcategory:null,difficulty:'core',prior:0.3,yes:[0,1],no:[2],maybe:[],facets:{}},
    {id:'mystery',name:'Mystery Thing',category:'object',subcategory:null,difficulty:'long_tail',prior:0.1,yes:[0],no:[1],maybe:[],facets:{}}
  ],
  aliases:{},
  facetIndex:{version:1,types:{brand:{question:'Is it made by {value}?',exclusiveKnown:true,requiresCategory:'object',reliability:0.98,known:[0],values:{Nintendo:[0]}}}}
};

test('Not sure leaves belief unchanged and does not turn missing evidence into No',()=>{
  const api=createMomRuntimeGame(runtime,{minGuessQuestions:20});
  const q={kind:'question',source:'static',index:2,id:'handheld',text:'Can you hold it?'};
  const before=[...api.game.belief];
  api.answer(q,'unknown');
  assert.deepEqual([...api.game.belief],before);
});

test('known evidence updates belief but unknown candidates receive neutral likelihood',()=>{
  const api=createMomRuntimeGame(runtime,{minGuessQuestions:20});
  const q={kind:'question',source:'static',index:2,id:'handheld',text:'Can you hold it?'};
  const beforeMystery=api.game.belief[2];
  api.answer(q,'yes');
  assert.ok(api.game.belief[0]>0.6,'known Yes candidate should gain probability');
  assert.ok(api.game.belief[1]<0.3,'known No candidate should lose probability');
  assert.ok(api.game.belief[2]>0,'unknown candidate must remain possible');
  assert.notEqual(api.game.belief[2],0);
  assert.ok(beforeMystery>0);
});

test('high late confidence produces a hunch before a final guess',()=>{
  const api=createMomRuntimeGame(runtime,{minGuessQuestions:5,guessThreshold:0.92});
  api.game.turn=16;
  api.game.belief.set([0.80,0.12,0.08]);
  const action=api.choose();
  assert.equal(action.kind,'hunch');
  assert.equal(action.index,0);
  assert.equal(action.reason,'confidence');
  const guess=api.commitGuess(action);
  assert.equal(guess.kind,'guess');
  assert.equal(guess.label,'Nintendo Switch');
});

test('defer hunch charges points and permits another question before rehunching',()=>{
  const api=createMomRuntimeGame(runtime,{minGuessQuestions:5,guessThreshold:0.92,continuePrice:2});
  api.game.turn=16;
  api.game.belief.set([0.80,0.12,0.08]);
  const hunch=api.choose();
  assert.equal(hunch.kind,'hunch');
  const next=api.deferGuess(hunch);
  assert.equal(api.game.continueCost,2);
  assert.equal(next.kind,'question');
});

test('Pam gets one final guess only',()=>{
  const api=createMomRuntimeGame(runtime,{minGuessQuestions:5});
  api.game.turn=5;
  api.game.belief.set([0.99,0.005,0.005]);
  const hunch=api.choose();
  const guess=hunch.kind==='hunch'?api.commitGuess(hunch):hunch;
  assert.equal(guess.kind,'guess');
  const result=api.confirm(guess,false);
  assert.equal(result.correct,false);
  assert.equal(api.game.status,'lost');
  assert.throws(()=>api.confirm(guess,true),/game finished|guess already used/);
});

test('logical single-candidate result bypasses hunch like the Phase 3 engine',()=>{
  const api=createMomRuntimeGame(runtime,{minGuessQuestions:5});
  api.game.turn=5;
  api.game.history.push({kind:'question',answer:'yes',action:{kind:'question',source:'static',index:2,id:'handheld',text:'Can you hold it?'}});
  api.game.history.push({kind:'question',answer:'yes',action:{kind:'question',source:'static',index:1,id:'electronic',text:'Is it electronic?'}});
  const decision=api.guessReason();
  assert.equal(decision.reason,'logical');
  assert.equal(decision.index,0);
  const action=api.choose();
  assert.equal(action.kind,'guess');
  assert.equal(action.label,'Nintendo Switch');
});

test('awkward clothing label is rendered as natural English',()=>{
  const clothingRuntime={
    questions:[{id:'clothing',q:'Is it a clothing?',family:'object',breadth:'category',reliability:0.97,requires:null,appliesTo:[],excludes:[],minCoverage:0}],
    concepts:[
      {name:'Shirt',category:'object',prior:0.5,yes:[0],no:[],maybe:[]},
      {name:'Lamp',category:'object',prior:0.5,yes:[],no:[0],maybe:[]}
    ],aliases:{},facetIndex:{version:1,types:{}}
  };
  const api=createMomRuntimeGame(clothingRuntime,{minGuessQuestions:20});
  const action=api.choose();
  assert.equal(action.kind,'question');
  assert.equal(action.text,'Is it clothing or something you wear?');
});
