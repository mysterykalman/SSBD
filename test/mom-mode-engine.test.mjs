import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
 const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of ["src/client/mom-mode/knowledge.js","src/client/mom-mode/engine.js"]){vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});}
 return ctx.MomBayes;
}

test("Mom Mode knowledge is broad and distinguishable",async()=>{
 const e=await load();assert.ok(e.N>=150);assert.ok(e.F>=80);
 const vectors=new Set;
 for(let i=0;i<e.N;i++){
  let key="";for(let f=0;f<e.F;f++)key+=e.truth[i*e.F+f]+",";
  assert.ok(!vectors.has(key),`duplicate feature vector: ${e.OBJECTS[i].name}`);vectors.add(key);
 }
});

test("truthful self-play always resolves within the 20-question limit",async()=>{
 const e=await load();
 const sample=[...new Set(Array.from({length:24},(_,n)=>Math.round(n*(e.N-1)/23)))];
 for(const i of sample){
  const r=e.selfPlay(i);
  assert.ok(r.turns<=20,`${e.OBJECTS[i].name} took ${r.turns} questions`);
  assert.equal(typeof r.score,"number");
  if(r.stumped)assert.equal(r.guess,null);
 }
});

test("person answers suppress object-style questions such as man-made",async()=>{
 const e=await load();
 const g=e.createGame();
 const personIndex=e.FEATURES.findIndex(f=>f.id==="person");
 const manmadeIndex=e.FEATURES.findIndex(f=>f.id==="manmade");
 g.answers.set("person","yes");
 assert.equal(e.questionAllowed(g,manmadeIndex),false);
 assert.equal(e.questionAllowed(g,personIndex),true);
});

test("Pam cannot guess before five questions even at extreme confidence",async()=>{
 const e=await load();
 const g=e.createGame({guessThreshold:0});
 g.belief.fill(0);g.belief[0]=1;
 g.turn=4;
 assert.equal(e.guessReason(g),null);
 g.turn=5;
 assert.equal(e.guessReason(g).index,0);
});

test("logical certainty forces a guess once the minimum question count is reached",async()=>{
 const e=await load();
 const g=e.createGame();
 const target=0;g.turn=5;
 for(let f=0;f<e.F;f++)g.answers.set(e.FEATURES[f].id,e.truth[target*e.F+f]===1?"yes":"no");
 const viable=e.viableCandidates(g);
 assert.deepEqual(Array.from(viable),[target]);
 const reason=e.guessReason(g);
 assert.equal(reason.reason,"logical");
 assert.equal(reason.index,target);
});

test("Pam gets exactly one guess and a wrong guess ends the round",async()=>{
 const e=await load();
 const g=e.createGame({guessThreshold:0,minGuessQuestions:0});
 const q=e.choose(g);
 assert.equal(q.kind,"guess");
 const r=e.confirm(g,q,false);
 assert.equal(r.done,true);
 assert.equal(g.status,"lost");
 assert.equal(g.guessUsed,true);
 assert.throws(()=>e.confirm(g,q,false),/game finished|guess already used/);
});

test("score rewards survival and gives a ten-point stump bonus",async()=>{
 const e=await load();
 assert.equal(e.scoreFor(12,true),12);
 assert.equal(e.scoreFor(12,false),22);
 assert.equal(e.scoreFor(20,false,true),30);
});
